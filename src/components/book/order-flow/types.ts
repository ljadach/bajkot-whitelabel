/**
 * Shared types and helpers for the order flow (topic → form → checkout).
 */

import type { Topic } from '../../../../convex/lib/topics';
import type { PartnerTheme } from '../../../../convex/lib/partners';
import { CONSENT_VERSION, clauseText, consentClauses } from '../../../lib/consents';

export type OrderFormat = 'pdf' | 'pdf_print';

export type Gender = 'boy' | 'girl';

/** Appearance fields: 4×4×3 selects + glasses + free-text outfit. */
export interface AppearanceData {
  /** 'Niebieskie' | 'Zielone' | 'Brązowe' | 'Szare' */
  eyeColor: string;
  /** 'Blond' | 'Brązowe' | 'Czarne' | 'Rude' */
  hairColor: string;
  /** 'Krótkie' | 'Średnie' | 'Długie' — mapped to the schema's hairStyle. */
  hairLength: string;
  glasses: boolean;
  /** Free-text outfit description. */
  outfitText: string;
}

/** Aggregate intake state shared between flow steps. */
export interface IntakeState {
  /** Topic from the URL (/zamow/<slug>). */
  topic: Topic | null;
  /** Free-text problem description ("Opis sytuacji"). */
  situation: string;
  /** Child name. */
  name: string;
  /** Concrete age in years (2-12). */
  age: number | null;
  gender: Gender | null;
  appearance: AppearanceData;
  favoriteToy: string;
  format: OrderFormat;
}

const INITIAL_APPEARANCE: AppearanceData = {
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

export interface ShippingAddress {
  fullName: string;
  phone: string;
  street: string;
  zip: string;
  city: string;
}

const INITIAL_ADDRESS: ShippingAddress = {
  fullName: '',
  phone: '',
  street: '',
  zip: '',
  city: '',
};

/**
 * Email + consents + address from the checkout screen. Owned by the parent
 * flow (like `IntakeState`) rather than by `OrderCheckout` itself, so that
 * navigating back to an earlier step - which unmounts the checkout - and
 * forward again does not wipe what the parent already typed in. Only the
 * checkout's own field-validation errors reset on remount.
 */
export interface CheckoutFormState {
  email: string;
  termsAccepted: boolean;
  specialDataAccepted: boolean;
  address: ShippingAddress;
}

export const INITIAL_CHECKOUT_STATE: CheckoutFormState = {
  email: '',
  termsAccepted: false,
  specialDataAccepted: false,
  address: { ...INITIAL_ADDRESS },
};

/** Polish singular/plural for ages 1..12. */
export function ageLabel(age: number): string {
  if (age === 1) return `${age} rok`;
  if (age >= 2 && age <= 4) return `${age} lata`;
  return `${age} lat`;
}

/**
 * Single definition of "the child profile is complete" — used by the form's
 * submit gate and the draft-restore gate, so the two can't drift.
 */
export function isChildProfileComplete(
  intake: Pick<IntakeState, 'name' | 'age' | 'gender'>,
): boolean {
  return intake.name.trim().length >= 2 && intake.age !== null && intake.gender !== null;
}

export interface ConsentField {
  accepted: boolean;
  version: string;
  clauseText: string;
}

export interface ConsentsPayload {
  terms: ConsentField;
  specialData: ConsentField;
}

/**
 * Consent payload for `startLandingOrder`: the exact clause text the parent
 * saw (partner-specific) plus a version tag naming the wording and partner.
 */
export function buildConsentsPayload(
  partner: PartnerTheme,
  input: { termsAccepted: boolean; specialDataAccepted: boolean },
): ConsentsPayload {
  const clauses = consentClauses(partner);
  const version = `wl-${CONSENT_VERSION}|partner-${partner.id}`;
  return {
    terms: {
      accepted: input.termsAccepted,
      version,
      clauseText: clauseText(clauses.terms),
    },
    specialData: {
      accepted: input.specialDataAccepted,
      version,
      clauseText: clauseText(clauses.specialData),
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
  outfit: string;
  email: string;
  format: OrderFormat;
  shippingAddress?: ShippingAddress;
  consents: ConsentsPayload;
}

/** Intake → `startLandingOrder` args. Throws if required fields are missing. */
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
    problemId: intake.topic.problemId,
    problemDetail: intake.situation.trim() || undefined,
    favoriteToy: intake.favoriteToy.trim() || undefined,
    glasses: intake.appearance.glasses,
    hairColor: intake.appearance.hairColor,
    // Hair length (Krótkie/Średnie/Długie) maps to hairStyle slot — pipeline
    // treats it as free-text descriptor, so the literal Polish word is fine.
    hairStyle: intake.appearance.hairLength,
    eyeColor: intake.appearance.eyeColor,
    // Skin tone isn't asked — pipeline defaults to 'jasna' downstream.
    outfit: trimmedOutfit || 'Wygodne ubranie',
    email: payload.email,
    format: payload.format,
    shippingAddress: payload.shippingAddress,
    consents: payload.consents,
  };
}
