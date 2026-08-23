/**
 * 引擎统一导出
 *
 * 扩展 MVP：未导出 convertPdfViaOcr（不内置 OCR 引擎）。
 */
export { convertPdf, disposeConverter } from './converter';
export { downloadMarkdown, copyToClipboard } from './markdown-assembler';
export { validatePdfFile, MAX_FILE_SIZE, formatBytes } from './file-validator';
export {
  ConversionError,
  type ConversionErrorCode,
  type ConversionProgress,
  type ConversionResult,
  type ConversionOptions,
  type ConversionStage,
  type OcrLanguage,
} from './types';