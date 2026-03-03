import { useEffect, useRef, useCallback } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';

const TIME_TRACKING_INTERVAL_MS = 60_000; // 1 minute

interface UseChapterProgressOptions {
  courseDocumentId: Id<'courseDocuments'> | undefined;
  chapterNumber: number;
  enabled?: boolean;
}

interface ChapterProgressResult {
  status: 'not_started' | 'in_progress' | 'completed';
  timeSpentMinutes: number;
  isCompleted: boolean;
  completeChapter: () => Promise<void>;
  isLoading: boolean;
}

/**
 * Hook for tracking chapter progress including time spent.
 *
 * - Calls startChapter when first opened
 * - Tracks time in full minutes while user is on the page
 * - Provides completeChapter function
 */
export function useChapterProgress({ courseDocumentId, chapterNumber, enabled = true }: UseChapterProgressOptions): ChapterProgressResult {
  const startChapterMutation = useMutation(api.progress.startChapter);
  const completeChapterMutation = useMutation(api.progress.completeChapter);
  const recordTimeSpentMutation = useMutation(api.progress.recordTimeSpent);

  const chapterStatus = useQuery(api.progress.getChapterStatus, courseDocumentId && enabled ? { courseDocumentId, chapterNumber } : 'skip');

  const hasStartedRef = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Start chapter on mount (only once per chapter)
  useEffect(() => {
    if (!courseDocumentId || !enabled) return;
    if (hasStartedRef.current) return;
    if (chapterStatus === undefined) return; // Still loading

    hasStartedRef.current = true;

    // Only call startChapter if not already started
    if (chapterStatus.status === 'not_started') {
      void startChapterMutation({ courseDocumentId, chapterNumber });
    }
  }, [courseDocumentId, chapterNumber, enabled, chapterStatus, startChapterMutation]);

  // Reset hasStartedRef when chapter changes
  useEffect(() => {
    hasStartedRef.current = false;
  }, [courseDocumentId, chapterNumber]);

  // Time tracking - record 60 seconds every minute
  useEffect(() => {
    if (!courseDocumentId || !enabled) return;
    if (chapterStatus?.status === 'completed') return;

    // Clear existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // Start new interval
    intervalRef.current = setInterval(() => {
      void recordTimeSpentMutation({
        courseDocumentId,
        chapterNumber,
        secondsToAdd: 60,
      });
    }, TIME_TRACKING_INTERVAL_MS);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [courseDocumentId, chapterNumber, enabled, chapterStatus?.status, recordTimeSpentMutation]);

  const completeChapter = useCallback(async () => {
    if (!courseDocumentId) return;
    await completeChapterMutation({ courseDocumentId, chapterNumber });
  }, [courseDocumentId, chapterNumber, completeChapterMutation]);

  return {
    status: chapterStatus?.status ?? 'not_started',
    timeSpentMinutes: Math.round((chapterStatus?.timeSpentSeconds ?? 0) / 60),
    isCompleted: chapterStatus?.status === 'completed',
    completeChapter,
    isLoading: chapterStatus === undefined,
  };
}
