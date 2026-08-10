/**
 * 错误提示组件测试 — 对应测试策略 T-02-06
 *
 * 断言：错误码 + 文案正确渲染；重试/关闭按钮条件显示并触发回调
 */
import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ErrorDisplay } from '@/components/converter/ErrorDisplay';
import { ConversionError } from '@/lib/engine';
import { renderWithProviders } from '../helpers/render-with-providers';

function makeError(code: ConversionError['code'], retryable = false): ConversionError {
  return new ConversionError(code, `msg-${code}`, { retryable });
}

describe('T-02-06 ErrorDisplay — 错误渲染', () => {
  it('file_wrong_type 错误码 → 显示对应 i18n 文案', () => {
    renderWithProviders(<ErrorDisplay error={makeError('file_wrong_type')} />);
    expect(screen.getByTestId('conversion-error')).toHaveTextContent(/doesn't look like a PDF/i);
  });

  it('file_too_big 错误码 → 显示超限文案', () => {
    renderWithProviders(<ErrorDisplay error={makeError('file_too_big')} />);
    expect(screen.getByTestId('conversion-error')).toHaveTextContent(/200 MB/i);
  });

  it('显示支持提示文案（supportedHint）', () => {
    renderWithProviders(<ErrorDisplay error={makeError('unknown')} />);
    expect(screen.getByTestId('conversion-error')).toHaveTextContent(/text-based PDFs up to 200 MB/i);
  });

  it('非可重试错误 → 不显示重试按钮', () => {
    renderWithProviders(<ErrorDisplay error={makeError('file_wrong_type', false)} />);
    expect(screen.queryByRole('button', { name: /try again/i })).not.toBeInTheDocument();
  });

  it('可重试错误 + onRetry → 显示按钮且点击触发回调', async () => {
    const onRetry = vi.fn();
    renderWithProviders(<ErrorDisplay error={makeError('worker_crashed', true)} onRetry={onRetry} />);

    const btn = screen.getByRole('button', { name: /try again/i });
    await userEvent.click(btn);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('提供 onDismiss → 显示关闭按钮且点击触发回调', async () => {
    const onDismiss = vi.fn();
    renderWithProviders(<ErrorDisplay error={makeError('unknown')} onDismiss={onDismiss} />);

    const btn = screen.getByRole('button', { name: /dismiss/i });
    await userEvent.click(btn);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
