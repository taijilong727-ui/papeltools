import { useCallback, useRef, useState, type ChangeEvent, type DragEvent, type KeyboardEvent } from 'react';

/**
 * Dropzone — 拖拽 + 点击选择 PDF
 *
 * 行为：
 * - 点击整个区域触发隐藏的 <input type="file">
 * - 拖拽文件时高亮反馈（视觉提示）
 * - 接受 application/pdf 与 .pdf 扩展名
 * - 校验通过后调用 onFile 回调（由 App 层做完整校验）
 *
 * 设计：纸感极简 — 圆形下载图标 + 虚线边框 + 居中布局。
 */

interface DropzoneProps {
  /** 用户选定文件后回调（接收原始 File，由 App 层做校验） */
  onFile: (file: File) => void;
  /** 是否禁用（转换进行中由父组件传入） */
  disabled?: boolean;
}

export function Dropzone({ onFile, disabled }: DropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleClick = useCallback(() => {
    if (disabled) return;
    inputRef.current?.click();
  }, [disabled]);

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) onFile(file);
      // 重置 input，允许再次选同一文件触发 change
      e.target.value = '';
    },
    [onFile]
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (disabled) return;
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleClick();
      }
    },
    [disabled, handleClick]
  );

  const handleDragEnter = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.items?.length) setIsDragging(true);
  }, []);

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    // 持续保持 dragover 状态（默认浏览器每帧重置）
    if (!isDragging) setIsDragging(true);
  }, [isDragging]);

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    // 必须是离开容器本身（非内部子元素冒泡）
    if (e.currentTarget === e.target) setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file) onFile(file);
    },
    [onFile]
  );

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
      aria-label="Drop PDF file here, or press Enter to choose"
      className={`dropzone${isDragging ? ' dropzone--dragging' : ''}`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        onChange={handleChange}
        className="dropzone__input"
        aria-label="Choose PDF file"
        tabIndex={-1}
      />

      <div className="dropzone__icon" aria-hidden="true">
        <svg
          viewBox="0 0 24 24"
          width="28"
          height="28"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 3v12" />
          <path d="m7 10 5 5 5-5" />
          <path d="M4 21h16" />
        </svg>
      </div>

      <strong className="dropzone__title">Drop PDF or click to choose</strong>
      <span className="dropzone__hint">
        Max 200 MB · processed locally in your browser
      </span>
    </div>
  );
}