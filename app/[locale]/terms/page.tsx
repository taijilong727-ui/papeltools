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
 * 服务条款页 — PRD 附录 B AdSense TOS 前置要求
 *
 * 内容结构（messages.{locale}.json 的 terms namespace）：
 * - title / h1 / intro / lastUpdated / backToHome
 * - 8 章节：接受条款 / 服务定义 / 可接受使用 / 文件与内容 /
 *         知识产权 / 无担保 / 责任限制 / 变更与联系
 * - 返回首页链接
 *
 * 与 privacy 页同构：generateStaticParams 三语全预渲染，
 * BreadcrumbList JSON-LD + pageMetadata 助手复用。
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
  const t = await getTranslations({ locale, namespace: 'terms' });
  return pageMetadata(locale, '/terms', t('title'), t('intro'));
}

export default async function TermsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  if (!isValidLocale(rawLocale)) notFound();
  const locale = rawLocale as Locale;
  setRequestLocale(locale);
  const t = await getTranslations('terms');

  const sections = [
    { titleKey: 'sectionTitle1', bodyKey: 'section1Body' },
    { titleKey: 'sectionTitle2', bodyKey: 'section2Body' },
    { titleKey: 'sectionTitle3', bodyKey: 'section3Body' },
    { titleKey: 'sectionTitle4', bodyKey: 'section4Body' },
    { titleKey: 'sectionTitle5', bodyKey: 'section5Body' },
    { titleKey: 'sectionTitle6', bodyKey: 'section6Body' },
    { titleKey: 'sectionTitle7', bodyKey: 'section7Body' },
    { titleKey: 'sectionTitle8', bodyKey: 'section8Body' },
  ];

  // BreadcrumbList JSON-LD — 复用 "Home" 文案
  const homeLabel = locale === 'es' ? 'Inicio' : locale === 'pt' ? 'Início' : 'Home';
  const breadcrumbLd = JSON.stringify(
    breadcrumbJsonLd([
      { name: homeLabel, url: absoluteUrl(locale, '') },
      { name: t('title'), url: absoluteUrl(locale, '/terms') },
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
        <p className="text-[18px] text-[var(--color-ink-soft)] leading-relaxed mb-4">
          {t('intro')}
        </p>
        <p className="text-[14px] text-[var(--color-ink-soft)] mb-12 italic">
          {t('lastUpdated')}
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