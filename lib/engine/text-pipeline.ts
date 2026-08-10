import { convert } from '@pdf2md/core';
import type { ConversionMessage } from '@pdf2md/core';
import type { ConversionOptions, ConversionProgress, ConversionResult } from './types';
import { classifyError } from './errors';
import { countWords, estimateTokens } from './token-estimator';

/**
 * TextPipeline — 文本型 PDF 转换
 *
 * 包装 @pdf2md/core（基于 pdf.js v5），提供：
 * - 进度回调（@pdf2md/core 自带 onProgress）
 * - AbortSignal 支持
 * - 统一返回结构（包含 token 估算 + 字符数）
 * - 错误分类
 */

/** @pdf2md/core 的进度事件 */
interface CoreProgress {
  stage: string;
  currentPage: number;
  totalPages: number;
}

/** @pdf2md/core 的结果 */
interface CoreResult {
  status: 'success' | 'partial' | 'failed';
  markdown: string;
  messages?: ConversionMessage[];
  stats: { pageCount: number; wordCount: number; processingMs: number };
  metadata?: {
    title?: string;
    author?: string;
    subject?: string;
    keywords?: string[];
    creationDate?: string;
  };
  chunks?: unknown[];
  structured?: unknown;
}

/**
 * 执行文本型 PDF 转换
 *
 * @param buffer PDF 文件 ArrayBuffer
 * @param options 转换选项
 * @param onProgress 进度回调（UI 层订阅）
 * @param signal AbortSignal 用于取消
 */
export async function convertTextPdf(
  buffer: ArrayBuffer,
  options: ConversionOptions,
  onProgress: (progress: ConversionProgress) => void,
  signal: AbortSignal
): Promise<ConversionResult> {
  const startTime = performance.now();

  try {
    const result = (await convert(buffer, {
      maxPages: options.maxPages ?? Infinity,
      outputFormat: options.outputFormat === 'json' ? 'json' : undefined,
      chunkBy: options.chunkBy,
      maxTokensPerChunk: options.maxTokensPerChunk,
      // 必传：默认 false 会让 result.metadata 永远 undefined，
      // 导致 deriveFilename 无法从 PDF 标题生成 .md 文件名（fallback 到原文件名）
      includeMetadata: true,
      signal,
      onProgress: (progress: CoreProgress) => {
        // 映射 @pdf2md/core 的 stage 到我们的阶段
        const stage = mapStage(progress.stage);
        onProgress({
          stage,
          currentPage: progress.currentPage,
          totalPages: progress.totalPages,
        });
      },
    })) as CoreResult;

    const durationMs = Math.round(performance.now() - startTime);
    const markdown = result.markdown ?? '';

    // @pdf2md/core 在某些错误场景下不 throw，而是返回 status: 'failed' + 空 markdown
    // — 我们必须把它当作错误处理（否则 UI 收到空 markdown 显示 "(empty result)"）
    if (result.status === 'failed') {
      throw new Error(result.messages?.[0]?.message ?? 'Conversion failed');
    }

    const chars = markdown.length;
    const words = countWords(markdown);
    const tokens = estimateTokens(markdown);

    onProgress({ stage: 'done', currentPage: result.stats.pageCount, totalPages: result.stats.pageCount });

    return {
      markdown,
      filename: '', // 由 caller 填充
      metadata: {
        pages: result.stats.pageCount,
        words,
        chars,
        tokens,
        durationMs,
      },
      sourceMeta: result.metadata,
    };
  } catch (error) {
    // 取消信号被 AbortSignal 抛出，单独处理
    if (signal.aborted) {
      throw new Error('Conversion cancelled');
    }
    throw classifyError(error);
  }
}

/**
 * 映射 @pdf2md/core 的 stage 字符串到我们的 ConversionStage
 */
function mapStage(coreStage: string): ConversionProgress['stage'] {
  const s = coreStage.toLowerCase();
  if (s.includes('parse')) return 'parsing';
  // 先匹配 ocr：未来 @pdf2md/core 可能加 OCR stage，需独立显示
  if (s.includes('ocr')) return 'ocr';
  if (s.includes('extract')) return 'extracting-text';
  if (s.includes('assembl') || s.includes('format')) return 'assembling';
  return 'parsing';
}