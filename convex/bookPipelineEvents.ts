/**
 * Pipeline narrative events — human-readable timeline of order progress.
 *
 * recordEvent: internalMutation (called by agents). Read the timeline with
 * `npm run cli -- events <orderId>`.
 */

import { internalMutation } from './_generated/server';
import { v } from 'convex/values';

// ── Narrative map ────────────────────────────────────────────

type EventType = 'start' | 'complete' | 'error' | 'retry' | 'info';

const NARRATIVE_MAP: Record<string, Record<string, string>> = {
  A0: {
    start: 'Sprawdzam dane zamówienia...',
    complete: 'Zamówienie zwalidowane ✓',
  },
  A1: {
    start: 'Tworzę profil postaci — wygląd, osobowość, magiczny przewodnik...',
    complete: 'Profil postaci gotowy!',
  },
  A2: {
    start: 'Projektuję strukturę bajki — 6 aktów, łuk terapeutyczny...',
    complete: 'Struktura bajki zaprojektowana',
  },
  A3: {
    start: 'Piszę bajkę po polsku...',
    complete: 'Bajka napisana!',
  },
  A4: {
    start: 'Recenzja psychologiczna — sprawdzam bezpieczeństwo i jakość terapeutyczną...',
    complete: 'Recenzja pozytywna ✓',
    retry: 'Poprawiam bajkę według uwag recenzenta...',
  },
  A5: {
    start: 'Planuję ilustracje — 7 scen, spójność wizualna...',
    complete: 'Plan ilustracji gotowy',
  },
  A6: {
    start: 'Generuję propozycje stylów ilustracji...',
    complete: 'Dwa style gotowe — czekam na wybór',
  },
  A6b: {
    start: 'Czekam na wybór stylu...',
    complete: 'Styl wybrany!',
  },
  A7: {
    start: 'Maluję ilustracje...',
    complete: '7 ilustracji gotowych!',
  },
  A8: {
    start: 'Sprawdzam jakość ilustracji...',
    complete: 'Ilustracje zaakceptowane ✓',
    retry: 'Niektóre ilustracje wymagają poprawy — regeneruję...',
  },
  A9: {
    start: 'Składam książkę — 16 stron PDF...',
    complete: 'Książka złożona!',
  },
  A10: {
    start: 'Ostateczna kontrola jakości...',
    complete: 'Kontrola zakończona — książka gotowa!',
  },
  A11: {
    start: 'Przygotowuję dostawę...',
    complete: 'Twoja bajka jest gotowa! 🎉',
  },
};

/**
 * Get a human-readable narrative string for a (agent, event) pair.
 * Falls back to a generic message when no specific narrative exists.
 */
export function getNarrative(agent: string, event: EventType, details?: string): string {
  // Error events are generic with details
  if (event === 'error') {
    return details ? `Wystąpił błąd: ${details}` : 'Wystąpił nieoczekiwany błąd';
  }

  const agentMap = NARRATIVE_MAP[agent];
  if (agentMap && agentMap[event]) {
    return agentMap[event];
  }

  // Fallback
  return `${agent}: ${event}`;
}

// ── recordEvent (internalMutation) ───────────────────────────

export const recordEvent = internalMutation({
  args: {
    orderId: v.id('bookOrders'),
    agent: v.string(),
    event: v.union(
      v.literal('start'),
      v.literal('complete'),
      v.literal('error'),
      v.literal('retry'),
      v.literal('info'),
    ),
    narrative: v.string(),
    details: v.optional(v.string()),
    traceId: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.insert('bookPipelineEvents', {
      orderId: args.orderId,
      agent: args.agent,
      event: args.event,
      narrative: args.narrative,
      details: args.details,
      traceId: args.traceId,
      timestamp: Date.now(),
    });
    return null;
  },
});
