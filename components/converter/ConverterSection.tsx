'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Dropzone } from './Dropzone';
import { ProgressPanel } from './ProgressPanel';
import { ResultPanel } from './ResultPanel';
import { ErrorDisplay } from './ErrorDisplay';
import {
  convertPdf,
  convertPdfViaOcr,
  disposeConverter,
  ConversionError,
  type ConversionProgress,
  type ConversionResult,
  type OcrLanguage,
} from '@/lib/engine';

/**
 * ConverterSection — 整合 Dropzone / Progress / Result / Error 的主组件
 *
 * 状态机：
 *   idle → converting → (done | error | awaiting_ocr)
 *   awaiting_ocr → ocr_running → (done | error)
 *   任意状态 → idle（用户上传新文件或重试）
 *
 * 设计：所有交互在客户端组件内闭环，不触碰网络（PRD §FR-50）。
 */

type Status = 'idle' | 'converting' | 'awaiting_ocr' | 'ocr_running' | 'done' | 'error';

export function ConverterSection() {
  const t = useTranslations('converter');
  const tErrors = useTranslations('errors');

  const [status, setStatus] = useState<Status>('idle');
  const [progress, setProgress] = useState<ConversionProgress>({
    stage: 'idle',
    currentPage: 0,
    totalPages: 0,
  });
  const [result, setResult] = useState<ConversionResult | null>(null);
  const [error, setError] = useState<ConversionError | null>(null);
  const [filename, setFilename] = useState<string>('');

  // 缓存：上次文件 + 取消令牌
  const cancelRef = useRef<(() => void) | null>(null);
  const lastFileRef = useRef<File | null>(null);
  const lastBufferRef = useRef<ArrayBuffer | null>(null); // §5.2 步骤 3：OCR 重试用

  // OCR 默认语言（§5.2 步骤 5 UI 联动推迟；MVP 默认 eng）
  const ocrLanguageRef = useRef<OcrLanguage>('eng');

  // 页面卸载时清理 worker
  useEffect(() => {
    return () => {
      cancelRef.current?.();
      disposeConverter();
    };
  }, []);

  /**
   * 启动一次文本管线转换（§5.2 步骤 1 当前行为）
   */
  const startConversion = useCallback(async (file: File) => {
    // 重置状态
    setStatus('converting');
    setError(null);
    setResult(null);
    setFilename(file.name);
    setProgress({ stage: 'parsing', currentPage: 0, totalPages: 0 });

    let buffer: ArrayBuffer;
    try {
      buffer = await file.arrayBuffer();
    } catch (e) {
      const err = new ConversionError(
        'file_empty',
        'Failed to read file',
        { retryable: true, cause: e }
      );
      setError(err);
      setStatus('error');
      return;
    }
    lastBufferRef.current = buffer;

    try {
      const { cancel } = await convertPdf(
        file,
        { includeImages: false, outputFormat: 'markdown' },
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
            setError(e);
            setStatus('error');
            setProgress({ stage: 'error', currentPage: 0, totalPages: 0 });
          },
          // §5.2 步骤 3：scanned_pdf 软信号——进入 awaiting_ocr 而非显示错误
          onScannedDetected: () => {
            setStatus('awaiting_ocr');
            setProgress({ stage: 'idle', currentPage: 0, totalPages: 0 });
          },
        }
      );
      cancelRef.current = cancel;
    } catch (e) {
      const err =
        e instanceof ConversionError
          ? e
          : new ConversionError(
              'unknown',
              (e as Error)?.message ?? 'Unknown error',
              { retryable: true }
            );
      setError(err);
      setStatus('error');
      setProgress({ stage: 'error', currentPage: 0, totalPages: 0 });
    }
  }, []);

  /**
   * 启动 OCR 管线（§5.2 步骤 3：用户在 awaiting_ocr 状态点"启用 OCR"时调用）
   *
   * 直接在主线程调 convertOcrPdf（tesseract.js workerBlobURL 在 nested worker 不可用，
   * 已在 §10.8 验证。详见 docs/OCR管线实现方案 §10.7a。）
   */
  const startOcr = useCallback(async (language: OcrLanguage = 'eng') => {
    const buffer = lastBufferRef.current;
    if (!buffer) {
      setError(
        new ConversionError('unknown', 'Buffer lost; please re-upload', {
          retryable: true,
        })
      );
      setStatus('error');
      return;
    }

    ocrLanguageRef.current = language;
    setStatus('ocr_running');
    setError(null);
    setResult(null);
    setProgress({ stage: 'ocr', currentPage: 0, totalPages: 0 });

    const { cancel } = await convertPdfViaOcr(
      buffer,
      { ocrEnabled: true, ocrLanguage: language },
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
          setError(e);
          setStatus('error');
          setProgress({ stage: 'error', currentPage: 0, totalPages: 0 });
        },
      }
    );
    cancelRef.current = cancel;
  }, []);

  const handleFileSelected = useCallback(
    (file: File) => {
      lastFileRef.current = file;
      startConversion(file);
    },
    [startConversion]
  );

  const handleRetry = useCallback(() => {
    if (lastFileRef.current) {
      startConversion(lastFileRef.current);
    }
  }, [startConversion]);

  const handleEnableOcr = useCallback(
    (language: OcrLanguage) => () => startOcr(language),
    [startOcr]
  );

  const handleDismiss = useCallback(() => {
    setStatus('idle');
    setError(null);
    setResult(null);
    setProgress({ stage: 'idle', currentPage: 0, totalPages: 0 });
    setFilename('');
    cancelRef.current?.();
    cancelRef.current = null;
    lastBufferRef.current = null;
  }, []);

  const handleCancel = useCallback(() => {
    cancelRef.current?.();
    cancelRef.current = null;
    // 取消不是错误：直接回到 idle，不设置 error
    setStatus('idle');
    setError(null);
    setResult(null);
    setProgress({ stage: 'idle', currentPage: 0, totalPages: 0 });
    setFilename('');
    lastBufferRef.current = null;
  }, []);

  return (
    <div className="max-w-[760px] mx-auto mt-12 text-left" id="converter">
      <div
        className="overflow-hidden"
        style={{
          background: 'var(--color-paper-soft)',
          border: '1px solid var(--color-rule)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'none', // 纸感：无阴影
        }}
      >
        <Dropzone
          onFileSelected={handleFileSelected}
          disabled={status === 'converting' || status === 'ocr_running'}
        />

        {/* 进度（仅 converting 时显示） */}
        {status === 'converting' && (
          <>
            <ProgressPanel progress={progress} filename={filename} />
            <div className="px-5 pb-4 flex justify-end">
              <button
                type="button"
                onClick={handleCancel}
                className="text-[13px] text-[var(--color-ink-soft)] underline hover:text-[var(--color-ink)]"
              >
                {tErrors('cancelButton')}
              </button>
            </div>
          </>
        )}

        {/* §5.2 步骤 3：扫描件软信号——启用 OCR 入口 */}
        {status === 'awaiting_ocr' && (
          <div
            className="px-5 py-4 border-t text-[13px]"
            style={{ borderColor: 'var(--color-rule)' }}
            data-testid="ocr-prompt"
          >
            <p
              className="text-[var(--color-ink)] mb-3"
              style={{ fontFamily: 'var(--font-serif)' }}
            >
              {t('scannedPrompt')}
            </p>
            <p className="text-[var(--color-ink-soft)] mb-4">
              {t('scannedHint')}
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleEnableOcr('eng')}
                className="text-[13px] px-4 py-2 border rounded transition-colors hover:opacity-80"
                style={{
                  borderColor: 'var(--color-ink)',
                  background: 'var(--color-paper)',
                  color: 'var(--color-ink)',
                }}
              >
                {t('ocrButtonEng')}
              </button>
              <button
                type="button"
                onClick={handleEnableOcr('spa')}
                className="text-[13px] px-4 py-2 border rounded transition-colors hover:opacity-80"
                style={{
                  borderColor: 'var(--color-rule)',
                  background: 'var(--color-paper)',
                  color: 'var(--color-ink)',
                }}
              >
                {t('ocrButtonSpa')}
              </button>
              <button
                type="button"
                onClick={handleEnableOcr('por')}
                className="text-[13px] px-4 py-2 border rounded transition-colors hover:opacity-80"
                style={{
                  borderColor: 'var(--color-rule)',
                  background: 'var(--color-paper)',
                  color: 'var(--color-ink)',
                }}
              >
                {t('ocrButtonPor')}
              </button>
              <button
                type="button"
                onClick={handleDismiss}
                className="text-[13px] px-4 py-2 underline hover:opacity-80"
                style={{ color: 'var(--color-ink-soft)' }}
              >
                {tErrors('cancelButton')}
              </button>
            </div>
          </div>
        )}

        {/* 进度（OCR running 时也显示，使用 ocr stage）*/}
        {status === 'ocr_running' && (
          <>
            <ProgressPanel progress={progress} filename={filename} />
            <div className="px-5 pb-4 flex justify-end">
              <button
                type="button"
                onClick={handleCancel}
                className="text-[13px] text-[var(--color-ink-soft)] underline hover:text-[var(--color-ink)]"
              >
                {tErrors('cancelButton')}
              </button>
            </div>
          </>
        )}

        {/* 结果（仅 done 时显示） */}
        {status === 'done' && result && <ResultPanel result={result} />}

        {/* 错误（仅 error 时显示） */}
        {status === 'error' && error && (
          <ErrorDisplay error={error} onRetry={handleRetry} onDismiss={handleDismiss} />
        )}
      </div>

      <p
        className="mt-5 text-center font-mono text-[11px] tracking-[0.06em] text-[var(--color-ink-soft)] opacity-70"
        aria-hidden="true"
      >
        {t('demoFlag')}
      </p>
    </div>
  );
}