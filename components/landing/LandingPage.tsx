import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import type { Locale } from '@/lib/i18n/config';
import { FAQItem } from '@/components/ui/FAQItem';

/**
 * LandingPage — 10 要素落地页模板
 *
 * 服务于 5 个落地页（llm / obsidian / rag / noUpload / mcp）+ mcp 文档页。
 * 内容由 `landingKey` prop 决定，从 messages.{en,es,pt}.json → landing.{key} 读取。
 *
 * 10 要素（参考 docs/落地页SEO与GEO完善方案-2026-08-06.md §2.1）：
 *  1. H1 + answer-first intro（心理化开场 — 控制感主张）
 *  2. 信任徽标条（🔒 + 可验证 + 免费）
 *  3. 3 条差异化要点（功能 + 心理收益）
 *  4. "如何操作"小节（场景化 3 步工作流）
 *  5. FAQ 区块（心理化排序 — Q1 永远是上传问题）
 *  6. 竞品微型对比表（1-3 行 — 社会比较 + 恐惧钩子）
 *  7. 嵌入转换 widget（CTA → 首页 #converter，GEO "被引用转被使用"）
 *  8. 内链区（回 #converter + 2-3 相关落地页）
 *  9. 引用权威来源（PDF.js / MCP SDK / @pdf2md/core）
 *
 * FAQ 使用 HTML 原生 <details>/<summary>（无需 client component，SEO 友好）。
 * 样式沿用现有设计令牌（var(--color-*)）。
 */

export type LandingKey = 'llm' | 'obsidian' | 'rag' | 'noUpload' | 'mcp' | 'mcpSeo' | 'ocr' | 'tables';

/**
 * faqSubtitle 可选渲染器 — 优雅处理 missing key
 *
 * 替代直接 `t('faqSubtitle')`（next-intl 在 key 缺失时抛 MISSING_MESSAGE 错误）。
 * 该函数捕获错误后返回 null，让 React 跳过渲染。
 *
 * 此处我们直接返回 ReactNode（不是 JSX），由 server component 在父级调用。
 * 用同步实现避免 server component async JSX 复杂度。
 */
type Translator = Awaited<ReturnType<typeof getTranslations>>;
function getFaqSubtitle(t: Translator): React.ReactNode {
  try {
    const subtitle = t('faqSubtitle');
    return (
      <p
        className="text-[15px] mb-5"
        style={{ color: 'var(--color-ink-soft)' }}
      >
        {subtitle}
      </p>
    );
  } catch {
    return null;
  }
}

interface LandingPageProps {
  locale: Locale;
  landingKey: LandingKey;
  /**
   * 覆盖 widget CTA 的跳转目标；默认跳本地化首页 #converter。
   * 例如 /mcp 营销页可传 `/${locale}/mcp`，把"连接 MCP"导向文档页。
   */
  ctaTarget?: string;
}

export async function LandingPage({ locale, landingKey, ctaTarget }: LandingPageProps) {
  const t = await getTranslations(`landing.${landingKey}`);
  const homePath = locale === 'en' ? '/' : `/${locale}/`;
  const converterPath = `${homePath}#converter`;
  const widgetHref = ctaTarget ?? converterPath;

  // 收集 FAQ 4 条（schema.org FAQPage JSON-LD 由 page.tsx 包装）
  const faqItems = [
    { q: t('faq1Q'), a: t('faq1A') },
    { q: t('faq2Q'), a: t('faq2A') },
    { q: t('faq3Q'), a: t('faq3A') },
    { q: t('faq4Q'), a: t('faq4A') },
  ];

  // 收集相关链接 3 条（href 加 locale 前缀，避免 Next.js 路由 404 — 根路径 /xxx 没有 [locale] 不匹配）
  const relatedLinks = [
    { label: t('relatedLink1Label'), href: `/${locale}${t('relatedLink1Href')}` },
    { label: t('relatedLink2Label'), href: `/${locale}${t('relatedLink2Href')}` },
    { label: t('relatedLink3Label'), href: `/${locale}${t('relatedLink3Href')}` },
  ];

  // 信任徽标条 — 3 条
  const trustBadges = [t('trustBadge1'), t('trustBadge2'), t('trustBadge3')];

  // 步骤 — 3 步
  const steps = [
    { title: t('step1Title'), body: t('step1Body') },
    { title: t('step2Title'), body: t('step2Body') },
    { title: t('step3Title'), body: t('step3Body') },
  ];

  return (
    <article className="max-w-[760px] mx-auto px-6 py-16 md:py-24">
      {/* ───── 要素 1：H1 + answer-first intro ───── */}
      <h1 className="headline-section mb-4 text-balance">{t('h1')}</h1>
      <p className="text-[18px] text-[var(--color-ink-soft)] leading-relaxed mb-10">
        {t('intro')}
      </p>

      {/* ───── 要素 2：信任徽标条 ───── */}
      <section
        className="mb-10 p-5"
        style={{
          background: 'var(--color-paper-soft)',
          border: '1px solid var(--color-rule)',
          borderRadius: 'var(--radius-md)',
        }}
        aria-label={t('trustBadgeTitle')}
      >
        <div
          className="text-[14px] font-semibold mb-1"
          style={{ color: 'var(--color-ink)' }}
        >
          {t('trustBadgeTitle')}
        </div>
        <div
          className="text-[12.5px] mb-3"
          style={{ color: 'var(--color-ink-soft)', opacity: 0.78 }}
        >
          {t('trustBadgeSubtitle')}
        </div>
        <ul className="flex flex-col gap-1.5 list-none">
          {trustBadges.map((badge, i) => (
            <li
              key={i}
              className="text-[14px]"
              style={{ color: 'var(--color-ink-soft)' }}
            >
              {badge}
            </li>
          ))}
        </ul>
      </section>

      {/* ───── 要素 3：3 条差异化要点（功能 + 心理收益） ───── */}
      <ul className="flex flex-col gap-5 list-none mb-12">
        {(['bullet1', 'bullet2', 'bullet3'] as const).map((bulletKey) => (
          <li
            key={bulletKey}
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
            <span>{t(bulletKey)}</span>
          </li>
        ))}
      </ul>

      {/* ───── 要素 4："如何操作"小节（场景化 3 步工作流） ───── */}
      <section className="mb-12">
        <h2
          className="text-[22px] font-medium mb-2"
          style={{ color: 'var(--color-ink)' }}
        >
          {t('stepsTitle')}
        </h2>
        <p
          className="text-[15px] mb-6"
          style={{ color: 'var(--color-ink-soft)' }}
        >
          {t('stepsSubtitle')}
        </p>
        <ol className="flex flex-col gap-5 list-none">
          {steps.map((step, i) => (
            <li
              key={i}
              className="flex gap-4"
              style={{ alignItems: 'flex-start' }}
            >
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

      {/* ───── 要素 5：FAQ 区块（心理化排序 — Q1 永远是上传问题） ───── */}
      <section className="mb-12">
        <h2
          className="text-[22px] font-medium mb-2"
          style={{ color: 'var(--color-ink)' }}
        >
          {t('faqTitle')}
        </h2>
        {/*
          faqSubtitle 可选字段：存在时渲染副标题，不存在则跳过。
          try/catch 处理 next-intl 在 key 缺失时的错误（fallback 优雅降级）。
        */}
        {getFaqSubtitle(t)}
        <div className="flex flex-col gap-2.5">
          {faqItems.map((item, i) => (
            <FAQItem key={i} question={item.q} answer={item.a} />
          ))}
        </div>
      </section>

      {/* ───── 要素 6：竞品微型对比表（社会比较） ───── */}
      <section className="mb-12">
        <h2
          className="text-[22px] font-medium mb-4"
          style={{ color: 'var(--color-ink)' }}
        >
          {t('compareTitle')}
        </h2>
        <div
          className="overflow-hidden"
          style={{
            border: '1px solid var(--color-rule)',
            borderRadius: 'var(--radius-md)',
          }}
        >
          <table className="w-full text-[14px]">
            <thead>
              <tr style={{ background: 'var(--color-paper-soft)' }}>
                <th
                  className="text-left px-4 py-3 font-medium"
                  style={{ color: 'var(--color-ink-soft)' }}
                />
                <th
                  className="text-left px-4 py-3 font-semibold"
                  style={{ color: 'var(--color-ink)' }}
                >
                  {t('compareColUs')}
                </th>
                <th
                  className="text-left px-4 py-3 font-medium"
                  style={{ color: 'var(--color-ink-soft)' }}
                >
                  {t('compareColOther')}
                </th>
              </tr>
            </thead>
            <tbody>
              {[
                { feature: t('compareRow1Feature'), us: t('compareRow1Us'), other: t('compareRow1Other') },
                { feature: t('compareRow2Feature'), us: t('compareRow2Us'), other: t('compareRow2Other') },
              ].map((row, i) => (
                <tr
                  key={i}
                  style={{ borderTop: '1px solid var(--color-rule)' }}
                >
                  <td
                    className="px-4 py-3"
                    style={{ color: 'var(--color-ink-soft)' }}
                  >
                    {row.feature}
                  </td>
                  <td
                    className="px-4 py-3 font-semibold"
                    style={{ color: 'var(--color-ink)' }}
                  >
                    {row.us}
                  </td>
                  <td
                    className="px-4 py-3"
                    style={{ color: 'var(--color-ink-soft)' }}
                  >
                    {row.other}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ───── 要素 7：嵌入转换 widget（CTA → 首页 #converter，GEO 战术 "被引用转被使用"） ───── */}
      <section
        className="mb-12 p-6 text-center"
        style={{
          background: 'var(--color-paper-soft)',
          border: '1px solid var(--color-rule)',
          borderRadius: 'var(--radius-lg)',
        }}
      >
        <Link
          href={widgetHref}
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

      {/* ───── 要素 8：内链区（回 #converter + 2-3 相关落地页） ───── */}
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
            {t('ctaHome')}
          </Link>
        </div>
      </section>

      {/* ───── 要素 9：引用权威来源（PRD §8.3#5） ───── */}
      <section
        className="mt-10 pt-6 text-[12.5px] leading-[1.7]"
        style={{
          borderTop: '1px solid var(--color-rule)',
          color: 'var(--color-ink-soft)',
          opacity: 0.82,
        }}
        aria-label={t('authoritiesTitle')}
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