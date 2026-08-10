/**
 * E2E 隐私验收（硬性）— 对应测试策略 T-04、验收 A-03
 *
 * 核心：转换期间 DevTools 0 网络请求（PRD FR-50 / NFR-08）。
 * 比功能正确性更优先（测试原则 P-3）。
 */
import { test, expect } from '@playwright/test';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { NetworkMonitor } from '../helpers/network-monitor';

const fixture = (name: string) => path.join(__dirname, '..', 'fixtures', name);
const hasSample = existsSync(fixture('sample-text.pdf'));

test.describe('T-04 隐私验收 — 零网络请求', () => {
  test.skip(!hasSample, '测试样本未生成：先执行 npm run generate:fixtures');

  test('T-04-01 转换全程无 XHR/Fetch 文档请求', async ({ page }) => {
    const monitor = new NetworkMonitor(page);
    await page.goto('/en/');

    // 清空页面加载期间的请求，只统计转换期间
    monitor.reset();
    await page.setInputFiles('#converter input[type="file"]', fixture('sample-text.pdf'));

    // 等待转换完成（预览区出现内容）
    const preview = page.locator('[aria-label="Converted Markdown preview"]');
    await expect(preview).toBeVisible({ timeout: 30_000 });

    // 硬性断言：转换期间除静态资源外 0 请求
    expect(monitor.nonStaticRequests(), `检测到非静态请求: ${monitor.nonStaticRequests().join(', ')}`).toHaveLength(0);
  });

  test('T-04-02 无 Service Worker（无外部请求拦截器）', async ({ page }) => {
    await page.goto('/en/');
    const registrations = await page.evaluate(async () => {
      if (!('serviceWorker' in navigator)) return [];
      return (await navigator.serviceWorker.getRegistrations()).map((r) => r.scope);
    });
    expect(registrations).toHaveLength(0);
  });

  test('T-04-03 无第三方 Cookie', async ({ context, page }) => {
    await page.goto('/en/');
    const cookies = await context.cookies();
    const thirdParty = cookies.filter((c) => !c.domain.includes('localhost'));
    expect(thirdParty, `存在非本地 Cookie: ${thirdParty.map((c) => c.domain).join(', ')}`).toHaveLength(0);
  });

  test('T-04-04 localStorage 无敏感数据（文件内容/转换历史）', async ({ page }) => {
    await page.goto('/en/');
    const keys = await page.evaluate(() => Object.keys(localStorage));
    const sensitive = keys.filter((k) => /file|pdf|markdown|conversion|history/i.test(k));
    expect(sensitive).toHaveLength(0);
  });
});
