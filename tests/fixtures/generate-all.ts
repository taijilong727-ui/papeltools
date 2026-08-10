/**
 * 一键生成全部 MVP 测试样本 — npm run generate:fixtures 的入口
 *
 * 生成顺序（有依赖关系，不可并行）：
 *   1. generate-text      → sample-text.pdf / sample-100p.pdf（先于 corrupted）
 *   2. generate-scanned   → sample-scanned.pdf
 *   3. generate-encrypted → sample-encrypted.pdf
 *   4. generate-corrupted → sample-corrupted.pdf（依赖 sample-text.pdf）
 *
 * 默认不含超大样本（sample-large.pdf），需要时单独运行：
 *   npx tsx tests/fixtures/generate-large.ts --size 201
 */
import { execSync } from 'node:child_process';
import path from 'node:path';

const here = __dirname;

/** 依次执行生成脚本（stdout 透传） */
function run(script: string) {
  const full = path.join(here, script);
  console.log(`\n── 运行 ${script} ──`);
  execSync(`npx tsx ${JSON.stringify(full)}`, { stdio: 'inherit' });
}

function main() {
  run('generate-text.ts');
  run('generate-scanned.ts');
  run('generate-encrypted.ts');
  run('generate-corrupted.ts');
  console.log('\n✅ 全部 MVP 样本生成完成');
  console.log('   sample-text.pdf       5 页文本型（T-01/T-03 主路径）');
  console.log('   sample-scanned.pdf    无文本层（T-01-09/10 迁移用例）');
  console.log('   sample-encrypted.pdf  密码 pass123（T-06-04/05/06 MVP 版）');
  console.log('   sample-corrupted.pdf  截断损坏（T-06-01）');
  console.log('   性能样本：npx tsx tests/fixtures/generate-text.ts --pages 100');
  console.log('   超大样本：npx tsx tests/fixtures/generate-large.ts --size 201');
}

main();
