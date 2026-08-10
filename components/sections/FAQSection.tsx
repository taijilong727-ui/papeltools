'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

/**
 * FAQSection — 6 问答手风琴
 *
 * 行为：点击展开，单选互斥（同一时刻只有一个打开）
 */

const faqKeys = [
  { q: 'q1', a: 'a1' },
  { q: 'q2', a: 'a2' },
  { q: 'q3', a: 'a3' },
  { q: 'q4', a: 'a4' },
  { q: 'q5', a: 'a5' },
  { q: 'q6', a: 'a6' },
] as const;

export function FAQSection() {
  const t = useTranslations('faq');
  const [openIndex, setOpenIndex] = useState<number | null>(0); // 默认展开第一个

  const toggle = (idx: number) => {
    setOpenIndex((prev) => (prev === idx ? null : idx));
  };

  return (
    <section className="pt-0 pb-[clamp(72px,9vw,120px)]" id="faq">
      <div className="max-w-[1180px] mx-auto px-6">
        <div
          className="mb-[clamp(40px,5vw,64px)] text-center mx-auto"
          style={{ maxWidth: '760px' }}
        >
          <span className="eyebrow mb-3.5 inline-flex items-center gap-2">{t('eyebrow')}</span>
          <h2 className="headline-section">{t('h2')}</h2>
        </div>

        <div className="max-w-[760px] mx-auto">
          {faqKeys.map((faq, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div
                key={faq.q}
                className="mb-3 overflow-hidden"
                style={{
                  border: '1px solid var(--color-rule)',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--color-paper-soft)',
                }}
              >
                <button
                  type="button"
                  onClick={() => toggle(idx)}
                  className="w-full flex items-center gap-4 px-6 py-5 text-left font-display text-[17px] font-medium transition-colors"
                  style={{ color: isOpen ? 'var(--color-accent)' : 'var(--color-ink)' }}
                  aria-expanded={isOpen}
                  aria-controls={`faq-a-${idx}`}
                >
                  <span className="flex-1">{t(faq.q)}</span>
                  <svg
                    viewBox="0 0 24 24"
                    width="16"
                    height="16"
                    fill="none"
                    stroke={isOpen ? 'var(--color-accent)' : 'var(--color-ink-soft)'}
                    strokeWidth="2"
                    strokeLinecap="round"
                    className={`flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                    aria-hidden="true"
                  >
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </button>
                <div
                  id={`faq-a-${idx}`}
                  className="overflow-hidden transition-all duration-300"
                  style={{
                    maxHeight: isOpen ? '300px' : '0',
                  }}
                >
                  <p className="px-6 pb-5 text-[15px] text-[var(--color-ink-soft)] leading-relaxed">
                    {t(faq.a)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}