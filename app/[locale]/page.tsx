import { setRequestLocale, getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { locales, isValidLocale, type Locale } from '@/lib/i18n/config';
import {
  softwareApplicationJsonLd,
  faqPageJsonLd,
  webSiteJsonLd,
  pageMetadata,
  breadcrumbJsonLd,
  absoluteUrl,
  type FAQItem,
} from '@/lib/seo';
import { HeroSection } from '@/components/sections/HeroSection';
import { PillarsSection } from '@/components/sections/PillarsSection';
import { CompareSection } from '@/components/sections/CompareSection';
import { ScenariosSection } from '@/components/sections/ScenariosSection';
import { FAQSection } from '@/components/sections/FAQSection';
import { MCPSection } from '@/components/sections/MCPSection';

/**
 * 首页 — 7 区块（PRD §首页内容与落地页规划 §二）
 *
 *   1. Hero + Converter（首屏）
 *   2. Pillars（信任区）
 *   3. Compare（对比表）
 *   4. Scenarios（场景卡片）
 *   5. FAQ（手风琴）
 *   6. MCP（开发者区）
 *   7. Footer（在 [locale]/layout.tsx 中）
 *
 * 设计：Papel 主题（纸感极简）
 * SEO：SoftwareApplication + FAQPage JSON-LD（详见 lib/seo.ts）
 */

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  if (!isValidLocale(rawLocale)) return {};
  const locale = rawLocale as Locale;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'meta' });

  // 与内页 pageMetadata() 统一 — canonical/hreflang/og:url/og:locale/twitter:card
  // 显式声明，不再让 layout 默认值参与合并（避免 Next.js 浅合并丢失字段）
  return pageMetadata(locale, '', t('title'), t('description'));
}

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  if (!isValidLocale(rawLocale)) notFound();
  const locale = rawLocale as Locale;

  // 标记请求 locale
  setRequestLocale(locale);

  // 构造 FAQ 数据（JSON-LD 与页面展示同源，避免漂移）
  const tFaq = await getTranslations({ locale, namespace: 'faq' });
  const faqItems: FAQItem[] = [
    { question: tFaq('q1'), answer: tFaq('a1') },
    { question: tFaq('q2'), answer: tFaq('a2') },
    { question: tFaq('q3'), answer: tFaq('a3') },
    { question: tFaq('q4'), answer: tFaq('a4') },
    { question: tFaq('q5'), answer: tFaq('a5') },
    { question: tFaq('q6'), answer: tFaq('a6') },
  ];

  // 4 个 JSON-LD：SoftwareApplication（应用本体）+ WebSite（站点级）+ FAQPage（FAQ 区块）+ BreadcrumbList（首页=单一节点，搜索结果中显示面包屑）
  const appLd = JSON.stringify(softwareApplicationJsonLd(locale));
  const siteLd = JSON.stringify(webSiteJsonLd(locale));
  const faqLd = JSON.stringify(faqPageJsonLd(faqItems));
  const homeLabel = locale === 'es' ? 'Inicio' : locale === 'pt' ? 'Início' : 'Home';
  const breadcrumbLd = JSON.stringify(
    breadcrumbJsonLd([
      { name: homeLabel, url: absoluteUrl(locale, '') },
    ])
  );

  return (
    <>
      {/* GEO 战术 #3：SoftwareApplication Schema（首页核心） */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: appLd }}
      />
      {/* WebSite Schema（站点级） */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: siteLd }}
      />
      {/* FAQPage Schema（FAQ 区块） */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: faqLd }}
      />
      {/* BreadcrumbList Schema（首页 — 单一节点，告知搜索引擎首页结构） */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: breadcrumbLd }}
      />
      <HeroSection />
      <PillarsSection />
      <CompareSection />
      <ScenariosSection locale={locale} />
      <FAQSection />
      <MCPSection locale={locale} />
    </>
  );
}