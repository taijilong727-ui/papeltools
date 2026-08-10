/**
 * 生成文本型 PDF 测试样本（T-01/T-03 主路径）
 *
 * 产物：
 * - tests/fixtures/sample-text.pdf（默认 5 页，含结构化内容）
 * - tests/fixtures/sample-100p.pdf（--pages 100，供性能/取消用例）
 *
 * 内容覆盖（对应 T-01-01 ~ T-01-07）：
 * - H1-H6 标题层级（不同字号 + 加粗）
 * - 无序/有序列表
 * - 表格（网格线 + 等宽文本对齐）
 * - 代码块（Courier + 缩进 + 边框）
 * - 超链接（蓝色下划线样式文本）
 * - 多栏排版（第 3 页两栏文本）
 * - 页眉/页脚（每页顶部/底部重复文本，供 T-01-05 剥离验证）
 *
 * 运行：npx tsx tests/fixtures/generate-text.ts [--pages N]
 * 依赖：pdf-lib（已加入 devDependencies）
 */
import { PDFDocument, StandardFonts, rgb, type PDFPage } from 'pdf-lib';
import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';

const OUT_DIR = path.join(__dirname, '..', 'fixtures');

function parseArgs(): { pages: number; out: string } {
  const pagesIdx = process.argv.indexOf('--pages');
  const pages = pagesIdx >= 0 ? Number(process.argv[pagesIdx + 1]) || 5 : 5;
  const out = pages >= 50 ? 'sample-100p.pdf' : 'sample-text.pdf';
  return { pages, out };
}

async function main() {
  const { pages, out } = parseArgs();
  const doc = await PDFDocument.create();
  const helv = await doc.embedFont(StandardFonts.Helvetica);
  const helvBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const courier = await doc.embedFont(StandardFonts.Courier);

  const W = 595;
  const H = 842;
  const INK = rgb(0.11, 0.1, 0.08);
  const GRAY = rgb(0.44, 0.42, 0.37);
  const ACCENT = rgb(0.66, 0.26, 0.17);
  const BLUE = rgb(0.2, 0.35, 0.7);

  // PDF 元数据标题（T-03-02 下载文件名断言依赖此值）
  doc.setTitle('Sample Text Document');
  doc.setAuthor('Papel Tools Test Fixtures');

  /** 页眉 + 页脚（T-01-05：验证输出中页眉页脚被剥离） */
  const drawChrome = (page: PDFPage, pageNo: number) => {
    page.drawText(`Sample Text Document - Page ${pageNo}`, { x: 50, y: H - 40, size: 8, font: helv, color: GRAY });
    page.drawText('Confidential', { x: 50, y: 30, size: 8, font: helv, color: GRAY });
  };

  for (let p = 0; p < pages; p += 1) {
    const page = doc.addPage([W, H]);
    drawChrome(page, p + 1);
    const pageNo = p + 1;

    if (pageNo === 1) {
      // ── 第 1 页：H1-H6 标题层级（字号递减 + 加粗） + 列表 ──
      page.drawText('Introduction', { x: 50, y: 760, size: 24, font: helvBold, color: INK });
      page.drawText('Background', { x: 50, y: 720, size: 18, font: helvBold, color: INK });
      page.drawText('Historical Context', { x: 50, y: 690, size: 14, font: helvBold, color: INK });
      page.drawText('Nested Section', { x: 50, y: 660, size: 12, font: helvBold, color: INK });
      page.drawText('Detail Level', { x: 50, y: 640, size: 11, font: helvBold, color: INK });
      page.drawText('Fine Grain', { x: 50, y: 620, size: 10, font: helvBold, color: INK });

      // 无序列表
      page.drawText('- First bullet item', { x: 50, y: 580, size: 11, font: helv, color: INK });
      page.drawText('- Second bullet item', { x: 50, y: 562, size: 11, font: helv, color: INK });
      page.drawText('- Nested bullet', { x: 70, y: 544, size: 11, font: helv, color: INK });

      // 有序列表
      page.drawText('1. Step one', { x: 50, y: 510, size: 11, font: helv, color: INK });
      page.drawText('2. Step two', { x: 50, y: 492, size: 11, font: helv, color: INK });
      page.drawText('3. Step three', { x: 50, y: 474, size: 11, font: helv, color: INK });
    } else if (pageNo === 2) {
      // ── 第 2 页：表格（等宽文本 + 网格线） + 代码块 ──────────
      page.drawText('Quarterly Data', { x: 50, y: 760, size: 18, font: helvBold, color: INK });

      // 表格：4 行 x 3 列网格
      const cols = [50, 220, 390];
      const rowY = [700, 665, 630, 595];
      const rows = [
        ['Section', 'Status', 'Owner'],
        ['Parsing', 'done', 'engine'],
        ['Tables', 'preserved', 'core'],
        ['Formulas', 'LaTeX', 'pdfjs'],
      ];
      rows.forEach((row, r) => {
        row.forEach((cell, c) => {
          page.drawText(cell, { x: cols[c] + 4, y: rowY[r] - 12, size: 10, font: courier, color: INK });
        });
      });
      cols.forEach((x) => {
        page.drawLine({ start: { x, y: 715 }, end: { x, y: 580 }, thickness: 0.5, color: GRAY });
      });
      [715, 680, 645, 610, 580].forEach((y) => {
        page.drawLine({ start: { x: 50, y }, end: { x: 420, y }, thickness: 0.5, color: GRAY });
      });

      // 代码块：等宽 + 缩进 + 边框
      page.drawText('Code Example', { x: 50, y: 540, size: 18, font: helvBold, color: INK });
      page.drawRectangle({ x: 50, y: 400, width: 360, height: 115, borderColor: GRAY, borderWidth: 0.8 });
      const code = ['def convert(pdf):', '    text = extract(pdf)', '    return to_md(text)'];
      code.forEach((line, i) => {
        page.drawText(line, { x: 62, y: 490 - i * 16, size: 10, font: courier, color: ACCENT });
      });
    } else if (pageNo === 3) {
      // ── 第 3 页：超链接样式文本 + 多栏排版 ──────────────────
      page.drawText('References', { x: 50, y: 760, size: 18, font: helvBold, color: INK });
      // 链接：蓝色 + 下划线样式（pdf-lib 无 drawText link 注解，用样式模拟）
      page.drawText('Link to documentation', { x: 50, y: 730, size: 12, font: helv, color: BLUE });
      page.drawLine({ start: { x: 50, y: 725 }, end: { x: 190, y: 725 }, thickness: 0.6, color: BLUE });
      page.drawText('https://example.com/docs/pdf', { x: 50, y: 710, size: 10, font: helv, color: GRAY });

      // 多栏：两栏各 3 行（T-01-07：验证输出文本顺序，非逐栏断裂）
      page.drawText('Two-Column Layout', { x: 50, y: 660, size: 18, font: helvBold, color: INK });
      const leftCol = ['Left column line one.', 'Left column line two.', 'Left column line three.'];
      const rightCol = ['Right column line one.', 'Right column line two.', 'Right column line three.'];
      leftCol.forEach((line, i) => page.drawText(line, { x: 50, y: 620 - i * 18, size: 11, font: helv, color: INK }));
      rightCol.forEach((line, i) => page.drawText(line, { x: 300, y: 620 - i * 18, size: 11, font: helv, color: INK }));
    } else {
      // ── 其余页：填充段落文本（供 100 页性能样本）────────────
      page.drawText(`Section ${pageNo}`, { x: 50, y: 760, size: 16, font: helvBold, color: INK });
      for (let i = 0; i < 8; i += 1) {
        page.drawText(
          `Paragraph ${i + 1}: This is filler body text for page ${pageNo}. It exercises the text extraction pipeline with plain paragraphs.`,
          { x: 50, y: 720 - i * 30, size: 11, font: helv, color: INK }
        );
      }
    }
  }

  mkdirSync(OUT_DIR, { recursive: true });
  const bytes = await doc.save();
  const outPath = path.join(OUT_DIR, out);
  writeFileSync(outPath, bytes);
  console.log(`[fixtures] 已生成 ${outPath}（${pages} 页，${(bytes.length / 1024).toFixed(0)} KB）`);
}

main().catch((err) => {
  console.error('[fixtures] 生成失败:', err);
  process.exit(1);
});
