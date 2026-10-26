import type { MetadataRoute } from 'next';
import { locales, hreflangMap } from '@/lib/i18n/config';

// sitemap 静态预渲染：SSG 模式下由构建期生成（混合模式，无需 Serverless 动态执行）
export const dynamic = 'force-static';

/**
 * sitemap.xml — 自动生成
 *
 * 包含：
 * - 三个语言版本的所有静态页（hreflang 互链 + x-default fallback）
 * - 单语限定路由（仅在指定 locale 下出现）
 * - 不包含转换器状态（动态内容，搜索引擎不需要）
 *
 * 参考：PRD §7.2 hreflang 互链 + docs/Sitemap-Robots-Llms三件套审查与GSC提交指南-2026-08-11
 */
// 固定 lastmod 而非 new Date()：避免每次部署 <lastmod> 全刷新
// 诱发不必要重爬（与 [[GSC冷启动与收录稳定性指南-2026-08-04]] §3.2 "为改而改有害" 配套）
// 内容真实变更时手动同步此处
const LAST_MODIFIED = '2026-08-11';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://papeltools.com';
  const lastModified = new Date(LAST_MODIFIED);

  const routes = [
    { path: '', priority: 1.0, changeFrequency: 'weekly' as const },
    { path: '/privacy', priority: 0.2, changeFrequency: 'yearly' as const },
    { path: '/terms', priority: 0.2, changeFrequency: 'yearly' as const },
    { path: '/contact', priority: 0.4, changeFrequency: 'monthly' as const },
    // Phase 2/3 页面（路由已存在但 P2 内容，预留）
    { path: '/pdf-to-markdown-for-llm', priority: 0.9, changeFrequency: 'weekly' as const },
    { path: '/pdf-to-markdown-for-obsidian', priority: 0.9, changeFrequency: 'weekly' as const },
    { path: '/pdf-to-markdown-for-rag', priority: 0.8, changeFrequency: 'weekly' as const },
    { path: '/pdf-to-markdown-free-no-upload', priority: 0.9, changeFrequency: 'weekly' as const },
    // /mcp 是 MCP 关键词核心（开发者文档 hub），SEO 主战场升到 0.9
    { path: '/mcp', priority: 0.9, changeFrequency: 'monthly' as const },
    // Phase 2 新页（2026-08-08）— 关键词长尾 + 场景补全
    // /pdf-to-markdown-mcp 是 MCP 营销页（使用者向），与 /mcp 开发者文档分工（依 AGENTS.md 锁定决策）
    { path: '/pdf-to-markdown-mcp', priority: 0.9, changeFrequency: 'weekly' as const },
    { path: '/pdf-ocr-to-markdown', priority: 0.7, changeFrequency: 'weekly' as const },
    { path: '/pdf-to-markdown-with-tables', priority: 0.7, changeFrequency: 'weekly' as const },
  ];

  // 单语限定路由：仅在指定 locale 下生成（其他 locale notFound）
  const localeOnlyRoutes = [
    { path: '/pdf-a-markdown-gratis', locale: 'es' as const, priority: 0.7, changeFrequency: 'weekly' as const },
    { path: '/converter-pdf-em-markdown-gratis', locale: 'pt' as const, priority: 0.7, changeFrequency: 'weekly' as const },
  ];

  // 构造标准化 URL：始终带尾斜杠，与 canonical/hreflang/next.config trailingSlash 一致
  // 英文首页的唯一 canonical 是根路径；英文子页面仍使用 /en/ 前缀。
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
        lastModified,
        changeFrequency: route.changeFrequency,
        priority: route.priority,
        alternates: {
          // 单一来源：hreflangMap（小写 pt-br）+ x-default fallback（Google/Bing 规范）
          languages: {
            ...Object.fromEntries(
              locales.map((l) => [hreflangMap[l], localizedUrl(l, route.path)])
            ),
            // x-default 必须指向默认 locale（en）的 URL
            'x-default': localizedUrl('en', route.path),
          },
        },
      });
    }
  }

  // 单语路由：只在指定 locale 下出现，无 hreflang 互链
  for (const route of localeOnlyRoutes) {
    sitemapEntries.push({
      url: localizedUrl(route.locale, route.path),
      lastModified,
      changeFrequency: route.changeFrequency,
      priority: route.priority,
      // 无 alternates — 单语页面无三语互链
    });
  }

  return sitemapEntries;
}
