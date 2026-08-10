/**
 * OCR 集成 E2E — §5.2 步骤 3（main thread OCR path）
 *
 * 路径：上传扫描型 fixture → ConverterSection 显示"启用 OCR"按钮 →
 *       用户点击 → 主线程 convertPdfViaOcr → result.metadata.ocr=true
 *
 * 前置：先跑 generate:fixtures 生成扫描型 fixture（已有 sample-ocr-fixture.pdf 直接用）
 *
 * 注意：跑 dev server 而不是静态服务（playwright.config.ts 默认配置）
 * OCR 真实跑：~30 秒（首次）+ WASM/模型加载
 */

import { test, expect } from '@playwright/test';
import { existsSync } from 'node:fs';
import path from 'node:path';

const fixture = (name: string) => path.join(__dirname, '..', 'fixtures', name);
const hasScannedSample = existsSync(fixture('sample-ocr-fixture.pdf'));

test.describe('T-05 OCR 集成（main thread 路径）', () => {
  test.skip(!hasScannedSample, '扫描型 OCR fixture 未生成');

  test('T-05-01 上传扫描型 PDF → 触发 OCR 软信号 → 用户启用 OCR → 得到 metadata.ocr=true 的 Markdown', async ({
    page,
  }) => {
    // 加大超时：OCR 首次冷启动 30-60s（含 WASM + 模型加载 + 3 页识别）
    test.setTimeout(180_000);

    await page.goto('/en/');

    // 上传扫描型 fixture（@pdf2md/core 报 scanned_pdf 错误 → UI 切换到 awaiting_ocr）
    await page.setInputFiles('#converter input[type="file"]', fixture('sample-ocr-fixture.pdf'));

    // 等 OCR 提示出现（ConverterSection 内 data-testid="ocr-prompt"）
    await expect(page.getByTestId('ocr-prompt')).toBeVisible({ timeout: 30_000 });

    // 启用 OCR（英文按钮）
    await page.getByRole('button', { name: /Enable OCR.*English/ }).click();

    // 等 OCR 完成（status=done 后 ResultPanel 渲染）
    // metadata-test：markdown preview 应在 done 时出现
    const preview = page.locator('[aria-label="Converted Markdown preview"]');
    await expect(preview).toBeVisible({ timeout: 90_000 });

    // 验证 metadata — 通过检查 ResultPanel 中 token 数 / 词数 等元信息栏
    // 简单办法：检查 markdown 中至少包含 fixture 中的真词
    const markdown = await preview.textContent();
    expect(markdown).toBeTruthy();
    expect((markdown ?? '').length).toBeGreaterThan(20);

    // fixture 真词：papel / hello / world / privacy / pdf / markdown / ocr
    // OCR 可能漏字，要求至少命中 4 个
    const expectedHits = ['papel', 'hello', 'world', 'privacy', 'pdf', 'markdown', 'ocr'];
    const hits = expectedHits.filter((w) => (markdown ?? '').toLowerCase().includes(w));
    expect(
      hits.length,
      `OCR 应至少命中 4 个 fixture 真词。命中：${hits.join(', ') || '(无)'}\n\nMarkdown:\n${markdown}`
    ).toBeGreaterThanOrEqual(4);

    // §5.2 步骤 5：OCR 结果必须显示 OCR 徽章（透明标记精度风险）
    await expect(page.getByTestId('ocr-badge')).toBeVisible();
  });
});
