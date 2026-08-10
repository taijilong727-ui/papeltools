'use client';

import { useTranslations } from 'next-intl';
import { errorTranslationKeys } from '@/lib/engine/errors';
import type { ConversionError } from '@/lib/engine';

/**
 * ErrorDisplay — 友好的错误提示
 *
 * 根据错误码显示对应文案（来自 i18n），附操作按钮
 */

interface ErrorDisplayProps {
  error: ConversionError;
  onRetry?: () => void;
  onDismiss?: () => void;
}

export function ErrorDisplay({ error, onRetry, onDismiss }: ErrorDisplayProps) {
  const t = useTranslations();
  const key = errorTranslationKeys[error.code];
  const message = (() => {
    try {
      return t(key);
    } catch {
      return t('errors.genericError');
    }
  })();

  return (
    <div
      role="alert"
      data-testid="conversion-error"
      className="px-5 py-4 border-t border-[var(--color-rule)] flex items-start gap-3"
      style={{
        background: 'color-mix(in srgb, #991b1b 6%, var(--color-paper-soft))',
      }}
    >
      <svg
        viewBox="0 0 24 24"
        width="20"
        height="20"
        fill="none"
        stroke="var(--color-error)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="flex-shrink-0 mt-0.5"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>

      <div className="flex-1">
        <p className="text-[14.5px] text-[var(--color-ink)] font-medium">
          {message}
        </p>
        <p className="text-[13px] text-[var(--color-ink-soft)] mt-1">
          {t('errors.supportedHint')}
        </p>
        <div className="flex gap-2 mt-3">
          {error.retryable && onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="text-[13px] font-medium px-3 py-1.5"
              style={{
                background: 'var(--color-ink)',
                color: 'var(--color-paper-soft)',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              {t('errors.retryButton')}
            </button>
          )}
          {onDismiss && (
            <button
              type="button"
              onClick={onDismiss}
              className="text-[13px] font-medium px-3 py-1.5 border border-[var(--color-rule)]"
              style={{
                color: 'var(--color-ink-soft)',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              {t('errors.dismissButton')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}