import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { JsonLd } from '../components/JsonLd';
import { PageShell } from '../components/layout/PageShell';
import { getPageFaqItems, type FaqItemData } from '../lib/faqHelpers';
import { useLangFromUrl } from '../hooks/useLangFromUrl';
import { usePublicNavigation } from '../hooks/usePublicNavigation';

/* ─── Tier data model ─── */

interface PricingTier {
  id: 'individual' | 'business' | 'enterprise';
  monthlyPrice: number;
  highlighted?: boolean;
}

const PRICING_TIERS: PricingTier[] = [
  { id: 'individual', monthlyPrice: 9 },
  { id: 'business', monthlyPrice: 19, highlighted: true },
  { id: 'enterprise', monthlyPrice: 29 },
];

function annualTotal(monthly: number) {
  return Math.ceil(monthly * 12 * 0.8);
}

function annualPerMonth(monthly: number) {
  return (annualTotal(monthly) / 12).toFixed(0);
}

/* ─── Inline SVG icons ─── */

function UserIcon({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function UsersIcon({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 00-3-3.87" />
      <path d="M16 3.13a4 4 0 010 7.75" />
    </svg>
  );
}

function Building2Icon({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 22V4a2 2 0 012-2h8a2 2 0 012 2v18z" />
      <path d="M6 12H4a2 2 0 00-2 2v6a2 2 0 002 2h2" />
      <path d="M18 9h2a2 2 0 012 2v9a2 2 0 01-2 2h-2" />
      <path d="M10 6h4" />
      <path d="M10 10h4" />
      <path d="M10 14h4" />
      <path d="M10 18h4" />
    </svg>
  );
}

function CheckIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function SparklesIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l1.912 5.813a2 2 0 001.275 1.275L21 12l-5.813 1.912a2 2 0 00-1.275 1.275L12 21l-1.912-5.813a2 2 0 00-1.275-1.275L3 12l5.813-1.912a2 2 0 001.275-1.275L12 3z" />
    </svg>
  );
}

function ChevronDownIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function HardDriveIcon({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="12" x2="2" y2="12" />
      <path d="M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z" />
      <line x1="6" y1="16" x2="6.01" y2="16" />
      <line x1="10" y1="16" x2="10.01" y2="16" />
    </svg>
  );
}

function XIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

const TIER_ICONS: Record<PricingTier['id'], (props: { className?: string }) => JSX.Element> = {
  individual: UserIcon,
  business: UsersIcon,
  enterprise: Building2Icon,
};

/* ─── PricingBanner ─── */

function PricingBanner({ onSignUp }: { onSignUp: () => void }) {
  const { t } = useTranslation('pricing');
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className="bg-ink text-white px-4 py-3 relative">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-center gap-2 text-sm font-medium text-center sm:text-left">
        <div className="flex items-center gap-2">
          <SparklesIcon className="w-4 h-4 text-accent" />
          <span>
            {t('banner.prefix')} <span className="text-accent">{t('banner.highlight')}</span> {t('banner.noCc')}
          </span>
        </div>
        <button onClick={onSignUp} className="underline decoration-accent underline-offset-4 hover:text-neutral-300 font-semibold">
          {t('banner.cta')}
        </button>
      </div>
      <button onClick={() => setDismissed(true)} className="absolute right-2 top-1/2 -translate-y-1/2 p-2 hover:bg-neutral-800 rounded-full" aria-label="Dismiss banner">
        <XIcon className="w-4 h-4 text-neutral-400" />
      </button>
    </div>
  );
}

/* ─── BillingToggle ─── */

function BillingToggle({ annual, onToggle }: { annual: boolean; onToggle: () => void }) {
  const { t } = useTranslation('pricing');

  return (
    <div className="flex items-center justify-center gap-4 mt-8">
      <span className={`text-sm font-medium ${!annual ? 'text-ink' : 'text-muted'}`}>{t('billing.monthly')}</span>
      <button onClick={onToggle} className={`relative w-11 h-6 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 ${annual ? 'bg-accent' : 'bg-line'}`} role="switch" aria-checked={annual} aria-label="Toggle annual billing">
        <span className={`absolute left-1 top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-200 ${annual ? 'translate-x-5' : ''}`} />
      </button>
      <span className={`text-sm font-medium ${annual ? 'text-ink' : 'text-muted'}`}>
        {t('billing.yearly')} <span className="text-accent text-xs ml-1 font-bold">{t('billing.discount')}</span>
      </span>
    </div>
  );
}

/* ─── CompoundFeature (expandable sub-bullets) ─── */

function CompoundFeature({ label, items }: { label: string; items: string[] }) {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <button onClick={() => setOpen(!open)} className="flex items-center gap-2 w-full text-left group">
        <SparklesIcon className="w-4 h-4 text-accent flex-shrink-0" />
        <span className="text-sm text-neutral-700 font-medium group-hover:text-neutral-900 transition-colors">{label}</span>
        <ChevronDownIcon className={`w-3.5 h-3.5 text-neutral-400 transition-transform ml-auto flex-shrink-0 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="pl-7 flex flex-col gap-1.5 mt-1 mb-1">
          {items.map((item, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="w-1 h-1 rounded-full bg-[#d4d4d4] flex-shrink-0" />
              <span className="text-xs text-muted leading-tight">{item}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── PricingCard ─── */

function PricingCard({ tier, annual, onSignUp }: { tier: PricingTier; annual: boolean; onSignUp: () => void }) {
  const { t } = useTranslation('pricing');
  const ns = `tiers.${tier.id}` as const;

  const TierIcon = TIER_ICONS[tier.id];
  const displayPrice = annual ? annualPerMonth(tier.monthlyPrice) : tier.monthlyPrice;
  const priceLabel = tier.id === 'individual' ? t(`${ns}.perMonth`) : t(`${ns}.perUserMonth`);
  const featuresRaw = t(`${ns}.features`, { returnObjects: true });
  const features: string[] = Array.isArray(featuresRaw) ? featuresRaw : [];

  // Helper to safely get string[] from i18next
  const tArray = (key: string): string[] => {
    const raw = t(key, { returnObjects: true });
    return Array.isArray(raw) ? raw : [];
  };

  // Compound feature groups per tier
  const compoundGroups: { label: string; items: string[] }[] = [];
  if (tier.id === 'business') {
    compoundGroups.push({
      label: t(`${ns}.complianceSuite.label`),
      items: tArray(`${ns}.complianceSuite.items`),
    });
  }
  if (tier.id === 'enterprise') {
    compoundGroups.push(
      {
        label: t(`${ns}.ragEngine.label`),
        items: tArray(`${ns}.ragEngine.items`),
      },
      {
        label: t(`${ns}.curriculum.label`),
        items: tArray(`${ns}.curriculum.items`),
      },
      {
        label: t(`${ns}.governance.label`),
        items: tArray(`${ns}.governance.items`),
      }
    );
  }

  const extrasArr = tArray(`${ns}.extras`);
  const extras = extrasArr.length > 0 ? extrasArr : undefined;

  return (
    <div className={`pricing-card relative flex flex-col ${tier.highlighted ? 'pricing-card-highlighted' : ''}`}>
      {/* Beta ribbon (mobile only) */}
      <span className="beta-card-ribbon">{t('betaStamp.ribbon')}</span>
      {/* Recommended badge */}
      {tier.highlighted && <span className="pricing-badge">{t(`${ns}.recommended`)}</span>}

      {/* Header */}
      <div className="mb-5">
        <div className="flex items-center gap-2.5 mb-2">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${tier.highlighted ? 'bg-accent-subtle' : 'bg-neutral-100'}`}>
            <TierIcon className={`w-5 h-5 ${tier.highlighted ? 'text-accent' : 'text-neutral-500'}`} />
          </div>
          <h3 className="text-lg font-semibold text-neutral-900">{t(`${ns}.name`)}</h3>
        </div>
        <p className="text-sm text-neutral-500 leading-relaxed">{t(`${ns}.description`)}</p>
      </div>

      {/* Price */}
      <div className="mb-6">
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-bold text-ink">${displayPrice}</span>
          <span className="text-muted text-sm font-medium">{priceLabel}</span>
        </div>
        {annual && <span className="text-xs text-success font-medium mt-1 block">{t('billing.billedYearly', { amount: annualTotal(tier.monthlyPrice) })}</span>}
      </div>

      {/* CTA */}
      <button onClick={onSignUp} className={`w-full py-2.5 px-4 rounded-lg text-sm font-semibold transition-all mb-6 ${tier.highlighted ? 'bg-accent text-white hover:bg-accent-hover shadow-sm hover:shadow-md' : 'bg-neutral-900 text-white hover:bg-neutral-800'}`}>
        {t(`${ns}.cta`)}
      </button>

      {/* Features */}
      <div className="space-y-3 flex-1">
        {features.map((feature, i) => (
          <div key={i} className="flex items-start gap-3">
            <CheckIcon className={`w-4 h-4 mt-0.5 shrink-0 ${tier.highlighted ? 'text-accent' : 'text-muted'}`} />
            <span className="text-sm text-ink-secondary leading-tight">{feature}</span>
          </div>
        ))}
        {compoundGroups.map((group, i) => (
          <CompoundFeature key={i} label={group.label} items={group.items} />
        ))}
        {extras?.map((extra, i) => (
          <div key={`extra-${i}`} className="flex items-start gap-3">
            <CheckIcon className={`w-4 h-4 mt-0.5 shrink-0 ${tier.highlighted ? 'text-accent' : 'text-muted'}`} />
            <span className="text-sm text-ink-secondary leading-tight">{extra}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── EnterprisePlusSection ─── */

function EnterprisePlusSection({ onContactSales }: { onContactSales: () => void }) {
  const { t } = useTranslation('pricing');
  const featuresRaw = t('enterprisePlus.features', { returnObjects: true });
  const features: string[] = Array.isArray(featuresRaw) ? featuresRaw : [];

  return (
    <div className="pricing-enterprise-footer shadow-lg hover:shadow-xl transition-shadow">
      <div className="flex flex-col md:flex-row items-center justify-between gap-8">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-3">
            <HardDriveIcon className="w-6 h-6 text-accent" />
            <h3 className="text-xl font-bold text-white">{t('enterprisePlus.name')}</h3>
          </div>
          <p className="text-neutral-300 mb-6 max-w-xl">{t('enterprisePlus.description')}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2">
            {features.map((feature, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-accent flex-shrink-0" />
                <span className="text-sm text-neutral-300">{feature}</span>
              </div>
            ))}
          </div>
        </div>
        <button onClick={onContactSales} className="group whitespace-nowrap px-6 py-3 bg-white text-ink rounded-lg font-semibold hover:bg-neutral-100 transition-colors flex items-center gap-2">
          {t('enterprisePlus.cta')}
          <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14" />
            <path d="M12 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}

/* ─── PricingFaq ─── */

function PricingFaq() {
  const { t: tFaq } = useTranslation('faq');
  const [openFaq, setOpenFaq] = useState<string | null>(null);

  const allItems = tFaq('items', { returnObjects: true }) as Record<string, FaqItemData>;
  const faqItems = getPageFaqItems(allItems, 'pricing');

  return (
    <section className="max-w-3xl mx-auto px-4 sm:px-6 section-spacing">
      <h2 className="text-2xl sm:text-3xl font-bold text-neutral-900 text-center mb-10">{tFaq('sectionTitle')}</h2>
      <div className="space-y-3">
        {faqItems.map((item) => (
          <div key={item.id} className="faq-card">
            <button onClick={() => setOpenFaq(openFaq === item.id ? null : item.id)} className="w-full flex items-center justify-between p-5 text-left bg-white hover:bg-neutral-50 transition-colors">
              <span className="font-semibold text-neutral-900">{item.question}</span>
              <ChevronDownIcon className={`w-5 h-5 text-neutral-400 transition-transform flex-shrink-0 ml-4 ${openFaq === item.id ? 'rotate-180' : ''}`} />
            </button>
            {openFaq === item.id && (
              <div className="px-5 pb-5 bg-white">
                <p className="text-neutral-500 leading-relaxed">{item.answer}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

/* ─── PricingPage ─── */

export function PricingPage() {
  const { t } = useTranslation('pricing');
  const navigate = useNavigate();
  const lang = useLangFromUrl();
  const { handleSignUp } = usePublicNavigation(lang);
  const [annual, setAnnual] = useState(false);

  return (
    <PageShell>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'AITutoro', item: `https://aitutoro.com/${lang}/` },
            { '@type': 'ListItem', position: 2, name: t('breadcrumb'), item: `https://aitutoro.com/${lang}/pricing` },
          ],
        }}
      />
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'SoftwareApplication',
          name: 'AITutoro',
          applicationCategory: ['BusinessApplication', 'EducationalApplication'],
          operatingSystem: 'Web',
          offers: [
            {
              '@type': 'Offer',
              name: 'Individual',
              price: '9',
              priceCurrency: 'USD',
              priceSpecification: { '@type': 'UnitPriceSpecification', billingDuration: 'P1M' },
            },
            {
              '@type': 'Offer',
              name: 'Business',
              price: '19',
              priceCurrency: 'USD',
              priceSpecification: { '@type': 'UnitPriceSpecification', billingDuration: 'P1M' },
            },
            {
              '@type': 'Offer',
              name: 'Enterprise',
              price: '29',
              priceCurrency: 'USD',
              priceSpecification: { '@type': 'UnitPriceSpecification', billingDuration: 'P1M' },
            },
          ],
        }}
      />

      {/* Sticky free-trial banner */}
      <PricingBanner onSignUp={handleSignUp} />

      {/* Header */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 pt-16 pb-4 text-center">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">{t('hero.headline')}</h1>
        <p className="text-lg text-ink-secondary mb-8" dangerouslySetInnerHTML={{ __html: t('hero.subheadline') }} />
        <BillingToggle annual={annual} onToggle={() => setAnnual(!annual)} />
      </section>

      {/* Pricing cards */}
      <section className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {PRICING_TIERS.map((tier) => (
            <PricingCard key={tier.id} tier={tier} annual={annual} onSignUp={handleSignUp} />
          ))}
        </div>
        {/* Beta stamp overlay (desktop) */}
        <div className="beta-stamp-overlay">
          <div className="beta-stamp">
            <span className="beta-stamp-text">{t('betaStamp.main')}</span>
            <span className="beta-stamp-sub">{t('betaStamp.sub')}</span>
          </div>
        </div>
      </section>

      {/* Enterprise+ footer */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <EnterprisePlusSection onContactSales={() => void navigate(`/${lang}/about/contact`)} />
      </section>

      {/* FAQ */}
      <PricingFaq />
    </PageShell>
  );
}
