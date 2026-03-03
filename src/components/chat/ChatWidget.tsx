import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { renderMarkdown } from '@lib/utils';
import { Spinner } from '../common/Spinner';

type StructuredAnswer = string | string[] | number | null;

interface ChatWidgetProps {
  question: {
    question: string;
    widgetType: string;
    options?: string[];
    maxChars?: number;
    likertLabels?: { left: string; right: string };
  } | null;
  value: string;
  onChange: (next: string, opts?: { structured?: StructuredAnswer }) => void;
  onSubmit: () => void;
  disabled: boolean;
  isSubmitting: boolean;
}

export function ChatWidget({ question, value, onChange, onSubmit, disabled, isSubmitting }: ChatWidgetProps) {
  const { t } = useTranslation('chat');
  const [showAllOptions, setShowAllOptions] = useState(false);
  const [multiSelections, setMultiSelections] = useState<string[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setShowAllOptions(false);
    setMultiSelections([]);
  }, [question]);

  useEffect(() => {
    if (!disabled && question) {
      textareaRef.current?.focus({ preventScroll: true });
    }
  }, [question, disabled]);

  const maxChars = question?.maxChars || 500;
  const rows = maxChars > 1000 ? 5 : 3;
  const isSingleSelect = question?.widgetType === 'single-select';
  const isMultiSelect = question?.widgetType === 'multi-select';
  const isLikert = question?.widgetType === 'likert';

  const insertValue = (text: string, structured?: StructuredAnswer) => {
    onChange(text, { structured });
    textareaRef.current?.focus({ preventScroll: true });
  };

  // Append text to existing value (with separator if needed)
  // Prevents adding the same option twice
  const appendValue = (text: string) => {
    const current = value.trim();
    // Check if option already exists in the current value
    const existingOptions = current.split(',').map((s) => s.trim().toLowerCase());
    if (existingOptions.includes(text.toLowerCase())) {
      return; // Don't add duplicate
    }
    const newValue = current ? `${current}, ${text}` : text;
    onChange(newValue);
    textareaRef.current?.focus({ preventScroll: true });
  };

  const handleSingleSelect = (option: string) => {
    const plain = sanitizeOption(option);
    appendValue(plain);
  };

  const handleMultiToggle = (option: string) => {
    const plain = sanitizeOption(option);
    const isSelected = multiSelections.includes(plain);
    if (!isSelected && multiSelections.length >= 10) return;

    const next = isSelected ? multiSelections.filter((item) => item !== plain) : [...multiSelections, plain];

    setMultiSelections(next);
    insertValue(next.join(', '), next.length ? next : null);
  };

  const handleLikertSelect = (rating: number) => {
    const text = rating.toString();
    insertValue(text, rating);
  };

  const readyToSubmit = Boolean(value.trim()) && !disabled && !isSubmitting;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && readyToSubmit) {
      e.preventDefault();
      onSubmit();
    }
  };

  const widgetType = question?.widgetType || 'free-text';

  return (
    <div data-testid="chat-widget" data-widget-type={widgetType} className="border-t border-neutral-200 bg-white">
      <div className="mx-auto w-full max-w-3xl px-4 py-4">
        {/* Quick suggestions */}
        {question && question.widgetType !== 'free-text' && (
          <div className="mb-4">
            <p className="text-xs font-medium text-neutral-500 mb-2.5">{t('widget.suggestions')}</p>

            {isSingleSelect && (
              <div className="flex flex-wrap gap-2">
                {(question.options || []).slice(0, showAllOptions ? undefined : 7).map((option, index) => (
                  <button
                    key={index}
                    type="button"
                    data-option={sanitizeOption(option)}
                    onClick={() => handleSingleSelect(option)}
                    className="px-3 py-1.5 text-sm text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-lg transition-colors"
                    dangerouslySetInnerHTML={{
                      __html: renderMarkdown(option),
                    }}
                  />
                ))}
                {!showAllOptions && (question.options || []).length > 7 && (
                  <button type="button" className="px-3 py-1.5 text-sm text-neutral-500 hover:text-neutral-700 underline underline-offset-2" onClick={() => setShowAllOptions(true)}>
                    {t('widget.showMore')}
                  </button>
                )}
              </div>
            )}

            {isMultiSelect && (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {(question.options || []).map((option, index) => {
                    const plain = sanitizeOption(option);
                    const isSelected = multiSelections.includes(plain);
                    const isDisabled = !isSelected && multiSelections.length >= 10;
                    return (
                      <button
                        key={index}
                        type="button"
                        data-option={plain}
                        onClick={() => !isDisabled && handleMultiToggle(option)}
                        className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${isSelected ? 'bg-neutral-900 text-white' : isDisabled ? 'bg-neutral-50 text-neutral-300 cursor-not-allowed' : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'}`}
                        dangerouslySetInnerHTML={{
                          __html: renderMarkdown(option),
                        }}
                      />
                    );
                  })}
                </div>
                <p className="text-xs text-neutral-400">{t('widget.selectedCount', { count: multiSelections.length })}</p>
              </div>
            )}

            {isLikert && (
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-neutral-400">
                  <span>{question.likertLabels?.left || t('widget.likert.notConfident')}</span>
                  <span>{question.likertLabels?.right || t('widget.likert.veryConfident')}</span>
                </div>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((rating) => {
                    const active = value.trim() === rating.toString();
                    return (
                      <button
                        key={rating}
                        type="button"
                        data-value={rating}
                        onClick={() => handleLikertSelect(rating)}
                        className={`flex h-10 w-10 items-center justify-center rounded-lg text-sm font-medium transition-colors ${active ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'}`}
                      >
                        {rating}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Input area */}
        <div className="space-y-3">
          {question && <label className="text-xs font-medium text-neutral-500">{t('widget.input.label')}</label>}
          <textarea
            ref={textareaRef}
            data-testid="chat-input"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={question ? t('widget.input.placeholder') : t('widget.input.waitingPlaceholder')}
            className="textarea"
            rows={rows}
            maxLength={maxChars}
            disabled={!question || disabled}
            autoCorrect="off"
            autoCapitalize="off"
          />

          {/* Footer */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-neutral-400">
              {value.length}/{maxChars}
            </span>
            <div className="flex items-center gap-3">
              <span className="hidden sm:inline text-xs text-neutral-400">⌘/Ctrl + Enter</span>
              <button
                type="button"
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-neutral-900 text-white transition-colors hover:bg-neutral-800 disabled:bg-neutral-300 disabled:cursor-not-allowed"
                onClick={onSubmit}
                disabled={!readyToSubmit}
                data-testid="chat-submit"
                data-autofill-submit
                aria-label={t('widget.input.submitLabel')}
              >
                {isSubmitting ? (
                  <Spinner size="sm" variant="light" />
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function sanitizeOption(option: string): string {
  return option
    .replace(/<\/?[^>]+(>|$)/g, '')
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .replace(/_/g, '')
    .trim();
}
