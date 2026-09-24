import { createContext, useCallback, useContext } from 'react';
import {
  DEFAULT_PARTNER_ID,
  bookProgressPath,
  bookResultPath,
  orderFormPath,
  resolvePartner,
  startPath,
  type PartnerTheme,
} from '../../convex/lib/partners';

/** Provided by the root layout from the current URL (see src/lib/theme.ts). */
export const PartnerContext = createContext<PartnerTheme>(resolvePartner(DEFAULT_PARTNER_ID));

export function usePartner(): PartnerTheme {
  return useContext(PartnerContext);
}

/**
 * URL builders bound to the current partner, so every link stays inside the
 * partner's theme (the id is the first path segment).
 */
export function usePartnerPaths() {
  const { id } = usePartner();
  return {
    start: startPath(id),
    orderForm: useCallback((slug: string) => orderFormPath(id, slug), [id]),
    bookProgress: useCallback((orderId: string) => bookProgressPath(id, orderId), [id]),
    bookResult: useCallback((orderId: string) => bookResultPath(id, orderId), [id]),
  };
}
