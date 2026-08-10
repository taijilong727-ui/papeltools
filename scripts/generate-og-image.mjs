#!/usr/bin/env node
/**
 * 生成 1200×630 OG 图片（PNG）
 *
 * 用途：替代 public/og-image.svg（社交平台不识别 SVG）。
 * 设计：与品牌方案一致（Papel 主题：纸白底 + 朱红强调 + 衬线标题）。
 *
 * 用法：node scripts/generate-og-image.mjs
 * 依赖：sharp（已在 devDependencies）
 */

import sharp from 'sharp';
import { readFile, access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PUBLIC_DIR = join(__dirname, '..', 'public');
const SVG_PATH = join(PUBLIC_DIR, 'og-image.svg');
const PNG_PATH = join(PUBLIC_DIR, 'og-image.png');
const WIDTH = 1200;
const HEIGHT = 630;

/**
 * 生成 SVG 源（品牌：Papel Tools — 纸感极简）
 * 颜色取自 app/globals.css 的 @theme：
 *   --color-paper-soft: #fbf8f1（纸感表面）
 *   --color-ink:        #1d1b17（墨黑主文本）
 *   --color-ink-soft:   #6f6a5e（次文本）
 *   --color-accent:     #a8432c（朱红强调）
 *   --color-rule:       #e2dccd（发丝线）
 *
 * 字体使用系统衬线（Georgia/serif），不依赖网络字体，确保 sharp 渲染一致。
 */
function buildSvg() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <!-- 背景：纸白 -->
  <rect width="${WIDTH}" height="${HEIGHT}" fill="#fbf8f1"/>
  <!-- 顶部微光晕（呼应 globals.css body 装饰） -->
  <defs>
    <radialGradient id="glow" cx="50%" cy="0%" r="60%">
      <stop offset="0%" stop-color="#a8432c" stop-opacity="0.06"/>
      <stop offset="100%" stop-color="#a8432c" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <ellipse cx="${WIDTH / 2}" cy="0" rx="${WIDTH * 0.55}" ry="${HEIGHT * 0.5}" fill="url(#glow)"/>

  <!-- 左下角折纸图标（呼应品牌 origami mark） -->
  <g transform="translate(80, 80)">
    <rect x="0" y="0" width="64" height="64" rx="4" fill="#a8432c"/>
    <g stroke="#fbf8f1" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" fill="none" transform="translate(14, 12)">
      <path d="M0 0 H22 L36 14 V40 H0 Z"/>
      <path d="M22 0 V14 H36"/>
      <path d="M8 22 H28 M8 30 H28"/>
    </g>
  </g>

  <!-- 品牌名 -->
  <text x="80" y="260" font-family="Georgia, 'Times New Roman', serif" font-size="92" font-weight="500" fill="#1d1b17" letter-spacing="-2">Papel Tools</text>

  <!-- 副标题（衬线斜体点睛，与 hero .hl 风格一致） -->
  <text x="80" y="340" font-family="Georgia, 'Times New Roman', serif" font-size="42" font-style="italic" fill="#6f6a5e">PDF to Markdown, in your browser.</text>

  <!-- 卖点 chips（等距 mono 风） -->
  <g font-family="'Courier New', monospace" font-size="22" letter-spacing="2">
    <text x="80" y="440" fill="#a8432c">100% IN-BROWSER</text>
    <text x="380" y="440" fill="#a8432c">·  FILES NEVER UPLOADED</text>
    <text x="820" y="440" fill="#a8432c">·  MCP-READY</text>
  </g>

  <!-- 底部分隔线 -->
  <line x1="80" y1="510" x2="${WIDTH - 80}" y2="510" stroke="#e2dccd" stroke-width="1"/>

  <!-- 底部域名 -->
  <text x="80" y="560" font-family="'Courier New', monospace" font-size="26" fill="#1d1b17" letter-spacing="1">papeltools.com</text>

  <!-- 右下角 EN · ES · PT 标识 -->
  <text x="${WIDTH - 80}" y="560" text-anchor="end" font-family="'Courier New', monospace" font-size="26" fill="#6f6a5e" letter-spacing="2">EN  ·  ES  ·  PT</text>
</svg>`;
}

async function main() {
  // 检查源 SVG 是否存在（如果存在，可作为替代输入；否则用 buildSvg 生成）
  let svgSource;
  try {
    await access(SVG_PATH);
    svgSource = await readFile(SVG_PATH, 'utf-8');
    console.log(`[og-image] Using existing ${SVG_PATH}`);
  } catch {
    svgSource = buildSvg();
    console.log('[og-image] Built SVG from brand tokens');
  }

  // sharp 将 SVG 栅格化为 1200×630 PNG（sRGB，去 Alpha 提升兼容性）
  await sharp(Buffer.from(svgSource))
    .resize(WIDTH, HEIGHT, { fit: 'cover' })
    .png({ compressionLevel: 9, palette: false })
    .toFile(PNG_PATH);

  // 验证
  const meta = await sharp(PNG_PATH).metadata();
  console.log(`[og-image] Generated ${PNG_PATH}`);
  console.log(`[og-image] Size: ${meta.width}×${meta.height} ${meta.format}`);
  if (meta.width !== WIDTH || meta.height !== HEIGHT) {
    throw new Error(`Size mismatch: expected ${WIDTH}×${HEIGHT}, got ${meta.width}×${meta.height}`);
  }
}

main().catch((err) => {
  console.error('[og-image] Failed:', err);
  process.exit(1);
});
