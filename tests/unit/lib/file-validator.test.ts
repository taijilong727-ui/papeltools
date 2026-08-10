/**
 * 文件预校验单元测试 — 对应测试策略 T-06-02/03/07、验收 A-06
 *
 * 用例映射：
 * - T-06-02 非 PDF 文件 → file_wrong_type
 * - T-06-03 / T-06-07 >200MB → file_too_big（前端拦截，不进入转换管线）
 * - 空文件 / 过小文件 → file_empty
 *
 * ⚠️ T-01-09/10（文本型/扫描型检测）说明：
 * MVP 中"文本层有无"的检测由 @pdf2md/core 内部完成，无独立可单测的
 * 纯函数。该能力已迁移至 E2E 层验证：
 *   tests/e2e/error-paths.spec.ts（sample-scanned.pdf → scanned 提示）
 *   tests/e2e/converter-flow.spec.ts（sample-text.pdf → 正常转换）
 */
import { describe, it, expect } from 'vitest';
import {
  validatePdfFile,
  formatBytes,
  MAX_FILE_SIZE,
  MIN_FILE_SIZE,
} from '@/lib/engine/file-validator';

/** 构造最小 File 对象（jsdom 可用的 File） */
function makeFile(name: string, size: number, type = 'application/pdf'): File {
  return new File([new Uint8Array(size)], name, { type });
}

describe('validatePdfFile — 文件预校验', () => {
  it('合法 PDF 通过（大小/类型/扩展名均满足）', () => {
    expect(() => validatePdfFile(makeFile('doc.pdf', 1024))).not.toThrow();
  });

  it('空文件（0 字节）→ file_empty', () => {
    expect(() => validatePdfFile(makeFile('empty.pdf', 0))).toThrowError(
      expect.objectContaining({ code: 'file_empty' })
    );
  });

  it('过小文件（< 100 字节）→ file_empty', () => {
    expect(() => validatePdfFile(makeFile('tiny.pdf', MIN_FILE_SIZE - 1))).toThrowError(
      expect.objectContaining({ code: 'file_empty' })
    );
  });

  it('T-06-03/07：超过 200MB → file_too_big（前端拦截）', () => {
    expect(() => validatePdfFile(makeFile('huge.pdf', MAX_FILE_SIZE + 1))).toThrowError(
      expect.objectContaining({ code: 'file_too_big' })
    );
  });

  it('T-06-02：非 .pdf 扩展名 → file_wrong_type', () => {
    expect(() => validatePdfFile(makeFile('notes.txt', 1024, 'text/plain'))).toThrowError(
      expect.objectContaining({ code: 'file_wrong_type' })
    );
  });

  it('MIME 与扩展名任一不匹配即拒绝', () => {
    // 扩展名 .pdf 但 MIME 非 pdf（部分浏览器缺 MIME 时 file.type 为 '' 可放行）
    expect(() => validatePdfFile(makeFile('doc.pdf', 1024, 'application/octet-stream'))).toThrowError(
      expect.objectContaining({ code: 'file_wrong_type' })
    );
    // MIME 正确但扩展名不是 .pdf
    expect(() => validatePdfFile(makeFile('doc.txt', 1024, 'application/pdf'))).toThrowError(
      expect.objectContaining({ code: 'file_wrong_type' })
    );
  });

  it('MIME 缺失（file.type === ""）时仅靠扩展名判断', () => {
    expect(() => validatePdfFile(makeFile('doc.pdf', 1024, ''))).not.toThrow();
  });

  it('null / undefined 文件 → file_empty', () => {
    expect(() => validatePdfFile(null as unknown as File)).toThrowError(
      expect.objectContaining({ code: 'file_empty' })
    );
  });
});

describe('formatBytes — 可读字节数', () => {
  it('B / KB / MB / GB 各档位', () => {
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(1024)).toBe('1.0 KB');
    expect(formatBytes(1024 * 1024)).toBe('1.0 MB');
    expect(formatBytes(1024 ** 3 * 2)).toBe('2.00 GB');
  });
});
