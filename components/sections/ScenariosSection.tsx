'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import type { Locale } from '@/lib/i18n/config';

/**
 * ScenariosSection — 四大使用场景卡片
 *
 * 01: 喂 LLM → /pdf-to-markdown-for-llm
 * 02: Agent 读文档 → /pdf-to-markdown-for-rag
 * 03: 知识库入库 → /pdf-to-markdown-for-obsidian
 * 04: 敏感文档 → /pdf-to-markdown-free-no-upload
 */

const scenarios = [
  { num: '01', titleKey: 's1Title', descKey: 's1Desc', linkKey: 's1Link', href: '/pdf-to-markdown-for-llm' },
  { num: '02', titleKey: 's2Title', descKey: 's2Desc', linkKey: 's2Link', href: '/mcp' },
  { num: '03', titleKey: 's3Title', descKey: 's3Desc', linkKey: 's3Link', href: '/pdf-to-markdown-for-obsidian' },
  { num: '04', titleKey: 's4Title', descKey: 's4Desc', linkKey: 's4Link', href: '/pdf-to-markdown-free-no-upload' },
] as const;

export function ScenariosSection({ locale }: { locale: Locale }) {
  const t = useTranslations('scenarios');
  // 落地页在静态导出中始终位于 locale 目录下（out/{locale}/pdf-to-markdown-for-*），
  // 因此链接恒带 locale 前缀（含 en）——省略前缀会导致 /pdf-to-markdown-for-* 404
  const prefix = `/${locale}`;

  return (
    <section className="pt-0 pb-[clamp(72px,9vw,120px)]" id="scenarios">
      <div className="max-w-[1180px] mx-auto px-6">
        <div className="mb-[clamp(40px,5vw,64px)]">
          <span className="eyebrow mb-3.5 inline-flex items-center gap-2">{t('eyebrow')}</span>
          <h2 className="headline-section max-w-[680px]">{t('h2')}</h2>
          <p className="mt-4 max-w-[560px] text-[clamp(16px,1.6vw,18px)] text-[var(--color-ink-soft)]">
            {t('sub')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {scenarios.map((scenario) => (
            <article
              key={scenario.num}
              className="p-7 flex gap-4 items-start hover:-translate-y-1 transition-transform"
              style={{
                background: 'var(--color-paper-soft)',
                border: '1px solid var(--color-rule)',
                borderRadius: 'var(--radius-lg)',
              }}
            >
              <span
                className="font-mono text-[13px] pt-1 flex-shrink-0"
                style={{ color: 'var(--color-accent)' }}
              >
                {scenario.num}
              </span>
              <div>
                <h3 className="text-[18.5px] font-medium mb-2">{t(scenario.titleKey)}</h3>
                <p className="text-[14.5px] text-[var(--color-ink-soft)] leading-relaxed">
                  {t(scenario.descKey)}
                </p>
                <Link
                  href={`${prefix}${scenario.href}`}
                  className="inline-block mt-3 text-[14px] font-semibold"
                  style={{
                    color: 'var(--color-accent)',
                    letterSpacing: '0.1em',
                  }}
                >
                  {t(scenario.linkKey)}
                </Link>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}