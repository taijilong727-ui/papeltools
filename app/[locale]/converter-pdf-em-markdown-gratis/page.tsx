import { setRequestLocale, getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { type Locale } from '@/lib/i18n/config';
import { GratisLandingPage } from '@/components/landing/GratisLandingPage';
import {
  pageMetadata,
  faqPageJsonLd,
  breadcrumbJsonLd,
  absoluteUrl,
  type FAQItem,
} from '@/lib/seo';

/**
 * 长尾占位页（PT only）：/pt/converter-pdf-em-markdown-gratis/
 *
 * 覆盖 PT 关键词：`converter pdf em markdown grátis`、`pdf para markdown sem upload`、
 * `conversor pdf markdown português` 等。
 *
 * 只在 pt locale 下生成静态路径，其他 locale 访问 → notFound。
 */

export function generateStaticParams() {
  return [{ locale: 'pt' as const }];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  if (!isValidPtLocale(rawLocale)) return {};
  const locale: Locale = 'pt';
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'landing.gratis' });
  return pageMetadata(locale, '/converter-pdf-em-markdown-gratis', t('title'), t('intro'));
}

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  if (!isValidPtLocale(rawLocale)) notFound();
  const locale: Locale = 'pt';
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
      { name: t('title'), url: absoluteUrl(locale, '/converter-pdf-em-markdown-gratis') },
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

/** 仅 PT locale 路由到本页面（其他 locale → notFound） */
function isValidPtLocale(value: string): value is 'pt' {
  return value === 'pt';
}