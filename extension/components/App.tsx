import { useCallback, useEffect, useRef, useState } from 'react';
import {
  convertPdf,
  validatePdfFile,
  ConversionError,
  type ConversionProgress,
  type ConversionResult,
} from '../lib/engine';
import { Dropzone } from './Dropzone';
import { ProgressBar } from './ProgressBar';
import { ResultDisplay } from './ResultDisplay';
import { ScannedPdfNotice } from './ScannedPdfNotice';
import { PrivacyBadge } from './PrivacyBadge';

/**
 * App — Chrome 扩展转换页根组件
 *
 * 状态机：
 *   idle ─(file selected)→ converting
 *   converting ─(onDone)→ done
 *   converting ─(onError)→ error
 *   converting ─(onScannedDetected)→ scanned   ← MVP 不进 OCR，链回网站
 *   done / error / scanned ─(user action)→ idle
 *
 * 设计要点：
 * - 单一 cancelRef 持有当前转换的取消函数；切换状态前必先调用
 * - lastFileRef 缓存原始 File，让 error 状态可"重试"同一文件
 * - 所有异步回调走 setX 路径；不依赖外部 store
 * - 卸载时 cancel，避免 worker 继续运行
 */

type Status = 'idle' | 'converting' | 'done' | 'error' | 'scanned';

/** 把任意异常收敛成可展示文案（strict 模式不依赖 as any） */
function extractErrorMessage(e: unknown): string {
  if (e instanceof ConversionError) return e.message;
  if (e instanceof Error) return e.message;
  return 'Unknown error';
}

/** 内部错误提示子组件（不导出，保持文件清单稳定） */
function ErrorNotice({
  message,
  onRetry,
  onDismiss,
}: {
  message: string;
  onRetry: () => void;
  onDismiss: () => void;
}) {
  return (
    <div className="error-notice" role="alert">
      <div className="error-notice__icon" aria-hidden="true">
        <svg
          viewBox="0 0 24 24"
          width="20"
          height="20"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>
      <div className="error-notice__body">
        <strong className="error-notice__title">Conversion failed</strong>
        <p className="error-notice__text">{message}</p>
        <div className="error-notice__actions">
          <button
            type="button"
            className="error-notice__btn"
            onClick={onRetry}
            aria-label="Retry conversion with the same file"
          >
            Try again
          </button>
          <button
            type="button"
            className="error-notice__btn error-notice__btn--ghost"
            onClick={onDismiss}
            aria-label="Dismiss error and return to start"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}

export function App() {
  const [status, setStatus] = useState<Status>('idle');
  const [progress, setProgress] = useState<ConversionProgress | null>(null);
  const [result, setResult] = useState<ConversionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filename, setFilename] = useState<string>('');

  // 缓存：上次文件（重试用）+ 取消令牌（卸载 / 切换状态时调用）
  const cancelRef = useRef<(() => void) | null>(null);
  const lastFileRef = useRef<File | null>(null);

  // 卸载时清理：取消进行中的转换 + 销毁 worker
  useEffect(() => {
    return () => {
      cancelRef.current?.();
      cancelRef.current = null;
      lastFileRef.current = null;
    };
  }, []);

  /** 重置到 idle（不保留 result / error / progress） */
  const resetToIdle = useCallback(() => {
    cancelRef.current?.();
    cancelRef.current = null;
    setStatus('idle');
    setProgress(null);
    setResult(null);
    setError(null);
    setFilename('');
  }, []);

  /**
   * 启动一次文本管线转换
   *
   * 流程：
   * 1. validatePdfFile（同步校验大小 / 类型；失败抛 ConversionError）
   * 2. 状态 → converting + 初始进度
   * 3. convertPdf → 异步；通过 4 个 callback 接收事件
   * 4. cancel 函数挂到 cancelRef
   */
  const handleFile = useCallback(async (file: File) => {
    lastFileRef.current = file;
    setFilename(file.name);

    try {
      validatePdfFile(file);
    } catch (e) {
      setError(extractErrorMessage(e));
      setStatus('error');
      return;
    }

    setStatus('converting');
    setError(null);
    setResult(null);
    setProgress({ stage: 'parsing', currentPage: 0, totalPages: 0 });

    try {
      const { cancel } = await convertPdf(
        file,
        {},
        {
          onProgress: (p) => setProgress(p),
          onDone: (r) => {
            setResult(r);
            setProgress({
              stage: 'done',
              currentPage: r.metadata.pages,
              totalPages: r.metadata.pages,
            });
            setStatus('done');
          },
          onError: (e) => {
            setError(e.message);
            setProgress({ stage: 'error', currentPage: 0, totalPages: 0 });
            setStatus('error');
          },
          // 扫描件软信号：MVP 不进 OCR，提示用户访问 papeltools.com
          onScannedDetected: () => {
            setStatus('scanned');
            setProgress(null);
          },
        }
      );
      cancelRef.current = cancel;
    } catch (e) {
      setError(extractErrorMessage(e));
      setProgress({ stage: 'error', currentPage: 0, totalPages: 0 });
      setStatus('error');
    }
  }, []);

  /** 用最近一次文件重试（仅 error 状态可触发） */
  const handleRetry = useCallback(() => {
    if (lastFileRef.current) {
      void handleFile(lastFileRef.current);
    }
  }, [handleFile]);

  return (
    <div className="app-root">
      <PrivacyBadge />

      <main className="converter">
        {status === 'idle' && (
          <Dropzone onFile={(file) => void handleFile(file)} />
        )}

        {status === 'converting' && (
          <ProgressBar
            progress={progress}
            filename={filename}
            onCancel={resetToIdle}
          />
        )}

        {status === 'done' && result && (
          <ResultDisplay result={result} onReset={resetToIdle} />
        )}

        {status === 'error' && (
          <ErrorNotice
            message={error ?? 'Unknown error'}
            onRetry={handleRetry}
            onDismiss={resetToIdle}
          />
        )}

        {status === 'scanned' && (
          <ScannedPdfNotice filename={filename} onDismiss={resetToIdle} />
        )}
      </main>
    </div>
  );
}