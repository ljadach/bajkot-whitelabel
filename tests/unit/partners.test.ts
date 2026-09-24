import { describe, expect, it } from 'vitest';
import {
  DEFAULT_PARTNER_ID,
  PARTNERS,
  RESERVED_PATH_SEGMENTS,
  bookProgressPath,
  bookResultPath,
  getPartner,
  isValidPartnerId,
  orderFormPath,
  resolvePartner,
  startPath,
  validatePartners,
} from '../../convex/lib/partners';
import { buildConsentsRecord } from '../../convex/lib/consents';
import { buildConsentsPayload } from '../../src/components/book/order-flow/types';
import { partnerFromPathname } from '../../src/lib/theme';

describe('partner registry', () => {
  it('is valid (unique slug ids, hex colours, default present)', () => {
    expect(validatePartners(PARTNERS)).toEqual([]);
  });

  it('rejects reserved and malformed ids', () => {
    for (const segment of RESERVED_PATH_SEGMENTS) expect(isValidPartnerId(segment)).toBe(false);
    expect(isValidPartnerId('Acme')).toBe(false);
    expect(isValidPartnerId('-acme')).toBe(false);
    expect(isValidPartnerId('acme-kids')).toBe(true);
  });

  it('flags duplicates and bad colours', () => {
    const base = PARTNERS[0]!;
    const errors = validatePartners([
      base,
      { ...base },
      { ...base, id: 'bad', colors: { primary: 'blue', accent: '#fff' } },
    ]);
    expect(errors).toContain(`${base.id}: duplicate id`);
    expect(errors).toContain('bad: colors.primary is not #rrggbb');
    expect(errors).toContain('bad: colors.accent is not #rrggbb');
  });

  it('falls back to the default theme for unknown or missing ids', () => {
    expect(resolvePartner(undefined).id).toBe(DEFAULT_PARTNER_ID);
    expect(resolvePartner('nope').id).toBe(DEFAULT_PARTNER_ID);
    expect(getPartner('nope')).toBeUndefined();
  });
});

describe('partner URLs', () => {
  it('has no prefix for the default theme', () => {
    expect(startPath(DEFAULT_PARTNER_ID)).toBe('/');
    expect(startPath(undefined)).toBe('/');
    expect(orderFormPath(undefined, 'lek-ciemnosci')).toBe('/zamow/lek-ciemnosci');
    expect(bookProgressPath(DEFAULT_PARTNER_ID, 'abc')).toBe('/bajka/abc');
    expect(bookResultPath(DEFAULT_PARTNER_ID, 'abc')).toBe('/bajka/abc/gotowa');
  });

  it('prefixes every path with a configured partner', () => {
    expect(startPath('przyklad')).toBe('/przyklad');
    expect(orderFormPath('przyklad', 'x')).toBe('/przyklad/zamow/x');
    expect(bookProgressPath('przyklad', 'abc')).toBe('/przyklad/bajka/abc');
    expect(bookResultPath('przyklad', 'abc')).toBe('/przyklad/bajka/abc/gotowa');
  });

  it('round-trips: the theme read from a built URL is the partner it was built for', () => {
    for (const partner of PARTNERS) {
      for (const path of [
        startPath(partner.id),
        orderFormPath(partner.id, 'x'),
        bookProgressPath(partner.id, 'o'),
        bookResultPath(partner.id, 'o'),
      ]) {
        expect(partnerFromPathname(path).id).toBe(partner.id);
      }
    }
  });
});

describe('consents per partner', () => {
  it('builds a payload the backend accepts for every partner', () => {
    for (const partner of PARTNERS) {
      const payload = buildConsentsPayload(partner, {
        termsAccepted: true,
        specialDataAccepted: true,
      });
      expect(() => buildConsentsRecord(payload)).not.toThrow();
      expect(payload.specialData.clauseText).toContain(partner.legalEntity ?? partner.name);
    }
  });

  it('never names the original operator', () => {
    for (const partner of PARTNERS) {
      const payload = buildConsentsPayload(partner, {
        termsAccepted: true,
        specialDataAccepted: true,
      });
      const text = `${payload.terms.clauseText} ${payload.specialData.clauseText}`;
      expect(text).not.toMatch(/trustee|bajkoterapia/i);
    }
  });
});
