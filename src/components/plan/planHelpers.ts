import { type OutlinePage } from './OutlineCard';

export function parseJsonArray(value?: string | null): OutlinePage[] | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- plan shape is dynamic JSON
export function parseFullPlan(value?: string | null): any[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- plan shape is dynamic JSON
export function buildDiagnostics(fullPlan: any[]): Map<number, string> {
  const map = new Map<number, string>();
  fullPlan.forEach((page, index) => {
    const num = typeof page?.page === 'number' ? page.page : index + 1;
    const pieces: string[] = [];
    if (typeof page?.heading === 'string') {
      pieces.push(`Heading: ${page.heading}`);
    }
    if (typeof page?.goal === 'string') {
      pieces.push(`Goal: ${page.goal}`);
    }
    const blocks = Array.isArray(page?.blocks) ? page.blocks : [];
    const highlights = blocks
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- dynamic JSON block
      .map((block: any) => {
        if (typeof block?.name === 'string') return block.name;
        if (typeof block?.type === 'string') return block.type;
        return null;
      })
      .filter(Boolean)
      .slice(0, 3);
    if (highlights.length) {
      pieces.push(`Focus: ${highlights.join(', ')}`);
    }
    const summary = pieces.slice(0, 2).join(' • ');
    if (summary) {
      map.set(num, summary);
    }
  });
  return map;
}
