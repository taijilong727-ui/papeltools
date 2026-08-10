/**
 * 转换引擎类型定义
 *
 * 参考：
 * - PRD §4.1 核心转换 (P0)
 * - PRD §4.7 MVP 范围决策 (M-01/M-05/M-07/M-08)
 * - docs/具体架构分析-2026-08-04.md §1 转换引擎
 */

/** 转换阶段（用于进度 UI） */
export type ConversionStage =
  | 'idle'
  | 'parsing'
  | 'extracting-text'
  | 'ocr'
  | 'assembling'
  | 'done'
  | 'error'
  | 'cancelled';

/**
 * OCR 引擎语言代码（Tesseract.js 简称；详见 PRD §4.4 FR-44 + §7.3）
 *
 * 当前 MVP 范围：en / es / pt 三语（与 i18n 对齐）
 * 实际映射在 lib/i18n/config.ts ocrLanguageMap 中定义（MCP 走同映射）
 *
 * 类型硬约束而非 string：避免拼写错误（如 'spn'），新增语种时需同步
 * 更新此处 + config + 资源脚本（§5.1 步骤 2）。
 */
export type OcrLanguage = 'eng' | 'spa' | 'por';

/** 进度事件（Worker → 主线程） */
export interface ConversionProgress {
  stage: ConversionStage;
  currentPage: number;
  totalPages: number;
  /** 当前阶段在总进度中的权重比例 */
  weight?: number;
}

/** 转换结果 */
export interface ConversionResult {
  markdown: string;
  filename: string;
  metadata: {
    pages: number;
    words: number;
    chars: number;
    tokens: number;
    durationMs: number;
    /**
     * 是否走 OCR 路径（与文本管线区分标记）
     * - true：扫描型 PDF 经 Tesseract.js 识别得到的 Markdown
     * - false / undefined：文本型 PDF 经 @pdf2md/core 得到的 Markdown
     * MCP convert_pdf 出参依赖此字段做能力声明（PRD FR-31）
     */
    ocr?: boolean;
  };
  sourceMeta?: {
    title?: string;
    author?: string;
    subject?: string;
    keywords?: string[];
    creationDate?: string;
  };
}

/** 转换选项 */
export interface ConversionOptions {
  /** 是否提取图片占位（MVP 占位字段，未来扩展） */
  includeImages?: boolean;
  /** 最大页数限制（MVP 不限制，传 Infinity） */
  maxPages?: number;
  /** 输出格式 */
  outputFormat?: 'markdown' | 'json' | 'both';
  /** 按标题分块（P1） */
  chunkBy?: 'page' | 'heading' | 'token';
  maxTokensPerChunk?: number;
  /**
   * 是否启用 OCR 路径（扫描件降级，方案 A：捕获 scanned_pdf 错误 → OCR 重试）
   * - undefined / true：扫描型自动降级到 OCR（默认行为）
   * - false：扫描型直接抛 scanned_pdf 错误（MVP 现有行为）
   * PRD FR-22（文本层差时强制 OCR）+ FR-23（升级路线留口）
   */
  ocrEnabled?: boolean;
  /**
   * OCR 引擎语言（仅当 ocrEnabled 为 true 时有意义）
   * 默认按 UI 语言映射（lib/i18n/config.ts ocrLanguageMap），可手动覆盖
   * MCP convert_pdf 入参同字段（PRD FR-31）
   */
  ocrLanguage?: OcrLanguage;
}

/** 错误码（与 UI 错误文案映射） */
export type ConversionErrorCode =
  | 'file_too_big'
  | 'file_empty'
  | 'file_wrong_type'
  | 'encrypted_pdf'
  | 'scanned_pdf'
  | 'corrupted_pdf'
  | 'worker_crashed'
  | 'cancelled'
  | 'unknown';

/** 错误对象 */
export class ConversionError extends Error {
  code: ConversionErrorCode;
  cause?: unknown;
  retryable: boolean;

  constructor(
    code: ConversionErrorCode,
    message: string,
    options?: { cause?: unknown; retryable?: boolean }
  ) {
    super(message);
    this.name = 'ConversionError';
    this.code = code;
    this.cause = options?.cause;
    this.retryable = options?.retryable ?? false;
  }
}