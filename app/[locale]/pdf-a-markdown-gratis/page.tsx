import { setRequestLocale, getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { type Locale, hreflangMap } from '@/lib/i18n/config';
import { GratisLandingPage } from '@/components/landing/GratisLandingPage';
import {
  pageMetadata,
  faqPageJsonLd,
  breadcrumbJsonLd,
  absoluteUrl,
  type FAQItem,
} from '@/lib/seo';

/**
 * 长尾占位页（ES only）：/es/pdf-a-markdown-gratis/
 *
 * 覆盖 ES 关键词：`convertir pdf a markdown gratis`、`pdf a markdown sin subir`、
 * `conversor pdf markdown español` 等。
 *
 * 只在 es locale 下生成静态路径，其他 locale 访问 → notFound。
 */

export function generateStaticParams() {
  return [{ locale: 'es' as const }];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  if (!isValidEsLocale(rawLocale)) return {};
  const locale: Locale = 'es';
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'landing.gratis' });
  return pageMetadata(locale, '/pdf-a-markdown-gratis', t('title'), t('intro'));
}

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  if (!isValidEsLocale(rawLocale)) notFound();
  const locale: Locale = 'es';
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: 'landing.gratis' });
  const faqItems: FAQItem[] = [
    { question: t('faq1Q'), answer: t('faq1A') },
    { question: t('faq2Q'), answer: t('faq2A') },
    { question: t('faq3Q'), answer: t('faq3A') },
  ];
  const faqLd = JSON.stringify(faqPageJsonLd(faqItems));
  const breadcrumbLd = JSON.stringify(
    breadcrumbJsonLd([
      { name: t('breadcrumbsHome'), url: absoluteUrl(locale, '') },
      { name: t('title'), url: absoluteUrl(locale, '/pdf-a-markdown-gratis') },
    ])
  );

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: faqLd }} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: breadcrumbLd }}
      />
      <GratisLandingPage locale={locale} />
    </>
  );
}

/** 仅 ES locale 路由到本页面（其他 locale → notFound） */
function isValidEsLocale(value: string): value is 'es' {
  return value === 'es';
}

// 抑制未使用警告（仅类型导入）
void hreflangMap;