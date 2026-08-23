#!/usr/bin/env node
/**
 * Chrome Web Store 截图生成器
 *
 * 输出：extension/store-assets/screenshots/screenshot-{1..5}.png (1280×800)
 *
 * 截图流程：
 * 1. 加载扩展（Chromium + CDP）
 * 2. 打开 convert.html
 * 3. 在 5 个真实状态截图：
 *    - 1. idle (初始 Dropzone + Privacy badge)
 *    - 2. converting (进度条 + 文件名 + 取消)
 *    - 3. done (Markdown 预览 + 元数据 + 3 按钮)
 *    - 4. error (损坏 PDF → 错误卡片)
 *    - 5. scanned (扫描件 → OCR 提示 + papeltools.com 链接)
 *
 * 依赖：playwright (root)
 * 前置：extension 已 build (npm run build)
 */

import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, rmSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';
import { tmpdir } from 'node:os';
import http from 'node:http';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '..', '..');
const EXT_PATH = join(ROOT, 'extension', '.output', 'chrome-mv3');
const FIXTURES_DIR = join(ROOT, 'tests', 'fixtures');
const SCREENSHOTS_DIR = join(ROOT, 'extension', 'store-assets', 'screenshots');

const CHROME_PATHS = [
  join(process.env.LOCALAPPDATA || '', 'ms-playwright', 'chromium-1234', 'chrome-win64', 'chrome.exe'),
  join(process.env.LOCALAPPDATA || '', 'ms-playwright', 'chromium-1223', 'chrome-win', 'chrome.exe'),
];
const CHROMIUM_PATH = CHROME_PATHS.find((p) => existsSync(p));

const SCREENSHOT_WIDTH = 1280;
const SCREENSHOT_HEIGHT = 800;

async function waitForPort(port, timeoutMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      await new Promise((resolve, reject) => {
        const req = http.get(`http://localhost:${port}/json/version`, (res) => {
          res.resume();
          if (res.statusCode === 200) resolve(true);
          else reject(new Error(`status ${res.statusCode}`));
        });
        req.on('error', reject);
        req.setTimeout(1000, () => req.destroy(new Error('timeout')));
      });
      return true;
    } catch {}
    await new Promise((r) => setTimeout(r, 250));
  }
  return false;
}

async function findOurExtensionId(ctx) {
  let candidates = [];
  for (let i = 0; i < 15; i++) {
    const sws = ctx.serviceWorkers();
    candidates = sws.filter((s) => s.url().includes('/background.js'));
    if (candidates.length > 0) break;
    await new Promise((r) => setTimeout(r, 1000));
  }
  if (candidates.length === 0) return null;
  const verifier = await ctx.newPage();
  try {
    for (const c of candidates) {
      const id = c.url().split('/')[2];
      try {
        const r = await verifier.goto(`chrome-extension://${id}/manifest.json`);
        if (r.status() === 200) {
          const m = await r.json();
          if (m.name === 'Papel Tools - PDF to Markdown') {
            return ctx.serviceWorkers().find((s) => s.url().includes(id))
              ?.url().split('/')[2] || id;
          }
        }
      } catch {}
    }
  } finally {
    await verifier.close();
  }
  return null;
}

async function captureState(page, label, outputPath) {
  // 等稳定（图标淡入动画完成）
  await page.waitForTimeout(400);
  await page.screenshot({
    path: outputPath,
    type: 'png',
    fullPage: false, // 严格 1280×800 viewport
    clip: { x: 0, y: 0, width: SCREENSHOT_WIDTH, height: SCREENSHOT_HEIGHT },
  });
  console.log(`  ✓ ${label} → ${outputPath}`);
}

async function run() {
  console.log('==========================================');
  console.log('  Screenshot Generator');
  console.log('==========================================');
  console.log(`Output: ${SCREENSHOTS_DIR}`);
  console.log('');

  if (!existsSync(join(EXT_PATH, 'convert.html'))) {
    throw new Error('Extension not built. Run: cd extension && npm run build');
  }

  mkdirSync(SCREENSHOTS_DIR, { recursive: true });

  const profileDir = join(tmpdir(), `papel-shot-${Date.now()}`);
  mkdirSync(profileDir, { recursive: true });
  const port = 9600 + Math.floor(Math.random() * 100);

  const chrome = spawn(
    CHROMIUM_PATH,
    [
      '--disable-extensions-except=' + EXT_PATH,
      '--load-extension=' + EXT_PATH,
      '--no-first-run',
      '--no-default-browser-check',
      '--user-data-dir=' + profileDir,
      '--remote-debugging-port=' + port,
    ],
    { detached: true, stdio: ['ignore', 'pipe', 'pipe'] }
  );
  chrome.unref();
  console.log(`Chromium PID: ${chrome.pid}`);

  let browser = null;
  try {
    if (!(await waitForPort(port))) throw new Error('Chromium not ready');
    browser = await chromium.connectOverCDP(`http://localhost:${port}`);
    const ctx = browser.contexts()[0];
    if (!ctx) throw new Error('No context');

    const extId = await findOurExtensionId(ctx);
    if (!extId) throw new Error('Extension not found');
    console.log(`Extension ID: ${extId}`);

    // ---- Screenshot 1: idle (Dropzone + PrivacyBadge) ----
    console.log('\n[1/5] Idle state');
    {
      const page = await ctx.newPage();
      await page.setViewportSize({ width: SCREENSHOT_WIDTH, height: SCREENSHOT_HEIGHT });
      await page.goto(`chrome-extension://${extId}/convert.html`);
      await page.waitForSelector('.dropzone', { timeout: 10000 });
      await captureState(page, 'idle', join(SCREENSHOTS_DIR, 'screenshot-1-idle.png'));
      await page.close();
    }

    // ---- Screenshot 2 & 3: converting + done (同一次上传) ----
    console.log('\n[2/5] Converting state');
    console.log('[3/5] Done state');
    {
      const pdfPath = join(FIXTURES_DIR, 'sample-100p.pdf');
      if (!existsSync(pdfPath)) {
        console.log('  ⚠ sample-100p.pdf missing, skip 2/3');
      } else {
        const page = await ctx.newPage();
        await page.setViewportSize({ width: SCREENSHOT_WIDTH, height: SCREENSHOT_HEIGHT });
        await page.goto(`chrome-extension://${extId}/convert.html`);
        await page.waitForSelector('.dropzone', { timeout: 10000 });

        const fileInput = await page.$('input[type="file"]');
        // 用 promise.all 同步：上传 + 立即轮询 progressbar
        await fileInput.setInputFiles(pdfPath);
        const progressOutput = join(SCREENSHOTS_DIR, 'screenshot-2-converting.png');

        // 轮询直到找到 progress 节点（最多 5s） — 100 页 3s 转换，progress 会闪一下
        let captured = false;
        for (let i = 0; i < 50; i++) {
          const has = await page.locator('.progress [role="progressbar"]').count();
          if (has > 0) {
            await captureState(page, 'converting', progressOutput);
            captured = true;
            break;
          }
          await page.waitForTimeout(100);
        }
        if (!captured) {
          console.log('  ⚠ Converting UI too fast to capture (skip 2) — keep 1,3,4,5');
        }

        // 等 done
        await page.waitForSelector('.result', { timeout: 30000 });
        await page.waitForTimeout(500); // 动画稳定
        await captureState(page, 'done', join(SCREENSHOTS_DIR, 'screenshot-3-done.png'));
        await page.close();
      }
    }

    // ---- Screenshot 4: error (corrupted PDF) ----
    console.log('\n[4/5] Error state');
    {
      const corruptedPath = join(FIXTURES_DIR, 'sample-corrupted.pdf');
      if (!existsSync(corruptedPath)) {
        console.log('  ⚠ sample-corrupted.pdf missing, skip 4');
      } else {
        const page = await ctx.newPage();
        await page.setViewportSize({ width: SCREENSHOT_WIDTH, height: SCREENSHOT_HEIGHT });
        await page.goto(`chrome-extension://${extId}/convert.html`);
        await page.waitForSelector('.dropzone', { timeout: 10000 });
        const fi = await page.$('input[type="file"]');
        await fi.setInputFiles(corruptedPath);
        try {
          await page.waitForSelector('.error-notice', { timeout: 10000 });
          await page.waitForTimeout(400);
          await captureState(page, 'error', join(SCREENSHOTS_DIR, 'screenshot-4-error.png'));
        } catch (e) {
          console.log(`  ⚠ Error UI not captured: ${e.message.substring(0, 60)}`);
        }
        await page.close();
      }
    }

    // ---- Screenshot 5: scanned PDF notice ----
    console.log('\n[5/5] Scanned PDF state');
    {
      const scannedPath = join(FIXTURES_DIR, 'sample-scanned.pdf');
      if (!existsSync(scannedPath)) {
        console.log('  ⚠ sample-scanned.pdf missing, skip 5');
      } else {
        const page = await ctx.newPage();
        await page.setViewportSize({ width: SCREENSHOT_WIDTH, height: SCREENSHOT_HEIGHT });
        await page.goto(`chrome-extension://${extId}/convert.html`);
        await page.waitForSelector('.dropzone', { timeout: 10000 });
        const fi = await page.$('input[type="file"]');
        await fi.setInputFiles(scannedPath);
        try {
          await page.waitForSelector('.scanned-notice', { timeout: 10000 });
          await page.waitForTimeout(400);
          await captureState(page, 'scanned', join(SCREENSHOTS_DIR, 'screenshot-5-scanned.png'));
        } catch (e) {
          console.log(`  ⚠ Scanned UI not captured: ${e.message.substring(0, 60)}`);
        }
        await page.close();
      }
    }

  } catch (err) {
    console.error('FATAL:', err.message);
    process.exit(1);
  } finally {
    if (browser) {
      try { await browser.close(); } catch {}
    }
    try { chrome.kill(); } catch {}
    try { rmSync(profileDir, { recursive: true, force: true }); } catch {}
  }

  // 总结
  console.log('\n==========================================');
  console.log('  Screenshots');
  console.log('==========================================');
  const files = readdirSync(SCREENSHOTS_DIR).filter((f) => f.endsWith('.png'));
  if (files.length === 0) {
    console.log('  ⚠ No screenshots generated');
  } else {
    files.sort().forEach((f) => {
      const stat = statSync(join(SCREENSHOTS_DIR, f));
      console.log(`  ✓ ${f}  (${stat.size} bytes, ${SCREENSHOT_WIDTH}×${SCREENSHOT_HEIGHT})`);
    });
  }
  console.log('==========================================');
  process.exit(0);
}

run().catch((err) => {
  console.error('Unhandled error:', err);
  process.exit(2);
});
