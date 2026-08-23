#!/usr/bin/env node
/**
 * 生成 Chrome Web Store promo tile (440×280 PNG)
 *
 * 设计：朱红品牌色 + 简洁文案（无 nested 品牌 + 1 关键词）
 * 颜色取自 extension/styles/globals.css:
 *   --color-paper-soft: #fbf8f1
 *   --color-ink:        #1d1b17
 *   --color-accent:     #a8432c
 *
 * 字体：系统衬线（Georgia/serif）+ 等宽（Courier New），不依赖网络字体
 *
 * 依赖：sharp（root node_modules）
 */

import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '..', '..');
const OUT_DIR = join(ROOT, 'extension', 'store-assets');
const PNG_PATH = join(OUT_DIR, 'promo-tile-440x280.png');

const WIDTH = 440;
const HEIGHT = 280;

function buildSvg() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <!-- 背景：纸感浅色 -->
  <rect width="${WIDTH}" height="${HEIGHT}" fill="#fbf8f1"/>

  <!-- 顶部发光晕（呼应 globals.css body 装饰） -->
  <defs>
    <radialGradient id="glow" cx="50%" cy="0%" r="80%">
      <stop offset="0%" stop-color="#a8432c" stop-opacity="0.10"/>
      <stop offset="100%" stop-color="#a8432c" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <ellipse cx="${WIDTH / 2}" cy="0" rx="${WIDTH * 0.6}" ry="${HEIGHT * 0.6}" fill="url(#glow)"/>

  <!-- 左侧折纸图标（呼应品牌 origami mark） -->
  <g transform="translate(40, 60)">
    <rect x="0" y="0" width="100" height="100" rx="8" fill="#a8432c"/>
    <g stroke="#fbf8f1" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round" fill="none" transform="translate(22, 18)">
      <path d="M0 0 H34 L54 22 V62 H0 Z"/>
      <path d="M34 0 V22 H54"/>
      <path d="M12 36 H42 M12 48 H42"/>
    </g>
  </g>

  <!-- 品牌名 -->
  <text x="160" y="100" font-family="Georgia, 'Times New Roman', serif" font-size="42" font-weight="500" fill="#1d1b17" letter-spacing="-1">Papel Tools</text>

  <!-- 副标题 -->
  <text x="160" y="135" font-family="Georgia, 'Times New Roman', serif" font-size="20" font-style="italic" fill="#6f6a5e">PDF to Markdown, in your browser.</text>

  <!-- 卖点 chips -->
  <g font-family="'Courier New', monospace" font-size="11" letter-spacing="1.5">
    <text x="160" y="170" fill="#a8432c">100% IN-BROWSER</text>
    <text x="160" y="188" fill="#a8432c">·  FILES NEVER UPLOADED</text>
  </g>

  <!-- 底部分隔线 -->
  <line x1="40" y1="220" x2="${WIDTH - 40}" y2="220" stroke="#e2dccd" stroke-width="1"/>

  <!-- 底部域名 -->
  <text x="40" y="250" font-family="'Courier New', monospace" font-size="14" fill="#1d1b17" letter-spacing="1">papeltools.com</text>
</svg>`;
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const svgSource = buildSvg();

  await sharp(Buffer.from(svgSource))
    .resize(WIDTH, HEIGHT, { fit: 'cover' })
    .png({ compressionLevel: 9, palette: false })
    .toFile(PNG_PATH);

  const meta = await sharp(PNG_PATH).metadata();
  console.log(`[promo-tile] Generated ${PNG_PATH}`);
  console.log(`[promo-tile] Size: ${meta.width}×${meta.height} ${meta.format}`);
  if (meta.width !== WIDTH || meta.height !== HEIGHT) {
    throw new Error(`Size mismatch: expected ${WIDTH}×${HEIGHT}, got ${meta.width}×${meta.height}`);
  }
}

main().catch((err) => {
  console.error('[promo-tile] Failed:', err);
  process.exit(1);
});
