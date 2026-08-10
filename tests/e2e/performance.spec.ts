/**
 * E2E 性能验收（硬性）— 对应测试策略 T-05、验收 A-02
 *
 * 标准：首次转换 ≤ 30 秒（100 页文本型 PDF）；首屏可交互 < 2 秒。
 *
 * ⚠️ 性能数据以生产构建为准（npm run build && 静态托管 out/）。
 * dev 模式下 Turbopack 编译/HMR 会显著拉低首屏成绩，且首次请求触发
 * 按需编译。如需在 dev 下运行，建议先预热页面再执行本套用例。
 *
 * 计时口径（测试策略文档）：
 *   起点：文件选择 change 事件触发
 *   终点：预览区 Markdown 渲染完成（非 loading 消失）
 */
import { test, expect } from '@playwright/test';
import { existsSync } from 'node:fs';
import path from 'node:path';

const fixture = (name: string) => path.join(__dirname, '..', 'fixtures', name);
const hasBigSample = existsSync(fixture('sample-100p.pdf'));

test.describe('T-05 性能验收', () => {
  test.skip(!hasBigSample, '性能用例需要 100 页样本：先运行 npm run generate:fixtures');

  test('T-05-01 首次转换 100 页文本型 PDF < 30 秒', async ({ page }) => {
    await page.goto('/en/');

    const start = Date.now();
    await page.setInputFiles('#converter input[type="file"]', fixture('sample-100p.pdf'));

    const preview = page.locator('[aria-label="Converted Markdown preview"]');
    await expect(preview).toBeVisible({ timeout: 35_000 });
    const duration = Date.now() - start;

    expect(duration, `首次转换耗时 ${duration}ms，超过 30s 上限`).toBeLessThan(30_000);
  });

  test('T-05-02 首屏可交互 < 2 秒', async ({ page }) => {
    const start = Date.now();
    await page.goto('/en/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#converter')).toBeVisible({ timeout: 5_000 });
    const duration = Date.now() - start;

    expect(duration, `首屏耗时 ${duration}ms，超过 2s 上限`).toBeLessThan(2_000);
  });

  test('T-05-03 重复转换同一文件：第二次 ≤ 第一次（缓存生效）', async ({ page }) => {
    await page.goto('/en/');
    const file = fixture('sample-100p.pdf');

    const preview = page.locator('[aria-label="Converted Markdown preview"]');

    const t1 = Date.now();
    await page.setInputFiles('#converter input[type="file"]', file);
    await expect(preview).toBeVisible({ timeout: 35_000 });
    const first = Date.now() - t1;

    // 第二次转换（input value 已由组件重置，可再次选择同一文件）
    const t2 = Date.now();
    await page.setInputFiles('#converter input[type="file"]', file);
    await expect(preview).toBeVisible({ timeout: 35_000 });
    const second = Date.now() - t2;

    // 允许 1s 容差（GC / 计时抖动），否则第二次应更快或持平（pdf.js 缓存生效）
    expect(second, `第二次 ${second}ms 比第一次 ${first}ms 更慢`).toBeLessThanOrEqual(first + 1_000);
  });
});
