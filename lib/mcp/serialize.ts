/**
 * MCP 工具结果序列化 — 把 lib/mcp/tools.ts 的强类型输出包成 MCP `CallToolResult`
 *
 * 参考：MCP 协议 types.ts 中 TextContent / CallToolResult schema（@modelcontextprotocol/sdk 1.30.x）
 * 与 docs/MCP实现分析与架构影响-2026-08-07.md §四（传输层负责序列化，业务层返回结构化数据）
 *
 * 设计：
 * - handler 直接返回 ConvertPdfOutput / PreviewPdfOutput / ListSupportedFormatsOutput
 * - serialize.ts 接 handler 输出，按 toolName 分派到对应的 MCP 包装
 * - convert_pdf/preview_pdf → content: text 块（Markdown 直接呈现给 LLM）
 *   + structuredContent: 完整结构化结果（供程序化消费）
 * - list_supported_formats → content: 文本摘要 + structuredContent: 完整能力表
 * - 错误：handler 抛错后由 server.ts 捕获，包成 isError
 */

import type { CallToolResult, TextContent } from '@modelcontextprotocol/sdk/types.js';
import type {
  ConvertPdfOutput,
  PreviewPdfOutput,
  ListSupportedFormatsOutput,
} from './tools';

/** union: handler 的合法返回（业务层三个工具强类型） */
export type ToolOutput =
  | ConvertPdfOutput
  | PreviewPdfOutput
  | ListSupportedFormatsOutput;

/** 把 output shape 转为 MCP CallToolResult（含文本 + 结构化） */
export function serializeToolResult(
  toolName: string,
  output: unknown
): CallToolResult {
  switch (toolName) {
    case 'convert_pdf':
      return serializeConvertPdf(output as ConvertPdfOutput);

    case 'preview_pdf':
      return serializePreviewPdf(output as PreviewPdfOutput);

    case 'list_supported_formats':
      return serializeListSupportedFormats(output as ListSupportedFormatsOutput);

    default:
      return {
        content: [
          {
            type: 'text',
            text: `Unknown tool: ${toolName}`,
          } satisfies TextContent,
        ],
        isError: true,
      };
  }
}

/* ---------------- per-tool serializers ---------------- */

function serializeConvertPdf(v: ConvertPdfOutput): CallToolResult {
  const markdown = typeof v?.markdown === 'string' ? v.markdown : '';
  const filename = typeof v?.filename === 'string' ? v.filename : 'untitled.md';
  const meta = v?.metadata;

  return {
    content: [
      { type: 'text', text: markdown } satisfies TextContent,
      {
        type: 'text',
        text:
          `\n\n---\n**Filename:** \`${filename}\`\n` +
          (meta
            ? `**Pages:** ${meta.pages}\n**Tokens:** ${meta.tokens}\n**OCR:** ${meta.ocr}\n`
            : ''),
      } satisfies TextContent,
    ],
    structuredContent: {
      filename,
      markdown,
      metadata: meta ?? null,
    },
  };
}

function serializePreviewPdf(v: PreviewPdfOutput): CallToolResult {
  const preview = typeof v?.preview === 'string' ? v.preview : '';
  const truncated = Boolean(v?.truncated);
  const pageCount = Number.isFinite(v?.pageCount) ? (v.pageCount as number) : 0;

  return {
    content: [
      {
        type: 'text',
        text: truncated ? `${preview}\n\n*[truncated]*` : preview,
      } satisfies TextContent,
    ],
    structuredContent: {
      preview,
      truncated,
      pageCount,
    },
  };
}

function serializeListSupportedFormats(
  v: ListSupportedFormatsOutput
): CallToolResult {
  const formats = Array.isArray(v?.formats) ? v.formats : [];
  const summary = formats
    .map((f) => {
      const sizeMB = (f.maxFileSizeBytes / 1024 / 1024).toFixed(0);
      const ocr = f.ocrSupported ? 'yes' : 'no';
      return `- \`.${f.extension}\` (${f.mimeType}) — ≤${sizeMB}MB, ≤${f.maxPages} pages, OCR: ${ocr}`;
    })
    .join('\n');

  return {
    content: [
      { type: 'text', text: `# Supported formats\n\n${summary}` } satisfies TextContent,
    ],
    structuredContent: { formats },
  };
}

/* ---------------- error envelope ---------------- */

/** 把 handler 抛出的异常统一包成 isError: true 的 CallToolResult */
export function serializeHandlerError(error: unknown): CallToolResult {
  const err = error as
    | { code?: string; message?: string; cause?: unknown; stack?: string }
    | null;
  const message = error instanceof Error ? error.message : String(error);
  const code = err?.code ?? 'internal_error';

  const detail: Record<string, unknown> = { code, message };
  if (err?.cause) {
    detail.cause =
      err.cause instanceof Error
        ? { message: err.cause.message, stack: err.cause.stack }
        : err.cause;
  }
  if (error instanceof Error && error.stack) {
    detail.stack = error.stack.split('\n').slice(0, 6).join('\n');
  }

  return {
    content: [
      { type: 'text', text: `[${code}] ${message}` } satisfies TextContent,
    ],
    isError: true,
    structuredContent: { error: detail },
  };
}
