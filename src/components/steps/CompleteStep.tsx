import { Trans, useTranslation } from 'react-i18next';
import { Doc } from '../../../convex/_generated/dataModel';
import { usePageView } from '@lib/telemetry';

interface CompleteStepProps {
  profile: Doc<'userProfiles'>;
}

export function CompleteStep({ profile }: CompleteStepProps) {
  usePageView('complete');
  const { t } = useTranslation('complete');
  const userEmail = profile?.email || 'your email';

  return (
    <div className="max-w-2xl mx-auto py-12 text-center">
      <div className="bg-white rounded-container border border-line p-12">
        {/* PRD Spec: Thank You with success icon */}
        <div className="mb-8">
          <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-4xl font-bold text-ink mb-4">{t('title')}</h1>
          <p className="text-xl text-ink leading-relaxed mb-2">{t('subtitle')}</p>
        </div>

        {/* PRD Spec: 3 business days SLA */}
        <div className="bg-accent-subtle border border-accent/10 rounded-container p-6 mb-8">
          <div className="flex items-start">
            <svg className="w-6 h-6 text-accent mr-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="text-left">
              <h3 className="font-semibold text-accent mb-2">{t('whatsNext.title')}</h3>
              <p className="text-ink mb-3">
                <Trans i18nKey="whatsNext.timeline" ns="complete" components={{ strong: <strong /> }} />
              </p>
              <p className="text-sm text-muted">
                <Trans i18nKey="whatsNext.emailConfirmation" ns="complete" values={{ email: userEmail }} components={{ strong: <strong /> }} />
              </p>
            </div>
          </div>
        </div>

        {/* Order Summary */}
        <div className="mb-8 text-left">
          <h3 className="text-lg font-semibold text-ink mb-4">{t('orderSummary.title')}</h3>
          <div className="border border-line rounded-container p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-ink">{t('orderSummary.product')}</span>
              <span className="font-semibold text-ink">{t('orderSummary.price')}</span>
            </div>
            <div className="text-sm text-muted">{t('orderSummary.description')}</div>
          </div>
        </div>

        {/* Next Steps */}
        <div className="space-y-4 mb-8 text-left">
          <h3 className="text-lg font-semibold text-ink mb-4">{t('inTheMeantime.title')}</h3>
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 bg-accent-subtle rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-accent font-semibold text-sm">1</span>
            </div>
            <div>
              <h4 className="font-medium text-ink mb-1">{t('inTheMeantime.step1.title')}</h4>
              <p className="text-sm text-muted">{t('inTheMeantime.step1.description')}</p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 bg-accent-subtle rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-accent font-semibold text-sm">2</span>
            </div>
            <div>
              <h4 className="font-medium text-ink mb-1">{t('inTheMeantime.step2.title')}</h4>
              <p className="text-sm text-muted">{t('inTheMeantime.step2.description')}</p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 bg-accent-subtle rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-accent font-semibold text-sm">3</span>
            </div>
            <div>
              <h4 className="font-medium text-ink mb-1">{t('inTheMeantime.step3.title')}</h4>
              <p className="text-sm text-muted">{t('inTheMeantime.step3.description')}</p>
            </div>
          </div>
        </div>

        {/* Support Section */}
        <div className="bg-gray-50 border border-line rounded-container p-6 mb-6">
          <h4 className="font-medium text-ink mb-2">{t('support.title')}</h4>
          <p className="text-sm text-muted mb-3">{t('support.description')}</p>
          <a href="mailto:support@aitutor.example.com" className="inline-block px-6 py-2 text-accent hover:bg-accent-subtle border border-accent rounded-container transition-colors font-medium">
            {t('support.contactLink')}
          </a>
        </div>

        {/* Legal Links */}
        <div className="flex justify-center gap-6 text-sm">
          <a href="https://aitutor.example.com/privacy" className="text-muted hover:text-accent transition-colors">
            {t('legal.privacy')}
          </a>
          <a href="https://aitutor.example.com/terms" className="text-muted hover:text-accent transition-colors">
            {t('legal.terms')}
          </a>
          <a href="https://aitutor.example.com/refunds" className="text-muted hover:text-accent transition-colors">
            {t('legal.refund')}
          </a>
        </div>
      </div>
    </div>
  );
}
