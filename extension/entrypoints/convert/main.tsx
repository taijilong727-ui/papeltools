import { createRoot } from 'react-dom/client';
import { App } from '../../components/App';
import '../../styles/globals.css';

/**
 * 扩展转换页入口 — React 19 挂载根
 *
 * Folder 模式（entrypoints/convert/index.html + main.tsx）：
 * - WXT 0.21 folder 模式避免 `convert.html` + `convert.tsx` 同名冲突
 * - HTML 页面脚本直接执行，**不需要** `defineUnlistedScript`（WXT 官方 React 模板
 *   也不使用）。`defineUnlistedScript` 只用于程序化手动调用的脚本，不适用于 HTML 页。
 * - 不使用 'use client'（扩展用 Vite 构建，无 Next.js RSC 上下文）。
 *
 * SSR/Node 守卫：WXT 在 `wxt prepare` / `wxt build` 阶段会在 Node 环境
 * 评估入口文件（用于类型生成与 manifest 元数据），此时 document 不存在。
 * 直接访问 getElementById 会抛错，导致构建失败。仅在浏览器侧执行挂载。
 */

const container =
  typeof document !== 'undefined' ? document.getElementById('root') : null;
if (container) {
  createRoot(container).render(<App />);
}
