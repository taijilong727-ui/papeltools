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
 *
 * 扩展 MVP 差异（vs 主仓库 lib/engine/converter.ts）：
 * - 剥离 Next.js 'use client' 指令
 * - 不导出 convertPdfViaOcr（不内置 OCR，扫描件引导回 https://papeltools.com/en/）
 */

import { validatePdfFile } from './file-validator';
import { WorkerManager } from './worker-manager';
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
   * scanned_pdf 软信号
   *
   * 触发场景：text-pipeline 识别为扫描型 PDF。
   * 扩展 MVP 不内置 OCR 引擎（§三决策 2）。UI 收到此信号后应展示
   * 提示文案，引导用户访问 https://papeltools.com/en/ 使用网页版 OCR。
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
 * 销毁 worker（页面卸载或路由切换时调用，释放资源）
 */
export function disposeConverter() {
  managerInstance?.destroy();
  managerInstance = null;
}