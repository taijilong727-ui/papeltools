/**
 * Converter — 主线程入口，编排文件验证 + Worker 调用
 *
 * 调用流程：
 *   1. validatePdfFile（文件大小/类型/MIME 校验）
 *   2. 读取 ArrayBuffer
 *   3. WorkerManager.convert（异步）
 *   4. 接收进度/结果/错误事件
 *
 * UI 组件应只调用此模块，不直接接触 worker。
 */

'use client';

import { validatePdfFile } from './file-validator';
import { WorkerManager } from './worker-manager';
import { convertOcrPdf } from './ocr-pipeline';
import type {
  ConversionOptions,
  ConversionProgress,
  ConversionResult,
} from './types';
import { ConversionError } from './types';

/**
 * 单例（页面生命周期内复用）
 */
let managerInstance: WorkerManager | null = null;
function getManager(): WorkerManager {
  if (!managerInstance) {
    managerInstance = new WorkerManager();
  }
  return managerInstance;
}

export interface ConvertCallbacks {
  onProgress: (progress: ConversionProgress) => void;
  onDone: (result: ConversionResult) => void;
  onError: (error: ConversionError) => void;
  /**
   * scanned_pdf 软信号（§5.2 步骤 3 main thread OCR 路径）
   *
   * 触发场景：text-pipeline 识别为扫描型 PDF。
   * UI 通常的响应：
   *   1. 状态 → awaiting_ocr（展示"启用 OCR"按钮）
   *   2. 用户点击 → 调用 `convertPdfViaOcr()` 启动 OCR
   *   3. OCR 完成 → onDone 拿到 Markdown
   *
   * 与 onError 不同：`scanned_pdf` 不是错误，只是"我们需要不同管线"。
   */
  onScannedDetected?: () => void;
}

/**
 * 发起一次 PDF → Markdown 转换
 *
 * @param file 用户选择的 File 对象
 * @param options 转换选项
 * @param callbacks 进度/结果/错误回调
 * @returns 取消函数
 */
export async function convertPdf(
  file: File,
  options: ConversionOptions,
  callbacks: ConvertCallbacks
): Promise<{ cancel: () => void }> {
  // 1. 文件预校验（同步、零成本）
  validatePdfFile(file);

  // 2. 读取 ArrayBuffer（异步；用户文件可能很大）
  const buffer = await file.arrayBuffer();

  // 3. 启动 worker
  const manager = getManager();
  const handle = manager.convert(
    buffer,
    options,
    file.name,
    {
      onProgress: callbacks.onProgress,
      onDone: callbacks.onDone,
      onError: callbacks.onError,
      onScannedDetected: callbacks.onScannedDetected,
    }
  );

  return { cancel: () => handle.cancel() };
}

/**
 * 直接跑 OCR 管线（main thread 调用，§5.2 步骤 3）
 *
 * 用途：用户在上一步 convertPdf 收到 onScannedDetected 后主动触发。
 * 调用方应在点击"启用 OCR"按钮后调用此函数。
 *
 * @param buffer PDF 文件 ArrayBuffer（来自前次 convertPdf 的 file.arrayBuffer()）
 * @param options 含 ocrEnabled / ocrLanguage
 * @param callbacks onProgress / onDone / onError（与 convertPdf 同构）
 * @returns 取消函数
 */
export async function convertPdfViaOcr(
  buffer: ArrayBuffer,
  options: ConversionOptions,
  callbacks: {
    onProgress: (progress: ConversionProgress) => void;
    onDone: (result: ConversionResult) => void;
    onError: (error: ConversionError) => void;
  }
): Promise<{ cancel: () => void }> {
  const controller = new AbortController();

  // 异步调用，不 await（让 onProgress 立即生效，caller 可以 cancel）
  const promise = convertOcrPdf(
    buffer,
    options,
    callbacks.onProgress,
    controller.signal
  )
    .then((result) => callbacks.onDone(result))
    .catch((err) => {
      if (controller.signal.aborted) return;
      const e =
        err instanceof ConversionError
          ? err
          : new ConversionError('unknown', (err as Error)?.message ?? String(err), {
              retryable: true,
            });
      callbacks.onError(e);
    });

  return {
    cancel: () => controller.abort(),
  };
}

/**
 * 销毁 worker（页面卸载或路由切换时调用，释放资源）
 */
export function disposeConverter() {
  managerInstance?.destroy();
  managerInstance = null;
}