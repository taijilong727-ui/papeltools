/**
 * 生成超大 PDF 测试样本（> 200MB）— T-06-03/07（可选）
 *
 * 说明：
 * - E2E 用例已在浏览器内构造 201MB File（避免大文件入库），见
 *   tests/e2e/error-paths.spec.ts T-06-03/07。
 * - 本脚本提供落盘版本，供本地手动验证（npm run generate:fixtures 不调用，
 *   需显式执行以避免每次生成 200MB 文件）。
 *
 * 运行：npx tsx tests/fixtures/generate-large.ts [--size MB]
 * 产物：tests/fixtures/sample-large.pdf（默认 201MB，字节填充，非合法 PDF——
 *       校验在转换前只查大小与扩展名，内容无关紧要）
 */
import { createWriteStream, mkdirSync } from 'node:fs';
import path from 'node:path';

const OUT_DIR = path.join(__dirname, '..', 'fixtures');

function parseSize(): number {
  const idx = process.argv.indexOf('--size');
  const mb = idx >= 0 ? Number(process.argv[idx + 1]) || 201 : 201;
  return mb * 1024 * 1024;
}

function main() {
  const size = parseSize();
  const outPath = path.join(OUT_DIR, 'sample-large.pdf');

  mkdirSync(OUT_DIR, { recursive: true });
  const ws = createWriteStream(outPath);

  return new Promise<void>((resolve, reject) => {
    ws.on('finish', () => {
      console.log(`[fixtures] 已生成 ${outPath}（${(size / 1024 / 1024).toFixed(0)} MB）`);
      resolve();
    });
    ws.on('error', reject);

    // 文件头 + 填充字节（%PDF- 开头，避免某些工具直接拒绝）
    ws.write('%PDF-1.7\n');
    const chunk = Buffer.alloc(1024 * 1024, 0x30); // 1MB 的 '0' 字节
    let written = 0;
    const writeNext = () => {
      while (written < size) {
        const ok = ws.write(chunk);
        written += chunk.length;
        if (!ok) {
          ws.once('drain', writeNext);
          return;
        }
      }
      ws.end();
    };
    writeNext();
  });
}

main().catch((err) => {
  console.error('[fixtures] 生成失败:', err);
  process.exit(1);
});
