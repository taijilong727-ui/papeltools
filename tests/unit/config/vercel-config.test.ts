/**
 * Vercel 配置级测试 — 对应测试策略 A-13（CSP 等安全响应头）
 *
 * 背景：静态导出（output: 'export'）下 next.config.ts 的 headers() 被忽略，
 * 安全头只能在 vercel.json 配置（Vercel 边缘层注入），本地 E2E 无法断言响应头，
 * 故改为配置级单元测试——读取 vercel.json 校验头配置完整性。
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

// tests/unit/config/ 向上三级 = 项目根
const vercelJson = JSON.parse(
  readFileSync(path.resolve(__dirname, '../../../vercel.json'), 'utf-8')
) as {
  headers: Array<{ source: string; headers: Array<{ key: string; value: string }> }>;
  redirects: Array<{ source: string; destination: string; permanent: boolean }>;
};

// proxy.ts 也参与 / 的 locale 协商（hybrid 模式下生产边缘也跑 proxy），
// 故"根路径 → /<locale>/"的契约由两边共同承担，需一并断言。
const proxyTs = readFileSync(
  path.resolve(__dirname, '../../../proxy.ts'),
  'utf-8'
);

function findHeader(key: string): string | undefined {
  const rule = vercelJson.headers.find((h) => h.source === '/(.*)');
  return rule?.headers.find((h) => h.key === key)?.value;
}

describe('A-13 vercel.json — 安全响应头配置', () => {
  it('存在作用于全站（/(.*)）的头规则', () => {
    expect(vercelJson.headers.some((h) => h.source === '/(.*)')).toBe(true);
  });

  it('配置 Content-Security-Policy 且允许 Worker 线程脚本（方案 G 依赖）', () => {
    const csp = findHeader('Content-Security-Policy');
    expect(csp).toBeDefined();
    // 静态导出无 nonce 机制，需 'unsafe-inline'（AGENTS.md 已锁定）
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain('script-src');
    expect(csp).toContain("'unsafe-inline'");
    // 转换线程加载 pdf.worker（方案 G 的 ?url / new URL 静态资源）
    expect(csp).toContain('worker-src');
    expect(csp).toContain('blob:');
  });

  it('配置其余基础安全头', () => {
    expect(findHeader('X-Content-Type-Options')).toBe('nosniff');
    expect(findHeader('X-Frame-Options')).toBe('DENY');
    expect(findHeader('Referrer-Policy')).toBe('strict-origin-when-cross-origin');
    expect(findHeader('Permissions-Policy')).toContain('camera=()');
  });

  it('静态资源带长缓存头（svg/png/ico）', () => {
    const rule = vercelJson.headers.find((h) => h.source.includes('\\.(svg|png|ico)'));
    const cache = rule?.headers.find((h) => h.key === 'Cache-Control')?.value;
    expect(cache).toBe('public, max-age=31536000, immutable');
  });

  it('根路径 / 由 proxy.ts 协商到 /<locale>/（vercel.json 不再写死 /en/）', () => {
    // vercel.json 不能再有 / → /en/ 永久重定向 —— 会与 proxy.ts 冲突，
    // 且无法对讲 pt-BR / es-419 的用户做 locale 协商（2026-08-10 修复 C1）
    const rootRedirect = vercelJson.redirects.find((r) => r.source === '/');
    expect(rootRedirect).toBeUndefined();

    // proxy.ts 必须包含"对 / 永远重定向到 /<locale>/"的逻辑（不接受 NextResponse.next）
    expect(proxyTs).toContain("pathname !== '/'");
    expect(proxyTs).toContain('url.pathname = `/${target}/`');
    expect(proxyTs).not.toContain('return NextResponse.next();\n  }\n  const url');
    // 必须有 defaultLocale 协商分支（Accept-Language / Cookie）
    expect(proxyTs).toContain('accept-language');
    expect(proxyTs).toContain('NEXT_LOCALE');
  });
});
