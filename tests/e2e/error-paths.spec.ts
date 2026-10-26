/**
 * E2E 错误路径 — 对应测试策略 T-06 + T-01-09/10 迁移用例
 *
 * 覆盖：
 * - T-06-01 损坏 PDF（截断字节）→ corrupted 提示
 * - T-06-02 非 PDF 文件 → wrong type 提示
 * - T-06-03/07 >200MB → 前端拦截，超限提示（内存构造，避免 201MB fixture 入库）
 * - T-06-04/05/06 加密 PDF（MVP 无密码对话框，见下方说明）
 * - T-06-08 转换中刷新 → 无残留状态
 * - T-01-09/10（迁移）扫描型 PDF → scanned 提示（类型检测的 E2E 验证）
 *
 * ⚠️ T-06-04/05/06 说明：PRD M-07 的密码交互对话框为 P1 规划，
 * MVP 阶段加密 PDF 直接显示 encryptedFile 错误提示（@pdf2md/core
 * 不支持加密文档）。此处先验证 MVP 行为，P1 实现密码对话框后
 * 再补充"错误密码重试 3 次/正确密码成功/取消"三条用例。
 */
import { test, expect } from '@playwright/test';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const fixture = (name: string) => path.join(__dirname, '..', 'fixtures', name);
const hasCorrupted = existsSync(fixture('sample-corrupted.pdf'));
const hasEncrypted = existsSync(fixture('sample-encrypted.pdf'));
const hasScanned = existsSync(fixture('sample-scanned.pdf'));

test.describe('T-06 错误路径', () => {
  test('T-06-01 损坏 PDF → 显示损坏提示（不崩溃）', async ({ page }) => {
    test.skip(!hasCorrupted, '需要 sample-corrupted.pdf：先运行 npm run generate:fixtures');
    await page.goto('/en/');
    await page.setInputFiles('#converter input[type="file"]', fixture('sample-corrupted.pdf'));

    const alert = page.getByTestId('conversion-error');
    await expect(alert).toContainText(/corrupted/i, { timeout: 15_000 });
  });

  test('T-06-02 非 PDF 文件（.txt）→ 类型错误提示', async ({ page }, testInfo) => {
    // 构造临时 .txt 文件（不依赖 fixture 生成）
    // outputDir 可能尚未创建（中文/特殊字符路径时序），先确保目录存在
    mkdirSync(testInfo.outputDir, { recursive: true });
    const txt = path.join(testInfo.outputDir, 'notes.txt');
    // 内容必须超过 MIN_FILE_SIZE(100B)，否则先触发 file_empty 而非 file_wrong_type
    writeFileSync(txt, 'hello, this is not a pdf. '.repeat(20));

    await page.goto('/en/');
    await page.setInputFiles('#converter input[type="file"]', txt);

    const alert = page.getByTestId('conversion-error');
    await expect(alert).toContainText(/doesn't look like a PDF/i, { timeout: 15_000 });
  });

  test('T-06-03/07 >200MB 文件 → 前端拦截超限提示', async ({ page }) => {
    await page.goto('/en/');

    // 在浏览器内构造 201MB File 并派发 drop（避免 201MB fixture 入库与传输）
    await page.evaluate(() => {
      const bytes = new Uint8Array(201 * 1024 * 1024);
      const file = new File([bytes], 'huge.pdf', { type: 'application/pdf' });
      const dt = new DataTransfer();
      dt.items.add(file);
      const zone = document.querySelector('#converter [role="button"]');
      zone?.dispatchEvent(new DragEvent('drop', { dataTransfer: dt, bubbles: true }));
    });

    const alert = page.getByTestId('conversion-error');
    await expect(alert).toContainText(/file too large/i, { timeout: 15_000 });
    // 不进入转换（无进度条）
    await expect(page.getByRole('progressbar')).toHaveCount(0);
  });

  test('T-06-04/05/06（MVP 简化）加密 PDF → 加密提示，无崩溃', async ({ page }) => {
    test.skip(!hasEncrypted, '需要 sample-encrypted.pdf：先运行 npm run generate:fixtures');
    await page.goto('/en/');
    await page.setInputFiles('#converter input[type="file"]', fixture('sample-encrypted.pdf'));

    const alert = page.getByTestId('conversion-error');
    await expect(alert).toContainText(/encrypted/i, { timeout: 15_000 });
  });

  test('T-01-09/10（迁移）扫描型 PDF（无文本层）→ scanned 提示', async ({ page }) => {
    test.skip(!hasScanned, '需要 sample-scanned.pdf：先运行 npm run generate:fixtures');
    await page.goto('/en/');
    await page.setInputFiles('#converter input[type="file"]', fixture('sample-scanned.pdf'));

    // 当前产品行为：检测到扫描件后展示 OCR 语言选择，不再走通用错误提示。
    await expect(page.getByText(/This PDF is a scanned document/i)).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByRole('button', { name: 'Enable OCR (English)' })).toBeVisible();
  });

  test('T-06-08 转换过程中刷新 → 无残留状态，页面正常加载', async ({ page }) => {
    test.skip(!existsSync(fixture('sample-100p.pdf')), '需要 sample-100p.pdf：先运行 npm run generate:fixtures');
    await page.goto('/en/');
    await page.setInputFiles('#converter input[type="file"]', fixture('sample-100p.pdf'));

    // 转换开始后立即刷新
    await expect(page.getByRole('progressbar')).toBeVisible({ timeout: 10_000 });
    await page.reload();

    // 页面正常：dropzone 可用（无残留进度/结果/错误）
    await expect(page.locator('#converter [role="button"]')).toBeVisible();
    await expect(page.locator('#converter [role="button"]')).not.toHaveAttribute('aria-disabled', 'true');
    await expect(page.getByRole('progressbar')).toHaveCount(0);
    await expect(page.getByTestId('conversion-error')).toHaveCount(0);
  });
});
