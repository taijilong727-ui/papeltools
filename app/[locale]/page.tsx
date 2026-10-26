import { setRequestLocale, getTranslations } from 'next-intl/server';
import { notFound, permanentRedirect } from 'next/navigation';
import { locales, isValidLocale, type Locale } from '@/lib/i18n/config';
import { pageMetadata } from '@/lib/seo';
import { HomePageContent } from '@/components/pages/HomePageContent';

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

  // 英文首页唯一入口是根路径；保留 /en/ 的 308 兜底，避免重复首页。
  if (locale === 'en') permanentRedirect('/');

  setRequestLocale(locale);
  return <HomePageContent locale={locale} />;
}
