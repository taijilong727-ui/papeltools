'use client';

import { useTranslations } from 'next-intl';

/**
 * CompareSection — 竞品对比表
 *
 * 4 维度 × 4 平台：
 * - 纯浏览器端 / 官方 MCP / 三语 / 可验证隐私
 */

const rowKeys = [
  { feature: 'row1Feature', us: 'row1Us', cloud: 'row1Cloud', free: 'row1Free', new: 'row1New' },
  { feature: 'row2Feature', us: 'row2Us', cloud: 'row2Cloud', free: 'row2Free', new: 'row2New' },
  { feature: 'row3Feature', us: 'row3Us', cloud: 'row3Cloud', free: 'row3Free', new: 'row3New' },
  { feature: 'row4Feature', us: 'row4Us', cloud: 'row4Cloud', free: 'row4Free', new: 'row4New' },
] as const;

export function CompareSection() {
  const t = useTranslations('compare');

  return (
    <section className="pt-0 pb-[clamp(72px,9vw,120px)]" id="compare">
      <div className="max-w-[1180px] mx-auto px-6">
        <div className="mb-[clamp(40px,5vw,64px)]">
          <span className="eyebrow mb-3.5 inline-flex items-center gap-2">{t('eyebrow')}</span>
          <h2 className="headline-section max-w-[680px]">{t('h2')}</h2>
          <p className="mt-4 max-w-[560px] text-[clamp(16px,1.6vw,18px)] text-[var(--color-ink-soft)]">
            {t('sub')}
          </p>
        </div>

        <div
          className="overflow-x-auto"
          style={{
            border: '1px solid var(--color-rule)',
            borderRadius: 'var(--radius-lg)',
            background: 'var(--color-paper-soft)',
          }}
        >
          <table className="w-full border-collapse min-w-[680px]">
            <thead>
              <tr>
                <th
                  className="px-5 py-4 text-left font-mono text-[12px] tracking-[0.08em] uppercase"
                  style={{
                    color: 'var(--color-ink-soft)',
                    borderBottom: '1px solid var(--color-rule)',
                    background: 'color-mix(in srgb, var(--color-paper) 55%, transparent)',
                  }}
                />
                <th
                  className="px-5 py-4 text-left font-mono text-[12px] tracking-[0.08em] uppercase"
                  style={{
                    color: 'var(--color-ink-soft)',
                    borderBottom: '1px solid var(--color-rule)',
                    background: 'color-mix(in srgb, var(--color-paper) 55%, transparent)',
                  }}
                >
                  {t('colUs')}
                </th>
                <th
                  className="px-5 py-4 text-left font-mono text-[12px] tracking-[0.08em] uppercase"
                  style={{
                    color: 'var(--color-ink-soft)',
                    borderBottom: '1px solid var(--color-rule)',
                    background: 'color-mix(in srgb, var(--color-paper) 55%, transparent)',
                  }}
                >
                  {t('colCloud')}
                </th>
                <th
                  className="px-5 py-4 text-left font-mono text-[12px] tracking-[0.08em] uppercase"
                  style={{
                    color: 'var(--color-ink-soft)',
                    borderBottom: '1px solid var(--color-rule)',
                    background: 'color-mix(in srgb, var(--color-paper) 55%, transparent)',
                  }}
                >
                  {t('colFree')}
                </th>
                <th
                  className="px-5 py-4 text-left font-mono text-[12px] tracking-[0.08em] uppercase"
                  style={{
                    color: 'var(--color-ink-soft)',
                    borderBottom: '1px solid var(--color-rule)',
                    background: 'color-mix(in srgb, var(--color-paper) 55%, transparent)',
                  }}
                >
                  {t('colNewSites')}
                </th>
              </tr>
            </thead>
            <tbody>
              {rowKeys.map((row, i) => (
                <tr key={row.feature}>
                  <td
                    className="px-5 py-4 text-[14.5px] font-semibold"
                    style={{
                      borderBottom:
                        i < rowKeys.length - 1 ? '1px solid var(--color-rule)' : 'none',
                    }}
                  >
                    {t(row.feature)}
                  </td>
                  <td
                    className="px-5 py-4 text-[14.5px] font-semibold"
                    style={{
                      color: 'var(--color-accent)',
                      borderBottom:
                        i < rowKeys.length - 1 ? '1px solid var(--color-rule)' : 'none',
                    }}
                  >
                    {t(row.us)}
                  </td>
                  <td
                    className="px-5 py-4 text-[14.5px]"
                    style={{
                      color: 'var(--color-ink-soft)',
                      opacity: 0.5,
                      borderBottom:
                        i < rowKeys.length - 1 ? '1px solid var(--color-rule)' : 'none',
                    }}
                  >
                    {t(row.cloud)}
                  </td>
                  <td
                    className="px-5 py-4 text-[14.5px]"
                    style={{
                      color: 'var(--color-ink-soft)',
                      opacity: 0.5,
                      borderBottom:
                        i < rowKeys.length - 1 ? '1px solid var(--color-rule)' : 'none',
                    }}
                  >
                    {t(row.free)}
                  </td>
                  <td
                    className="px-5 py-4 text-[14.5px]"
                    style={{
                      color: 'var(--color-ink)',
                      borderBottom:
                        i < rowKeys.length - 1 ? '1px solid var(--color-rule)' : 'none',
                    }}
                  >
                    {t(row.new)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3.5 text-[13px] text-[var(--color-ink-soft)]">{t('note')}</p>
      </div>
    </section>
  );
}