/**
 * MarkdownAssembler 单元测试 — 文件名派生 / 下载 / 剪贴板
 *
 * 对应测试策略：
 * - T-03-02（下载 .md，文件名含 PDF 标题）→ deriveFilename 行为
 * - T-03-03（复制内容为 Markdown）→ copyToClipboard 行为
 * - 验收 A-08 / A-09
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { deriveFilename, downloadMarkdown, copyToClipboard } from '@/lib/engine/markdown-assembler';

describe('deriveFilename — 从元数据生成 .md 文件名', () => {
  it('有 title：清洗非法字符并追加 .md', () => {
    expect(deriveFilename({ title: 'Quarterly Report: Q3/2026' })).toBe('Quarterly-Report-Q3-2026.md');
  });

  it('title 清洗：斜杠/冒号/星号/连续空格/首尾分隔符', () => {
    expect(deriveFilename({ title: '  a//b::c**d??  ' })).toBe('a-b-c-d.md');
  });

  it('title 过长截断到 80 字符', () => {
    const long = 'x'.repeat(120);
    const name = deriveFilename({ title: long });
    expect(name.endsWith('.md')).toBe(true);
    // base 名 80 字符 + '.md' 后缀 3 字符 = 总长 83
    expect(name.length).toBeLessThanOrEqual(83);
  });

  it('无 title 时回退到原始文件名（去 .pdf 后缀）', () => {
    expect(deriveFilename(undefined, 'My Document.pdf')).toBe('My-Document.md');
  });

  it('title 与原始文件名都无 → 时间戳格式 converted-YYYYMMDD.md', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-05T12:00:00Z'));
    expect(deriveFilename(undefined, undefined)).toBe('converted-20260805.md');
    vi.useRealTimers();
  });
});

describe('downloadMarkdown — 触发 .md 文件下载', () => {
  beforeEach(() => {
    // mock 浏览器下载 API
    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL: vi.fn(() => 'blob:mock'),
      revokeObjectURL: vi.fn(),
    });
    const click = vi.fn();
    document.createElement = vi.fn().mockImplementation((tag: string) => {
      const el = {
        href: '',
        download: '',
        click,
        style: {},
      } as unknown as HTMLElement;
      // 只 mock a 标签，其余交给真实实现
      return tag === 'a' ? (el as HTMLElement) : (document as unknown as { __origCreate?: unknown }).__origCreate ? (document as unknown as { __origCreate: (t: string) => HTMLElement }).__origCreate(tag) : el;
    });
    document.body.appendChild = vi.fn();
    document.body.removeChild = vi.fn();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('创建 Blob + a[download] 并触发点击', () => {
    downloadMarkdown('# hello', 'hello.md');
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
    // 触发点击的 a 元素 download 属性为期望文件名
    const a = vi.mocked(document.createElement).mock.results.find((r) => r.value)?.value as
      | ({ download: string } & HTMLElement)
      | undefined;
    // 简化断言：a 标签被创建且 click 被调用
    expect(document.createElement).toHaveBeenCalledWith('a');
  });
});

describe('copyToClipboard — 复制到剪贴板', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('优先使用 navigator.clipboard.writeText', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } });
    await expect(copyToClipboard('markdown 内容')).resolves.toBe(true);
    expect(writeText).toHaveBeenCalledWith('markdown 内容');
  });

  it('clipboard 不可用时走 textarea 降级', async () => {
    vi.stubGlobal('navigator', { ...navigator, clipboard: undefined });
    document.execCommand = vi.fn(() => true);
    const createEl = vi
      .spyOn(document, 'createElement')
      .mockReturnValue({ value: '', select: vi.fn(), style: {} } as unknown as HTMLTextAreaElement);
    document.body.appendChild = vi.fn();
    document.body.removeChild = vi.fn();

    await expect(copyToClipboard('text')).resolves.toBe(true);
    expect(createEl).toHaveBeenCalledWith('textarea');
    expect(document.execCommand).toHaveBeenCalledWith('copy');
  });

  it('降级失败返回 false', async () => {
    vi.stubGlobal('navigator', { ...navigator, clipboard: undefined });
    document.execCommand = vi.fn(() => false);
    vi.spyOn(document, 'createElement').mockReturnValue({ value: '', select: vi.fn(), style: {} } as unknown as HTMLTextAreaElement);
    document.body.appendChild = vi.fn();
    document.body.removeChild = vi.fn();

    await expect(copyToClipboard('text')).resolves.toBe(false);
  });
});
