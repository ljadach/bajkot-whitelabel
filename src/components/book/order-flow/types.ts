/**
 * Shared types for the prototype-fidelity order flow (auth + landing).
 * Mirrors the screens in docs/protos_v2/Bajkoterapia-Nowy-Flow.html.
 */

import type { Topic, CatalogCategory } from '../../../data/topics';

export type OrderFormat = 'pdf' | 'pdf_print';

export type Gender = 'boy' | 'girl';

/** Simplified appearance fields per prototype: 4×4×3 selects + glasses. */
export interface AppearanceData {
  /** 'Niebieskie' | 'Zielone' | 'Brązowe' | 'Szare' */
  eyeColor: string;
  /** 'Blond' | 'Brązowe' | 'Czarne' | 'Rude' */
  hairColor: string;
  /** 'Krótkie' | 'Średnie' | 'Długie' — mapped to schema's hairStyle. */
  hairLength: string;
  glasses: boolean;
  /** Free-text outfit description, replaces the preset dropdown. */
  outfitText: string;
}

/** "Inny problem" sentinel — for the dashed catalog card. */
export interface OtherTopic {
  isOther: true;
  emoji: string;
  shortTitle: string;
  shortDesc: string;
}

export type SelectedTopic = Topic | OtherTopic;

export function isOtherTopic(topic: SelectedTopic): topic is OtherTopic {
  return 'isOther' in topic && topic.isOther === true;
}

/** Aggregate intake state shared between flow steps. */
export interface IntakeState {
  /** Selected topic from catalog, or topic preselected by landing flow. */
  topic: SelectedTopic | null;
  /** Free-text problem description ("Opis sytuacji"). */
  situation: string;
  /** Child name. */
  name: string;
  /** Concrete age in years (2-12 in the prototype). */
  age: number | null;
  gender: Gender | null;
  appearance: AppearanceData;
  favoriteToy: string;
  format: OrderFormat;
}

export const INITIAL_APPEARANCE: AppearanceData = {
  eyeColor: 'Niebieskie',
  hairColor: 'Blond',
  hairLength: 'Krótkie',
  glasses: false,
  outfitText: '',
};

export const INITIAL_INTAKE: IntakeState = {
  topic: null,
  situation: '',
  name: '',
  age: null,
  gender: null,
  appearance: { ...INITIAL_APPEARANCE },
  favoriteToy: '',
  format: 'pdf',
};

/** Polish singular/plural for ages 1..12. */
export function ageLabel(age: number): string {
  if (age === 1) return `${age} rok`;
  if (age >= 2 && age <= 4) return `${age} lata`;
  return `${age} lat`;
}

/** Tab id for the catalog filter ('all' for everything). */
export type CatalogTab = CatalogCategory | 'all';

/** Resolve a problem id for the pipeline.
 *
 * Topic.problemId may be null (defensive) — fall back to 'general_resilience'.
 * "Inny problem" → 'other' (the pipeline accepts arbitrary strings, and the
 * free-text situation gives the LLM enough to work with).
 */
export function resolveProblemId(topic: SelectedTopic): string {
  if (isOtherTopic(topic)) return 'other';
  return topic.problemId ?? 'general_resilience';
}

/**
 * Shared mapping from intake state to the args expected by both the auth
 * (`startOrder`) and landing (`startLandingOrder`) Convex actions.
 *
 * Caller is responsible for adding flow-specific fields:
 *   - auth flow:    skipStripe / skipQaReviews
 *   - landing flow: accessToken
 */
export interface IntakeOrderArgs {
  childName: string;
  ageNumber: number;
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
  email: string;
  format: OrderFormat;
  shippingAddress?: import('./OrderCheckout').ShippingAddress;
}

/** Intake → Convex action args. Throws if required fields are missing. */
export function intakeToOrderArgs(
  intake: IntakeState,
  payload: {
    email: string;
    format: OrderFormat;
    shippingAddress?: IntakeOrderArgs['shippingAddress'];
  },
): IntakeOrderArgs {
  if (!intake.topic || intake.age === null || !intake.gender) {
    throw new Error('Incomplete intake');
  }
  const trimmedOutfit = intake.appearance.outfitText.trim();
  return {
    childName: intake.name.trim(),
    ageNumber: intake.age,
    gender: intake.gender,
    problemId: resolveProblemId(intake.topic),
    problemDetail: intake.situation.trim() || undefined,
    favoriteToy: intake.favoriteToy.trim() || undefined,
    glasses: intake.appearance.glasses,
    hairColor: intake.appearance.hairColor,
    // Hair length (Krótkie/Średnie/Długie) maps to hairStyle slot — pipeline
    // treats it as free-text descriptor, so the literal Polish word is fine.
    hairStyle: intake.appearance.hairLength,
    eyeColor: intake.appearance.eyeColor,
    // Skin tone defaults to 'jasna' — prototype dropped the explicit field.
    skinTone: 'jasna',
    outfit: trimmedOutfit || 'Wygodne ubranie',
    email: payload.email,
    format: payload.format,
    shippingAddress: payload.shippingAddress,
  };
}
