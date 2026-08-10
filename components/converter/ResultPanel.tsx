'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { formatNumber } from '@/lib/engine/token-estimator';
import { copyToClipboard, downloadMarkdown } from '@/lib/engine/markdown-assembler';
import { DonateLink } from '@/components/DonateLink';
import type { ConversionResult } from '@/lib/engine';

/**
 * ResultPanel — 转换结果展示
 *
 * - 文件名 chip
 * - 元数据（页数/字数/token 估算/耗时）
 * - Markdown 预览（纯文本展示，高亮 token 数字）
 * - 下载 / 复制按钮
 */

interface ResultPanelProps {
  result: ConversionResult;
}

export function ResultPanel({ result }: ResultPanelProps) {
  const t = useTranslations('converter');
  const [copyState, setCopyState] = useState<'idle' | 'copied'>('idle');
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 组件卸载时清理 timer，避免 setState on unmounted component
  useEffect(() => {
    return () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    };
  }, []);

  const handleDownload = () => {
    downloadMarkdown(result.markdown, result.filename);
  };

  const handleCopy = async () => {
    const ok = await copyToClipboard(result.markdown);
    if (ok) {
      setCopyState('copied');
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => setCopyState('idle'), 1400);
    }
  };

  return (
    <div className="px-5 py-5 border-t border-[var(--color-rule)] animate-in fade-in slide-in-from-bottom-2">
      {/* 头部：文件名 + 元数据 */}
      <div className="flex items-center gap-2.5 mb-3.5 flex-wrap">
        <span
          className="font-mono text-[13px] px-3 py-1"
          style={{
            background: 'color-mix(in srgb, var(--color-accent) 10%, transparent)',
            color: 'var(--color-accent)',
            borderRadius: 'var(--radius-sm)',
          }}
        >
          {result.filename}
        </span>
        <span
          data-testid="result-metadata"
          className="ml-auto font-mono text-[12.5px] text-[var(--color-ink-soft)]"
        >
          {formatNumber(result.metadata.pages)} {t('unitPage', { count: result.metadata.pages })} ·{' '}
          {formatNumber(result.metadata.words)} {t('unitWord', { count: result.metadata.words })} · ~
          {formatNumber(result.metadata.tokens)} {t('unitToken')}
          {result.metadata.durationMs > 0 && ` · ${(result.metadata.durationMs / 1000).toFixed(1)}s`}
        </span>
        {/* §5.2 步骤 5：OCR 结果透明标记 — 让用户知道精度可能不如文本型 */}
        {result.metadata.ocr && (
          <span
            data-testid="ocr-badge"
            title={t('ocrBadgeTitle')}
            className="font-mono text-[10.5px] px-1.5 py-0.5 uppercase tracking-[0.08em]"
            style={{
              background: 'var(--color-paper)',
              color: 'var(--color-ink-soft)',
              border: '1px solid var(--color-rule)',
              borderRadius: 'var(--radius-sm)',
            }}
          >
            {t('ocrBadge')}
          </span>
        )}
      </div>

      {/* Markdown 预览 */}
      <div
        className="p-5 font-mono text-[13px] leading-[1.75] text-[var(--color-ink-soft)] whitespace-pre-wrap max-h-[320px] overflow-auto"
        style={{
          background: 'var(--color-paper)',
          border: '1px solid var(--color-rule)',
          borderRadius: 'var(--radius-md)',
        }}
        role="region"
        aria-label={t('ariaPreview')}
      >
        {result.markdown || t('emptyResult')}
      </div>

      {/* 操作按钮 */}
      <div className="flex gap-2.5 mt-4 flex-wrap">
        <button
          type="button"
          onClick={handleDownload}
          className="inline-flex items-center gap-2 font-display text-[14px] font-medium px-4 py-2.5 hover:-translate-y-0.5 transition-transform"
          style={{
            background: 'var(--color-accent)',
            color: 'var(--color-accent-soft)',
            borderRadius: 'var(--radius-md)',
            letterSpacing: '0.02em',
          }}
        >
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          {t('downloadButton')}
        </button>
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-2 font-display text-[14px] font-medium px-4 py-2.5 hover:-translate-y-0.5 transition-transform"
          style={{
            background: 'transparent',
            color: 'var(--color-ink)',
            border: '1px solid var(--color-rule)',
            borderRadius: 'var(--radius-md)',
            letterSpacing: '0.02em',
          }}
        >
          {copyState === 'copied' ? t('copiedText') : t('copyButton')}
        </button>
      </div>

      {/* 位置 A：转换完成后低调提示（不影响主操作，零网络请求） */}
      <div className="mt-3.5 text-center">
        <DonateLink variant="prompt" />
      </div>
    </div>
  );
}