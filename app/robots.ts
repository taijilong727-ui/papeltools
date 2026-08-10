/**
 * robots.txt — PRD §8.3 GEO 战术 #2
 *
 * 关键：放行 AI 实时检索爬虫：
 *   - OAI-SearchBot (OpenAI 搜索)
 *   - ChatGPT-User (ChatGPT 浏览)
 *   - PerplexityBot (Perplexity)
 *   - Claude-SearchBot / Claude-User (Anthropic)
 *   - Googlebot / Bingbot (传统搜索引擎)
 *
 * 可选：屏蔽训练爬虫（GPTBot / CCBot / ClaudeBot）以贴合隐私品牌
 */

// robots.txt 静态预渲染：SSG 模式下由构建期生成（混合模式）
export const dynamic = 'force-static';

export default function robots() {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/'],
      },
      // 放行 AI 检索爬虫
      { userAgent: 'OAI-SearchBot', allow: '/' },
      { userAgent: 'ChatGPT-User', allow: '/' },
      { userAgent: 'PerplexityBot', allow: '/' },
      { userAgent: 'Claude-SearchBot', allow: '/' },
      { userAgent: 'Claude-User', allow: '/' },
      { userAgent: 'Googlebot', allow: '/' },
      { userAgent: 'Bingbot', allow: '/' },
      // 屏蔽 AI 训练爬虫（隐私立场）
      { userAgent: 'GPTBot', disallow: '/' },
      { userAgent: 'CCBot', disallow: '/' },
      { userAgent: 'ClaudeBot', disallow: '/' },
      { userAgent: 'anthropic-ai', disallow: '/' },
      { userAgent: 'Bytespider', disallow: '/' },
    ],
    sitemap: 'https://papeltools.com/sitemap.xml',
    host: 'https://papeltools.com',
  };
}