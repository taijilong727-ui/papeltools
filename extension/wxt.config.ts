import { defineConfig } from 'wxt';

/**
 * Papel Tools Chrome 扩展 — WXT 配置
 *
 * 关键决策（参考 docs/Chrome扩展技术方案-2026-08-13.md）：
 * - MV3 服务工作者（type: 'module' 默认）
 * - 零 host_permissions（锁定决策 §三：隐私叙事一致）
 * - 仅 contextMenus 一个权限 — downloads 权限已移除（2026-08-16 review
 *   发现 markdown-assembler.ts 用 DOM <a download> 触发下载，扩展页内
 *   可用 chrome.downloads API 冗余）。权限最小化有利 Store 审核。
 * - 生产关闭 sourcemap（§五坑 6：绝对路径泄露）
 *
 * 图标（icons）：从 public/icon-*.png 提供（WXT 自动复制 public/ 到 .output）。
 * 16/32/48 供工具栏三档 DPI；128 供 Chrome Web Store 列表大图。
 */
export default defineConfig({
  srcDir: '.',
  // 显式声明 MV3（避免 WXT 自动推断偏差）
  manifestVersion: 3,
  manifest: {
    name: 'Papel Tools - PDF to Markdown',
    description: 'Privacy-first PDF to Markdown converter. Files never leave your device.',
    permissions: ['contextMenus'],
    // 故意省略 host_permissions — 扩展为纯本地转换
    icons: {
      '16': 'icon-16.png',
      '32': 'icon-32.png',
      '48': 'icon-48.png',
      '128': 'icon-128.png',
    },
  },
  vite: () => ({
    build: {
      sourcemap: false,
    },
  }),
});