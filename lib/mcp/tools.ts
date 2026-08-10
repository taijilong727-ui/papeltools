/**
 * MCP 工具定义与实现（远程 /mcp + 本地 stdio 包双轨共享）
 *
 * 参考：
 * - PRD FR-31（convert_pdf）/ FR-32（preview_pdf）/ FR-33（list_supported_formats）/ FR-34（双轨共享）
 * - PRD M-11（远程限制：文件 ≤ 3MB、maxPages ≤ 50）
 * - docs/MCP实现分析与架构影响-2026-08-07.md §四（引擎共享：转换代码同一份）
 *
 * 设计约束：
 * - 工具 handler 返回**结构化数据**，不直接返回 MCP CallToolResult——
 *   由传输层（远程 Route Handler / 本地 StdioServerTransport）统一包装，
 *   保证两端共享同一份业务逻辑（FR-34）。
 * - 转换走 lib/engine/text-pipeline.ts 的 convertTextPdf —— 与网页工具同一引擎（勿分叉逻辑）。
 * - OCR 不在本文件范围：远程 MVP 不含 OCR（见架构文档 §5.7 决策点）。
 * - 校验独立于 lib/engine/file-validator.ts（后者绑定浏览器 File API，此处为 Node Buffer）。
 */

import { z } from 'zod';
import { convertTextPdf } from '../engine/text-pipeline';
import { deriveFilename } from '../engine/markdown-assembler';
import { ConversionError } from '../engine/types';
import type { ConversionOptions } from '../engine/types';

/** 远程 MCP 文件大小上限：3 MB（PRD M-11，Vercel 4.5MB body 限制 ÷ Base64 膨胀 1.33x） */
export const REMOTE_MAX_FILE_SIZE_BYTES = 3 * 1024 * 1024;

/** 远程 MCP 最大页数：50（PRD M-11；OCR 场景需降至 15，MVP 不含 OCR 故不涉及） */
export const REMOTE_MAX_PAGES = 50;

/** preview_pdf 返回的预览截断长度（字符） */
export const PREVIEW_MAX_CHARS = 4000;

/* ------------------------------------------------------------------ */
/* 入参 Schema（zod，供传输层注册工具时直接使用）                        */
/* ------------------------------------------------------------------ */

/** 转换选项（与 ConversionOptions 对齐，仅暴露远程允许的子集） */
const conversionOptionsSchema = z
  .object({
    /** 最大页数（默认 50，远程上限） */
    maxPages: z.number().int().positive().max(REMOTE_MAX_PAGES).optional(),
    /** 输出格式 */
    outputFormat: z.enum(['markdown', 'json', 'both']).optional(),
    /** 按标题分块 */
    chunkBy: z.enum(['page', 'heading', 'token']).optional(),
    /** 每块最大 token 数 */
    maxTokensPerChunk: z.number().int().positive().optional(),
  })
  .optional();

/** convert_pdf 入参 */
export const convertPdfSchema = z.object({
  /** PDF 文件内容（Base64 编码；解码后 ≤ 3MB） */
  file: z.string().min(1, 'file 不能为空'),
  /** 原始文件名（用于生成 .md 文件名 fallback） */
  filename: z.string().min(1).optional(),
  /** 转换选项 */
  options: conversionOptionsSchema,
});
export type ConvertPdfInput = z.infer<typeof convertPdfSchema>;

/** preview_pdf 入参（file 为可选：未提供时用 file 字段，双轨共用同一校验） */
export const previewPdfSchema = z.object({
  /** PDF 文件内容（Base64 编码；解码后 ≤ 3MB） */
  file: z.string().min(1, 'file 不能为空'),
  /** 原始文件名（用于生成 .md 文件名 fallback） */
  filename: z.string().min(1).optional(),
  /** 转换选项（预览同样受 maxPages 限制） */
  options: conversionOptionsSchema,
});
export type PreviewPdfInput = z.infer<typeof previewPdfSchema>;

/** list_supported_formats 入参（无） */
export const listSupportedFormatsSchema = z.object({});
export type ListSupportedFormatsInput = z.infer<typeof listSupportedFormatsSchema>;

/* ------------------------------------------------------------------ */
/* 出参类型                                                             */
/* ------------------------------------------------------------------ */

export interface ConvertPdfOutput {
  markdown: string;
  /** 生成的 .md 文件名（优先 PDF 标题，fallback 原始文件名） */
  filename: string;
  metadata: {
    pages: number;
    words: number;
    chars: number;
    tokens: number;
    durationMs: number;
    ocr: boolean;
  };
}

export interface PreviewPdfOutput {
  /** Markdown 预览（截断到 PREVIEW_MAX_CHARS） */
  preview: string;
  /** 是否被截断 */
  truncated: boolean;
  pageCount: number;
}

export interface ListSupportedFormatsOutput {
  formats: Array<{
    extension: string;
    mimeType: string;
    maxFileSizeBytes: number;
    maxPages: number;
    /** 远程 MVP 不支持 OCR（架构文档 §5.7） */
    ocrSupported: boolean;
    description: string;
  }>;
}

/* ------------------------------------------------------------------ */
/* 工具注册（双轨共享）                                                  */
/* ------------------------------------------------------------------ */

/** MCP 工具定义（schema + handler；传输层负责序列化为 MCP 协议格式） */
export interface McpToolDefinition {
  name: string;
  description: string;
  schema: z.ZodType;
  handler: (input: never) => Promise<unknown>;
}

/**
 * 工具定义工厂：由 schema 自动推导 handler 的入参类型
 * （避免 McpToolDefinition 数组字面量处的类型不匹配）
 */
export function defineTool<TSchema extends z.ZodType>(
  name: string,
  description: string,
  schema: TSchema,
  handler: (input: z.infer<TSchema>) => Promise<unknown>
): McpToolDefinition {
  return { name, description, schema, handler };
}

/* ------------------------------------------------------------------ */
/* 工具实现                                                             */
/* ------------------------------------------------------------------ */

/**
 * Base64 → ArrayBuffer（带远程大小校验）
 *
 * @throws ConversionError file_empty / file_too_big
 */
function decodeBase64Pdf(base64: string): ArrayBuffer {
  if (!base64) {
    throw new ConversionError('file_empty', 'No file provided', { retryable: false });
  }
  const buffer = Buffer.from(base64, 'base64');
  if (buffer.byteLength === 0) {
    throw new ConversionError('file_empty', 'File is empty or too small', { retryable: false });
  }
  if (buffer.byteLength > REMOTE_MAX_FILE_SIZE_BYTES) {
    throw new ConversionError(
      'file_too_big',
      `File exceeds ${REMOTE_MAX_FILE_SIZE_BYTES / (1024 * 1024)}MB remote limit`,
      { retryable: false }
    );
  }
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
}

/**
 * 执行文本型 PDF 转换（MCP 版本，PRD FR-31）
 *
 * 与网页工具共用 convertTextPdf —— 同一引擎、同一错误分类。
 * 进度回调与 AbortSignal 在 MCP 场景下无 UI 可绑，使用空回调 + 永未触发信号。
 */
export async function convertPdf(input: ConvertPdfInput): Promise<ConvertPdfOutput> {
  const arrayBuffer = decodeBase64Pdf(input.file);
  const options: ConversionOptions = {
    maxPages: input.options?.maxPages ?? REMOTE_MAX_PAGES,
    outputFormat: input.options?.outputFormat,
    chunkBy: input.options?.chunkBy,
    maxTokensPerChunk: input.options?.maxTokensPerChunk,
  };

  const result = await convertTextPdf(
    arrayBuffer,
    options,
    () => {
      // MCP 无进度 UI，忽略进度事件（保留占位以对齐签名）
    },
    new AbortController().signal
  );

  return {
    markdown: result.markdown,
    filename: deriveFilename(result.sourceMeta, input.filename),
    metadata: {
      pages: result.metadata.pages,
      words: result.metadata.words,
      chars: result.metadata.chars,
      tokens: result.metadata.tokens,
      durationMs: result.metadata.durationMs,
      // 远程 MVP 仅文本管线，OCR 恒为 false（见架构文档 §5.7）
      ocr: false,
    },
  };
}

/**
 * 生成 Markdown 预览（PRD FR-32）
 *
 * MVP 实现：全文转换后截取前 PREVIEW_MAX_CHARS 字符。
 * 未来可优化为按页转换（page 参数），不改变工具名与出参结构。
 */
export async function previewPdf(input: PreviewPdfInput): Promise<PreviewPdfOutput> {
  const arrayBuffer = decodeBase64Pdf(input.file);
  const options: ConversionOptions = {
    maxPages: input.options?.maxPages ?? REMOTE_MAX_PAGES,
    // 预览恒为 markdown 输出
    outputFormat: 'markdown',
  };

  const result = await convertTextPdf(
    arrayBuffer,
    options,
    () => {
      // 同上：MCP 无进度 UI
    },
    new AbortController().signal
  );

  const truncated = result.markdown.length > PREVIEW_MAX_CHARS;
  return {
    preview: truncated ? result.markdown.slice(0, PREVIEW_MAX_CHARS) : result.markdown,
    truncated,
    pageCount: result.metadata.pages,
  };
}

/**
 * 列出支持的输入格式（PRD FR-33）
 *
 * 返回远程端能力声明（大小/页数上限 + OCR 支持情况），
 * 供 Agent 在调用 convert_pdf 前判断文件是否可处理。
 */
export async function listSupportedFormats(
  _input: ListSupportedFormatsInput
): Promise<ListSupportedFormatsOutput> {
  return {
    formats: [
      {
        extension: 'pdf',
        mimeType: 'application/pdf',
        maxFileSizeBytes: REMOTE_MAX_FILE_SIZE_BYTES,
        maxPages: REMOTE_MAX_PAGES,
        // 远程 MVP 不含 OCR（架构文档 §5.7 决策点：本地 stdio 包是 OCR 主战场）
        ocrSupported: false,
        description: 'Portable Document Format (text-based)',
      },
    ],
  };
}

/* ------------------------------------------------------------------ */
/* 工具注册表（远程 /mcp 与本地 stdio 包共用）                            */
/* ------------------------------------------------------------------ */

export const mcpTools: McpToolDefinition[] = [
  defineTool(
    'convert_pdf',
    '将 PDF 文件（Base64）转换为 Markdown。文件最大 3MB、最多 50 页。返回 Markdown 内容、生成的文件名与转换统计。',
    convertPdfSchema,
    convertPdf
  ),
  defineTool(
    'preview_pdf',
    '将 PDF 文件（Base64）转换为 Markdown 预览（截断到 4000 字符），用于快速判断内容质量后再决定是否完整转换。',
    previewPdfSchema,
    previewPdf
  ),
  defineTool(
    'list_supported_formats',
    '列出远程 MCP 支持的文件格式及其限制（大小上限、页数上限、OCR 支持情况）。',
    listSupportedFormatsSchema,
    listSupportedFormats
  ),
];
