/**
 * 进度条组件测试 — 对应测试策略 T-02-05
 *
 * 断言：进度值正确更新（page/total → 百分比 + aria-valuenow）
 *
 * stage 文案已 i18n 化（审查 §2.5），从 messages.en.json 读取；
 * 此处断言 EN 文案与字典同步，未来新增语言时只需扩字典不影响测试。
 */
import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { ProgressPanel } from '@/components/converter/ProgressPanel';
import type { ConversionProgress } from '@/lib/engine';
import { renderWithProviders } from '../helpers/render-with-providers';

function renderAt(progress: ConversionProgress, filename = 'report.pdf') {
  return renderWithProviders(<ProgressPanel progress={progress} filename={filename} />);
}

describe('T-02-05 ProgressPanel — 进度显示', () => {
  it('进行中：显示阶段文案与页码（page/total）', () => {
    renderAt({ stage: 'extracting-text', currentPage: 2, totalPages: 10 });

    expect(screen.getByText(/Extracting text/i)).toBeInTheDocument();
    expect(screen.getByText(/(2\/10)/)).toBeInTheDocument();
  });

  it('进度条 aria-valuenow 正确（2/10 → 20）', () => {
    renderAt({ stage: 'extracting-text', currentPage: 2, totalPages: 10 });

    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveAttribute('aria-valuenow', '20');
    expect(bar).toHaveAttribute('aria-valuemin', '0');
    expect(bar).toHaveAttribute('aria-valuemax', '100');
  });

  it('完成态：进度 100%', () => {
    renderAt({ stage: 'done', currentPage: 5, totalPages: 5 });

    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100');
  });

  it('文件名以 [文件名] 形式显示', () => {
    renderAt({ stage: 'parsing', currentPage: 0, totalPages: 3 }, 'my-report.pdf');
    expect(screen.getByText(/\[my-report\.pdf\]/)).toBeInTheDocument();
  });

  it('totalPages 为 0 时百分比为 0 且不显示页码', () => {
    renderAt({ stage: 'parsing', currentPage: 0, totalPages: 0 });
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
    expect(screen.queryByText(/\(0\/0\)/)).not.toBeInTheDocument();
  });
});
