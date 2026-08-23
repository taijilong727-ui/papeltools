import { createRoot } from 'react-dom/client';

/**
 * Popup — 极简快捷入口
 *
 * 弹窗空间有限（默认 280px 宽），不做转换，只放一个"打开转换器"按钮。
 * 点击后在新标签页打开 convert.html（扩展页）。
 *
 * Folder 模式（entrypoints/popup/index.html + main.tsx）：
 * - WXT 0.21 不支持 `definePopup`，只能用 HTML + TSX 入口
 * - folder 模式让 WXT 把 index.html + 同目录 TS/TSX 视为单一 entrypoint
 *   （避免 `popup.html` + `popup.tsx` 同名冲突）
 * - HTML 页面脚本直接执行，**不需要** `defineUnlistedScript`（WXT 官方 React 模板
 *   也不使用）。`defineUnlistedScript` 只用于"程序化手动调用"的脚本（如
 *   `chrome.tabs.executeScript`），不适用于 HTML 页（页面加载即自动执行）。
 */

function Popup() {
  const handleOpen = () => {
    window.open(chrome.runtime.getURL('/convert.html'), '_blank');
  };

  return (
    <div>
      <h1 style={{ margin: '0 0 4px', fontSize: '16px', fontWeight: 600 }}>
        Papel Tools
      </h1>
      <p style={{ margin: '0 0 12px', fontSize: '12px', color: '#666' }}>
        PDF to Markdown — files stay on your device.
      </p>
      <button
        type="button"
        onClick={handleOpen}
        style={{
          width: '100%',
          padding: '8px 12px',
          fontSize: '14px',
          fontWeight: 500,
          color: '#ffffff',
          background: '#1a1a1a',
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer',
        }}
      >
        Open converter
      </button>
    </div>
  );
}

// HTML 页面在浏览器中加载时直接执行 — 不需要 defineUnlistedScript 包装
// （区别于 background.ts 用 defineBackground / content script 用 defineContentScript）
// SSR/Node 守卫：wxt prepare / wxt build 阶段在 Node 环境评估此文件
const rootEl =
  typeof document !== 'undefined' ? document.getElementById('root') : null;
if (rootEl) {
  createRoot(rootEl).render(<Popup />);
}
