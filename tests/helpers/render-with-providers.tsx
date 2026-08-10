/**
 * 组件测试渲染工具 — 用 next-intl Provider 包裹被测组件
 *
 * 组件使用 useTranslations，测试必须提供 NextIntlClientProvider，
 * 否则 next-intl v4 会抛 "No intl context found"。
 *
 * 注意：不走 lib/i18n/dictionaries.ts（其含 'server-only' 限制，
 * 在 vitest 环境 import 会抛错），直接引用 messages/en.json。
 *
 * 参考：docs/具体架构分析-2026-08-04.md §四（tests/helpers/render-with-providers.tsx）
 */
import { render } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import { NextIntlClientProvider } from 'next-intl';
import en from '@/messages/en.json';

/** 组件测试统一使用英文文案 */
export function renderWithProviders(ui: ReactElement): ReturnType<typeof render> {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      {ui}
    </NextIntlClientProvider>
  );
}

/** 包裹任意 ReactNode（用于测试中手动组合多个组件） */
export function withIntlProvider(children: ReactNode): ReactElement {
  return (
    <NextIntlClientProvider locale="en" messages={en}>
      {children}
    </NextIntlClientProvider>
  );
}

export { en as messagesEn };
