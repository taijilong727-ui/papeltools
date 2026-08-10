/**
 * E2E 核心流程 — 对应测试策略 T-03
 *
 * 前置：先生成测试样本（npm run generate:fixtures），否则整个 describe 跳过。
 *
 * 上传方式说明：Playwright 对 dropzone 内隐藏 input 使用 setInputFiles，
 * 触发与"拖拽/选择"完全相同的 onFileSelected 路径（校验逻辑不区分来源）。
 */
import { test, expect } from '@playwright/test';
import { existsSync } from 'node:fs';
import path from 'node:path';

const fixture = (name: string) => path.join(__dirname, '..', 'fixtures', name);
const hasTextSample = existsSync(fixture('sample-text.pdf'));
const hasBigSample = existsSync(fixture('sample-100p.pdf'));

/** 上传并等待转换完成的公共步骤 */
async function convertSample(page: import('@playwright/test').Page, filePath: string) {
  await page.goto('/en/');
  await page.setInputFiles('#converter input[type="file"]', filePath);
  const preview = page.locator('[aria-label="Converted Markdown preview"]');
  await expect(preview).toBeVisible({ timeout: 30_000 });
  return preview;
}

test.describe('T-03 核心流程', () => {
  test.skip(!hasTextSample, '测试样本未生成：先执行 npm run generate:fixtures');

  test('T-03-01 上传文本型 PDF → 预览区显示 Markdown 内容', async ({ page }) => {
    const preview = await convertSample(page, fixture('sample-text.pdf'));
    // sample-text.pdf 由 generate-text.ts 生成；以下断言对应真实转换输出
    // （已用 @pdf2md/core 实际转换验证：H1/H2、无序列表、代码块、链接、表格关键词）
    await expect(preview).toContainText('# Introduction'); // H1 识别
    await expect(preview).toContainText('## Background'); // H2 识别
    await expect(preview).toContainText('- First bullet item'); // 无序列表
    await expect(preview).toContainText('def convert(pdf)'); // 代码块内容
    await expect(preview).toContainText('[https://example.com/docs/pdf]'); // 链接保留
    await expect(preview).toContainText('Section'); // 表格列名（核心库按行输出，非管道表格）
    // 页眉页脚剥离（T-01-05 的 E2E 层验证）
    await expect(preview).not.toContainText('Page 1');
    await expect(preview).not.toContainText('Confidential');
  });

  test('T-03-02 文件选择上传 → 下载 .md 且文件名含 PDF 标题', async ({ page }) => {
    await page.goto('/en/');
    await page.setInputFiles('#converter input[type="file"]', fixture('sample-text.pdf'));
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download .md' }).click({ timeout: 30_000 });

    const download = await downloadPromise;
    // generate-text.ts 设置 PDF 标题 "Sample Text Document" → deriveFilename 清洗后为 Sample-Text-Document.md
    expect(download.suggestedFilename()).toMatch(/^Sample-Text-Document.*\.md$/i);
  });

  test('T-03-03 转换完成 → 复制按钮 → 剪贴板内容为 Markdown', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await convertSample(page, fixture('sample-text.pdf'));

    await page.getByRole('button', { name: 'Copy to clipboard' }).click();
    // 复制成功 → 按钮文案切换为 Copied ✓
    await expect(page.getByText(/Copied/i)).toBeVisible();
    const clip = await page.evaluate(() => navigator.clipboard.readText());
    expect(clip).toContain('# Introduction');
  });

  test('T-03-04 转换完成 → 元数据栏显示页数/字数/token 估算/耗时', async ({ page }) => {
    await convertSample(page, fixture('sample-text.pdf'));
    // 元数据格式："N pages · X words · ~Y tokens · Zs"
    // 用 data-testid 精确定位元数据栏（正文文案也可能含 "pages"，避免选择器歧义）
    const metadata = page.getByTestId('result-metadata');
    await expect(metadata).toContainText(/pages/i);
    await expect(metadata).toContainText(/tokens/i);
    await expect(metadata).toContainText(/words/i);
  });

  test('T-03-05 转换中点击取消 → 中止并回到初始状态', async ({ page }) => {
    test.skip(!hasBigSample, '取消用例需要较大样本（sample-100p.pdf），未生成则跳过');
    await page.goto('/en/');
    await page.setInputFiles('#converter input[type="file"]', fixture('sample-100p.pdf'));

    const cancelBtn = page.getByRole('button', { name: 'Cancel' });
    // 等待转换进入进行中（进度条出现）
    await expect(page.getByRole('progressbar')).toBeVisible({ timeout: 10_000 });
    // 若转换过快已完成（Cancel 按钮已消失），跳过取消断言
    if (await cancelBtn.isVisible()) {
      await cancelBtn.click();
      await expect(page.getByRole('progressbar')).toBeHidden();
      // 回到初始状态：dropzone 可再次交互
      await expect(page.locator('#converter [role="button"]')).not.toHaveAttribute(
        'aria-disabled',
        'true'
      );
    }
  });
});
