'use client';

import { useCallback, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';

/**
 * Dropzone — 拖拽 + 点击上传
 *
 * 行为：
 * - 点击整个区域触发隐藏的 <input type="file">
 * - 拖拽文件高亮
 * - 接受 application/pdf
 * - 调用 onFileSelected 回调
 *
 * 设计：纸感极简 — 圆形图标 + 直角容器 + 米色背景
 */

interface DropzoneProps {
  onFileSelected: (file: File) => void;
  disabled?: boolean;
}

export function Dropzone({ onFileSelected, disabled }: DropzoneProps) {
  const t = useTranslations('converter');
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleClick = useCallback(() => {
    if (disabled) return;
    inputRef.current?.click();
  }, [disabled]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) onFileSelected(file);
      // 重置 input，允许选同一文件
      e.target.value = '';
    },
    [onFileSelected]
  );

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.items?.length) setIsDragging(true);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) setIsDragging(true);
  }, [isDragging]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // 必须是离开容器本身（非内部子元素）
    if (e.currentTarget === e.target) setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file) onFileSelected(file);
    },
    [onFileSelected]
  );

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`relative px-8 py-12 md:py-16 flex flex-col items-center gap-2 cursor-pointer transition-colors ${
        isDragging ? 'bg-[color-mix(in_srgb,var(--color-accent)_6%,var(--color-paper-soft))]' : ''
      }`}
      style={{
        border: '1px dashed var(--color-rule)',
        borderRadius: 'var(--radius-lg)',
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        onChange={handleChange}
        className="sr-only"
        aria-label={t('ariaChooseFile')}
        tabIndex={-1}
      />

      <div
        className="w-16 h-16 grid place-items-center mb-3"
        style={{
          background: 'color-mix(in srgb, var(--color-accent) 12%, transparent)',
          color: 'var(--color-accent)',
          borderRadius: '50%',
        }}
        aria-hidden="true"
      >
        <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3v12" />
          <path d="m7 10 5 5 5-5" />
          <path d="M4 21h16" />
        </svg>
      </div>

      <strong className="text-[19px] font-display font-medium">{t('dropTitle')}</strong>
      <span className="text-[14.5px] text-[var(--color-ink-soft)]">
        {t('dropHint')}
      </span>
    </div>
  );
}