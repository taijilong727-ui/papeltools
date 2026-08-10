/**
 * 网络请求监听器 — T-04 隐私验收专用（Playwright）
 *
 * 用法：
 *   const monitor = new NetworkMonitor(page);
 *   await page.setInputFiles(...);  // 触发转换
 *   expect(monitor.nonStaticRequests()).toHaveLength(0);
 *
 * 过滤规则（对应测试策略 T-04-01）：
 * - 排除页面自身静态资源（js/css/图片/字体/wasm 等）
 * - 排除 Next.js dev 内部请求（/_next/ 资源与 RSC 数据）
 * - 排除 Next.js 静态导出（out/）的 RSC 导航文件（__next._tree.txt 等，位于根路径）
 * - 剩余请求若存在，即为转换期间的"文档请求"（隐私违规）
 */
import type { Page, Request } from '@playwright/test';

/** 静态资源与页面自身请求（GET，非隐私关注点） */
const EXCLUDED_RE =
  /\.(js|css|png|jpe?g|svg|gif|webp|avif|woff2?|ttf|wasm|ico|map)(\?|$)|^https?:\/\/[^/]+\/(_next\/|__next\.[a-zA-Z_]+\.txt)|^https?:\/\/[^/]+\/(\?|$)|^data:/;

export class NetworkMonitor {
  private requests: Request[] = [];

  constructor(private readonly page: Page) {
    page.on('request', (req) => {
      this.requests.push(req);
    });
  }

  /** 清空记录（转换开始前调用，确保只统计转换期间） */
  reset(): void {
    this.requests = [];
  }

  /**
   * 转换期间的"非静态"请求（应为空）
   *
   * 规则：可能携带请求体（body）的方法（POST/PUT/PATCH）是唯一可能泄露文档
   * 内容的途径，一律视为隐私违规；GET/HEAD/OPTIONS 无 body 语义，仅按静态/
   * 框架 URL 白名单排除（Next.js 页面预取会用 HEAD 探测，静态导出走根路径）。
   */
  nonStaticRequests(): string[] {
    const bodyMethods = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
    return this.requests
      .filter((req) => bodyMethods.has(req.method()) || !EXCLUDED_RE.test(req.url()))
      .map((req) => req.url());
  }

  /** 全部请求（含静态资源） */
  allRequests(): string[] {
    return this.requests.map((req) => req.url());
  }
}
