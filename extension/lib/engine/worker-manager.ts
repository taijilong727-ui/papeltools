/**
 * WorkerManager — 主线程的 Web Worker 生命周期管理
 *
 * 职责（PRD §4.1 FR-05/10/11，§4.7 M-08）：
 * - 创建/销毁/复用 Worker
 * - 监听进度、结果、错误事件
 * - 转发给 UI 层
 * - Worker 崩溃自动重建 + 重试 1 次（M-08）
 * - AbortSignal 通过 message 传递给 Worker
 */

import type {
  ConversionOptions,
  ConversionProgress,
  ConversionResult,
} from './types';
import { ConversionError } from './types';

export interface WorkerManagerCallbacks {
  onProgress?: (progress: ConversionProgress) => void;
  onDone?: (result: ConversionResult) => void;
  onError?: (error: ConversionError) => void;
  /**
   * scanned_pdf 软信号（§5.2 步骤 3）
   *
   * 当 text-pipeline 抛 `scanned_pdf` 时回调，而非 onError。
   * UI 收到此信号后应切换到 awaiting_ocr 状态，让用户主动选择是否启用 OCR。
   * 触发条件：@pdf2md/core 报告"无文本层"或"扫描件"。
   */
  onScannedDetected?: () => void;
}

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

interface WorkerCrashMessage {
  type: 'crashed';
  id: string;
  reason: string;
}

type WorkerInbound = CancelRequest | ConvertRequest;
type WorkerOutbound = ProgressMessage | DoneMessage | ErrorMessage | WorkerCrashMessage;

export class WorkerManager {
  private worker: Worker | null = null;
  private currentId: string | null = null;
  private retryCount = 0;
  private readonly maxRetries = 1; // PRD M-08: 崩溃重试 1 次
  private callbacks: WorkerManagerCallbacks = {};
  private abortController: AbortController | null = null;
  private pendingRequest: ConvertRequest | null = null;
  // 备份：postMessage 转移 buffer 所有权后原 buffer 失效，重试时需用副本
  private pendingBufferCopy: ArrayBuffer | null = null;

  /**
   * 懒加载 worker（首次转换时才创建，节省首屏资源）
   */
  private ensureWorker(): Worker {
    if (this.worker) return this.worker;
    if (typeof Worker === 'undefined') {
      throw new ConversionError('unknown', 'Web Workers are not supported in this environment', {
        retryable: false,
      });
    }
    // Vite/WXT 静态分析支持 new URL() + import.meta.url 模式加载 worker 模块
    // （从 extension/lib/engine/ → extension/workers/converter.worker.ts）
    this.worker = new Worker(new URL('../../workers/converter.worker.ts', import.meta.url), {
      type: 'module',
    });
    this.worker.addEventListener('message', this.handleMessage);
    this.worker.addEventListener('error', this.handleError);
    return this.worker;
  }

  private handleMessage = (event: MessageEvent<WorkerOutbound>) => {
    const data = event.data;
    if (data.id !== this.currentId) return; // 忽略过期消息

    switch (data.type) {
      case 'progress':
        this.callbacks.onProgress?.(data.progress);
        break;
      case 'done':
        this.callbacks.onDone?.(data.result);
        this.cleanup();
        break;
      case 'error':
        // worker 主动取消时不再 post cancelled 消息（见 converter.worker.ts），
        // 此处保留为防御性分支（防止第三方 worker 仍发此消息）
        if (data.code === 'cancelled') {
          this.cleanup();
          break;
        }
        // 扫描件软信号（§5.2 步骤 3）：scanned_pdf 是 OCR 入口而非错误
        // UI 此时应触发"启用 OCR"按钮，而非展示错误页
        if (data.code === 'scanned_pdf') {
          this.callbacks.onScannedDetected?.();
          // 注意：不清理 — WorkerManager 进入 idle 等待后续操作
          this.currentId = null;
          this.pendingRequest = null;
          this.pendingBufferCopy = null;
          // abortController 保留以便外部 cancel
          break;
        }
        this.callbacks.onError?.(
          new ConversionError(
            (data.code as ConversionError['code']) || 'unknown',
            data.message,
            { retryable: false }
          )
        );
        this.cleanup();
        break;
      case 'crashed':
        this.handleCrash(data.reason);
        break;
    }
  };

  private handleError = (event: ErrorEvent) => {
    // Worker 内部未捕获异常
    this.handleCrash(event.message || 'Unknown worker error');
  };

  /**
   * Worker 崩溃处理：重建 Worker 并自动重试 1 次（PRD M-08）
   */
  private handleCrash(reason: string) {
    console.warn('[WorkerManager] Worker crashed:', reason);
    this.disposeWorker();

    if (this.retryCount < this.maxRetries) {
      this.retryCount += 1;
      // 重新提交当前任务
      const pending = this.pendingRequest;
      const bufferCopy = this.pendingBufferCopy;
      if (pending && bufferCopy) {
        // 用备份副本重建请求（原 buffer 已被 postMessage 转移所有权，detached 不可用）
        const retryRequest = { ...pending, buffer: bufferCopy };
        // 通知 UI "自动重试中"
        this.callbacks.onProgress?.({
          stage: 'parsing',
          currentPage: 0,
          totalPages: 0,
        });
        // 延迟一帧再重启，避免相同原因再次崩溃
        setTimeout(() => this.dispatch(retryRequest), 100);
        return;
      }
    }

    this.callbacks.onError?.(
      new ConversionError('worker_crashed', `Worker crashed: ${reason}`, { retryable: true })
    );
    this.cleanup();
  }

  /**
   * 发起一次转换请求
   *
   * 单例 WorkerManager 不支持并发：在已有任务运行/排队时拒绝新请求。
   * 调用方（ConverterSection）应保证 status === 'idle' 时才调用本方法。
   * 双重防护：UI 层禁用 Dropzone + Manager 层硬校验，避免竞态。
   */
  convert(
    buffer: ArrayBuffer,
    options: ConversionOptions,
    filename: string,
    callbacks: WorkerManagerCallbacks
  ): { id: string; cancel: () => void } {
    // 并发防护：如果已有任务，拒绝并抛出错误（让 UI 走 onError 路径）
    if (this.currentId !== null || this.pendingRequest !== null) {
      const error = new ConversionError(
        'unknown',
        'A conversion is already running. Please cancel it or wait for it to finish.',
        { retryable: false }
      );
      // 同步回调：让 UI 能立即感知并发请求
      queueMicrotask(() => callbacks.onError?.(error));
      return {
        id: 'rejected',
        cancel: () => {},
      };
    }

    this.callbacks = callbacks;
    this.retryCount = 0;
    this.abortController = new AbortController();

    const id = generateId();
    this.currentId = id;
    const request: ConvertRequest = { type: 'convert', id, buffer, options, filename };
    this.pendingRequest = request;
    // 备份 buffer 副本，供崩溃重试使用（postMessage 转移后原 buffer 失效）
    this.pendingBufferCopy = buffer.slice(0);
    this.dispatch(request);

    return {
      id,
      cancel: () => this.cancel(id),
    };
  }

  private dispatch(request: ConvertRequest) {
    try {
      const worker = this.ensureWorker();
      // 转移 buffer 所有权（避免复制）
      worker.postMessage(request, [request.buffer]);
    } catch (err) {
      this.callbacks.onError?.(
        new ConversionError('unknown', `Failed to start worker: ${(err as Error).message}`, {
          cause: err,
          retryable: false,
        })
      );
      this.cleanup();
    }
  }

  /**
   * 取消当前任务
   *
   * 设计：取消**不**产生 error。cancel 只通知 worker 停止 + 清理状态；
   * UI 层通过 status 流转感知取消（idle/converting/done/error 取消仅回到 idle）。
   * 移除此处与 `ConverterSection.handleCancel` 的双重 onError 路径。
   */
  cancel(id: string) {
    if (id !== this.currentId) return;
    this.abortController?.abort();
    const worker = this.worker;
    if (worker) {
      worker.postMessage({ type: 'cancel', id } satisfies CancelRequest);
    }
    this.cleanup();
  }

  private disposeWorker() {
    if (this.worker) {
      this.worker.removeEventListener('message', this.handleMessage);
      this.worker.removeEventListener('error', this.handleError);
      this.worker.terminate();
      this.worker = null;
    }
  }

  private cleanup() {
    this.abortController = null;
    this.currentId = null;
    this.pendingRequest = null;
    this.pendingBufferCopy = null;
  }

  /**
   * 完全销毁（页面卸载时调用）
   */
  destroy() {
    this.disposeWorker();
    this.cleanup();
    this.callbacks = {};
  }
}

function generateId(): string {
  return `conv-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}