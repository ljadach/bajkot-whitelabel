/**
 * Pipeline status state machine.
 *
 * Defines allowed status transitions and prevents race conditions
 * where parallel agents overwrite each other's status.
 */

// Keep in sync with schema.ts bookOrders.status union
export type PipelineStatus =
  | 'intake'
  | 'profiling'
  | 'story_planning'
  | 'story_writing'
  | 'psych_review'
  | 'art_direction'
  | 'character_design'
  | 'style_vote'
  | 'illustrating'
  | 'visual_qa'
  | 'awaiting_dedication'
  | 'composing_pdf'
  | 'final_qa'
  | 'delivering'
  | 'completed'
  | 'failed'
  | 'paused';

// Statuses set by the story track (A2→A3→A4→A5) during parallel phase
const STORY_TRACK_STATUSES: ReadonlySet<PipelineStatus> = new Set([
  'story_planning',
  'story_writing',
  'psych_review',
  'art_direction',
]);

// Statuses set by the image track (A6→vote) during parallel phase
const IMAGE_TRACK_STATUSES: ReadonlySet<PipelineStatus> = new Set([
  'character_design',
  'style_vote',
]);

// Statuses that mean the parallel phase is over — don't restart it
export const POST_CONVERGENCE_STATUSES: ReadonlySet<PipelineStatus> = new Set([
  'illustrating',
  'visual_qa',
  'awaiting_dedication',
  'composing_pdf',
  'final_qa',
  'delivering',
  'completed',
  'paused',
  'failed',
]);

/**
 * Guard: should we allow this status transition?
 *
 * Key rule: during the parallel phase (A2-A5 vs A6-vote), one track
 * must not overwrite the other's user-facing status. Specifically:
 * - Story track agents cannot overwrite image track statuses
 * - Image track agents cannot overwrite story track statuses
 *
 * Terminal statuses (failed, paused) are always writable.
 * Post-convergence statuses enforce strict forward order.
 */
export function shouldUpdateStatus(from: PipelineStatus, to: PipelineStatus): boolean {
  // Always allow terminal transitions
  if (to === 'failed' || to === 'paused') return true;

  // From failed/paused — allow anything (admin retry)
  if (from === 'failed' || from === 'paused') return true;

  // Parallel track protection: story track cannot overwrite image track
  if (IMAGE_TRACK_STATUSES.has(from) && STORY_TRACK_STATUSES.has(to)) {
    return false;
  }

  // Parallel track protection: image track cannot overwrite story track
  if (STORY_TRACK_STATUSES.has(from) && IMAGE_TRACK_STATUSES.has(to)) {
    return false;
  }

  // Don't go backwards from post-convergence to pre-convergence
  if (from === 'illustrating' && (STORY_TRACK_STATUSES.has(to) || IMAGE_TRACK_STATUSES.has(to))) {
    return false;
  }

  return true;
}
