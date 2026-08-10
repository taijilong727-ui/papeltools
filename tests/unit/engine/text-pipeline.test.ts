/**
 * TextPipeline 单元测试 — 对应测试策略 T-01
 *
 * 说明：
 * - 真实 PDF 解析由 @pdf2md/core 完成（需真实文件），结构断言（H1-H6、列表、
 *   表格、代码块、链接、多栏）在 E2E 层用 fixture 验证（tests/e2e/converter-flow.spec.ts）。
 * - 本文件 mock @pdf2md/core 的 convert，验证管线**包装逻辑**：
 *   返回结构、stage 映射、options 透传、取消信号、错误分类。
 * - T-01-01 ~ T-01-07 在此以"markdown 透传 + metadata 计算"方式覆盖，
 *   并在每个用例标注对应 E2E 断言位置。
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { convertTextPdf } from '@/lib/engine/text-pipeline';
import { ConversionError } from '@/lib/engine/types';
import type { ConversionProgress } from '@/lib/engine/types';

// ── mock @pdf2md/core ────────────────────────────────────────────
const convertMock = vi.hoisted(() => vi.fn());
vi.mock('@pdf2md/core', () => ({ convert: convertMock }));

/** 构造一个合法的 CoreResult（@pdf2md/core 0.3.0 结构） */
function coreResult(overrides: Record<string, unknown> = {}) {
  return {
    status: 'success',
    markdown: '# Heading',
    messages: [],
    stats: { pageCount: 2, wordCount: 20, processingMs: 50 },
    chunks: [],
    ...overrides,
  };
}

describe('T-01 TextPipeline（@pdf2md/core 包装）', () => {
  beforeEach(() => {
    convertMock.mockReset();
  });

  it('T-01-核心：返回统一 ConversionResult 结构（markdown + metadata）', async () => {
    convertMock.mockResolvedValue(coreResult({ markdown: '# Heading\n\nSome body text.' }));

    const result = await convertTextPdf(new ArrayBuffer(8), {}, () => {}, new AbortController().signal);

    expect(result.markdown).toBe('# Heading\n\nSome body text.');
    expect(result.metadata.pages).toBe(2);
    // 字数：'#'(1) + 'Heading'(1) + 'Some'(1) + 'body'(1) + 'text.'(1) = 5 个独立非空白 token
    expect(result.metadata.words).toBe(5);
    // 字符数：'#'(1)+' '(1)+'Heading'(7)+'\n'(1)+'\n'(1)+'Some'(4)+' '(1)+'body'(4)+' '(1)+'text.'(5) = 26
    expect(result.metadata.chars).toBe(26);
    expect(result.metadata.tokens).toBeGreaterThan(0);
    expect(result.metadata.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('T-01-01~07：markdown 结构原样透传（真实结构由 E2E fixture 验证）', async () => {
    // 覆盖：H1-H6 / 列表 / 表格 / 代码块 / 链接 —— 管线应原样透传不做二次加工
    const markdown = [
      '# H1',
      '## H2',
      '### H3',
      '- item',
      '1. ordered',
      '| a | b |',
      '| - | - |',
      '```ts\nconst x = 1;\n```',
      '[link](https://example.com)',
    ].join('\n');
    convertMock.mockResolvedValue(coreResult({ markdown }));

    const result = await convertTextPdf(new ArrayBuffer(8), {}, () => {}, new AbortController().signal);
    expect(result.markdown).toBe(markdown);
    // E2E 对照：tests/e2e/converter-flow.spec.ts —— 上传 sample-text.pdf 后预览区包含这些结构
  });

  it('T-01-stage：@pdf2md/core 的 stage 正确映射到 ConversionStage', async () => {
    const received: ConversionProgress[] = [];
    // @pdf2md/core 0.3.0 API：onProgress 在 options 对象内（不是第 3 个位置参数）
    convertMock.mockImplementation(
      async (
        _buffer: ArrayBuffer,
        options: { onProgress?: (p: { stage: string; currentPage: number; totalPages: number }) => void }
      ) => {
        options.onProgress?.({ stage: 'Parsing page 1 of 3', currentPage: 1, totalPages: 3 });
        options.onProgress?.({ stage: 'Extracting text', currentPage: 2, totalPages: 3 });
        options.onProgress?.({ stage: 'Assembling markdown', currentPage: 3, totalPages: 3 });
        return coreResult();
      }
    );

    await convertTextPdf(
      new ArrayBuffer(8),
      {},
      (p) => received.push(p),
      new AbortController().signal
    );

    const stages = received.map((p) => p.stage);
    expect(stages).toContain('parsing');
    expect(stages).toContain('extracting-text');
    expect(stages).toContain('assembling');
    expect(received.at(-1)?.stage).toBe('done'); // 收尾上报 done
  });

  it('T-01-options：转换选项与取消信号透传给 @pdf2md/core', async () => {
    const signal = new AbortController().signal;
    const sentOptions: Record<string, unknown> = {};
    convertMock.mockImplementation(async (_buffer: ArrayBuffer, options: Record<string, unknown>) => {
      Object.assign(sentOptions, options);
      return coreResult();
    });

    await convertTextPdf(
      new ArrayBuffer(8),
      { maxPages: 10, outputFormat: 'markdown', chunkBy: 'heading', maxTokensPerChunk: 2000 },
      () => {},
      signal
    );

    expect(sentOptions.maxPages).toBe(10);
    expect(sentOptions.outputFormat).toBeUndefined(); // markdown 是默认值，不透传
    expect(sentOptions.chunkBy).toBe('heading');
    expect(sentOptions.maxTokensPerChunk).toBe(2000);
    expect(sentOptions.signal).toBe(signal);
  });

  it('T-01-取消：signal.aborted 时抛 "Conversion cancelled"', async () => {
    convertMock.mockRejectedValue(new DOMException('Aborted', 'AbortError'));
    const controller = new AbortController();
    controller.abort();

    await expect(
      convertTextPdf(new ArrayBuffer(8), {}, () => {}, controller.signal)
    ).rejects.toThrow('Conversion cancelled');
  });

  it('T-01-错误分类：核心库抛错映射为 ConversionError 错误码', async () => {
    convertMock.mockRejectedValue(new Error('Encrypted PDFs are not supported'));

    await expect(
      convertTextPdf(new ArrayBuffer(8), {}, () => {}, new AbortController().signal)
    ).rejects.toMatchObject({ code: 'encrypted_pdf' });
  });
});
