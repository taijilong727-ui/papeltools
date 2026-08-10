/**
 * 生成扫描型 PDF 测试样本（无文本层）— T-01-09/10 迁移用例 + M-01 拒绝提示
 *
 * 原理：每页仅嵌入一张 1x1 PNG 图片，**不写任何文本操作符**，
 * 从而让 pdf.js 检测到"无文本层"（@pdf2md/core 报 No text layer found）。
 *
 * 运行：npx tsx tests/fixtures/generate-scanned.ts
 * 产物：tests/fixtures/sample-scanned.pdf
 */
import { PDFDocument } from 'pdf-lib';
import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';

const OUT_DIR = path.join(__dirname, '..', 'fixtures');

/** 1x1 白色 PNG（base64） */
const ONE_PX_PNG =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

async function main() {
  const doc = await PDFDocument.create();
  doc.setTitle('Scanned Sample');
  doc.setAuthor('Papel Tools Test Fixtures');

  const pngBytes = Buffer.from(ONE_PX_PNG, 'base64');
  const image = await doc.embedPng(pngBytes);

  // 3 页：全部只有图片，无文本层
  for (let i = 0; i < 3; i += 1) {
    const page = doc.addPage([595, 842]);
    // 铺满页面（1x1 放大会有像素块，无妨——仅用于触发"无文本层"判定）
    page.drawImage(image, { x: 0, y: 0, width: 595, height: 842 });
  }

  mkdirSync(OUT_DIR, { recursive: true });
  const bytes = await doc.save();
  const outPath = path.join(OUT_DIR, 'sample-scanned.pdf');
  writeFileSync(outPath, bytes);
  console.log(`[fixtures] 已生成 ${outPath}（${(bytes.length / 1024).toFixed(0)} KB，无文本层）`);
}

main().catch((err) => {
  console.error('[fixtures] 生成失败:', err);
  process.exit(1);
});
