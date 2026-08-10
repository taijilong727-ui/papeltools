/**
 * 生成损坏 PDF 测试样本 — T-06-01
 *
 * 原理：读取合法 PDF 字节，保留文件头（%PDF-...），截断到约一半。
 * 模拟"损坏 PDF（截断字节）"场景 → @pdf2md/core 报 Invalid/Parse 错误。
 *
 * 前置：先运行 generate-text.ts（依赖 sample-text.pdf）
 * 运行：npx tsx tests/fixtures/generate-corrupted.ts
 * 产物：tests/fixtures/sample-corrupted.pdf
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';

const OUT_DIR = path.join(__dirname, '..', 'fixtures');
const SOURCE = path.join(OUT_DIR, 'sample-text.pdf');
const OUT = path.join(OUT_DIR, 'sample-corrupted.pdf');

async function main() {
  if (!existsSync(SOURCE)) {
    console.error(`[fixtures] 缺少源文件 ${SOURCE}，请先运行 generate-text.ts`);
    process.exit(1);
  }

  const bytes = readFileSync(SOURCE);
  // 截断到 50%（保留文件头）
  const truncated = bytes.subarray(0, Math.floor(bytes.length / 2));

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(OUT, truncated);
  console.log(`[fixtures] 已生成 ${OUT}（原 ${(bytes.length / 1024).toFixed(0)} KB → 截断为 ${(truncated.length / 1024).toFixed(0)} KB）`);
}

main().catch((err) => {
  console.error('[fixtures] 生成失败:', err);
  process.exit(1);
});
