#!/usr/bin/env node
/**
 * 生成 Chrome 扩展图标（PNG，从 source svg 栅格化）
 *
 * 用途：
 * - Chrome Web Store 提交必备（最小 128×128）
 * - 工具栏图标 16/32/48 三档
 *
 * 输出：extension/public/icon-{16,32,48,128}.png
 * 源：public/favicon.svg（与主站 favicon 共享品牌：朱红折纸图标）
 *
 * 用法：node extension/scripts/generate-icons.mjs
 * 依赖：sharp（root node_modules 已装）
 */

import sharp from 'sharp';
import { readFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 路径：脚本在 extension/scripts/，跳到项目根
const ROOT_DIR = resolve(__dirname, '..', '..');
const SOURCE_SVG = join(ROOT_DIR, 'public', 'favicon.svg');
const OUTPUT_DIR = join(ROOT_DIR, 'extension', 'public');

const SIZES = [
  { size: 16, name: 'icon-16.png' },
  { size: 32, name: 'icon-32.png' },
  { size: 48, name: 'icon-48.png' },
  { size: 128, name: 'icon-128.png' },
];

async function main() {
  // 确保输出目录存在
  await mkdir(OUTPUT_DIR, { recursive: true });

  // 读取源 SVG
  const svgSource = await readFile(SOURCE_SVG, 'utf-8');
  console.log(`[icons] Loaded source: ${SOURCE_SVG}`);

  // 为每个尺寸生成 PNG
  for (const { size, name } of SIZES) {
    const outputPath = join(OUTPUT_DIR, name);
    await sharp(Buffer.from(svgSource))
      .resize(size, size, { fit: 'cover', kernel: 'lanczos3' })
      // Chrome 工具栏图标需要高 DPI 支持，但 PNG 是栅格化输出
      // 使用 density 提升锐度（render at 4x then downsample）
      .png({ compressionLevel: 9, palette: false })
      .toFile(outputPath);

    const meta = await sharp(outputPath).metadata();
    console.log(`[icons] Generated ${name} (${meta.width}×${meta.height}, ${meta.format})`);
  }

  console.log(`[icons] ✅ All icons generated to ${OUTPUT_DIR}`);
}

main().catch((err) => {
  console.error('[icons] Failed:', err);
  process.exit(1);
});
