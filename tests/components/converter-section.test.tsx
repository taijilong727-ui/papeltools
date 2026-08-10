/**
 * ConverterSection 状态机测试 — 覆盖完整转换生命周期（T-02 补充）
 *
 * 状态机（见 ConverterSection.tsx 注释）：
 *   idle → converting → (done | error | awaiting_ocr)
 *   awaiting_ocr → ocr_running → (done | error)
 *   任意状态 → idle（取消 / 关闭）
 *
 * 测试清单：
 * - T-02-05 idle → converting：拖入文件后显示进度条 + Cancel 按钮
 * - T-02-06 converting → done：onDone 回调 → 显示 ResultPanel（文件名/元数据/操作按钮）
 * - T-02-07 converting → error：onError 回调 → 显示错误（role=alert）+ Retry 按钮
 * - T-02-08 error → retry：点击 Try again 重新触发 convertPdf → 回 converting
 * - T-02-09 converting → awaiting_ocr：onScannedDetected → 显示 OCR 启用入口（3 语言按钮）
 * - T-02-10 awaiting_ocr → ocr_running → done：点击 OCR 按钮 → convertPdfViaOcr → ResultPanel（含 OCR badge）
 * - T-02-11 converting → cancel：点击 Cancel → cancel 函数被调用 → 回 idle
 * - T-02-12 error → dismiss：点击 Dismiss → 回 idle
 *
 * 注：mock 转换引擎（不启动真实 worker），通过手动触发回调驱动状态机，
 * 与 upload-zone.test.tsx 的集成测试互补（后者只覆盖校验错误路径）。
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, fireEvent, screen } from '@testing-library/react';
import { ConverterSection } from '@/components/converter/ConverterSection';
import type { ConversionResult } from '@/lib/engine/types';
import { ConversionError } from '@/lib/engine/types';
import type { ConvertCallbacks } from '@/lib/engine/converter';
import { renderWithProviders } from '../helpers/render-with-providers';

// ── mock 转换引擎：保留真实类型，替换 worker 侧实现 ──────────────
vi.mock('@/lib/engine', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/engine')>();
  return {
    ...actual,
    convertPdf: vi.fn(),
    convertPdfViaOcr: vi.fn(),
    disposeConverter: vi.fn(),
  };
});

import {
  convertPdf,
  convertPdfViaOcr,
  disposeConverter,
} from '@/lib/engine';

/** 捕获最近一次 convertPdf 的 callbacks，测试手动触发回调 */
let textCallbacks: ConvertCallbacks | null = null;
let ocrCallbacks: ConvertCallbacks | null = null;
const cancelText = vi.fn();
const cancelOcr = vi.fn();

/** 构造 jsdom 可用的 File（显式 arrayBuffer 元数据） */
function makePdfFile(name = 'report.pdf', size = 1024): File {
  const bytes = new Uint8Array(size);
  const file = new File([bytes.buffer], name, { type: 'application/pdf' });
  const buf = new ArrayBuffer(size);
  new Uint8Array(buf).fill(0x25);
  file.arrayBuffer = () => Promise.resolve(buf);
  return file;
}

/** drop 事件辅助（与 upload-zone.test.tsx 一致） */
function dropFile(element: HTMLElement, file: File): void {
  fireEvent.drop(element, { dataTransfer: { files: [file] } });
}

/** 文本管线成功结果 */
function textResult(): ConversionResult {
  return {
    markdown: '# Hello\n\nworld',
    filename: 'report.pdf',
    metadata: { pages: 5, words: 100, chars: 500, tokens: 120, durationMs: 300 },
  };
}

/** OCR 管线成功结果（ocr: true 触发 badge） */
function ocrResult(): ConversionResult {
  const r = textResult();
  r.metadata.ocr = true;
  r.filename = 'scan.pdf';
  return r;
}

describe('ConverterSection — 状态机', () => {
  beforeEach(() => {
    textCallbacks = null;
    ocrCallbacks = null;
    cancelText.mockClear();
    cancelOcr.mockClear();

    vi.mocked(convertPdf).mockReset();
    vi.mocked(convertPdfViaOcr).mockReset();
    vi.mocked(disposeConverter).mockClear();

    // convertPdf mock：捕获 callbacks 并返回 cancel
    vi.mocked(convertPdf).mockImplementation(
      async (_file: File, _opts: unknown, callbacks: ConvertCallbacks) => {
        textCallbacks = callbacks;
        return { cancel: cancelText };
      }
    );
    // convertPdfViaOcr mock：同样捕获
    vi.mocked(convertPdfViaOcr).mockImplementation(
      async (_buffer: ArrayBuffer, _opts: unknown, callbacks: ConvertCallbacks) => {
        ocrCallbacks = callbacks;
        return { cancel: cancelOcr };
      }
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('T-02-05：拖入文件 → converting（进度条 + Cancel 按钮）', async () => {
    renderWithProviders(<ConverterSection />);
    dropFile(screen.getByRole('button'), makePdfFile());

    // converting：进度条出现（ProgressPanel role="progressbar"）
    const bar = await screen.findByRole('progressbar');
    expect(bar).toBeInTheDocument();
    // 文件名显示在进度面板
    expect(screen.getByText('[report.pdf]')).toBeInTheDocument();
    // Cancel 按钮
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    // Dropzone 进入 disabled（不能再拖新文件）— 用可访问名区分 Dropzone 与 Cancel 按钮
    expect(
      screen.getByRole('button', { name: /drop your pdf/i })
    ).toHaveAttribute('aria-disabled', 'true');
    // convertPdf 已调用 1 次，且传了 markdown 输出
    expect(convertPdf).toHaveBeenCalledTimes(1);
    const opts = vi.mocked(convertPdf).mock.calls[0][1] as { outputFormat: string };
    expect(opts.outputFormat).toBe('markdown');
  });

  it('T-02-06：onDone → done（ResultPanel：文件名/元数据/下载/复制）', async () => {
    renderWithProviders(<ConverterSection />);
    dropFile(screen.getByRole('button'), makePdfFile());
    await screen.findByRole('progressbar');

    // 手动触发成功回调
    await act(async () => {
      textCallbacks?.onDone(textResult());
    });

    // ResultPanel 内容（markdown 是整块文本，用正则匹配开头）
    expect(screen.getByText('report.pdf')).toBeInTheDocument();
    expect(screen.getByTestId('result-metadata')).toHaveTextContent('5');
    expect(screen.getByText(/^# Hello/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /download .md/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /copy to clipboard/i })).toBeInTheDocument();
    // OCR badge 不应出现（文本管线）
    expect(screen.queryByTestId('ocr-badge')).not.toBeInTheDocument();
    // 进度条已消失（done 状态不显示 converting UI）
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });

  it('T-02-07：onError → error（role=alert + Try again）', async () => {
    renderWithProviders(<ConverterSection />);
    dropFile(screen.getByRole('button'), makePdfFile());
    await screen.findByRole('progressbar');

    // retryable: true → ErrorDisplay 渲染 Try again 按钮
    await act(async () => {
      textCallbacks?.onError(
        new ConversionError('corrupted_pdf', 'corrupted', { retryable: true })
      );
    });

    const alert = screen.getByRole('alert');
    expect(alert).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /dismiss/i })).toBeInTheDocument();
  });

  it('T-02-08：error → retry（Try again 重新触发 convertPdf → converting）', async () => {
    renderWithProviders(<ConverterSection />);
    dropFile(screen.getByRole('button'), makePdfFile());
    await screen.findByRole('progressbar');

    // 先失败
    await act(async () => {
      textCallbacks?.onError(
        new ConversionError('corrupted_pdf', 'corrupted', { retryable: true })
      );
    });
    expect(convertPdf).toHaveBeenCalledTimes(1);

    // 点击重试 → 再次调用 convertPdf（用缓存的上次文件）
    fireEvent.click(screen.getByRole('button', { name: /try again/i }));
    await screen.findByRole('progressbar');
    expect(convertPdf).toHaveBeenCalledTimes(2);
  });

  it('T-02-09：onScannedDetected → awaiting_ocr（OCR 启用入口）', async () => {
    renderWithProviders(<ConverterSection />);
    dropFile(screen.getByRole('button'), makePdfFile());
    await screen.findByRole('progressbar');

    // 软信号：扫描件 → 进入 awaiting_ocr
    await act(async () => {
      textCallbacks?.onScannedDetected?.();
    });

    // OCR 入口出现
    expect(screen.getByTestId('ocr-prompt')).toBeInTheDocument();
    expect(screen.getByText(/scanned document/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /enable ocr \(english\)/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /enable ocr \(spanish\)/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /enable ocr \(portuguese\)/i })
    ).toBeInTheDocument();
    // 文本管线转换已完成（不再显示进度条）
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });

  it('T-02-10：awaiting_ocr → ocr_running → done（OCR badge）', async () => {
    renderWithProviders(<ConverterSection />);
    dropFile(screen.getByRole('button'), makePdfFile());
    await screen.findByRole('progressbar');

    // 扫描软信号
    await act(async () => {
      textCallbacks?.onScannedDetected?.();
    });
    expect(screen.getByTestId('ocr-prompt')).toBeInTheDocument();

    // 点击 "Enable OCR (English)" → 进入 ocr_running
    fireEvent.click(screen.getByRole('button', { name: /enable ocr \(english\)/i }));
    await screen.findByRole('progressbar');
    expect(convertPdfViaOcr).toHaveBeenCalledTimes(1);

    // OCR 完成 → done
    await act(async () => {
      ocrCallbacks?.onDone(ocrResult());
    });

    // ResultPanel 显示 scan.pdf + OCR badge
    expect(screen.getByText('scan.pdf')).toBeInTheDocument();
    expect(screen.getByTestId('ocr-badge')).toBeInTheDocument();
    expect(screen.queryByTestId('ocr-prompt')).not.toBeInTheDocument();
  });

  it('T-02-11：converting → cancel（cancel 函数被调用 → idle）', async () => {
    renderWithProviders(<ConverterSection />);
    dropFile(screen.getByRole('button'), makePdfFile());
    await screen.findByRole('progressbar');

    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));

    // cancel 函数被调用，回到 idle（无进度条 / 无错误 / Dropzone 恢复可用）
    expect(cancelText).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByRole('button')).not.toHaveAttribute('disabled');
  });

  it('T-02-12：error → dismiss（Dismiss → idle）', async () => {
    renderWithProviders(<ConverterSection />);
    dropFile(screen.getByRole('button'), makePdfFile());
    await screen.findByRole('progressbar');

    await act(async () => {
      textCallbacks?.onError(
        new ConversionError('corrupted_pdf', 'corrupted', { retryable: true })
      );
    });
    expect(screen.getByRole('alert')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /dismiss/i }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByRole('button')).not.toHaveAttribute('disabled');
  });
});
