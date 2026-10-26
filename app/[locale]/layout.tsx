import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { locales, isValidLocale, type Locale, hreflangMap } from '@/lib/i18n/config';
import { LocaleDocument } from '@/components/i18n/LocaleDocument';

/**
 * 本地化路由布局
 *
 * - 静态预渲染三种语言（generateStaticParams）
 * - 服务端设置请求 locale（让 next-intl 知道当前语言）
 * - 客户端 Provider 注入字典，组件树可通过 useTranslations 消费
 *
 * 文档结构由 LocaleDocument 渲染，与根路径英文首页共享同一套外壳。
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
  // setRequestLocale 必须先于 getTranslations 调用，确保 i18n 上下文正确
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'meta' });
  return {
    alternates: {
      canonical: `/${locale === 'en' ? '' : `${locale}/`}`,
      languages: {
        [hreflangMap.en]: '/',
        [hreflangMap.es]: '/es/',
        [hreflangMap.pt]: '/pt/',
        'x-default': '/',
      },
    },
    title: t('title'),
    description: t('description'),
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;

  if (!isValidLocale(rawLocale)) {
    notFound();
  }
  const locale = rawLocale as Locale;

  // 标记当前请求的 locale（next-intl）
  setRequestLocale(locale);

  return <LocaleDocument locale={locale}>{children}</LocaleDocument>;
}
