/**
 * PDF to Markdown Conversion Worker (Vite/WXT 版)
 *
 * 相比主仓库 workers/converter.worker.ts 的差异：
 * - pdf.js Worker 加载方式：Next.js `new URL()` → Vite `?worker` 语法
 *   （Vite 实证方案：避免 assetsInlineLimit / data: URI CSP 限制）
 *
 * 运行在独立线程（PRD §4.1 FR-05/10/11，§4.7 M-08）：
 * - 加载 @pdf2md/core（其内部已用 pdf.js Worker）
 * - 通过 postMessage 与主线程通信
 * - 支持 AbortSignal 取消
 *
 * 注意：所有计算在此线程完成，**不发起任何网络请求**（PRD 零上传硬性要求）。
 */

import { GlobalWorkerOptions } from 'pdfjs-dist';
import { convertTextPdf } from '../lib/engine/text-pipeline';
import { deriveFilename } from '../lib/engine/markdown-assembler';
import type {
  ConversionOptions,
  ConversionProgress,
  ConversionResult,
} from '../lib/engine/types';
import { ConversionError } from '../lib/engine/types';

// ─────────────────────────────────────────────
// pdf.js Worker（Vite `?worker` 语法，§五坑 3 实证方案）
// ─────────────────────────────────────────────
// 用 workerPort 显式指定 Worker 实例，pdf.js 内部会通过 postMessage 与其通信。
// @pdf2md/core 的 initPdfWorker() 会检测到 workerPort 已设置，跳过自身的初始化。
import PdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?worker';
GlobalWorkerOptions.workerPort = new PdfWorker();

// ─────────────────────────────────────────────
// 消息协议
// ─────────────────────────────────────────────

interface ConvertRequest {
  type: 'convert';
  id: string;
  buffer: ArrayBuffer;
  options: ConversionOptions;
  filename: string;
}

interface CancelRequest {
  type: 'cancel';
  id: string;
}

type InboundMessage = ConvertRequest | CancelRequest;

interface ProgressMessage {
  type: 'progress';
  id: string;
  progress: ConversionProgress;
}
interface DoneMessage {
  type: 'done';
  id: string;
  result: ConversionResult;
}
interface ErrorMessage {
  type: 'error';
  id: string;
  code: string;
  message: string;
}
interface CrashedMessage {
  type: 'crashed';
  id: string;
  reason: string;
}

type OutboundMessage = ProgressMessage | DoneMessage | ErrorMessage | CrashedMessage;

// ─────────────────────────────────────────────
// 取消令牌注册表（每个任务一个 AbortController）
// ─────────────────────────────────────────────

const controllers = new Map<string, AbortController>();

function post(msg: OutboundMessage) {
  (self as unknown as Worker).postMessage(msg);
}

// 全局未处理 Promise 拒绝兜底（async 路径错误可能逃逸 try/catch）
// 'error' 事件已由主线程 worker.onerror → handleCrash 路径处理（主线程会触发重试），
// 故此处不再监听 'error'，仅保留 'unhandledrejection'（async 路径特有）。
self.addEventListener('unhandledrejection', (event) => {
  event.preventDefault?.();
  console.error('[converter.worker] Unhandled rejection:', event.reason);
});

self.addEventListener('message', async (event: MessageEvent<InboundMessage>) => {
  const data = event.data;

  if (data.type === 'cancel') {
    const controller = controllers.get(data.id);
    controller?.abort();
    controllers.delete(data.id);
    return;
  }

  if (data.type !== 'convert') return;

  const { id, buffer, options, filename } = data;
  const controller = new AbortController();
  controllers.set(id, controller);

  try {
    // 先上报 parsing 阶段，让 UI 有即时反馈
    post({ type: 'progress', id, progress: { stage: 'parsing', currentPage: 0, totalPages: 0 } });

    const result = await convertTextPdf(
      buffer,
      options,
      (progress) => post({ type: 'progress', id, progress }),
      controller.signal
    );

    // 填充文件名（从源 PDF 标题派生）
    result.filename = deriveFilename(result.sourceMeta, filename);

    controllers.delete(id);
    post({ type: 'done', id, result });
  } catch (error) {
    controllers.delete(id);
    // 主动取消：worker 不发任何消息，main thread 通过 cancel()→cleanup() 自行清理
    if (controller.signal.aborted) {
      return;
    }
    if (error instanceof ConversionError) {
      post({ type: 'error', id, code: error.code, message: error.message });
    } else {
      // 未预期错误：通知主线程崩溃以便触发重试
      post({
        type: 'crashed',
        id,
        reason: (error as Error)?.message ?? 'Unknown error',
      });
    }
  }
});

export {}; // 模块隔离