/**
 * 生成 OCR 验证测试样本 — 关卡 B 端到端验证专用
 *
 * 与 sample-scanned.pdf 区别：
 * - sample-scanned.pdf 仅含 1x1 空白 PNG（用于"无文本层"判定 / M-01 拒绝路径）
 * - sample-ocr-fixture.pdf 含清晰可识别的英文文字（用于 OCR 端到端验证）
 *
 * 两者都是"无 PDF 文本层"PDF（满足 scanned_pdf 错误码触发条件）
 * 但后者图片有真内容，OCR 出来应有文字
 *
 * 运行：npx tsx tests/fixtures/generate-ocr-fixture.ts
 * 产物：tests/fixtures/sample-ocr-fixture.pdf
 */

import { PDFDocument } from 'pdf-lib';
import sharp from 'sharp';
import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';

const OUT_DIR = path.join(__dirname, '..', 'fixtures');

/** 三页各自的内容（OCR 验证期望每页都有真实文字输出） */
const PAGE_TEXTS = [
  'Papel Tools OCR Validation',
  'Hello World 2026 Number Test',
  'Privacy First PDF to Markdown',
];

/** SVG 模板：用 sharp 渲染 SVG → PNG（避免 Node canvas 依赖） */
async function renderTextToPng(text: string, width = 800, height = 600): Promise<Buffer> {
  const fontSize = 48;
  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${width}" height="${height}" fill="white" />
      <text
        x="${width / 2}"
        y="${height / 2}"
        font-family="Arial, sans-serif"
        font-size="${fontSize}"
        font-weight="bold"
        fill="black"
        text-anchor="middle"
        dominant-baseline="middle"
      >${escapeXml(text)}</text>
    </svg>
  `;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function main() {
  const doc = await PDFDocument.create();
  doc.setTitle('OCR Test Fixture');
  doc.setAuthor('Papel Tools Test Fixtures');

  for (const text of PAGE_TEXTS) {
    // 用 sharp 生成清晰可识别的 PNG
    const pngBytes = await renderTextToPng(text);
    const image = await doc.embedPng(pngBytes);

    const page = doc.addPage([595, 842]); // A4 portrait
    // 等比缩放 PNG 到页面（保持比例）
    const scale = Math.min(595 / image.width, 842 / image.height);
    const w = image.width * scale;
    const h = image.height * scale;
    page.drawImage(image, {
      x: (595 - w) / 2,
      y: (842 - h) / 2,
      width: w,
      height: h,
    });
  }

  mkdirSync(OUT_DIR, { recursive: true });
  const bytes = await doc.save();
  const outPath = path.join(OUT_DIR, 'sample-ocr-fixture.pdf');
  writeFileSync(outPath, bytes);
  console.log(
    `[fixtures] 已生成 ${outPath}（${(bytes.length / 1024).toFixed(1)} KB，${PAGE_TEXTS.length} 页含可读英文）`
  );
}

main().catch((err) => {
  console.error('[fixtures] 生成失败:', err);
  process.exit(1);
});
