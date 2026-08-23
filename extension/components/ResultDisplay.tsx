import { useCallback, useEffect, useRef, useState } from 'react';
import { copyToClipboard, downloadMarkdown, type ConversionResult } from '../lib/engine';

/**
 * ResultDisplay — 转换结果展示
 *
 * 功能：
 * - 文件名 chip + 元数据（页数 / 字数 / tokens / 耗时）
 * - Markdown 预览（等宽字体，最多 320px 高度滚动）
 * - Download 按钮（触发 .md 下载）
 * - Copy 按钮（写入剪贴板 + 状态反馈）
 * - "New file" 按钮（重置回 idle）
 */

interface ResultDisplayProps {
  result: ConversionResult;
  onReset: () => void;
}

/** 千位分隔格式化（英文 locale） */
function formatNumber(n: number): string {
  return n.toLocaleString('en-US');
}

type CopyState = 'idle' | 'copied' | 'failed';

export function ResultDisplay({ result, onReset }: ResultDisplayProps) {
  const [copyState, setCopyState] = useState<CopyState>('idle');
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 卸载时清理 timer，避免 setState on unmounted component
  useEffect(() => {
    return () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    };
  }, []);

  const handleDownload = useCallback(() => {
    downloadMarkdown(result.markdown, result.filename);
  }, [result.markdown, result.filename]);

  const handleCopy = useCallback(async () => {
    const ok = await copyToClipboard(result.markdown);
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current);

    if (ok) {
      setCopyState('copied');
      copyTimerRef.current = setTimeout(() => setCopyState('idle'), 1400);
    } else {
      setCopyState('failed');
      copyTimerRef.current = setTimeout(() => setCopyState('idle'), 2400);
    }
  }, [result.markdown]);

  const copyLabel =
    copyState === 'copied' ? 'Copied' : copyState === 'failed' ? 'Copy failed' : 'Copy';

  return (
    <div className="result" role="region" aria-label="Conversion result">
      <div className="result__header">
        <span className="result__filename">{result.filename}</span>
        <span className="result__meta">
          {formatNumber(result.metadata.pages)} pages ·{' '}
          {formatNumber(result.metadata.words)} words · ~
          {formatNumber(result.metadata.tokens)} tokens
          {result.metadata.durationMs > 0 &&
            ` · ${(result.metadata.durationMs / 1000).toFixed(1)}s`}
        </span>
      </div>

      <div
        className="result__preview"
        role="region"
        aria-label="Markdown preview"
      >
        {result.markdown || '(Empty result)'}
      </div>

      <div className="result__actions">
        <button
          type="button"
          className="result__btn result__btn--primary"
          onClick={handleDownload}
          aria-label="Download Markdown file"
        >
          <svg
            viewBox="0 0 24 24"
            width="15"
            height="15"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Download .md
        </button>

        <button
          type="button"
          className="result__btn"
          onClick={handleCopy}
          aria-label={
            copyState === 'copied'
              ? 'Markdown copied to clipboard'
              : 'Copy Markdown to clipboard'
          }
          aria-live="polite"
        >
          {copyLabel}
        </button>

        <button
          type="button"
          className="result__btn result__btn--ghost"
          onClick={onReset}
          aria-label="Convert another file"
        >
          New file
        </button>
      </div>
    </div>
  );
}