import type { Segment, IconName } from '../components/landing';

interface ValuePropConfig {
  icon: IconName;
  titleKey: string;
  descriptionKey: string;
}

export interface SubPageConfig {
  slug: string;
  icon: IconName;
  titleKey: string;
  descriptionKey: string;
}

interface SegmentConfig {
  segment: Segment;
  /** URL slug used in public routes (e.g., "ai-for-business") */
  slug: string;
  namespace: string;
  valueProps: ValuePropConfig[];
  subPages?: SubPageConfig[];
  meta: {
    titleKey: string;
    descriptionKey: string;
  };
}

/** Lookup segment by its URL slug. Returns undefined if not found. */
export function segmentBySlug(slug: string): Segment | undefined {
  return (Object.keys(SEGMENT_CONFIG) as Segment[]).find((key) => SEGMENT_CONFIG[key].slug === slug);
}

export const SEGMENT_CONFIG: Record<Segment, SegmentConfig> = {
  business: {
    segment: 'business',
    slug: 'ai-for-business',
    namespace: 'segment-business',
    valueProps: [
      {
        icon: 'chart',
        titleKey: 'value1.title',
        descriptionKey: 'value1.description',
      },
      {
        icon: 'document',
        titleKey: 'value2.title',
        descriptionKey: 'value2.description',
      },
      {
        icon: 'users',
        titleKey: 'value3.title',
        descriptionKey: 'value3.description',
      },
    ],
    meta: {
      titleKey: 'meta.title',
      descriptionKey: 'meta.description',
    },
  },
  edu: {
    segment: 'edu',
    slug: 'ai-for-education',
    namespace: 'segment-edu',
    valueProps: [
      {
        icon: 'lightbulb',
        titleKey: 'value1.title',
        descriptionKey: 'value1.description',
      },
      {
        icon: 'clock',
        titleKey: 'value2.title',
        descriptionKey: 'value2.description',
      },
      {
        icon: 'academic',
        titleKey: 'value3.title',
        descriptionKey: 'value3.description',
      },
    ],
    meta: {
      titleKey: 'meta.title',
      descriptionKey: 'meta.description',
    },
  },
  executive: {
    segment: 'executive',
    slug: 'ai-for-executives',
    namespace: 'segment-executive',
    valueProps: [
      {
        icon: 'briefcase',
        titleKey: 'value1.title',
        descriptionKey: 'value1.description',
      },
      {
        icon: 'shield',
        titleKey: 'value2.title',
        descriptionKey: 'value2.description',
      },
      {
        icon: 'chart',
        titleKey: 'value3.title',
        descriptionKey: 'value3.description',
      },
    ],
    meta: {
      titleKey: 'meta.title',
      descriptionKey: 'meta.description',
    },
  },
  individuals: {
    segment: 'individuals',
    slug: 'ai-for-individuals',
    namespace: 'segment-individuals',
    valueProps: [
      {
        icon: 'lightbulb',
        titleKey: 'value1.title',
        descriptionKey: 'value1.description',
      },
      {
        icon: 'chart',
        titleKey: 'value2.title',
        descriptionKey: 'value2.description',
      },
      {
        icon: 'clock',
        titleKey: 'value3.title',
        descriptionKey: 'value3.description',
      },
    ],
    subPages: [
      {
        slug: 'ai-for-individuals/ai-for-freelancers',
        icon: 'briefcase',
        titleKey: 'subpages.freelancers.title',
        descriptionKey: 'subpages.freelancers.description',
      },
      {
        slug: 'ai-for-individuals/ai-for-career-changers',
        icon: 'academic',
        titleKey: 'subpages.career.title',
        descriptionKey: 'subpages.career.description',
      },
      {
        slug: 'ai-for-individuals/ai-for-creators',
        icon: 'lightbulb',
        titleKey: 'subpages.creators.title',
        descriptionKey: 'subpages.creators.description',
      },
      {
        slug: 'ai-for-individuals/ai-for-personal-productivity',
        icon: 'clock',
        titleKey: 'subpages.productivity.title',
        descriptionKey: 'subpages.productivity.description',
      },
    ],
    meta: {
      titleKey: 'meta.title',
      descriptionKey: 'meta.description',
    },
  },
  freelancers: {
    segment: 'freelancers',
    slug: 'ai-for-individuals/ai-for-freelancers',
    namespace: 'segment-freelancers',
    valueProps: [
      {
        icon: 'clock',
        titleKey: 'value1.title',
        descriptionKey: 'value1.description',
      },
      {
        icon: 'document',
        titleKey: 'value2.title',
        descriptionKey: 'value2.description',
      },
      {
        icon: 'chart',
        titleKey: 'value3.title',
        descriptionKey: 'value3.description',
      },
    ],
    meta: {
      titleKey: 'meta.title',
      descriptionKey: 'meta.description',
    },
  },
  'career-changers': {
    segment: 'career-changers',
    slug: 'ai-for-individuals/ai-for-career-changers',
    namespace: 'segment-career-changers',
    valueProps: [
      {
        icon: 'chart',
        titleKey: 'value1.title',
        descriptionKey: 'value1.description',
      },
      {
        icon: 'academic',
        titleKey: 'value2.title',
        descriptionKey: 'value2.description',
      },
      {
        icon: 'shield',
        titleKey: 'value3.title',
        descriptionKey: 'value3.description',
      },
    ],
    meta: {
      titleKey: 'meta.title',
      descriptionKey: 'meta.description',
    },
  },
  creators: {
    segment: 'creators',
    slug: 'ai-for-individuals/ai-for-creators',
    namespace: 'segment-creators',
    valueProps: [
      {
        icon: 'lightbulb',
        titleKey: 'value1.title',
        descriptionKey: 'value1.description',
      },
      {
        icon: 'users',
        titleKey: 'value2.title',
        descriptionKey: 'value2.description',
      },
      {
        icon: 'document',
        titleKey: 'value3.title',
        descriptionKey: 'value3.description',
      },
    ],
    meta: {
      titleKey: 'meta.title',
      descriptionKey: 'meta.description',
    },
  },
  'personal-productivity': {
    segment: 'personal-productivity',
    slug: 'ai-for-individuals/ai-for-personal-productivity',
    namespace: 'segment-personal-productivity',
    valueProps: [
      {
        icon: 'chart',
        titleKey: 'value1.title',
        descriptionKey: 'value1.description',
      },
      {
        icon: 'clock',
        titleKey: 'value2.title',
        descriptionKey: 'value2.description',
      },
      {
        icon: 'lightbulb',
        titleKey: 'value3.title',
        descriptionKey: 'value3.description',
      },
    ],
    meta: {
      titleKey: 'meta.title',
      descriptionKey: 'meta.description',
    },
  },
};
