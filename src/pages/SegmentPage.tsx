import { useState, useEffect, lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router';
import posthog from 'posthog-js';

import { SegmentProvider, LandingHero, LandingValueProps, LandingFaq, LandingCta, LandingTestimonial, LandingPitch, LandingSubPages, type Segment } from '../components/landing';
import { PageShell } from '../components/layout/PageShell';

const SignInModal = lazy(() => import('../components/SignInModal').then((m) => ({ default: m.SignInModal })));
const LeadCaptureModal = lazy(() => import('../components/LeadCaptureModal').then((m) => ({ default: m.LeadCaptureModal })));
import { JsonLd } from '../components/JsonLd';
import { useLangFromUrl } from '../hooks/useLangFromUrl';
import { SEGMENT_CONFIG } from './segmentConfig';
import { getPageFaqItems, type FaqItemData } from '../lib/faqHelpers';

interface SegmentPageProps {
  segment: Segment;
}

/**
 * Outer wrapper that forces re-mount when navigating between segments.
 * The key prop ensures useTranslation gets the correct namespace.
 */
export function SegmentPage({ segment }: SegmentPageProps) {
  const location = useLocation();

  return <SegmentPageContent key={location.pathname} segment={segment} />;
}

/**
 * Inner component that handles all the segment-specific content.
 * This component re-mounts when the key changes, ensuring fresh translations.
 */
const INDIVIDUALS_FAMILY: Segment[] = ['individuals', 'freelancers', 'career-changers', 'creators', 'personal-productivity'];

function SegmentPageContent({ segment }: SegmentPageProps) {
  const config = SEGMENT_CONFIG[segment];
  const { t } = useTranslation(config.namespace);
  const { t: tFaq } = useTranslation('faq');
  const { t: tCommon } = useTranslation('segment-common');
  const navigate = useNavigate();
  const lang = useLangFromUrl();
  const isIndividualsFamily = INDIVIDUALS_FAMILY.includes(segment);

  const [showSignIn, setShowSignIn] = useState(false);
  const [showLeadModal, setShowLeadModal] = useState(false);

  // PostHog page view tracking
  useEffect(() => {
    posthog.capture('segment_page_view', { segment });
  }, [segment]);

  // Track CTA clicks
  const handleTrialClick = () => {
    posthog.capture('segment_cta_click', { segment, cta_type: 'trial' });
    setShowSignIn(true);
  };

  const handlePilotClick = () => {
    posthog.capture('segment_cta_click', { segment, cta_type: 'pilot' });
    posthog.capture('lead_form_open', { segment });
    setShowLeadModal(true);
  };

  const handlePricingClick = () => {
    posthog.capture('segment_cta_click', { segment, cta_type: 'pricing' });
    void navigate(`/${lang}/pricing`);
  };

  // Build value props from config
  const valueProps = config.valueProps.map((vp) => ({
    icon: vp.icon,
    title: t(vp.titleKey),
    description: t(vp.descriptionKey),
  }));

  // Build FAQ items from faq.json
  const allFaqItems = tFaq('items', { returnObjects: true }) as Record<string, FaqItemData>;
  const segmentFaqItems = getPageFaqItems(allFaqItems, segment).map((item, i) => ({
    ...item,
    id: `segment-${i}`,
  }));

  return (
    <SegmentProvider value={segment}>
      <PageShell dataAttributes={{ segment }}>
        <JsonLd
          data={{
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'AITutoro', item: `https://aitutoro.com/${lang}/` },
              { '@type': 'ListItem', position: 2, name: t(config.meta.titleKey), item: `https://aitutoro.com/${lang}/${config.slug}` },
            ],
          }}
        />
        <JsonLd
          data={{
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: segmentFaqItems.map((item) => ({
              '@type': 'Question',
              name: item.question,
              acceptedAnswer: { '@type': 'Answer', text: item.answer },
            })),
          }}
        />

        <LandingHero
          headline={t('hero.headline')}
          subheadline={t('hero.subheadline')}
          primaryCta={{
            label: t('cta.trial'),
            onClick: handleTrialClick,
          }}
          {...(!isIndividualsFamily && {
            secondaryCta: { label: t('cta.pilot'), onClick: handlePilotClick },
          })}
          {...(isIndividualsFamily && { buttonClass: 'btn-cta' })}
        />

        {config.subPages && (
          <LandingSubPages
            title={t('subpages.title')}
            items={config.subPages.map((sp) => ({
              slug: sp.slug,
              icon: sp.icon,
              title: t(sp.titleKey),
              description: t(sp.descriptionKey),
            }))}
          />
        )}

        <LandingValueProps items={valueProps} />

        <LandingPitch headline={t('pitch2.headline')} body={t('pitch2.body')} variant="muted" />

        <LandingTestimonial quote={t('testimonial.quote')} author={t('testimonial.author')} />

        <LandingPitch headline={t('pitch.headline')} body={t('pitch.body')} />

        <LandingFaq faqItems={segmentFaqItems} title={tFaq('sectionTitle')} />

        <LandingCta
          headline={t('cta.headline')}
          description={t('cta.description')}
          {...(isIndividualsFamily && { buttonClass: 'btn-cta' })}
          primaryCta={{
            label: t('cta.trial'),
            onClick: handleTrialClick,
          }}
          secondaryCta={isIndividualsFamily ? { label: tCommon('nav.pricing'), onClick: handlePricingClick } : { label: t('cta.pilot'), onClick: handlePilotClick }}
        />

        {/* Sign In Modal */}
        {showSignIn && (
          <Suspense fallback={null}>
            <SignInModal onClose={() => setShowSignIn(false)} />
          </Suspense>
        )}

        {/* Lead Capture Modal */}
        {showLeadModal && (
          <Suspense fallback={null}>
            <LeadCaptureModal segment={segment} onClose={() => setShowLeadModal(false)} />
          </Suspense>
        )}
      </PageShell>
    </SegmentProvider>
  );
}
