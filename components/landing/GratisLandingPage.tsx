import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import type { Locale } from '@/lib/i18n/config';
import { FAQItem } from '@/components/ui/FAQItem';

/**
 * GratisLandingPage — 长尾占位页简化模板
 *
 * 用于 ES/PT 长尾页（/es/pdf-a-markdown-gratis、/pt/converter-pdf-em-markdown-gratis），
 * 不复用 LandingPage 的 10 要素模板（长尾页内容更聚焦，5-6 要素足够）。
 *
 * 内容来源：messages.{en,es,pt}.json → landing.gratis
 *
 * FAQ 使用 HTML 原生 <details>/<summary>（同 LandingPage）。
 */

export async function GratisLandingPage({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: 'landing.gratis' });
  const homePath = locale === 'en' ? '/' : `/${locale}/`;
  const converterPath = `${homePath}#converter`;

  // FAQ 3 条（精简版）
  const faqItems = [
    { q: t('faq1Q'), a: t('faq1A') },
    { q: t('faq2Q'), a: t('faq2A') },
    { q: t('faq3Q'), a: t('faq3A') },
  ];

  const relatedLinks = [
    { label: t('relatedLink1Label'), href: t('relatedLink1Href') },
    { label: t('relatedLink2Label'), href: t('relatedLink2Href') },
    { label: t('relatedLink3Label'), href: t('relatedLink3Href') },
  ];

  const steps = [
    { title: t('step1Title'), body: t('step1Body') },
    { title: t('step2Title'), body: t('step2Body') },
    { title: t('step3Title'), body: t('step3Body') },
  ];

  return (
    <article className="max-w-[760px] mx-auto px-6 py-16 md:py-24">
      {/* H1 + intro */}
      <h1 className="headline-section mb-4 text-balance">{t('h1')}</h1>
      <p className="text-[18px] text-[var(--color-ink-soft)] leading-relaxed mb-10">
        {t('intro')}
      </p>

      {/* 3 条差异化要点 */}
      <ul className="flex flex-col gap-5 list-none mb-12">
        {(['bullet1', 'bullet2', 'bullet3'] as const).map((key) => (
          <li
            key={key}
            className="flex gap-3 text-[16px] text-[var(--color-ink)] leading-[1.7]"
          >
            <svg
              viewBox="0 0 24 24"
              width="20"
              height="20"
              fill="none"
              stroke="var(--color-accent)"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="flex-shrink-0 mt-1"
              aria-hidden="true"
            >
              <path d="M20 6 9 17l-5-5" />
            </svg>
            <span>{t(key)}</span>
          </li>
        ))}
      </ul>

      {/* 3 步工作流 */}
      <section className="mb-12">
        <h2
          className="text-[22px] font-medium mb-2"
          style={{ color: 'var(--color-ink)' }}
        >
          {t('step1Title')}
        </h2>
        <ol className="flex flex-col gap-5 list-none">
          {steps.map((step, i) => (
            <li key={i} className="flex gap-4" style={{ alignItems: 'flex-start' }}>
              <span
                className="flex-shrink-0 font-mono text-[14px] font-semibold flex items-center justify-center"
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: 'color-mix(in srgb, var(--color-accent) 14%, transparent)',
                  color: 'var(--color-accent)',
                }}
                aria-hidden="true"
              >
                {i + 1}
              </span>
              <div className="flex-1">
                <h3
                  className="text-[16px] font-semibold mb-1"
                  style={{ color: 'var(--color-ink)' }}
                >
                  {step.title}
                </h3>
                <p
                  className="text-[14.5px] leading-[1.7]"
                  style={{ color: 'var(--color-ink-soft)' }}
                >
                  {step.body}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* FAQ 3 条 */}
      <section className="mb-12">
        <h2
          className="text-[22px] font-medium mb-5"
          style={{ color: 'var(--color-ink)' }}
        >
          {t('faq1Q').replace(/\?$/, '')}
        </h2>
        <div className="flex flex-col gap-2.5">
          {faqItems.map((item, i) => (
            <FAQItem key={i} question={item.q} answer={item.a} />
          ))}
        </div>
      </section>

      {/* Widget CTA → 首页 #converter */}
      <section
        className="mb-12 p-6 text-center"
        style={{
          background: 'var(--color-paper-soft)',
          border: '1px solid var(--color-rule)',
          borderRadius: 'var(--radius-lg)',
        }}
      >
        <Link
          href={converterPath}
          className="inline-flex items-center gap-2 font-display text-[16px] font-medium px-6 py-3 hover:-translate-y-0.5 transition-transform"
          style={{
            background: 'var(--color-ink)',
            color: 'var(--color-paper)',
            borderRadius: 'var(--radius-md)',
            letterSpacing: '0.02em',
          }}
        >
          {t('widgetCta')}
          <svg
            viewBox="0 0 24 24"
            width="18"
            height="18"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M5 12h14M13 5l7 7-7 7" />
          </svg>
        </Link>
        <p
          className="mt-3 text-[13.5px]"
          style={{ color: 'var(--color-ink-soft)', opacity: 0.78 }}
        >
          {t('widgetHint')}
        </p>
      </section>

      {/* 相关链接 */}
      <section className="mb-10">
        <h3
          className="text-[16px] font-semibold mb-3"
          style={{ color: 'var(--color-ink)' }}
        >
          {t('relatedTitle')}
        </h3>
        <ul className="flex flex-col gap-2 list-none">
          {relatedLinks.map((link, i) => (
            <li key={i}>
              <Link
                href={link.href}
                className="text-[14.5px] font-medium hover:underline"
                style={{ color: 'var(--color-accent)' }}
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
        <div className="mt-6 pt-6 border-t" style={{ borderColor: 'var(--color-rule)' }}>
          <Link
            href={converterPath}
            className="text-[14.5px] font-medium hover:underline"
            style={{ color: 'var(--color-accent)' }}
          >
            ← Back to converter
          </Link>
        </div>
      </section>

      {/* 权威来源 */}
      <section
        className="mt-10 pt-6 text-[12.5px] leading-[1.7]"
        style={{
          borderTop: '1px solid var(--color-rule)',
          color: 'var(--color-ink-soft)',
          opacity: 0.82,
        }}
      >
        <div className="font-medium mb-1.5">{t('authoritiesTitle')}</div>
        <ul className="list-none">
          <li>{t('authority1')}</li>
          <li>{t('authority2')}</li>
        </ul>
      </section>
    </article>
  );
}