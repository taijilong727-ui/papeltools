/**
 * i18n 配置常量
 *
 * - 三语：en（默认，hreflang x-default）/ es / pt（巴西葡语习惯）
 * - 参考：docs/首页内容与落地页规划-2026-08-03.md §七、URL 与 hreflang
 * - PRD §7.2 决策：PT 用单 /pt/ 路径，hreflang 声明 pt-br
 */

export const locales = ['en', 'es', 'pt'] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'en';

/** hreflang 映射（pt 实际指向 pt-br） */
export const hreflangMap: Record<Locale, string> = {
  en: 'en',
  es: 'es-419',
  pt: 'pt-br',
};

/** UI 显示标签（header 切换器） */
export const localeLabels: Record<Locale, string> = {
  en: 'EN',
  es: 'ES',
  pt: 'PT',
};

/**
 * OCR 语言代码映射（PRD §4.4 FR-44）
 * 仅在引入 OCR 引擎（Tesseract.js）时使用
 */
export const ocrLanguageMap: Record<Locale, string> = {
  en: 'eng',
  es: 'spa',
  pt: 'por',
};

/**
 * 语言验证：URL 中的 locale 是否合法
 */
export function isValidLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}