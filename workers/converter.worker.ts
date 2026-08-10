/**
 * PDF to Markdown Conversion Worker
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
// pdf.js Worker URL（方案 G，修复 E2E 根因类型 1）
// ─────────────────────────────────────────────
// @pdf2md/core 的 initPdfWorker() 在 Worker 线程内（window 为 undefined）会跳过
// workerSrc 赋值（详见 node_modules/@pdf2md/core/dist/pdf-worker.js 外层守卫），
// 导致 pdf.js 抛出 "No GlobalWorkerOptions.workerSrc specified"。
// 此处使用 Next.js 静态分析的 new URL() 模式，构建期输出带 hash 的 worker 资源 URL，
// 从而在转换线程内显式指定 pdf.worker 脚本。
GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

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
    // （原 message.includes('cancel') 子串匹配脆弱，改用 AbortSignal 显式判断）
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