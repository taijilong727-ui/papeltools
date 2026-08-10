/**
 * lib/mcp/serialize.ts 单测 — CallToolResult 序列化逻辑
 *
 * 覆盖（适配重写后的 serialize.ts — handler 直接返回 native output shape）：
 * - convert_pdf：content 含 markdown 文本 + 元数据 + structuredContent 完整字段
 * - preview_pdf：truncated 标记与文本截断
 * - list_supported_formats：摘要文本 + structuredContent.format 数组
 * - 未知工具兜底
 * - serializeHandlerError：ConversionError / 普通 Error / 字符串三种输入
 */

import { describe, it, expect } from 'vitest';
import { serializeToolResult, serializeHandlerError } from '@/lib/mcp/serialize';
import { ConversionError } from '@/lib/engine/types';
import type {
  ConvertPdfOutput,
  PreviewPdfOutput,
  ListSupportedFormatsOutput,
} from '@/lib/mcp/tools';

const sampleConvert: ConvertPdfOutput = {
  markdown: '# Heading\n\nBody',
  filename: 'Test.md',
  metadata: {
    pages: 5,
    words: 100,
    chars: 200,
    tokens: 50,
    durationMs: 1000,
    ocr: false,
  },
};

const samplePreview: PreviewPdfOutput = {
  preview: 'abc'.repeat(100),
  truncated: true,
  pageCount: 10,
};

const samplePreviewShort: PreviewPdfOutput = {
  preview: 'Short',
  truncated: false,
  pageCount: 1,
};

const sampleList: ListSupportedFormatsOutput = {
  formats: [
    {
      extension: 'pdf',
      mimeType: 'application/pdf',
      maxFileSizeBytes: 3 * 1024 * 1024,
      maxPages: 50,
      ocrSupported: false,
      description: 'Portable Document Format (text-based)',
    },
  ],
};

describe('serializeToolResult — convert_pdf', () => {
  it('内容包含 markdown 文本与元数据 + structuredContent 完整字段', () => {
    const result = serializeToolResult('convert_pdf', sampleConvert);

    expect(result.isError).toBeUndefined();
    const blocks = result.content as Array<{ type: string; text?: string }>;
    expect(blocks[0].type).toBe('text');
    expect(blocks[0].text).toBe('# Heading\n\nBody');
    // 第二个 block 是元数据摘要
    expect(blocks[1].text).toContain('Test.md');
    expect(blocks[1].text).toContain('5'); // pages
    const sc = result.structuredContent as {
      markdown: string;
      filename: string;
      metadata: ConvertPdfOutput['metadata'];
    };
    expect(sc.markdown).toBe('# Heading\n\nBody');
    expect(sc.filename).toBe('Test.md');
    expect(sc.metadata.pages).toBe(5);
    expect(sc.metadata.tokens).toBe(50);
    expect(sc.metadata.ocr).toBe(false);
  });
});

describe('serializeToolResult — preview_pdf', () => {
  it('截断时附加 *[truncated]* 提示', () => {
    const result = serializeToolResult('preview_pdf', samplePreview);

    expect(result.isError).toBeUndefined();
    const blocks = result.content as Array<{ type: string; text?: string }>;
    expect(blocks[0].text).toContain('abc'.repeat(100));
    expect(blocks[0].text).toContain('*[truncated]*');
    const sc = result.structuredContent as unknown as PreviewPdfOutput;
    expect(sc.truncated).toBe(true);
    expect(sc.pageCount).toBe(10);
  });

  it('短 preview 无截断标记', () => {
    const result = serializeToolResult('preview_pdf', samplePreviewShort);
    const blocks = result.content as Array<{ type: string; text?: string }>;
    expect(blocks[0].text).toBe('Short');
    expect(blocks[0].text).not.toContain('truncated');
  });
});

describe('serializeToolResult — list_supported_formats', () => {
  it('返回格式摘要 + 完整 capability 表', () => {
    const result = serializeToolResult('list_supported_formats', sampleList);

    const blocks = result.content as Array<{ type: string; text?: string }>;
    expect(blocks[0].text).toContain('Supported formats');
    expect(blocks[0].text).toContain('.pdf');
    expect(blocks[0].text).toContain('OCR: no');
    const sc = result.structuredContent as { formats: unknown[] };
    expect(Array.isArray(sc.formats)).toBe(true);
    expect(sc.formats).toHaveLength(1);
  });
});

describe('serializeToolResult — 未知工具兜底', () => {
  it('未知工具名 → isError: true + 提示', () => {
    const result = serializeToolResult('unknown_tool', { dummy: true });

    expect(result.isError).toBe(true);
    const blocks = result.content as Array<{ type: string; text?: string }>;
    expect(blocks[0].text).toContain('Unknown tool');
  });
});

describe('serializeHandlerError — 错误信封', () => {
  it('ConversionError → isError + code envelope', () => {
    const err = new ConversionError('encrypted_pdf', 'PDF is encrypted', {
      retryable: false,
    });

    const result = serializeHandlerError(err);

    expect(result.isError).toBe(true);
    const blocks = result.content as Array<{ type: string; text?: string }>;
    expect(blocks[0].text).toContain('encrypted_pdf');
    expect(blocks[0].text).toContain('PDF is encrypted');
  });

  it('普通 Error → 内部错误码 + message', () => {
    const result = serializeHandlerError(new Error('boom'));

    expect(result.isError).toBe(true);
    const blocks = result.content as Array<{ type: string; text?: string }>;
    expect(blocks[0].text).toContain('boom');
    const sc = result.structuredContent as { error: { code: string; message: string } };
    expect(sc.error.code).toBe('internal_error');
  });

  it('非 Error 异常 → 字符串化', () => {
    const result = serializeHandlerError('string error');

    expect(result.isError).toBe(true);
    const blocks = result.content as Array<{ type: string; text?: string }>;
    expect(blocks[0].text).toContain('string error');
  });
});
