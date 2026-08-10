import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { NextIntlClientProvider } from 'next-intl';
import { Newsreader, IBM_Plex_Mono } from 'next/font/google';
import { locales, isValidLocale, type Locale, hreflangMap } from '@/lib/i18n/config';
import { organizationJsonLd } from '@/lib/seo';
import { Header } from '@/components/i18n/Header';
import { Footer } from '@/components/i18n/Footer';
import { getDictionary } from '@/lib/i18n/dictionaries';

// next/font 自托管（构建期下载并自托管到 .next/static/media/，运行时零第三方请求）
// latin-ext 子集覆盖 es/pt 的 á é í ó ú ñ ç ã õ 等重音字符
const newsreader = Newsreader({
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '500'],
  style: ['normal', 'italic'], // italic 用于 hero 标题 .hl 斜体点睛
  variable: '--font-newsreader',
  display: 'swap',
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '500'],
  variable: '--font-ibm-plex-mono',
  display: 'swap',
});

/**
 * 本地化路由布局
 *
 * - 静态预渲染三种语言（generateStaticParams）
 * - 服务端设置请求 locale（让 next-intl 知道当前语言）
 * - 客户端 Provider 注入字典，组件树可通过 useTranslations 消费
 *
 * 文档结构 <html lang="..."> 在此处声明（根 layout 不渲染，避免嵌套）。
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

  // 加载字典
  const messages = await getDictionary(locale);

  // 全站 Organization JSON-LD（站点级身份声明）
  const orgLd = JSON.stringify(organizationJsonLd());

  return (
    <html lang={hreflangMap[locale]} dir="ltr">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: orgLd }}
        />
      </head>
      <body className={`${newsreader.variable} ${ibmPlexMono.variable} min-h-screen flex flex-col`}>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <Header locale={locale} />
          <main className="flex-1">{children}</main>
          <Footer locale={locale} />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}