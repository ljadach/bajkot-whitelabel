export interface FaqItemData {
  question: string;
  answer: string;
  category: string;
  faqVisible: boolean;
  pages: string[];
}

export interface FaqCategoryGroup {
  category: string;
  label: string;
  items: { id: string; question: string; answer: string }[];
}

/**
 * Build FAQ category groups for the /faq page.
 * Only includes items where faqVisible is true, ordered by categoryOrder.
 */
export function buildFaqPageGroups(
  items: Record<string, FaqItemData>,
  categoryLabels: Record<string, string>,
  categoryOrder: string[],
): FaqCategoryGroup[] {
  return categoryOrder
    .map((catId) => ({
      category: catId,
      label: categoryLabels[catId] ?? catId,
      items: Object.entries(items)
        .filter(([, item]) => item.category === catId && item.faqVisible)
        .map(([id, item]) => ({
          id: `${catId}-${id}`,
          question: item.question,
          answer: item.answer,
        })),
    }))
    .filter((group) => group.items.length > 0);
}

/**
 * Get FAQ items for a specific page (product page, comparison page, etc.).
 * Returns items whose `pages` array includes the given pageKey.
 */
export function getPageFaqItems(
  items: Record<string, FaqItemData>,
  pageKey: string,
): { id: string; question: string; answer: string }[] {
  return Object.entries(items)
    .filter(([, item]) => item.pages.includes(pageKey))
    .map(([id, item]) => ({
      id,
      question: item.question,
      answer: item.answer,
    }));
}
