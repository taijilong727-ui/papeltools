import { redirect } from 'next/navigation';

/**
 * 根路径静态重定向到 /en/
 *
 * 三层机制保证 `/` 永远能跳转到 `/en/`：
 * 1. **Vercel 边缘层**（生产）：vercel.json 配置 `permanent: true` 301，最优 SEO 权重传递
 * 2. **静态 HTML 兜底**（其他静态托管）：本文件 `redirect()` 生成 `<meta http-equiv="refresh">` HTML
 * 3. **Next.js dev**（本地开发）：本文件 `redirect()` 由 Next.js 路由系统处理为 302
 *
 * 触发链路：用户访问 `/` → Vercel 301 拦截（如已部署）/ Next.js 302（如 dev）/ 静态 HTML meta-refresh（如其他托管） → 浏览器 GET `/en/`
 */
export default function RootIndex() {
  redirect('/en/');
}