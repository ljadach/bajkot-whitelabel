/**
 * Shared types for the prototype-fidelity order flow (auth + landing).
 * Mirrors the screens in docs/protos_v2/Bajkoterapia-Nowy-Flow.html.
 */

import type { Topic, CatalogCategory } from '../../../data/topics';
import {
  CONSENT_CLAUSE_SPECIAL_DATA,
  CONSENT_CLAUSE_TERMS,
  PRIVACY_VERSION,
  TERMS_VERSION,
} from '../../../data/legalDocs';

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

export type SelectedTopic = Topic;

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

export function resolveProblemId(topic: SelectedTopic): string {
  return topic.problemId ?? 'general_resilience';
}

/**
 * Single definition of "the child profile is complete" — used by the wizard's
 * submit gate and the landing draft-restore gate, so the two can't drift.
 */
export function isChildProfileComplete(
  intake: Pick<IntakeState, 'name' | 'age' | 'gender'>,
): boolean {
  return intake.name.trim().length >= 2 && intake.age !== null && intake.gender !== null;
}

/**
 * Shared mapping from intake state to the args expected by both the auth
 * (`startOrder`) and landing (`startLandingOrder`) Convex actions.
 *
 * Caller is responsible for adding flow-specific fields:
 *   - landing flow: accessToken (intake gate, separate from per-order token)
 */
export interface ConsentField {
  accepted: boolean;
  version: string;
  clauseText: string;
}

export interface ConsentsPayload {
  terms: ConsentField;
  specialData: ConsentField;
}

/** Use TERMS_VERSION for terms (covers Regulamin + Polityka — both linked from the clause). */
export function buildConsentsPayload(input: {
  termsAccepted: boolean;
  specialDataAccepted: boolean;
}): ConsentsPayload {
  return {
    terms: {
      accepted: input.termsAccepted,
      // Polityka Prywatności jest częścią klauzuli — łączymy oba numery wersji
      // w jedną etykietę, dzięki czemu audit widzi które dokumenty były akceptowane.
      version: `terms-${TERMS_VERSION}|privacy-${PRIVACY_VERSION}`,
      clauseText: CONSENT_CLAUSE_TERMS,
    },
    specialData: {
      accepted: input.specialDataAccepted,
      version: `privacy-${PRIVACY_VERSION}`,
      clauseText: CONSENT_CLAUSE_SPECIAL_DATA,
    },
  };
}

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
  /** Spec section 3.4 dropped skin tone from intake. Optional for legacy callers. */
  skinTone?: string;
  outfit: string;
  email: string;
  format: OrderFormat;
  shippingAddress?: import('./OrderCheckout').ShippingAddress;
  consents: ConsentsPayload;
}

/** Intake → Convex action args. Throws if required fields are missing. */
export function intakeToOrderArgs(
  intake: IntakeState,
  payload: {
    email: string;
    format: OrderFormat;
    shippingAddress?: IntakeOrderArgs['shippingAddress'];
    consents: ConsentsPayload;
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
    // Spec section 3.4 dropped skin tone — pipeline defaults to 'jasna' downstream.
    outfit: trimmedOutfit || 'Wygodne ubranie',
    email: payload.email,
    format: payload.format,
    shippingAddress: payload.shippingAddress,
    consents: payload.consents,
  };
}
