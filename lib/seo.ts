/**
 * SEO 工具 — JSON-LD 结构化数据生成 + 内页 Metadata
 *
 * PRD §8.3 GEO 战术 #3：所有营销页加 SoftwareApplication + FAQPage Schema
 * 参考：schema.org SoftwareApplication, FAQPage
 */

import type { Metadata } from 'next';
import { locales, hreflangMap, type Locale } from '@/lib/i18n/config';

/**
 * 站点 canonical URL — 全 SSG/PRERENDER 共享单一源
 *
 * 2026-09-08 切回 apex (papeltools.com)：
 * - AGENTS.md 锁定"根域无子域"（MCP 域名 papeltools.com/api/mcp）
 * - 2026-08-11 v1.1 改 www 子域是 Vercel Domain 配置下的妥协（apex 308 → www）
 * - 2026-09-08 配套 Vercel Dashboard 把 apex 设为 primary domain，
 *   代码 SITE_URL 同步改回 apex，redirect 链从 3 跳缩减到 1-2 跳
 * - 与 README、AGENTS.md、Chrome Web Store 4 条外链（已指 apex）全部对齐
 *
 * 历史：2026-08-11 v1.1 短暂用过 www，发现正确组合是 apex primary + 代码 SITE_URL = apex
 * （而非 www primary + 代码 SITE_URL = www），2026-09-08 切回 apex 永久锁定。
 */
export const SITE_URL = 'https://papeltools.com';

/**
 * 构造绝对 URL — 与 lib/i18n/pageMetadata 规则一致：
 * 根路径对 en 省略前缀，子路径恒带 locale 前缀。
 * 用于 JSON-LD（canonical、breadcrumb 等需要绝对 URL 的场景）。
 */
export function absoluteUrl(locale: Locale, path: string): string {
  const localePrefix = path === '' && locale === 'en' ? '' : `/${locale}`;
  const pathWithSlash = path === '' ? '/' : `${path}/`;
  return `${SITE_URL}${localePrefix}${pathWithSlash}`;
}

/**
 * 内页 Metadata 生成器（P0 修复：canonical / hreflang / OG 指向自身）
 *
 * 背景：内页如果不在 generateMetadata 显式声明 alternates，会继承
 * `app/[locale]/layout.tsx` 返回的首页 alternates（canonical 指向首页、
 * hreflang 指向首页三语），OG/Twitter 同理继承根 layout 的首页默认值——
 * 这是全内页 canonical / og:url 错误指向首页的根因。
 *
 * 本 helper 输出：
 * - alternates.canonical → 当前页面自身（恒带 locale 前缀，含 en，与 sitemap.ts 规则一致）
 * - alternates.languages → 当前页面的三语版本 + x-default（en）
 * - openGraph / twitter  → title/description/url 覆盖为当前页面（图片等保留根 layout 默认值）
 *
 * @param locale 当前语言
 * @param path 页面路径，形如 '/pdf-to-markdown-for-llm'（无 locale 前缀、无尾斜杠）
 * @param title 页面标题（已 i18n 翻译）
 * @param description 页面描述（已 i18n 翻译）
 */
export function pageMetadata(
  locale: Locale,
  path: string,
  title: string,
  description: string
): Metadata {
  // 根路径英文首页是 canonical 自身；其他页面（含英文子页面）恒带 locale 前缀
  const localizedUrl = (l: Locale): string =>
    l === 'en' && path === '' ? `${SITE_URL}/` : `${SITE_URL}/${l}${path}/`;
  const canonicalUrl = localizedUrl(locale);
  // OG/Twitter locale 的 BCP 47 表示（与 hreflang pt-br 一致）
  const ogLocale = locale === 'en' ? 'en_US' : locale === 'es' ? 'es_419' : 'pt_BR';
  return {
    title,
    description,
    robots: { index: true, follow: true },
    alternates: {
      canonical: canonicalUrl,
      languages: {
        ...(Object.fromEntries(
          locales.map((l) => [hreflangMap[l], localizedUrl(l)])
        ) as Record<string, string>),
        'x-default': localizedUrl('en'),
      },
    },
    // 注意：Next.js 对 openGraph/twitter 做浅合并——页面一旦提供该字段即整体替换
    // 根 layout 的默认值，因此必须在此显式补齐 siteName/type/images/card 等，
    // 否则 og:image、twitter:card 会丢失（实测 twitter:card 退化为 summary）。
    openGraph: {
      type: 'website',
      siteName: 'Papel Tools',
      locale: ogLocale,
      url: canonicalUrl,
      title,
      description,
      images: ['/og-image.png'],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ['/og-image.png'],
    },
  };
}

export interface FAQItem {
  question: string;
  answer: string;
}

/**
 * SoftwareApplication Schema（首页使用）
 *
 * 关键字段：
 * - applicationCategory: UtilitiesApplication
 * - operatingSystem: 任意浏览器（Web 应用）
 * - offers: 免费（price 0）
 * - featureList: 三大支柱
 * - aggregateRating: 可选（P2 加真实数据）
 */
export function softwareApplicationJsonLd(locale: Locale) {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Papel Tools',
    alternateName: 'Papel Tools — PDF to Markdown',
    url: locale === 'en' ? SITE_URL : `${SITE_URL}/${locale}/`,
    description:
      'Privacy-first PDF to Markdown converter running 100% in your browser. Files never leave your device.',
    applicationCategory: 'UtilitiesApplication',
    applicationSubCategory: 'Document Converter',
    operatingSystem: 'Any modern browser (Chrome, Firefox, Safari, Edge)',
    browserRequirements: 'Requires JavaScript and WebAssembly support',
    softwareVersion: '1.0.0',
    datePublished: '2026-08-04',
    inLanguage: ['en', 'es-419', 'pt-BR'],
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
    },
    featureList: [
      '100% client-side conversion',
      'Files never leave your device',
      'MCP-native server for AI agents (Streamable HTTP)',
      'Trilingual interface (EN / ES / PT)',
      'Tables and LaTeX formulas preserved',
      'No signup, no limits, free forever',
      'On-device OCR for scanned PDFs (English, Spanish, Portuguese)',
    ],
    creator: {
      '@type': 'Organization',
      name: 'Papel Tools',
      url: SITE_URL,
    },
  };
}

/**
 * FAQPage Schema（首页 FAQ 区块使用）
 *
 * 每个 question/answer 对一个 Question → AcceptedAnswer
 */
export function faqPageJsonLd(faqs: FAQItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };
}

/**
 * Organization Schema（footer 全站使用）
 */
export function organizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Papel Tools',
    url: SITE_URL,
    logo: `${SITE_URL}/favicon.svg`,
    sameAs: [
      // 'https://github.com/papeltools' — GitHub 仓库未上线，等项目公开后启用（同 Twitter / HuggingFace 占位模式）
      // 'https://twitter.com/papeltools',
      // 'https://huggingface.co/papeltools',
    ],
    contactPoint: [
      {
        '@type': 'ContactPoint',
        email: 'taijilong727@gmail.com',
        contactType: 'customer support',
        url: `${SITE_URL}/contact`,
        availableLanguage: ['English', 'Spanish', 'Portuguese'],
      },
    ],
    description:
      'Privacy-first PDF to Markdown converter. 100% in-browser, MCP-native, free.',
  };
}

/**
 * WebSite Schema（首页搜索框）
 */
export function webSiteJsonLd(locale: Locale) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Papel Tools',
    url: locale === 'en' ? SITE_URL : `${SITE_URL}/${locale}/`,
    inLanguage: locale === 'pt' ? 'pt-BR' : hreflangMap[locale],
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${SITE_URL}/?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

/** 生成 JSON-LD script 标签内容（HTML 字符串） */
export function jsonLdScript(data: object | object[]): string {
  return JSON.stringify(data);
}

/**
 * BreadcrumbList Schema（面包屑导航结构化数据）
 *
 * PRD §8.3#3 要求全站内页/落地页补面包屑结构化数据。
 * 用于帮助 Google 在搜索结果中显示面包屑路径（替代默认 URL）。
 *
 * 每个 ListItem 包含 position（1-indexed）+ name + item（绝对 URL）。
 */
export interface BreadcrumbItem {
  /** 显示文本（可已 i18n 翻译） */
  name: string;
  /** 绝对 URL（含协议 +域名 + 路径；尾斜杠与 canonical 一致） */
  url: string;
}

export function breadcrumbJsonLd(items: BreadcrumbItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}
