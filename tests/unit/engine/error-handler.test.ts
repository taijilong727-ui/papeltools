/**
 * ErrorHandler 单元测试 — 错误分类与 UI 文案映射
 *
 * 对应测试策略：
 * - T-06-01（损坏 PDF → corrupted_pdf 提示）
 * - T-06-04/05（加密 PDF → encrypted_pdf 提示）
 * - 验收 A-04 / A-05
 *
 * 说明：实际模块名为 lib/engine/errors.ts（架构文档列出的
 * error-handler.test.ts 对应测试此模块的导出）。
 */
import { describe, it, expect } from 'vitest';
import { classifyError, errorTranslationKeys } from '@/lib/engine/errors';
import { ConversionError, type ConversionErrorCode } from '@/lib/engine/types';

describe('classifyError — @pdf2md/core 错误 → 统一错误码', () => {
  it('ConversionError 实例直通（不重新分类）', () => {
    const original = new ConversionError('scanned_pdf', 'no text layer', { retryable: false });
    expect(classifyError(original)).toBe(original);
  });

  it('超大文件：包含 "size" 与 "15 MB" → file_too_big（不可重试）', () => {
    const err = classifyError(new Error('File size exceeds the 15 MB limit'));
    expect(err.code).toBe('file_too_big');
    expect(err.retryable).toBe(false);
  });

  it('加密 PDF：encrypted / password → encrypted_pdf', () => {
    expect(classifyError(new Error('Encrypted PDFs are not supported')).code).toBe('encrypted_pdf');
    expect(classifyError(new Error('password required')).code).toBe('encrypted_pdf');
  });

  it('扫描型：no text / scanned / image-based → scanned_pdf', () => {
    expect(classifyError(new Error('No text layer found')).code).toBe('scanned_pdf');
    expect(classifyError(new Error('PDF appears to be scanned')).code).toBe('scanned_pdf');
    expect(classifyError(new Error('image-based document')).code).toBe('scanned_pdf');
  });

  it('损坏 PDF：invalid / corrupt / parse → corrupted_pdf', () => {
    expect(classifyError(new Error('Invalid PDF')).code).toBe('corrupted_pdf');
    expect(classifyError(new Error('corrupt document')).code).toBe('corrupted_pdf');
    expect(classifyError(new Error('parse error at offset 12')).code).toBe('corrupted_pdf');
  });

  it('未知错误 → unknown（可重试）', () => {
    const err = classifyError(new Error('Something weird happened'));
    expect(err.code).toBe('unknown');
    expect(err.retryable).toBe(true);
  });

  it('非 Error 值（字符串/对象）也能安全分类', () => {
    expect(classifyError('boom').code).toBe('unknown');
    expect(classifyError({}).code).toBe('unknown');
  });
});

describe('errorTranslationKeys — 每个错误码都有 UI 文案映射', () => {
  const allCodes: ConversionErrorCode[] = [
    'file_too_big',
    'file_empty',
    'file_wrong_type',
    'encrypted_pdf',
    'scanned_pdf',
    'corrupted_pdf',
    'worker_crashed',
    'cancelled',
    'unknown',
  ];

  it('9 个错误码全部有翻译 key（且为 errors.* 命名空间）', () => {
    for (const code of allCodes) {
      expect(errorTranslationKeys[code], `缺少 ${code} 的映射`).toBeTruthy();
      expect(errorTranslationKeys[code]).toMatch(/^errors\./);
    }
  });

  it('新增错误码时会因类型签名编译报错（保持映射同步）', () => {
    // 此测试仅为类型防护：errorTranslationKeys 是 Record<ConversionErrorCode, string>
    const keys = Object.keys(errorTranslationKeys) as ConversionErrorCode[];
    expect(keys.sort()).toEqual(allCodes.sort());
  });
});
