/**
 * MCP 工具单元测试 — 对应 PRD FR-31/32/33 + docs/MCP实现分析与架构影响-2026-08-07.md §四
 *
 * 说明：
 * - 与 text-pipeline.test.ts 相同策略：mock @pdf2md/core 的 convert，
 *   验证 tools.ts 的**包装逻辑**（Base64 解码、options 透传、文件名推导、
 *   元数据组装、能力声明、大小/空文件校验）。
 * - 真实 PDF 解析由 E2E 层用 fixture 验证（tests/e2e）。
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  convertPdf,
  previewPdf,
  listSupportedFormats,
  REMOTE_MAX_FILE_SIZE_BYTES,
  REMOTE_MAX_PAGES,
  PREVIEW_MAX_CHARS,
} from '@/lib/mcp/tools';
import { ConversionError } from '@/lib/engine/types';

// ── mock @pdf2md/core ────────────────────────────────────────────
const convertMock = vi.hoisted(() => vi.fn());
vi.mock('@pdf2md/core', () => ({ convert: convertMock }));

/** 构造一个合法的 CoreResult（@pdf2md/core 0.3.0 结构） */
function coreResult(overrides: Record<string, unknown> = {}) {
  return {
    status: 'success',
    markdown: '# Heading\n\nBody text.',
    messages: [],
    stats: { pageCount: 2, wordCount: 5, processingMs: 50 },
    chunks: [],
    metadata: { title: 'Test Title', author: 'Tester' },
    ...overrides,
  };
}

/** 任意文本 → Base64（转换被 mock，无需真实 PDF 字节） */
function base64Of(text: string): string {
  return Buffer.from(text, 'utf-8').toString('base64');
}

describe('MCP tools — convert_pdf（FR-31）', () => {
  beforeEach(() => {
    convertMock.mockReset();
  });

  it('默认 maxPages=50 且 includeMetadata=true 透传给共享引擎', async () => {
    convertMock.mockResolvedValue(coreResult());

    await convertPdf({ file: base64Of('fake pdf bytes') });

    expect(convertMock).toHaveBeenCalledTimes(1);
    const options = convertMock.mock.calls[0][1];
    expect(options.maxPages).toBe(REMOTE_MAX_PAGES);
    expect(options.includeMetadata).toBe(true);
  });

  it('自定义 options（maxPages/outputFormat/chunkBy/maxTokensPerChunk）正确透传', async () => {
    convertMock.mockResolvedValue(coreResult());

    await convertPdf({
      file: base64Of('fake pdf bytes'),
      options: { maxPages: 10, outputFormat: 'json', chunkBy: 'heading', maxTokensPerChunk: 500 },
    });

    const options = convertMock.mock.calls[0][1];
    expect(options.maxPages).toBe(10);
    expect(options.outputFormat).toBe('json');
    expect(options.chunkBy).toBe('heading');
    expect(options.maxTokensPerChunk).toBe(500);
  });

  it('文件名优先从 PDF 标题推导（deriveFilename 复用）', async () => {
    convertMock.mockResolvedValue(coreResult({ metadata: { title: 'Annual Report 2026' } }));

    const result = await convertPdf({ file: base64Of('fake'), filename: 'report.pdf' });

    expect(result.filename).toBe('Annual-Report-2026.md');
  });

  it('无标题时文件名 fallback 到原始文件名', async () => {
    convertMock.mockResolvedValue(coreResult({ metadata: undefined }));

    const result = await convertPdf({ file: base64Of('fake'), filename: 'my-doc.pdf' });

    expect(result.filename).toBe('my-doc.md');
  });

  it('元数据完整组装且 ocr 恒为 false（远程 MVP 不含 OCR）', async () => {
    convertMock.mockResolvedValue(coreResult({ markdown: '# H\n\nword1 word2' }));

    const result = await convertPdf({ file: base64Of('fake') });

    expect(result.metadata.pages).toBe(2);
    expect(result.metadata.chars).toBe(result.markdown.length);
    expect(result.metadata.tokens).toBeGreaterThan(0);
    expect(result.metadata.ocr).toBe(false);
  });

  it('超 3MB 远程上限 → 抛 file_too_big（不调用引擎）', async () => {
    const oversized = Buffer.alloc(REMOTE_MAX_FILE_SIZE_BYTES + 1).toString('base64');

    await expect(convertPdf({ file: oversized })).rejects.toMatchObject({
      code: 'file_too_big',
      retryable: false,
    });
    expect(convertMock).not.toHaveBeenCalled();
  });

  it('空 file → 抛 file_empty（不调用引擎）', async () => {
    await expect(convertPdf({ file: '' })).rejects.toMatchObject({
      code: 'file_empty',
    });
    expect(convertMock).not.toHaveBeenCalled();
  });

  it('引擎返回 failed 状态 → 抛出 ConversionError（复用共享错误分类）', async () => {
    convertMock.mockResolvedValue(
      coreResult({ status: 'failed', messages: [{ message: 'Encrypted PDF' }] })
    );

    await expect(convertPdf({ file: base64Of('fake') })).rejects.toBeInstanceOf(ConversionError);
  });
});

describe('MCP tools — preview_pdf（FR-32）', () => {
  beforeEach(() => {
    convertMock.mockReset();
  });

  it('超长 markdown 截断到 PREVIEW_MAX_CHARS 并标记 truncated', async () => {
    const long = 'x'.repeat(PREVIEW_MAX_CHARS + 500);
    convertMock.mockResolvedValue(coreResult({ markdown: long, stats: { pageCount: 3, wordCount: 1, processingMs: 50 } }));

    const result = await previewPdf({ file: base64Of('fake') });

    expect(result.truncated).toBe(true);
    expect(result.preview.length).toBe(PREVIEW_MAX_CHARS);
    expect(result.pageCount).toBe(3);
  });

  it('短 markdown 不截断', async () => {
    convertMock.mockResolvedValue(coreResult({ markdown: '# Short' }));

    const result = await previewPdf({ file: base64Of('fake') });

    expect(result.truncated).toBe(false);
    expect(result.preview).toBe('# Short');
  });

  it('preview 默认 maxPages=50（远程上限）', async () => {
    convertMock.mockResolvedValue(coreResult());

    await previewPdf({ file: base64Of('fake') });

    // 注：outputFormat 的 'markdown' 值会被引擎层映射为 undefined（text-pipeline 内部逻辑，
    // 已有 text-pipeline.test.ts 覆盖），故此处只断言页数透传
    expect(convertMock.mock.calls[0][1].maxPages).toBe(REMOTE_MAX_PAGES);
  });
});

describe('MCP tools — list_supported_formats（FR-33）', () => {
  it('能力声明与远程限制一致（pdf / 3MB / 50 页 / 无 OCR）', async () => {
    const result = await listSupportedFormats({});

    expect(result.formats).toHaveLength(1);
    const format = result.formats[0];
    expect(format.extension).toBe('pdf');
    expect(format.mimeType).toBe('application/pdf');
    expect(format.maxFileSizeBytes).toBe(REMOTE_MAX_FILE_SIZE_BYTES);
    expect(format.maxPages).toBe(REMOTE_MAX_PAGES);
    expect(format.ocrSupported).toBe(false);
  });
});
