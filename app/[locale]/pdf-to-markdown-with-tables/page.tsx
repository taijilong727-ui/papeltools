import { setRequestLocale, getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { locales, isValidLocale, type Locale } from '@/lib/i18n/config';
import { LandingPage } from '@/components/landing/LandingPage';
import {
  pageMetadata,
  faqPageJsonLd,
  breadcrumbJsonLd,
  absoluteUrl,
  type FAQItem,
} from '@/lib/seo';

/**
 * 落地页：PDF to Markdown with tables（表格保真）
 * 内容来源：messages.{en,es,pt}.json → landing.tables
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
  const t = await getTranslations({ locale, namespace: 'landing.tables' });
  return pageMetadata(locale, '/pdf-to-markdown-with-tables', t('title'), t('intro'));
}

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  if (!isValidLocale(rawLocale)) notFound();
  const locale = rawLocale as Locale;
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: 'landing.tables' });
  const faqItems: FAQItem[] = [
    { question: t('faq1Q'), answer: t('faq1A') },
    { question: t('faq2Q'), answer: t('faq2A') },
    { question: t('faq3Q'), answer: t('faq3A') },
    { question: t('faq4Q'), answer: t('faq4A') },
  ];
  const faqLd = JSON.stringify(faqPageJsonLd(faqItems));
  const breadcrumbLd = JSON.stringify(
    breadcrumbJsonLd([
      { name: t('breadcrumbsHome'), url: absoluteUrl(locale, '') },
      { name: t('title'), url: absoluteUrl(locale, '/pdf-to-markdown-with-tables') },
    ])
  );

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: faqLd }} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: breadcrumbLd }}
      />
      <LandingPage locale={locale} landingKey="tables" />
    </>
  );
}