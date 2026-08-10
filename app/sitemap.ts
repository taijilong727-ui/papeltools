import type { MetadataRoute } from 'next';
import { locales, hreflangMap } from '@/lib/i18n/config';

// sitemap 静态预渲染：SSG 模式下由构建期生成（混合模式，无需 Serverless 动态执行）
export const dynamic = 'force-static';

/**
 * sitemap.xml — 自动生成
 *
 * 包含：
 * - 三个语言版本的所有静态页（hreflang 互链）
 * - 不包含转换器状态（动态内容，搜索引擎不需要）
 *
 * 参考：PRD §7.2 hreflang 互链
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://papeltools.com';
  const now = new Date();

  const routes = [
    { path: '', priority: 1.0, changeFrequency: 'weekly' as const },
    { path: '/privacy', priority: 0.3, changeFrequency: 'yearly' as const },
    { path: '/terms', priority: 0.3, changeFrequency: 'yearly' as const },
    { path: '/contact', priority: 0.4, changeFrequency: 'yearly' as const },
    // Phase 2/3 页面（路由已存在但 P2 内容，预留）
    { path: '/pdf-to-markdown-for-llm', priority: 0.9, changeFrequency: 'weekly' as const },
    { path: '/pdf-to-markdown-for-obsidian', priority: 0.9, changeFrequency: 'weekly' as const },
    { path: '/pdf-to-markdown-for-rag', priority: 0.8, changeFrequency: 'weekly' as const },
    { path: '/pdf-to-markdown-free-no-upload', priority: 0.9, changeFrequency: 'weekly' as const },
    { path: '/mcp', priority: 0.8, changeFrequency: 'monthly' as const },
    // Phase 2 新页（2026-08-08）— 关键词长尾 + 场景补全
    { path: '/pdf-to-markdown-mcp', priority: 0.7, changeFrequency: 'weekly' as const },
    { path: '/pdf-ocr-to-markdown', priority: 0.7, changeFrequency: 'weekly' as const },
    { path: '/pdf-to-markdown-with-tables', priority: 0.7, changeFrequency: 'weekly' as const },
  ];

  // 单语限定路由：仅在指定 locale 下生成（其他 locale notFound）
  const localeOnlyRoutes = [
    { path: '/pdf-a-markdown-gratis', locale: 'es' as const, priority: 0.7, changeFrequency: 'weekly' as const },
    { path: '/converter-pdf-em-markdown-gratis', locale: 'pt' as const, priority: 0.7, changeFrequency: 'weekly' as const },
  ];

  // 构造标准化 URL：始终带尾斜杠，与 canonical/hreflang/next.config trailingSlash 一致
  // 注意：子路径（落地页等）静态导出后位于 out/{locale}/ 下，必须恒带 locale 前缀（含 en）；
  // 仅根路径（''）对 en 省略前缀（out/index.html 存在且重定向到 /en/）
  const localizedUrl = (locale: string, path: string): string => {
    const localePrefix = path === '' && locale === 'en' ? '' : `/${locale}`;
    const pathWithSlash = path === '' ? '/' : `${path}/`;
    return `${baseUrl}${localePrefix}${pathWithSlash}`;
  };

  const sitemapEntries: MetadataRoute.Sitemap = [];

  for (const route of routes) {
    for (const locale of locales) {
      const url = localizedUrl(locale, route.path);
      sitemapEntries.push({
        url,
        lastModified: now,
        changeFrequency: route.changeFrequency,
        priority: route.priority,
        alternates: {
          // 单一来源：hreflangMap（小写 pt-br）
          languages: Object.fromEntries(
            locales.map((l) => [hreflangMap[l], localizedUrl(l, route.path)])
          ) as Record<string, string>,
        },
      });
    }
  }

  // 单语路由：只在指定 locale 下出现，无 hreflang 互链
  for (const route of localeOnlyRoutes) {
    sitemapEntries.push({
      url: localizedUrl(route.locale, route.path),
      lastModified: now,
      changeFrequency: route.changeFrequency,
      priority: route.priority,
      // 无 alternates — 单语页面无三语互链
    });
  }

  return sitemapEntries;
}