/**
 * TypeScript interfaces for the book pipeline.
 * These provide application-level type safety for JSON-stringified artifacts
 * stored on bookOrders.
 */

// ── Order Form Data ──────────────────────────────

import type { AgeBracket } from './ageBracket';
export type { AgeBracket };

export type Gender = 'boy' | 'girl';
export type StyleChoice = 'A' | 'B';

export interface BookOrderFormData {
  childName: string;
  ageBracket: AgeBracket;
  gender: Gender;
  problemId: string;
  problemDetail?: string;
  favoriteToy?: string;
  glasses: boolean;
  hairColor: string;
  hairStyle: string;
  eyeColor: string;
  skinTone: string;
  outfit: string;
  email?: string;
}

// ── Pipeline Status ──────────────────────────────

export type BookOrderStatus =
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
  | 'composing_pdf'
  | 'final_qa'
  | 'delivering'
  | 'completed'
  | 'failed'
  | 'paused';

export type PaymentStatus = 'pending' | 'completed' | 'failed';

// ── A0: Normalized Order ─────────────────────────

export interface NormalizedOrder {
  childName: string;
  ageBracket: AgeBracket;
  gender: Gender;
  problemId: string;
  problemTitle: string;
  problemContext: string;
  problemMetaphor: string;
  problemCategory: string;
  problemDetail?: string;
  favoriteToy?: string;
  glasses: boolean;
  hairColor: string;
  hairColorEn: string;
  hairStyle: string;
  hairStyleEn: string;
  eyeColor: string;
  eyeColorEn: string;
  skinTone: string;
  skinToneEn: string;
  outfit: string;
  outfitPl: string;
  outfitEn: string;
}

// ── A1: Character Profile ────────────────────────

export interface GuideCharacter {
  name: string;
  descriptionPl: string;
  descriptionEn: string;
  role: string;
}

export interface ArtStyleSpec {
  style: string;
  modifiers: string;
  moodPalette: string[];
}

export interface CharacterProfile {
  childName: string;
  age: string;
  gender: Gender;
  physicalDescription: string;
  personalityTraits: string[];
  fears: string[];
  strengths: string[];
  companions: string[];
  visualPromptBase: string;
  // Trustee-parity fields (optional for backward compat)
  descriptionPl?: string;
  descriptionEn?: string;
  visualAnchor?: string;
  personalitySketch?: string;
  guideCharacter?: GuideCharacter;
  artStyleSpec?: ArtStyleSpec;
  characterReferencePrompt?: string;
}

// ── A2: Illustration plan entry (in blueprint) ──────

export interface BlueprintIllustrationEntry {
  id: string; // e.g. "cover", "scene_1.1", "scene_4a.2", "mood_closing"
  beat_ref: string | null; // "1", "2", "4a", etc. null for cover/mood_*
  category: 'cover' | 'scene' | 'mood';
  description_pl: string;
}

// ── A2: Story Blueprint ──────────────────────────

export interface StoryBeat {
  beatNumber: number;
  title: string;
  summary: string;
  emotionalArc: string;
  therapeuticGoal: string;
  settingDescription: string;
  // Trustee-parity fields
  summaryPl?: string;
  summaryEn?: string;
  wordBudget?: number;
  visualDirection?: string;
  keyDialogue?: string | null;
}

export interface ActionableTakeaway {
  strategyNamePl: string;
  howToPl: string;
  strategyNameEn?: string;
}

export interface StoryBlueprint {
  title: string;
  subtitle: string;
  theme: string;
  therapeuticApproach: string;
  beats: StoryBeat[];
  // Trustee-parity fields
  arcType?: string;
  targetTotalWords?: number;
  oldStrategy?: string;
  newStrategy?: string;
  actionableTakeaway?: ActionableTakeaway;
  parentQuestions?: string[];
  pagesPlan?: Array<{
    pageNumber: number;
    contentType: string;
    beatRef: number;
    illustrationId: string;
  }>;
  /** Per-bracket illustration plan — drives A5 (prompts) and A9 (page sequence). */
  illustrationPlan?: BlueprintIllustrationEntry[];
}

// ── A3: Story Draft ──────────────────────────────

export interface StoryPage {
  beatNumber: number;
  /** String beat id from A2 schema (e.g. "1", "4a", "4b"). Preferred over beatNumber. */
  beatId?: string;
  text: string;
  readAloudVersion: string;
  /** Actual word count reported by A3 (optional, for QA). */
  wordCount?: number;
}

export interface ParentCard {
  title: string;
  introPl: string;
  questions: string[];
  activityPl: string;
}

export interface StoryDraft {
  title: string;
  /**
   * Dedication text. No longer produced by A3 — supplied by the parent via UI
   * during illustration rendering, so it may be empty on a fresh draft.
   */
  dedication: string;
  pages: StoryPage[];
  wordCount: number;
  // Trustee-parity fields
  coverBlurb?: string;
  parentCard?: ParentCard;
}

// ── A4: Psych Review ─────────────────────────────

export interface PsychCorrection {
  page: number;
  issue: string;
  suggestion: string;
  severity: 'low' | 'medium' | 'high';
  // Trustee-parity: enable find/replace instead of append
  originalPl?: string;
  correctedPl?: string;
}

export interface PsychCheckResult {
  status: string;
  issues?: string[];
  note?: string;
}

export interface PsychReviewChecks {
  safetyScan?: PsychCheckResult;
  therapeuticStructure?: PsychCheckResult & {
    beatChecks?: Array<{ beat: number; status: string; note: string }>;
  };
  metaphorCoherence?: PsychCheckResult;
  personalizationAccuracy?: PsychCheckResult & {
    visualAnchorCount?: number;
    nameDeclensionCorrect?: boolean;
  };
  languageAppropriateness?: PsychCheckResult;
  emotionalCalibration?: PsychCheckResult;
}

export interface PsychReview {
  status: 'PASS' | 'PASS_WITH_CORRECTIONS' | 'FAIL';
  overallAssessment: string;
  ageAppropriateness: number; // 1-5
  therapeuticAlignment: number; // 1-5
  emotionalSafety: number; // 1-5
  corrections: PsychCorrection[];
  // Trustee-parity fields
  checks?: PsychReviewChecks;
  confidence?: 'HIGH' | 'MEDIUM' | 'LOW';
}

// ── A5: Illustration Plan ────────────────────────

/**
 * One illustration spec. 2026-04-16 refactor fields are first — legacy aliases
 * retained for unmigrated orders & callers that still read the old shape.
 */
export interface IllustrationSpec {
  /** Stable id, e.g. "cover", "scene_1.1", "scene_4a.2". */
  id: string;
  /** Beat reference — "1" | "4a" | "4b" etc., or null for cover/mood_*. */
  beatRef: string | null;
  category: 'cover' | 'scene' | 'mood';
  aspectRatio: string; // "2:3" (cover) | "3:2" (scene/mood)
  composition: string;
  mood: string;
  illustrationPrompt: string;
  negativePrompt: string;
  visualAnchorVisible: boolean;
  charactersPresent: string[];
  // Derived/legacy fields (kept for back-compat with older artifacts & downstream code)
  width?: number;
  height?: number;
  /** Alias for `id` — legacy callers. */
  illustrationId?: string;
  /** Alias for `illustrationPrompt` — legacy callers. */
  prompt?: string;
  /** Legacy: short description, superseded by composition. */
  sceneDescription?: string;
  /** Legacy: free-form elements list. */
  keyElements?: string[];
}

export interface IllustrationPlan {
  styleGuide: string;
  characterConsistencyNotes: string;
  illustrations: IllustrationSpec[];
  /** 2026-04-16: top-level summary fields from A5 output. */
  totalIllustrations?: number;
  characterDescriptionEn?: string;
  guideDescriptionEn?: string;
  visualAnchor?: string;
}

// ── A6: Style Definition ─────────────────────────

export interface StyleDefinition {
  id: string;
  name_pl: string;
  name_en: string;
  style: string;
  modifiers: string;
}

// ── A8: Visual QA ────────────────────────────────

export interface VisualQaImageScores {
  character_consistency: number;
  scene_accuracy: number;
  technical_quality: number;
  child_friendliness: number;
}

export interface VisualQaImage {
  id: string;
  scores: VisualQaImageScores;
  weighted_score: number;
  visual_anchor_visible: boolean;
  issues: string[];
  action: 'KEEP' | 'REGENERATE';
}

export interface VisualQa {
  status: 'PASS' | 'REGENERATE';
  overall_consistency_score: number;
  images: VisualQaImage[];
  summary: { total_images: number; keep: number; regenerate: number };
  confidence: string;
}

// ── A10: Final QA (programmatic — no LLM) ───────

export interface FinalQaChecks {
  artifacts_present: boolean;
  name_in_story: boolean;
  dedication_present: boolean;
  pages_complete: boolean;
  illustrations_complete: boolean;
  parent_card_present: boolean;
}

export interface FinalQa {
  status: 'PASS' | 'BLOCK';
  checks: FinalQaChecks;
  issues: string[];
}

// ── Problem Catalog Types ────────────────────────

export interface ProblemDefinition {
  title_pl: string;
  context_pl: string;
  metaphor_pl: string;
  category: string;
}

export interface OutfitDefinition {
  pl: string;
  en: string;
}

// ── Artifact Parsing Utility ────────────────────

export function parseArtifact<T>(json: string | undefined | null, label: string): T {
  if (!json) throw new Error(`Missing artifact: ${label}`);
  try {
    return JSON.parse(json) as T;
  } catch (e) {
    throw new Error(`Corrupted artifact ${label}: ${e instanceof Error ? e.message : String(e)}`);
  }
}
