/**
 * 结果面板组件测试 — 对应测试策略 T-02-07
 *
 * 断言：Markdown 内容正确渲染预览；文件名/元数据/下载/复制按钮
 *
 * mock 说明：downloadMarkdown / copyToClipboard 是浏览器 API 封装，
 * 此处 mock 验证按钮触发行为；函数本体逻辑在单元测试
 * （tests/unit/engine/markdown-assembler.test.ts）覆盖。
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ResultPanel } from '@/components/converter/ResultPanel';
import type { ConversionResult } from '@/lib/engine';
import { renderWithProviders } from '../helpers/render-with-providers';

vi.mock('@/lib/engine/markdown-assembler', () => ({
  downloadMarkdown: vi.fn(),
  copyToClipboard: vi.fn(),
}));

import { downloadMarkdown, copyToClipboard } from '@/lib/engine/markdown-assembler';

function makeResult(overrides: Partial<ConversionResult> = {}): ConversionResult {
  return {
    markdown: '# Quarterly Report\n\nSome content.',
    filename: 'Quarterly-Report.md',
    metadata: { pages: 18, words: 1204, chars: 6000, tokens: 1600, durationMs: 2800 },
    ...overrides,
  };
}

describe('T-02-07 ResultPanel — 结果展示与操作', () => {
  beforeEach(() => {
    vi.mocked(downloadMarkdown).mockReset();
    vi.mocked(copyToClipboard).mockReset();
  });

  it('Markdown 内容渲染在预览区（aria-label=Converted Markdown preview）', () => {
    renderWithProviders(<ResultPanel result={makeResult()} />);

    const preview = screen.getByLabelText('Converted Markdown preview');
    expect(preview).toHaveTextContent('# Quarterly Report');
    expect(preview).toHaveTextContent('Some content.');
  });

  it('文件名 chip 显示', () => {
    renderWithProviders(<ResultPanel result={makeResult()} />);
    expect(screen.getByText('Quarterly-Report.md')).toBeInTheDocument();
  });

  it('元数据栏显示页数/字数/token/耗时', () => {
    renderWithProviders(<ResultPanel result={makeResult()} />);
    expect(screen.getByText(/18 pages/)).toBeInTheDocument();
    expect(screen.getByText(/1\.2K words/)).toBeInTheDocument();
    expect(screen.getByText(/~1\.6K tokens/)).toBeInTheDocument();
    expect(screen.getByText(/2\.8s/)).toBeInTheDocument();
  });

  it('单页/单词使用单数形式', () => {
    renderWithProviders(
      <ResultPanel result={makeResult({ metadata: { pages: 1, words: 1, chars: 5, tokens: 2, durationMs: 100 } })} />
    );
    expect(screen.getByText(/1 page/)).toBeInTheDocument();
    expect(screen.getByText(/1 word/)).toBeInTheDocument();
  });

  it('空结果 → 显示 "(empty result)" 占位', () => {
    renderWithProviders(<ResultPanel result={makeResult({ markdown: '' })} />);
    expect(screen.getByLabelText('Converted Markdown preview')).toHaveTextContent('(empty result)');
  });

  it('点击下载按钮 → 调用 downloadMarkdown（markdown + 文件名）', async () => {
    renderWithProviders(<ResultPanel result={makeResult()} />);
    await userEvent.click(screen.getByRole('button', { name: /download/i }));
    expect(downloadMarkdown).toHaveBeenCalledWith(
      '# Quarterly Report\n\nSome content.',
      'Quarterly-Report.md'
    );
  });

  it('点击复制按钮 → 调用 copyToClipboard 并短暂显示 Copied ✓', async () => {
    vi.mocked(copyToClipboard).mockResolvedValue(true);
    renderWithProviders(<ResultPanel result={makeResult()} />);

    await userEvent.click(screen.getByRole('button', { name: /copy to clipboard/i }));
    expect(copyToClipboard).toHaveBeenCalledWith('# Quarterly Report\n\nSome content.');
    // 复制成功后文案切换为 Copied ✓（1.4s 后恢复，不等待）
    expect(screen.getByText(/Copied/i)).toBeInTheDocument();
  });
});
