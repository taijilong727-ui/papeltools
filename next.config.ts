import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

// next-intl 插件：在构建时生成静态资源
const withNextIntl = createNextIntlPlugin('./lib/i18n/request.ts');

const nextConfig: NextConfig = {
  // 混合模式：页面 SSG（generateStaticParams 已就位）+ 单一 Serverless Function /api/mcp
  // PRD FR-30、M-11；docs/MCP实现分析与架构影响-2026-08-07.md §三 决策 A（2026-08-08）
  // 注意：AGENTS.md "纯静态托管" 锁定决策已迁移到"Vercel 混合模式"，Cloudflare Pages 选项失效
  // 静态导出：开启 trailingSlash 让输出目录为 en/index.html（与 sitemap/canonical/hreflang 一致）
  trailingSlash: true,
  // 服务端打包：外置 @pdf2md/core（实际 ESM 包装层）让 Node runtime
  // 走 node_modules 解析 @pdf2md/core → pdfjs-dist 整条 ESM 链
  //
  // 为什么不直接外置 'pdfjs-dist'：pdfjs-dist v5 是 ESM-only（"type": "module"），
  // serverExternalPackages 的外置机制走 CJS require()，会触发 ERR_REQUIRE_ESM。
  // Next.js 看见 import 后会警告并回退到 bundle（详见用户报告的 dev 警告）。
  // 外置 @pdf2md/core 才能让 Next 16 的 ESM-aware external 走 dynamic import。
  //
  // 原始动机：避免 webpack/turbopack 把 pdf.worker.mjs 嵌进 chunks/
  // 导致 pdf.js 启动 fake worker fallback 失败（MCP Phase 1 远程端核心修复）
  // 参考 docs/MCP实现分析与架构影响-2026-08-07.md §五 worker 定位风险
  serverExternalPackages: ['@pdf2md/core'],
  // 图片优化关闭：项目只用自托管静态资源（public/ 下的 SVG/PNG，无 next/image 组件），
  // 无需启动 Next.js 图片优化 pipeline；混合模式下保持简单且避免 Serverless 端额外计算
  images: { unoptimized: true },
  // CSP / 安全头
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },
  // 明确排除 pdfjs-dist 的服务端代码（它在浏览器中需要 worker）
  webpack(config) {
    config.resolve.alias = {
      ...config.resolve.alias,
      canvas: false,
    };
    return config;
  },
};

export default withNextIntl(nextConfig);