/**
 * 错误模式匹配 — 将 @pdf2md/core 抛出的错误分类到我们的错误码
 *
 * @pdf2md/core 0.3.0 的错误信息特征：
 * - "File size exceeds the 15 MB limit"
 * - "Encrypted PDFs are not supported"
 * - "No text layer found" / "PDF appears to be scanned"
 * - "Invalid PDF" / 解析异常
 */
import { ConversionError, type ConversionErrorCode } from './types';

export function classifyError(error: unknown): ConversionError {
  if (error instanceof ConversionError) return error;

  const message = (error instanceof Error ? error.message : String(error)).toLowerCase();

  if (message.includes('size') && message.includes('15 mb')) {
    return new ConversionError('file_too_big', 'File too large (>15 MB)', { cause: error, retryable: false });
  }
  if (message.includes('encrypted') || message.includes('password')) {
    return new ConversionError('encrypted_pdf', 'Encrypted PDF', { cause: error, retryable: false });
  }
  if (
    message.includes('no text') ||
    message.includes('no text layer') ||
    message.includes('scanned') ||
    message.includes('image-based')
  ) {
    return new ConversionError('scanned_pdf', 'No text layer found', { cause: error, retryable: false });
  }
  if (
    message.includes('invalid') ||
    message.includes('corrupt') ||
    message.includes('parse') ||
    message.includes('unexpected')
  ) {
    return new ConversionError('corrupted_pdf', 'Corrupted or invalid PDF', { cause: error, retryable: false });
  }

  return new ConversionError('unknown', 'Unknown conversion error', { cause: error, retryable: true });
}

/** 把错误码映射到 UI 翻译 key */
export const errorTranslationKeys: Record<ConversionErrorCode, string> = {
  file_too_big: 'errors.fileTooBig',
  file_empty: 'errors.fileEmpty',
  file_wrong_type: 'errors.fileWrongType',
  encrypted_pdf: 'errors.encryptedFile',
  scanned_pdf: 'errors.scannedFile',
  corrupted_pdf: 'errors.corruptedFile',
  worker_crashed: 'errors.workerCrashed',
  cancelled: 'errors.genericError',
  unknown: 'errors.genericError',
};