'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

/**
 * CopyButton — 单文件 Copy 按钮（'use client'，纯客户端逻辑）
 *
 * 设计动机：
 *   **不**接受代码内容作为 prop。原因：JSON 字符串里的 `{` `}` 字符会触发
 *   RSC 序列化的 MALFORMED_ARGUMENT 错误（详见 [[MCP文档页组件补全方案-2026-08-09]] §十一）。
 *   改为运行时通过 `targetId` 从 DOM 读取文本——代码文本完全留在服务端渲染的 HTML 里，
 *   不进入 RSC payload。
 *
 * 用法（必须与同 id 的 <code> 配套）：
 *   <pre><code id={id}>{jsonString}</code></pre>
 *   <CopyButton targetId={id} language="json" />
 */
interface CopyButtonProps {
  /** 与 <code id=...> 相同的 DOM id */
  targetId: string;
  /** 语言标签（用于 aria-label 补充信息，例如 "json" / "bash"） */
  language: string;
}

export function CopyButton({ targetId, language }: CopyButtonProps) {
  const t = useTranslations('landing.mcp');
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const el = document.getElementById(targetId);
    const text = el?.textContent ?? '';
    if (!text) return;

    try {
      // 现代 API：HTTPS / localhost 可用
      await navigator.clipboard.writeText(text);
    } catch {
      // 降级：HTTP 开发环境 / 老浏览器
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      textarea.style.pointerEvents = 'none';
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand('copy');
      } catch {
        // 静默失败：用户可手动复制
      }
      document.body.removeChild(textarea);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={`${t('ariaCopyCode')} (${language})`}
      className="absolute top-2 right-2 px-3 py-1.5 text-[12px] font-mono rounded-[var(--radius-sm)] border opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity"
      style={{
        background: 'var(--color-paper-soft)',
        borderColor: 'var(--color-rule)',
        color: copied ? 'var(--color-accent)' : 'var(--color-ink-soft)',
      }}
    >
      {copied ? t('copiedButton') : t('copyButton')}
    </button>
  );
}