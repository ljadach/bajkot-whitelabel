/**
 * TypeScript interfaces for the book pipeline.
 * These provide application-level type safety for JSON-stringified artifacts
 * stored on bookOrders.
 */

// ── Order Form Data ──────────────────────────────

export type AgeBracket = '3-5' | '6-8' | '9+';
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
}

// ── A3: Story Draft ──────────────────────────────

export interface StoryPage {
  beatNumber: number;
  text: string;
  readAloudVersion: string;
}

export interface ParentCard {
  title: string;
  introPl: string;
  questions: string[];
  activityPl: string;
}

export interface StoryDraft {
  title: string;
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

export interface IllustrationSpec {
  illustrationId: string; // "cover", "scene_1" .. "scene_6"
  beatRef: number;
  sceneDescription: string;
  prompt: string;
  mood: string;
  keyElements: string[];
  width: number;
  height: number;
}

export interface IllustrationPlan {
  styleGuide: string;
  characterConsistencyNotes: string;
  illustrations: IllustrationSpec[];
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
