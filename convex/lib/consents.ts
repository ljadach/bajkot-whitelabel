/**
 * GDPR consent accountability. Every order persists which clauses the user
 * accepted, the exact wording, the document version, and a server-side
 * timestamp. This is what we'd show a UODO auditor years from now.
 *
 * Two consents are required at intake:
 *   - terms          → Regulamin + Polityka Prywatności (art. 6 ust. 1 lit. b)
 *   - specialData    → child's emotional problem (art. 9 ust. 2 lit. a RODO)
 *
 * The client sends the booleans + version + clause text it actually displayed.
 * The server adds a trusted timestamp and refuses orders where either flag is
 * false (intake form blocks submit, but defense-in-depth at the action level).
 */

import { ConvexError, v } from 'convex/values';

/** Public-action input validator. Both consents are required. */
export const consentsArgsValidator = v.object({
  terms: v.object({
    accepted: v.boolean(),
    version: v.string(),
    clauseText: v.string(),
  }),
  specialData: v.object({
    accepted: v.boolean(),
    version: v.string(),
    clauseText: v.string(),
  }),
});

/** Persisted shape — same as args plus server timestamp per record. */
export const consentRecordStoreValidator = v.object({
  terms: v.object({
    accepted: v.boolean(),
    version: v.string(),
    clauseText: v.string(),
    timestampMs: v.number(),
  }),
  specialData: v.object({
    accepted: v.boolean(),
    version: v.string(),
    clauseText: v.string(),
    timestampMs: v.number(),
  }),
});

export type ConsentsArgs = {
  terms: { accepted: boolean; version: string; clauseText: string };
  specialData: { accepted: boolean; version: string; clauseText: string };
};

export type ConsentsRecord = {
  terms: { accepted: boolean; version: string; clauseText: string; timestampMs: number };
  specialData: { accepted: boolean; version: string; clauseText: string; timestampMs: number };
};

const VERSION_RE = /^[A-Za-z0-9._-]{1,32}$/;
const CLAUSE_MIN = 20;
const CLAUSE_MAX = 1000;

function validateConsentField(
  label: 'Regulamin' | 'Zgoda na dane szczególne',
  field: { accepted: boolean; version: string; clauseText: string },
) {
  if (!field.accepted) {
    throw new ConvexError(`${label}: zgoda jest wymagana do złożenia zamówienia.`);
  }
  if (!VERSION_RE.test(field.version)) {
    throw new ConvexError(`${label}: nieprawidłowa wersja dokumentu.`);
  }
  const len = field.clauseText.trim().length;
  if (len < CLAUSE_MIN || len > CLAUSE_MAX) {
    throw new ConvexError(`${label}: treść klauzuli ma niepoprawną długość.`);
  }
}

/**
 * Validate and stamp consents server-side. Throws ConvexError with a
 * user-readable Polish message if either consent is missing or malformed.
 */
export function buildConsentsRecord(args: ConsentsArgs): ConsentsRecord {
  validateConsentField('Regulamin', args.terms);
  validateConsentField('Zgoda na dane szczególne', args.specialData);
  const now = Date.now();
  return {
    terms: { ...args.terms, timestampMs: now },
    specialData: { ...args.specialData, timestampMs: now },
  };
}
