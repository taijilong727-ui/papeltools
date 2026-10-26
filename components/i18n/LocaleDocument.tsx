import { NextIntlClientProvider } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { Newsreader, IBM_Plex_Mono } from 'next/font/google';
import { hreflangMap, type Locale } from '@/lib/i18n/config';
import { organizationJsonLd } from '@/lib/seo';
import { Header } from '@/components/i18n/Header';
import { Footer } from '@/components/i18n/Footer';
import { getDictionary } from '@/lib/i18n/dictionaries';

// next/font 自托管（构建期下载并自托管到 .next/static/media/，运行时零第三方请求）
// latin-ext 子集覆盖 es/pt 的 á é í ó ú ñ ç ã õ 等重音字符
const newsreader = Newsreader({
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '500'],
  style: ['normal', 'italic'],
  variable: '--font-newsreader',
  display: 'swap',
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '500'],
  variable: '--font-ibm-plex-mono',
  display: 'swap',
});

interface LocaleDocumentProps {
  locale: Locale;
  children: React.ReactNode;
}

/**
 * 本地化文档外壳
 *
 * 根路径和 /[locale] 路由分支各自需要渲染完整 <html>/<body>。
 * 把 Provider、字体、Header、Footer 和站点级 JSON-LD 收敛在这里，避免两套布局漂移。
 */
export async function LocaleDocument({ locale, children }: LocaleDocumentProps) {
  setRequestLocale(locale);
  const messages = await getDictionary(locale);
  const orgLd = JSON.stringify(organizationJsonLd());

  return (
    <html lang={hreflangMap[locale]} dir="ltr">
      <body className={`${newsreader.variable} ${ibmPlexMono.variable} min-h-screen flex flex-col`}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: orgLd }}
        />
        <NextIntlClientProvider locale={locale} messages={messages}>
          <Header locale={locale} />
          <main className="flex-1">{children}</main>
          <Footer locale={locale} />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
