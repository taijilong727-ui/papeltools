/**
 * 引擎统一导出
 */
export { convertPdf, convertPdfViaOcr, disposeConverter } from './converter';
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