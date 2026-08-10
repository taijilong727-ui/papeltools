/**
 * 上传区组件测试 — 对应测试策略 T-02
 *
 * - T-02-01 Dropzone：拖拽文件后触发 onFileSelected
 * - T-02-02 Dropzone：点击/键盘/文件选择器路径
 * - T-02-03 ConverterSection：拖入非 PDF 显示错误提示（集成）
 * - T-02-04 ConverterSection：拖入 >200MB 显示超限提示（集成）
 *
 * 注：Dropzone 本身不做类型/大小校验（校验在 convertPdf → validatePdfFile），
 * 因此 T-02-03/04 通过 ConverterSection 集成测试（mock convertPdf）覆盖。
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Dropzone } from '@/components/converter/Dropzone';
import { ConverterSection } from '@/components/converter/ConverterSection';
import { ConversionError } from '@/lib/engine/types';
import { renderWithProviders } from '../helpers/render-with-providers';

function makePdfFile(name = 'a.pdf', size = 1024, type = 'application/pdf'): File {
  // jsdom 中 File/Blob 的元数据来自 BlobPart 本身。必须用 ArrayBuffer
  // 并显式设置 type，否则 file.arrayBuffer() 在 jsdom 下可能读为 0 字节。
  const bytes = new Uint8Array(size);
  return new File([bytes.buffer], name, { type });
}

/** 为 jsdom 中的 File 补全 arrayBuffer/size/type 元数据。drop 事件下 jsdom 可能丢失这些属性。 */
function patchFileMeta(file: File, opts: { size: number; type: string; name?: string }): File {
  Object.defineProperty(file, 'size', { configurable: true, value: opts.size });
  if (opts.name) {
    Object.defineProperty(file, 'name', { configurable: true, value: opts.name });
  }
  Object.defineProperty(file, 'type', { configurable: true, value: opts.type });
  const buf = new ArrayBuffer(opts.size);
  new Uint8Array(buf).fill(0x25);
  file.arrayBuffer = () => Promise.resolve(buf);
  return file;
}

/** drop 事件辅助（jsdom 无需完整 DataTransfer，仅 files 即可触发 handleDrop） */
function dropFile(element: HTMLElement, file: File): void {
  fireEvent.drop(element, { dataTransfer: { files: [file] } });
}

describe('T-02-01 Dropzone — 拖拽上传', () => {
  it('拖入文件后触发 onFileSelected 回调', () => {
    const onFileSelected = vi.fn();
    renderWithProviders(<Dropzone onFileSelected={onFileSelected} />);

    const zone = screen.getByRole('button');
    dropFile(zone, makePdfFile('report.pdf'));

    expect(onFileSelected).toHaveBeenCalledTimes(1);
    expect(onFileSelected.mock.calls[0][0].name).toBe('report.pdf');
  });

  it('拖入时高亮（isDragging），离开后取消高亮', () => {
    const onFileSelected = vi.fn();
    const { container } = renderWithProviders(<Dropzone onFileSelected={onFileSelected} />);

    const zone = screen.getByRole('button');
    const dt = { dataTransfer: { items: [{ length: 1 }], files: [] } };
    fireEvent.dragEnter(zone, dt);
    // 高亮通过 class 切换（bg-[color-mix...]）
    expect(zone.className).toContain('bg-[color-mix');
    fireEvent.dragLeave(zone);
    expect(zone.className).not.toContain('bg-[color-mix');
  });

  it('disabled 状态下点击不触发', () => {
    const onFileSelected = vi.fn();
    renderWithProviders(<Dropzone onFileSelected={onFileSelected} disabled />);
    fireEvent.click(screen.getByRole('button'));
    expect(onFileSelected).not.toHaveBeenCalled();
  });
});

describe('T-02-02 Dropzone — 点击与键盘上传', () => {
  it('点击区域触发隐藏 input 的 click', async () => {
    const clickSpy = vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(() => {});
    const onFileSelected = vi.fn();
    renderWithProviders(<Dropzone onFileSelected={onFileSelected} />);

    await userEvent.click(screen.getByRole('button'));
    expect(clickSpy).toHaveBeenCalled();
    clickSpy.mockRestore();
  });

  it('Enter 键触发同样路径', async () => {
    const clickSpy = vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(() => {});
    const onFileSelected = vi.fn();
    renderWithProviders(<Dropzone onFileSelected={onFileSelected} />);

    await userEvent.keyboard('{Tab}{Enter}'); // 聚焦后回车
    expect(clickSpy).toHaveBeenCalled();
    clickSpy.mockRestore();
  });

  it('文件选择器选中的文件触发 onFileSelected（input change 事件）', async () => {
    const onFileSelected = vi.fn();
    renderWithProviders(<Dropzone onFileSelected={onFileSelected} />);

    const input = screen.getByLabelText('Choose PDF file') as HTMLInputElement;
    await userEvent.upload(input, makePdfFile('picked.pdf'));

    expect(onFileSelected).toHaveBeenCalledTimes(1);
    expect(onFileSelected.mock.calls[0][0].name).toBe('picked.pdf');
  });
});

// ── ConverterSection 集成（校验失败路径）────────────────────────
// mock 转换引擎：验证 UI 对校验错误的反馈，不真正启动 worker
vi.mock('@/lib/engine', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/engine')>();
  return {
    ...actual,
    convertPdf: vi.fn(),
  };
});

import { convertPdf } from '@/lib/engine';

describe('T-02-03/04 ConverterSection — 校验错误提示', () => {
  beforeEach(() => {
    vi.mocked(convertPdf).mockReset();
  });

  it('T-02-03：拖入非 PDF → 显示类型错误提示', async () => {
    vi.mocked(convertPdf).mockRejectedValue(
      new ConversionError('file_wrong_type', 'Not a PDF file', { retryable: false })
    );
    renderWithProviders(<ConverterSection />);

    const file = patchFileMeta(
      makePdfFile('placeholder.pdf'),
      { size: 1024, type: 'text/plain', name: 'notes.txt' }
    );
    dropFile(screen.getByRole('button'), file);

    // 异步错误 → 等待 alert 出现
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/doesn't look like a PDF/i);
  });

  it('T-02-04：拖入 >200MB → 显示超限提示', async () => {
    vi.mocked(convertPdf).mockRejectedValue(
      new ConversionError('file_too_big', 'File too large', { retryable: false })
    );
    renderWithProviders(<ConverterSection />);

    // 200MB 的 Uint8Array 在 jsdom 中构造较慢；只通过 size 元数据触发该路径
    const file = patchFileMeta(
      makePdfFile('huge.pdf'),
      { size: 300 * 1024 * 1024, type: 'application/pdf', name: 'huge.pdf' }
    );
    dropFile(screen.getByRole('button'), file);

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/file too large/i);
  });
});
