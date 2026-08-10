/**
 * Origin / Host 校验 + 客户端 IP 提取（MCP 端点访问控制与限流维度）
 *
 * 策略：
 * - 生产（NODE_ENV=production）：从 ALLOWED_ORIGINS 环境变量读取白名单（逗号分隔）
 *   未配置白名单 → 拒绝所有非空 Origin（fail-closed，避免误开放）
 * - 生产 + 空 Origin（无 Origin 头）→ **放行**：Node/CLI/Agent 进程调用通常不带 Origin，
 *   浏览器端 fetch 必带 Origin（同源也带），故空 Origin 主要来自 CLI 场景
 * - 开发/测试（其他 NODE_ENV）：跳过 Origin 校验，便于本地调试与单测
 *
 * 不启用 SDK 内部 DNS 重绑定保护（enableDnsRebindingProtection 默认 false）：
 * - SDK 的严格模式要求列出精确 Host（生产不方便，Vercel preview 子域众多）
 * - 自管 Origin 检查更轻，覆盖 99% 跨站滥用场景
 * - 边缘场景：被绕过的风险通过限流 + Content-Length 上限 + 中间件层兜底
 *
 * 参考：PRD FR-36（限流与安全）；docs/MCP实现分析与架构影响-2026-08-07.md §六 #5
 */

import type { NextRequest } from 'next/server';

/** 运行时读取 NODE_ENV（不缓存为模块顶部常量，便于测试隔离） */
function getNodeEnv(): string {
  return process.env.NODE_ENV ?? 'development';
}

/** 是否生产环境（决定 Origin 校验是否启用） */
function isProduction(): boolean {
  return getNodeEnv() === 'production';
}

/** 解析 ALLOWED_ORIGINS 环境变量（逗号分隔，去空白），结果不含空字符串 */
function parseAllowedOrigins(): string[] {
  return (process.env.ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/** 是否启用 Origin 校验（仅生产） */
export function isOriginCheckEnabled(): boolean {
  return isProduction();
}

/**
 * 把通配符 Origin pattern 转为可比较的后缀
 * 例：'https://*.example.com' → '.example.com'（含前缀点防子串误匹配）
 * 严格匹配：'https://app.example.com' ✅、'https://a.b.example.com' ✅
 *           'https://example.com' ❌（无子域）、'https://notexample.com' ❌
 */
function matchOriginPattern(origin: string, pattern: string): boolean {
  if (pattern === origin) return true;
  if (pattern.startsWith('https://*.')) {
    const suffix = pattern.slice('https://*.'.length);
    return (
      origin.startsWith('https://') &&
      origin.endsWith(`.${suffix}`) &&
      origin.length > `https://.${suffix}`.length
    );
  }
  return false;
}

/**
 * 检查 Origin 是否在白名单内
 * @returns `true` 表示放行，`false` 表示拒绝
 *
 * 规则：
 * - 非生产环境 → 永远放行（dev/test/CI 友好）
 * - 生产 + 空 Origin → **放行**（Node/CLI/Agent 进程调用不带 Origin，属主要消费场景）
 *   注：浏览器端 fetch（含同源）必带 Origin 头，故空 Origin 不会来自浏览器滥用
 * - 生产 + Origin 不在白名单 → 拒绝
 *
 * 支持通配符：`https://*.example.com` 匹配 `https://app.example.com` 等子域。
 */
export function isOriginAllowed(origin: string | null): boolean {
  if (!isOriginCheckEnabled()) return true;
  if (!origin) {
    // 生产环境无 Origin：允许通过（CLI / Agent 本地进程调用场景）
    return true;
  }
  const allowed = parseAllowedOrigins();
  if (allowed.length === 0) {
    // 生产未配置白名单 → 全部 Origin 拒绝（fail-closed）；CLI/无 Origin 仍放行
    return false;
  }
  return allowed.some((pattern) => matchOriginPattern(origin, pattern));
}

/**
 * 从 NextRequest 提取客户端标识（用于限流 + 审计日志）
 *
 * 优先级：
 * 1. x-forwarded-for 第一段（Vercel 自动注入，链式代理第一跳为真实 client）
 * 2. x-real-ip（Nginx 风格）
 * 3. cf-connecting-ip（Cloudflare 注入）
 * 4. 回退 'anonymous'（不应发生在生产；仅作日志占位）
 */
export function getClientIp(request: NextRequest): string {
  const xff = request.headers.get('x-forwarded-for');
  if (xff) {
    const first = xff.split(',')[0]?.trim();
    if (first) return first;
  }
  const realIp = request.headers.get('x-real-ip');
  if (realIp) return realIp.trim();
  const cfIp = request.headers.get('cf-connecting-ip');
  if (cfIp) return cfIp.trim();
  return 'anonymous';
}

/**
 * 构造 Origin 拒绝的 JSON-RPC 错误响应（403 + code -32000）
 * 与 MCP 协议约定的错误码对齐（与 docs/MCP实现分析与架构影响 §6.4 一致）
 */
export function originRejectedResponse(): Response {
  return new Response(
    JSON.stringify({
      jsonrpc: '2.0',
      error: {
        code: -32000,
        message: 'Origin not allowed',
      },
      id: null,
    }),
    {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}
