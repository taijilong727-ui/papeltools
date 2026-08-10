import Link from 'next/link';
import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { locales, isValidLocale, type Locale } from '@/lib/i18n/config';
import { getTranslations } from 'next-intl/server';
import {
  pageMetadata,
  breadcrumbJsonLd,
  absoluteUrl,
} from '@/lib/seo';

/**
 * 隐私页 — PRD §4.5 FR-51
 *
 * 内容结构：
 * - 一句话承诺（h1）
 * - 介绍（intro）
 * - 7 章节：不做的事 / 验证方法 / 收集 / cookie / 第三方 / 开源 / 联系
 * - 返回首页链接
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
  const t = await getTranslations({ locale, namespace: 'privacy' });
  return pageMetadata(locale, '/privacy', t('title'), t('intro'));
}

export default async function PrivacyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  if (!isValidLocale(rawLocale)) notFound();
  const locale = rawLocale as Locale;
  setRequestLocale(locale);
  const t = await getTranslations('privacy');

  const sections = [
    { titleKey: 'sectionTitle1', bodyKey: 'section1Body' },
    { titleKey: 'sectionTitle2', bodyKey: 'section2Body' },
    { titleKey: 'sectionTitle3', bodyKey: 'section3Body' },
    { titleKey: 'sectionTitle4', bodyKey: 'section4Body' },
    { titleKey: 'sectionTitle5', bodyKey: 'section5Body' },
    { titleKey: 'sectionTitle6', bodyKey: 'section6Body' },
    { titleKey: 'sectionTitle7', bodyKey: 'section7Body' },
  ];

  // BreadcrumbList JSON-LD — 复用 "Home" 文案
  // （隐私页无独立 breadcrumbsHome，用 layout meta.title 的简短形式 + Home）
  const tMeta = await getTranslations({ locale, namespace: 'meta' });
  const homeLabel = locale === 'es' ? 'Inicio' : locale === 'pt' ? 'Início' : 'Home';
  const breadcrumbLd = JSON.stringify(
    breadcrumbJsonLd([
      { name: homeLabel, url: absoluteUrl(locale, '') },
      { name: t('title'), url: absoluteUrl(locale, '/privacy') },
    ])
  );

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: breadcrumbLd }}
      />
      <article className="max-w-[760px] mx-auto px-6 py-16 md:py-24">
        <h1 className="headline-section mb-6 text-balance">{t('h1')}</h1>
        <p className="text-[18px] text-[var(--color-ink-soft)] leading-relaxed mb-12">
          {t('intro')}
        </p>

        <div className="flex flex-col gap-10">
          {sections.map((s) => (
            <section key={s.titleKey}>
              <h2 className="text-[24px] font-medium mb-3 text-balance">{t(s.titleKey)}</h2>
              <p className="text-[16px] text-[var(--color-ink-soft)] leading-[1.75]">
                {t(s.bodyKey)}
              </p>
            </section>
          ))}
        </div>

        <div className="mt-12 pt-8 border-t border-[var(--color-rule)]">
          <Link
            href={`/${locale === 'en' ? '' : `${locale}/`}`}
            className="text-[14.5px] font-medium hover:underline"
            style={{ color: 'var(--color-accent)' }}
          >
            {t('backToHome')}
          </Link>
        </div>
      </article>
    </>
  );
}