/**
 * OCR 模型自托管脚本（§5.1 步骤 2，§5.2 步骤 2 重写版）
 *
 * 拉取 + 复制 OCR 引擎运行所需资源到 public/ocr/：
 * - worker.min.js（从 jsdelivr CDN 一次性下载，**必需**——tesseract v7 workerBlobURL 模式
 *   必须有具体文件 URL）
 * - tesseract-core.wasm.js（base64 内嵌 WASM 的 JS 包装，**不是** raw `.wasm`）
 * - tesseract-core-simd.wasm.js（SIMD 加速版，Chrome/Edge/Firefox 现代版使用）
 * - 训练数据 eng/spa/por（FR-44）
 *
 * 设计说明：
 * - 不下 `tesseract-core-simd.wasm`（raw WASM 二进制）：v7 不再用这个
 * - workerPath 配置必须指向具体文件 URL（不能是目录），否则 tesseract.js 用 Blob URL spawn
 *   outer worker 时 importScripts('/ocr/') 失败 → "URL '/ocr/' is invalid"
 *
 * 调用：npm run generate:ocr-models
 */

import { mkdir, copyFile, writeFile, stat, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const PROJECT_ROOT = process.cwd();
const PUBLIC_OCR = path.join(PROJECT_ROOT, 'public', 'ocr');
const NODE_MODULES = path.join(PROJECT_ROOT, 'node_modules');

/** tessdata 仓库 CDN（tesseract.js 官方默认 langPath） */
const TESSDATA_BASE = 'https://tessdata.projectnaptha.com/4.0.0';

/** 从 package.json 动态读 tesseract.js 版本（避免升级时不同步） */
async function getTesseractVersion(): Promise<string> {
  try {
    const pkg = JSON.parse(
      await readFile(path.join(PROJECT_ROOT, 'package.json'), 'utf-8')
    );
    const v = pkg.dependencies?.['tesseract.js'] as string | undefined;
    // 去掉 ^ / ~ 前缀，匹配 CDN URL 约定
    return v?.replace(/^[\^~]/, '') ?? '7.0.0';
  } catch {
    return '7.0.0';
  }
}

let JSDELIVR_TESSERACT = 'https://cdn.jsdelivr.net/npm/tesseract.js@7.0.0/dist';

/** 三语训练数据（FR-44 + §7.3：eng/spa/por） */
const LANGUAGES = ['eng', 'spa', 'por'] as const;

interface ResourceSpec {
  source: string;
  dest: string;
  desc: string;
  approxBytes: number;
}

/** 资源清单 */
/** WASM 核心的 6 个变体（base64 内嵌 JS 包装）
 * 覆盖 tesseract.js getCore.js 的检测分支（relaxedSimd/simd × lstm/no-lstm/basic）
 * 一起下发保证所有浏览器都能命中（relaxedSimd 是 Chromium 91+ 特性，最先尝试）
 */
const WASM_JS_VARIANTS = [
  'tesseract-core.wasm.js',
  'tesseract-core-lstm.wasm.js',
  'tesseract-core-simd.wasm.js',
  'tesseract-core-simd-lstm.wasm.js',
  'tesseract-core-relaxedsimd.wasm.js',
  'tesseract-core-relaxedsimd-lstm.wasm.js',
];

const RESOURCES: ResourceSpec[] = [
  // tesseract.js 内层 worker 脚本（v7 workerBlobURL 模式下必需）
  {
    source: `${JSDELIVR_TESSERACT}/worker.min.js`,
    dest: path.join(PUBLIC_OCR, 'worker.min.js'),
    desc: 'tesseract 内层 worker 脚本（worker.min.js）',
    approxBytes: 100 * 1024,
  },
  // WASM 核心：6 个变体
  ...WASM_JS_VARIANTS.map(
    (filename): ResourceSpec => ({
      source: `file://${path.join(NODE_MODULES, 'tesseract.js-core', filename)}`,
      dest: path.join(PUBLIC_OCR, filename),
      desc: `WASM 核心变体：${filename}`,
      approxBytes: 4.5 * 1024 * 1024,
    })
  ),
  // 训练数据三语
  ...LANGUAGES.map(
    (lang): ResourceSpec => ({
      source: `${TESSDATA_BASE}/${lang}.traineddata.gz`,
      dest: path.join(PUBLIC_OCR, `${lang}.traineddata.gz`),
      desc: `训练数据 ${lang}（~10MB 压缩）`,
      approxBytes: 10 * 1024 * 1024,
    })
  ),
];

/** 把字节数格式化为人类可读 */
function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

async function ensureResource(r: ResourceSpec): Promise<number> {
  // 幂等：已存在则跳过
  if (existsSync(r.dest)) {
    const s = await stat(r.dest);
    console.log(`  ✓ 已存在: ${path.basename(r.dest)} (${formatBytes(s.size)})`);
    return s.size;
  }

  process.stdout.write(`  ⇣ 下载: ${path.basename(r.dest)} ... `);
  try {
    if (r.source.startsWith('file://')) {
      await copyFile(r.source.replace(/^file:\/\//, ''), r.dest);
    } else {
      // 60 秒超时：避免构建时网络挂死
      const res = await fetch(r.source, {
        redirect: 'follow',
        signal: AbortSignal.timeout(60_000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      await writeFile(r.dest, buf);
    }
    const s = await stat(r.dest);
    console.log(`${formatBytes(s.size)} ✓`);
    return s.size;
  } catch (err) {
    console.log(`✗ 失败: ${(err as Error).message}`);
    return 0;
  }
}

async function main() {
  console.log(`📁 目标目录: ${PUBLIC_OCR}`);
  // 用 package.json 的 tesseract.js 版本替换默认 URL（B4 修复：避免硬编码版本）
  JSDELIVR_TESSERACT = `https://cdn.jsdelivr.net/npm/tesseract.js@${await getTesseractVersion()}/dist`;
  await mkdir(PUBLIC_OCR, { recursive: true });

  let totalBytes = 0;
  let failed = 0;

  for (const r of RESOURCES) {
    const size = await ensureResource(r);
    totalBytes += size;
    if (size === 0) failed++;
  }

  console.log('');
  if (failed === 0) {
    console.log(`✅ 完成。public/ocr/ 共 ${RESOURCES.length} 项，总计 ${formatBytes(totalBytes)}`);
  } else {
    console.log(
      `⚠️  部分失败（${failed}/${RESOURCES.length}）。检查网络或重试后失败的资源。`
    );
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('脚本异常:', err);
  process.exit(1);
});
