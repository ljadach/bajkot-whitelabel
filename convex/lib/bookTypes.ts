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
  | 'failed';

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
}

// ── A2: Story Blueprint ──────────────────────────

export interface StoryBeat {
  beatNumber: number;
  title: string;
  summary: string;
  emotionalArc: string;
  therapeuticGoal: string;
  settingDescription: string;
}

export interface StoryBlueprint {
  title: string;
  subtitle: string;
  theme: string;
  therapeuticApproach: string;
  beats: StoryBeat[];
}

// ── A3: Story Draft ──────────────────────────────

export interface StoryPage {
  beatNumber: number;
  text: string;
  readAloudVersion: string;
}

export interface StoryDraft {
  title: string;
  dedication: string;
  pages: StoryPage[];
  wordCount: number;
}

// ── A4: Psych Review ─────────────────────────────

export interface PsychCorrection {
  page: number;
  issue: string;
  suggestion: string;
  severity: 'low' | 'medium' | 'high';
}

export interface PsychReview {
  status: 'PASS' | 'PASS_WITH_CORRECTIONS' | 'FAIL';
  overallAssessment: string;
  ageAppropriateness: number; // 1-5
  therapeuticAlignment: number; // 1-5
  emotionalSafety: number; // 1-5
  corrections: PsychCorrection[];
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

export interface VisualQaIssue {
  illustrationId: string;
  issue: string;
  severity: 'minor' | 'major' | 'critical';
}

export interface VisualQa {
  status: 'PASS' | 'NEEDS_REVISION';
  overallQuality: number; // 1-5
  consistencyScore: number; // 1-5
  issues: VisualQaIssue[];
}

// ── A10: Final QA ────────────────────────────────

export interface FinalQa {
  status: 'APPROVED' | 'NEEDS_REVISION';
  storyQuality: number; // 1-5
  illustrationQuality: number; // 1-5
  therapeuticValue: number; // 1-5
  overallScore: number; // 1-5
  notes: string;
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
