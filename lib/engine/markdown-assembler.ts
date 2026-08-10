/**
 * MarkdownAssembler — 输出格式整理 + 元数据计算
 *
 * 职责：
 * - 在 TextPipeline 输出基础上加元数据头（MVP 可选）
 * - 计算输出文件名（从 PDF metadata 标题生成）
 * - 校验最终 markdown 非空
 */

import type { ConversionResult } from './types';

/**
 * 从 PDF 元数据生成 Markdown 文件名
 *
 * 规则：
 * 1. 有 title → 用 title（清洗非法字符）
 * 2. 无 title → 用 "converted-{timestamp}"
 */
export function deriveFilename(
  sourceMeta: ConversionResult['sourceMeta'],
  originalFilename?: string
): string {
  const sanitize = (s: string): string =>
    s
      .replace(/[\\/:*?"<>|]+/g, '-') // Windows 文件名非法字符
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80);

  if (sourceMeta?.title) {
    const cleaned = sanitize(sourceMeta.title);
    if (cleaned) return `${cleaned}.md`;
  }

  if (originalFilename) {
    const base = originalFilename.replace(/\.pdf$/i, '');
    const cleaned = sanitize(base);
    if (cleaned) return `${cleaned}.md`;
  }

  const now = new Date();
  const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  return `converted-${stamp}.md`;
}

/**
 * 触发浏览器下载 .md 文件
 */
export function downloadMarkdown(content: string, filename: string): void {
  if (typeof window === 'undefined') return;
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // 释放 URL（延迟确保下载已触发）
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * 复制到剪贴板（现代 API + 降级）
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (typeof navigator === 'undefined') return false;
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    // 降级方案：临时 textarea
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}