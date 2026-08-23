import { ConversionError } from './types';

/**
 * 文件预校验 — 在转换之前对文件做轻量检查
 *
 * - 文件大小（M-05: 200MB 硬上限）
 * - MIME / 扩展名（仅接受 PDF）
 * - 文件非空
 *
 * 不在此处做内容解析（pdf.js 检查留到 worker）。
 */

export const MAX_FILE_SIZE = 200 * 1024 * 1024; // 200 MB（PRD M-05）
export const MIN_FILE_SIZE = 100; // 100 bytes — 防止空文件
export const ACCEPTED_MIME = ['application/pdf'];
export const ACCEPTED_EXT = ['.pdf'];

/**
 * 校验用户选择的文件是否符合基本要求
 *
 * @throws ConversionError 包含明确错误码
 */
export function validatePdfFile(file: File): void {
  if (!file) {
    throw new ConversionError('file_empty', 'No file provided', { retryable: false });
  }
  if (file.size === 0 || file.size < MIN_FILE_SIZE) {
    throw new ConversionError('file_empty', 'File is empty or too small', { retryable: false });
  }
  if (file.size > MAX_FILE_SIZE) {
    throw new ConversionError('file_too_big', `File is ${formatBytes(file.size)}, max is ${formatBytes(MAX_FILE_SIZE)}`, { retryable: false });
  }
  // MIME 检测（某些浏览器可能缺失，回退到扩展名）
  const isPdfMime = file.type === '' || ACCEPTED_MIME.includes(file.type);
  const isPdfExt = ACCEPTED_EXT.some((ext) => file.name.toLowerCase().endsWith(ext));
  if (!isPdfMime || !isPdfExt) {
    throw new ConversionError('file_wrong_type', 'Not a PDF file', { retryable: false });
  }
}

/**
 * 格式化字节数为可读字符串（UI 显示用）
 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}