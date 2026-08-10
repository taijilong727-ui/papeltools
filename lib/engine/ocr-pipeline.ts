/**
 * OCR Pipeline — 扫描型 PDF 转换（方案 §5.2 步骤 2）
 *
 * 范围：
 * - 纯逻辑（OffscreenCanvas + Web Worker / 现代浏览器 main thread 兼容）
 * - 仅支持 eng/spa/por 三语（PRD FR-44，与 i18n 对齐）
 * - 与 text-pipeline.ts 同形接口（ConversionOptions / ConversionProgress / ConversionResult）
 *
 * 调用方：
 * - workers/converter.worker.ts 的 scanned_pdf 错误降级路径（§5.2 步骤 3 上线）
 * - 未来 MCP convert_pdf 的 ocrEnabled=true 分支（§5.2 步骤 7）
 *
 * 风险：tesseract.js 在子 worker 内 spawn 第二层 worker
 *   - 主线程调：浏览器原生支持
 *   - Dedicated Worker 内调：现代浏览器可工作，依赖 workerBlobURL + 同源
 *   - 运行时验证留 §5.2 步骤 6 E2E
 */

import type { PDFDocumentProxy } from 'pdfjs-dist/types/src/display/api';
import * as Tesseract from 'tesseract.js';
import type {
  ConversionOptions,
  ConversionProgress,
  ConversionResult,
  OcrLanguage,
} from './types';
import { ConversionError } from './types';
import { classifyError } from './errors';
import { countWords, estimateTokens } from './token-estimator';

// pdf.js 使用 dynamic import（避免 SSG 时实例化 DOMMatrix 报错）
// 模块顶层 new DOMMatrix() 在 Next.js 16 静态导出会触发"DOMMatrix is not defined"
async function getPdfjs() {
  const pdfjsLib = await import('pdfjs-dist');
  // pdf.js worker URL（同 converter.worker.ts：构建期输出带 hash 的 worker 资源 URL）
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url
  ).toString();
  return pdfjsLib;
}

/** 自托管 OCR 资源前缀（与 scripts/download-ocr-models.ts 输出对应） */
const OCR_BASE = '/ocr/';
/** tesseract v7 workerBlobURL 模式下，workerPath 必须是具体 .js 文件 URL */
const WORKER_PATH = '/ocr/worker.min.js';

/**
 * 扫描型 PDF 转 Markdown（OCR 路径入口）
 *
 * 与 convertTextPdf 同形接口，区别：
 * - stage 进度用 'ocr' 而非 'parsing/extracting-text/assembling'
 * - metadata.ocr = true（MCP FR-31 依赖此标记）
 *
 * 故障语义：
 * - 用户取消 → 抛 ConversionError('cancelled')，不进入全局 onError
 * - Tesseract 失败 → 包 classifyError 后抛
 * - 其他异常 → 包 classifyError 后抛
 */
export async function convertOcrPdf(
  buffer: ArrayBuffer,
  options: ConversionOptions,
  onProgress: (progress: ConversionProgress) => void,
  signal: AbortSignal
): Promise<ConversionResult> {
  const startTime = performance.now();

  // 0. 取消信号：早期检查
  if (signal.aborted) {
    throw new ConversionError('cancelled', 'Conversion cancelled', {
      retryable: false,
    });
  }

  // 1. 加载 PDF（pdf.js，dynamic import）
  let pdf: PDFDocumentProxy;
  try {
    const pdfjsLib = await getPdfjs();
    // pdf.js 需要 ArrayBuffer 转 Uint8Array 视图（避免 PDFDocument 内部 detach 原 buffer）
    const data = new Uint8Array(buffer);
    pdf = await pdfjsLib.getDocument({ data }).promise;
  } catch (err) {
    throw classifyError(err);
  }
  const totalPages = pdf.numPages;

  // 2. 决定 OCR 引擎语言（默认 eng）
  const language: OcrLanguage = options.ocrLanguage ?? 'eng';

  // 3. 进度：开始 OCR 阶段
  onProgress({ stage: 'ocr', currentPage: 0, totalPages });

  // 4. 启动 tesseract worker（一次创建，多页共用，结束释放）
  // 注意：tesseract v7 workerBlobURL 模式下，workerPath 必须具体到 .js 文件
  // 否则 spawnWorker 写 Blob URL `importScripts('${workerPath}')` 失败
  // （实测错误：Failed to execute 'importScripts' on 'WorkerGlobalScope': The URL '/ocr/' is invalid.）
  const tessWorker = await Tesseract.createWorker(language, 1, {
    workerPath: WORKER_PATH, // /ocr/worker.min.js
    corePath: OCR_BASE, // /ocr/ + tesseract-core-simd.wasm.js
    langPath: OCR_BASE, // /ocr/{eng,spa,por}.traineddata.gz
    workerBlobURL: true,
    gzip: true, // .traineddata.gz 为 gzip 压缩
    legacyLang: false,
    legacyCore: false,
    logger: () => {
      // 静默日志（MVP）；§5.2 步骤 5 UI 联动时会接 progress
    },
    errorHandler: (err: unknown) => {
      // 静默错误，由 classifyError 统一处理
      console.warn('[ocr-pipeline] tesseract error:', err);
    },
  });

  try {
    const pageTexts: string[] = [];
    const SCALE = 2.0; // 渲染缩放：2x DPI 提升 OCR 精度（项目 PRD 默认）

    // 5. 逐页渲染 + OCR
    for (let i = 1; i <= totalPages; i++) {
      // 取消信号：每页前检查
      if (signal.aborted) {
        await tessWorker.terminate().catch(() => {});
        throw new ConversionError('cancelled', 'Conversion cancelled', {
          retryable: false,
        });
      }

      const page = await pdf.getPage(i);

      // 渲染：canvasContext（ctx）+ viewport + canvas（OffscreenCanvas）
      const viewport = page.getViewport({ scale: SCALE });
      const width = Math.ceil(viewport.width);
      const height = Math.ceil(viewport.height);
      const canvas = new OffscreenCanvas(width, height);
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw classifyError(
          new Error('OffscreenCanvas 2d context unavailable')
        );
      }

      // 类型桥接：pdf.js v5 的 RenderParameters 类型仍签名为 HTMLCanvasElement，
      // 但其 JSDoc 与运行时明确支持 OffscreenCanvas（在 worker 中是推荐路径）。
      // 这里走 `as unknown as T` 双重转换而非 `as any`：
      // - AGENTS.md 禁止 `as any`
      // - `as unknown as T` 是 TS 推荐的不安全转换写明确形式
      // - 类型仍可通过 typecheck 验证
      await page
        .render({
          canvasContext: ctx as unknown as CanvasRenderingContext2D,
          viewport,
          canvas: canvas as unknown as HTMLCanvasElement,
        } as Parameters<typeof page.render>[0])
        .promise;

      // OCR 这一页（交给 tesseract worker）
      const tessResult = await tessWorker.recognize(canvas);
      pageTexts.push(tessResult.data.text);

      onProgress({ stage: 'ocr', currentPage: i, totalPages });
    }

    // 6. 组装 Markdown（按页分隔，水平分隔线 + 页标签）
    const markdown = assembleOcrMarkdown(pageTexts);

    // 7. 元数据
    const chars = markdown.length;
    const words = countWords(markdown);
    const tokens = estimateTokens(markdown);
    const durationMs = Math.round(performance.now() - startTime);

    onProgress({
      stage: 'done',
      currentPage: totalPages,
      totalPages,
    });

    return {
      markdown,
      filename: '', // 由调用方（converter.worker.ts）填充 deriveFilename
      metadata: {
        pages: totalPages,
        words,
        chars,
        tokens,
        durationMs,
        ocr: true, // ★ 标记走了 OCR 路径（MCP FR-31 依赖）
      },
    };
  } catch (error) {
    throw classifyError(error);
  } finally {
    // 无论成功 / 失败 / 取消：释放 tesseract worker
    await tessWorker.terminate().catch(() => {
      // 忽略 terminate 错误（worker 可能已终止）
    });
  }
}

/**
 * 把多页纯文本按简单格式组装成 Markdown
 *
 * 选型说明：
 * - 不做结构化识别（标题 / 列表 / 段落）：OCR 精度不足以可靠推断 Markdown 语法
 * - 用水平分隔线 + 页标签切分，便于阅读和裁剪
 * - 段落切分留空行（tesseract 输出通常是单行或简单换行）
 */
function assembleOcrMarkdown(pageTexts: string[]): string {
  return pageTexts
    .map((text, idx) => {
      const trimmed = text.trim();
      if (!trimmed) return '';
      return `---\n\n*Page ${idx + 1}*\n\n${trimmed}`;
    })
    .filter((s) => s.length > 0)
    .join('\n\n');
}
