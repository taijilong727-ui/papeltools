'use client';

import { useTranslations } from 'next-intl';
import { ConverterSection } from '@/components/converter';

/**
 * Hero + Converter — 首屏
 *
 * 结构：
 * - 隐私徽标（带锁图标）
 * - 大标题（Highlight 用斜体强调 Markdown）
 * - 副标题（answer-first 描述）
 * - 5 个信任 chip
 * - 副 CTA（面向开发者 → MCP）
 * - ConverterSection（拖拽上传 + 进度 + 结果）
 *
 * 设计：纸感极简，标题用衬线斜体强调，圆角小
 */

export function HeroSection() {
  const t = useTranslations('hero');

  return (
    <section className="pt-12 md:pt-24 pb-0 text-center relative overflow-hidden">
      <div className="max-w-[1180px] mx-auto px-6">
        {/* 隐私徽标 */}
        <span
          className="inline-flex items-center gap-2 font-mono text-[12.5px] tracking-[0.06em] px-4 py-2 mb-7"
          style={{
            border: '1px solid var(--color-rule)',
            borderRadius: '999px',
            color: 'var(--color-ink-soft)',
          }}
        >
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3" y="11" width="18" height="11" rx="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          {t('badge')}
        </span>

        {/* 大标题 */}
        <h1 className="headline-hero max-w-[900px] mx-auto">
          {t('h1Prefix')}
          <span className="italic" style={{ color: 'var(--color-accent)' }}>
            {t('h1Highlight')}
          </span>
          {t('h1Suffix')}
        </h1>

        {/* 副标题 */}
        <p className="mt-6 mx-auto max-w-[620px] text-[clamp(17px,1.9vw,20px)] text-[var(--color-ink-soft)]">
          {t('sub')}
        </p>

        {/* 信任 chip 行 */}
        <div className="flex justify-center flex-wrap gap-2.5 mt-7 max-w-[720px] mx-auto">
          <TrustChip>{t('trustZero')}</TrustChip>
          <TrustChip>{t('trustTables')}</TrustChip>
          <TrustChip>{t('trustLaTeX')}</TrustChip>
          <TrustChip>{t('trustMcp')}</TrustChip>
          <TrustChip>{t('trustI18n')}</TrustChip>
        </div>

        {/* 副 CTA */}
        <div className="flex justify-center mt-7">
          <a
            href="#mcp"
            className="text-[14px] text-[var(--color-accent)] font-medium hover:underline"
          >
            {t('devLink')}
          </a>
        </div>

        {/* 转换器 */}
        <ConverterSection />
      </div>
    </section>
  );
}

function TrustChip({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="font-mono text-[12.5px] px-3.5 py-1.5 whitespace-nowrap"
      style={{
        border: '1px solid var(--color-rule)',
        borderRadius: '999px',
        color: 'var(--color-ink-soft)',
      }}
    >
      {children}
    </span>
  );
}