'use client';

import { useTranslations } from 'next-intl';

/**
 * PillarsSection — 三大支柱（信任区）
 *
 * 1. 100% 浏览器端
 * 2. MCP 原生
 * 3. 三语
 */

const pillarIcons = [
  // Lock
  <svg key="lock" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>,
  // Globe
  <svg key="globe" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z" />
    <path d="M2 12h20" />
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
  </svg>,
  // Languages
  <svg key="lang" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 8h14M5 12h14M5 16h10" />
    <path d="M2 4h20v16H2z" />
  </svg>,
];

export function PillarsSection() {
  const t = useTranslations('features');

  const pillars = [
    { icon: pillarIcons[0], titleKey: 'pillar1Title', descKey: 'pillar1Desc', tagKey: 'pillar1Tag' },
    { icon: pillarIcons[1], titleKey: 'pillar2Title', descKey: 'pillar2Desc', tagKey: 'pillar2Tag' },
    { icon: pillarIcons[2], titleKey: 'pillar3Title', descKey: 'pillar3Desc', tagKey: 'pillar3Tag' },
  ];

  return (
    <section className="py-[clamp(72px,9vw,120px)]" id="features">
      <div className="max-w-[1180px] mx-auto px-6">
        <div className="mb-[clamp(40px,5vw,64px)]">
          <span className="eyebrow mb-3.5 inline-flex items-center gap-2">
            {t('eyebrow')}
          </span>
          <h2 className="headline-section max-w-[680px]">
            {t('h2')}
          </h2>
          <p className="mt-4 max-w-[560px] text-[clamp(16px,1.6vw,18px)] text-[var(--color-ink-soft)]">
            {t('sub')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {pillars.map((pillar) => (
            <article
              key={pillar.titleKey}
              className="p-7 hover:-translate-y-1 transition-transform"
              style={{
                background: 'var(--color-paper-soft)',
                border: '1px solid var(--color-rule)',
                borderRadius: 'var(--radius-lg)',
              }}
            >
              <div
                className="w-11 h-11 grid place-items-center mb-5"
                style={{
                  background: 'color-mix(in srgb, var(--color-accent) 12%, transparent)',
                  color: 'var(--color-accent)',
                  borderRadius: 'var(--radius-md)',
                }}
                aria-hidden="true"
              >
                <span className="w-5 h-5 block">{pillar.icon}</span>
              </div>
              <h3 className="text-[20px] font-medium mb-2.5">{t(pillar.titleKey)}</h3>
              <p className="text-[14.5px] text-[var(--color-ink-soft)] leading-relaxed">
                {t(pillar.descKey)}
              </p>
              <span
                className="inline-block mt-4 font-mono text-[11.5px] tracking-[0.1em] uppercase"
                style={{ color: 'var(--color-accent)' }}
              >
                {t(pillar.tagKey)}
              </span>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}