import { lazy, Suspense } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { JsonLd } from '../components/JsonLd';
import { PageShell } from '../components/layout/PageShell';
import { useLangFromUrl } from '../hooks/useLangFromUrl';

const ContactForm = lazy(() =>
  import('../components/ContactForm').then((m) => ({ default: m.ContactForm })),
);

/* ─── Obfuscated email builder ─── */

function buildEmail(user: string, domain: string): string {
  return `${user}@${domain}`;
}

const CHANNELS = [
  { key: 'sales' as const, user: 'sales', domain: 'bajkoterapia.org' },
  { key: 'support' as const, user: 'cs', domain: 'bajkoterapia.org' },
  { key: 'press' as const, user: 'press', domain: 'bajkoterapia.org' },
  { key: 'general' as const, user: 'info', domain: 'bajkoterapia.org' },
];

/* ─── DirectChannels ─── */

function DirectChannels() {
  const { t } = useTranslation('contact');

  return (
    <div>
      <h2 className="text-lg font-semibold text-neutral-900 mb-4">{t('channels.heading')}</h2>
      <ul className="space-y-3">
        {CHANNELS.map((ch) => {
          const email = buildEmail(ch.user, ch.domain);
          return (
            <li key={ch.key}>
              <span className="block text-xs font-medium text-neutral-400 uppercase tracking-wide mb-0.5">
                {t(`channels.${ch.key}`)}
              </span>
              <a href={`mailto:${email}`} className="text-sm text-accent hover:underline">
                {email}
              </a>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* ─── SocialLinks ─── */

function SocialLinks() {
  const { t } = useTranslation('contact');

  return (
    <div>
      <h2 className="text-lg font-semibold text-neutral-900 mb-4">{t('social.heading')}</h2>
      <ul className="space-y-3">
        <li>
          <a
            href="https://linkedin.com/company/bajkoterapia"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-neutral-700 hover:text-accent transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
            </svg>
            {t('social.linkedin')}
          </a>
        </li>
        <li>
          <a
            href="https://instagram.com/bajkoterapia"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-neutral-700 hover:text-accent transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.899 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.899-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678a6.162 6.162 0 100 12.324 6.162 6.162 0 100-12.324zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm7.846-10.405a1.441 1.441 0 11-2.88 0 1.441 1.441 0 012.88 0z" />
            </svg>
            {t('social.instagram')}
          </a>
        </li>
      </ul>
    </div>
  );
}

/* ─── Headquarters ─── */

function Headquarters() {
  const { t } = useTranslation('contact');

  return (
    <div>
      <h2 className="text-lg font-semibold text-neutral-900 mb-4">{t('hq.heading')}</h2>
      <address className="not-italic text-sm text-neutral-600 leading-relaxed">
        <strong>Bajkoterapia</strong>
        <br />
        {t('hq.line1')}
        <br />
        {t('hq.line2')}
      </address>
    </div>
  );
}

/* ─── ContactPage ─── */

export function ContactPage() {
  const { t } = useTranslation('contact');
  const lang = useLangFromUrl();

  return (
    <PageShell>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            {
              '@type': 'ListItem',
              position: 1,
              name: 'Bajkoterapia',
              item: `https://bajkoterapia.org/${lang}/`,
            },
            {
              '@type': 'ListItem',
              position: 2,
              name: t('aboutBreadcrumb'),
              item: `https://bajkoterapia.org/${lang}/about/contact`,
            },
            {
              '@type': 'ListItem',
              position: 3,
              name: t('breadcrumb'),
              item: `https://bajkoterapia.org/${lang}/about/contact`,
            },
          ],
        }}
      />
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'ContactPage',
          name: t('header.heading'),
          url: `https://bajkoterapia.org/${lang}/about/contact`,
        }}
      />
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'Organization',
          name: 'Bajkoterapia',
          url: 'https://bajkoterapia.org',
          address: {
            '@type': 'PostalAddress',
            streetAddress: 'Plac Inwalidów 10',
            postalCode: '01-552',
            addressLocality: 'Warszawa',
            addressCountry: 'PL',
          },
          sameAs: [
            'https://linkedin.com/company/bajkoterapia',
            'https://instagram.com/bajkoterapia',
          ],
        }}
      />

      {/* Header */}
      <section className="max-w-content mx-auto px-4 sm:px-6 pt-16 pb-8">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
          {t('header.heading')}
        </h1>
        <p className="text-lg text-neutral-500 leading-relaxed max-w-2xl">
          <Trans
            i18nKey="header.body"
            ns="contact"
            components={{
              strong: <strong className="text-neutral-700" />,
              faqLink: <Link to={`/${lang}/support/faq`} className="text-accent hover:underline" />,
            }}
          />
        </p>
      </section>

      {/* Grid: form + info sidebar */}
      <section className="max-w-content mx-auto px-4 sm:px-6 pb-20">
        <div className="grid md:grid-cols-5 gap-10 lg:gap-14">
          {/* Form — 3 cols */}
          <div className="md:col-span-3">
            <Suspense fallback={<div className="animate-pulse h-96 bg-neutral-100 rounded-xl" />}>
              <ContactForm />
            </Suspense>
          </div>

          {/* Info sidebar — 2 cols */}
          <div className="md:col-span-2 space-y-10">
            <DirectChannels />
            <SocialLinks />
            <Headquarters />
          </div>
        </div>
      </section>
    </PageShell>
  );
}
