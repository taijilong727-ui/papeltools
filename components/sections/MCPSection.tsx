'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { copyToClipboard } from '@/lib/engine/markdown-assembler';
import type { Locale } from '@/lib/i18n/config';

/**
 * MCPSection — MCP 开发者区
 *
 * 结构：
 * - 左侧：卖点 + 3 条要点 + CTA
 * - 右侧：代码卡（remote / local 双 tab + 复制按钮）
 */

interface MCPSectionProps {
  locale: Locale;
}

export function MCPSection({ locale }: MCPSectionProps) {
  const t = useTranslations('mcp');
  const [activeTab, setActiveTab] = useState<'remote' | 'local'>('remote');
  const [copyState, setCopyState] = useState<'idle' | 'copied'>('idle');
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 组件卸载时清理 timer
  useEffect(() => {
    return () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    };
  }, []);

  const handleCopy = async () => {
    const code =
      activeTab === 'remote' ? t('codeRemote') : t('codeLocal');
    const ok = await copyToClipboard(code);
    if (ok) {
      setCopyState('copied');
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => setCopyState('idle'), 1400);
    }
  };

  return (
    <section className="pt-0 pb-[clamp(72px,9vw,120px)]" id="mcp">
      <div className="max-w-[1180px] mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-stretch">
          {/* 左侧：卖点 */}
          <div className="flex flex-col justify-center">
            <span className="eyebrow mb-3.5 inline-flex items-center gap-2">{t('eyebrow')}</span>
            <h3 className="text-[26px] font-medium mb-3.5">{t('h3')}</h3>
            <p className="text-[15.5px] text-[var(--color-ink-soft)] leading-relaxed">{t('p')}</p>
            <p
              className="mt-3 text-[12.5px] leading-[1.65] italic"
              style={{ color: 'var(--color-ink-soft)', opacity: 0.78 }}
            >
              {t('privacyNote')}
            </p>
            <ul className="mt-5 flex flex-col gap-3 list-none">
              {[t('p1'), t('p2'), t('p3')].map((point, i) => (
                <li key={i} className="flex gap-3 text-[14.5px] text-[var(--color-ink-soft)]">
                  <svg
                    viewBox="0 0 24 24"
                    width="17"
                    height="17"
                    fill="none"
                    stroke="var(--color-accent)"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="flex-shrink-0 mt-0.5"
                    aria-hidden="true"
                  >
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                  {point}
                </li>
              ))}
            </ul>
            <a
              href={`/${locale}/mcp/`}
              className="inline-flex items-center gap-2 self-start mt-3 font-display text-[14px] font-medium px-4 py-2.5 hover:-translate-y-0.5 transition-transform"
              style={{
                background: 'transparent',
                color: 'var(--color-ink)',
                border: '1px solid var(--color-rule)',
                borderRadius: 'var(--radius-md)',
                letterSpacing: '0.02em',
              }}
            >
              {t('cta')}
            </a>
          </div>

          {/* 右侧：代码卡 */}
          <div
            className="p-7 flex flex-col gap-4"
            style={{
              background: 'var(--color-paper-soft)',
              border: '1px solid var(--color-rule)',
              borderRadius: 'var(--radius-lg)',
            }}
          >
            {/* Tabs */}
            <div className="flex gap-1.5" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'remote'}
                onClick={() => setActiveTab('remote')}
                className={`font-mono text-[11.5px] tracking-[0.05em] px-3 py-1.5 transition-colors ${
                  activeTab === 'remote'
                    ? 'text-[var(--color-accent)]'
                    : 'text-[var(--color-ink-soft)] border border-[var(--color-rule)]'
                }`}
                style={{
                  borderRadius: 'var(--radius-sm)',
                  background:
                    activeTab === 'remote'
                      ? 'color-mix(in srgb, var(--color-accent) 12%, transparent)'
                      : 'transparent',
                }}
              >
                {t('tabRemote')}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'local'}
                onClick={() => setActiveTab('local')}
                className={`font-mono text-[11.5px] tracking-[0.05em] px-3 py-1.5 transition-colors ${
                  activeTab === 'local'
                    ? 'text-[var(--color-accent)]'
                    : 'text-[var(--color-ink-soft)] border border-[var(--color-rule)]'
                }`}
                style={{
                  borderRadius: 'var(--radius-sm)',
                  background:
                    activeTab === 'local'
                      ? 'color-mix(in srgb, var(--color-accent) 12%, transparent)'
                      : 'transparent',
                }}
              >
                {t('tabLocal')}{' '}
                <span style={{ opacity: 0.55 }}>({t('tabLocalBadge')})</span>
              </button>
            </div>

            {/* Code block */}
            <div
              className="relative p-4 font-mono text-[13px] leading-[1.8] text-[var(--color-ink-soft)] overflow-x-auto"
              style={{
                background: 'var(--color-paper)',
                border: '1px solid var(--color-rule)',
                borderRadius: 'var(--radius-md)',
              }}
            >
              <pre className="whitespace-pre">
                <span style={{ color: 'var(--color-accent)', opacity: 0.75 }}>
                  {activeTab === 'remote' ? t('codeRemoteComment') : t('codeLocalComment')}
                </span>
                {'\n'}
                {activeTab === 'remote' ? t('codeRemote') : t('codeLocal')}
                {'\n'}
                <span style={{ color: 'var(--color-accent)', opacity: 0.75 }}>
                  {activeTab === 'remote' ? t('codeRemoteAfter') : t('codeLocalAfter')}
                </span>
              </pre>
              <button
                type="button"
                onClick={handleCopy}
                className="absolute top-2.5 right-2.5 font-mono text-[11px] px-2.5 py-1.5"
                style={{
                  background: 'color-mix(in srgb, var(--color-accent) 12%, transparent)',
                  color: 'var(--color-accent)',
                  borderRadius: 'var(--radius-sm)',
                }}
                aria-label={t('ariaCopyCode')}
              >
                {copyState === 'copied' ? t('copiedButton') : t('copyButton')}
              </button>
            </div>

            <span className="font-mono text-[12.5px] text-[var(--color-ink-soft)]">
              {t('note')}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}