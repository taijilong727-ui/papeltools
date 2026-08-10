/**
 * MCP Rate Limiter — Upstash Redis sliding-window + dev fallback
 *
 * 决策（docs/MCP实现分析与架构影响-2026-08-07.md §七 #3）：
 * - 生产：@upstash/ratelimit + slidingWindow(60, '1 m') — 每 IP 每分钟 60 次
 * - 开发：无 env → 内存 RateLimiter（仅 dev/CI 模式可用）
 * - 生产未配置 Upstash → 软降级：warn 日志 + in-memory fallback（多实例精度下降，不阻断服务）
 *   （2026-08-08 决策从 fail-fast 改为软降级，避免部署初期忘设 env 导致整个端点 503）
 *
 * 边界场景：
 * - Vercel 多区域函数：每实例一个内存 limiter，命中率局部 — 但 dev fallback 模式仅 dev 启用
 * - Upstash 配额耗尽：limit() 抛错时降级为 fail-open + 服务端日志告警（MCP 协议允许）
 *
 * 与 AGENTS.md 锁定决策：
 * - 限流 dimension：IP（Vercel 注入 x-forwarded-for 真实 IP）
 * - 关键约束：保护 Serverless 函数不被滥用、对接 Anthropic/MCP Client 友好
 */

import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const NODE_ENV = process.env.NODE_ENV ?? 'development';

/** Upstash 配置（生产从 env 读取） */
function getUpstashConfig(): { url: string; token: string } | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return { url, token };
}

/** 是否配置 Upstash（生产必须配；dev 可选） */
export function isUpstashConfigured(): boolean {
  return getUpstashConfig() !== null;
}

/**
 * 创建 RateLimiter 实例（生产 Upstash；未配置 env 时软降级 in-memory）
 */
export function createRateLimiter() {
  const config = getUpstashConfig();
  if (config) {
    const redis = new Redis({ url: config.url, token: config.token });
    // slidingWindow: 滑动窗口更平滑，避免边界突刺
    return new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(60, '1 m'),
      // analytics 默认关闭（开需要 Upstash 控制台）
      prefix: 'mcp:rl',
    });
  }

  if (NODE_ENV === 'production') {
    // 软降级：在生产但缺失 Upstash env 时告警 + 继续 in-memory fallback，
    // 而非硬抛(后者在 Vercel 部署初期忘记设 env 时会让整个 MCP 端点 503)。
    // 多实例环境:警告后这意味着限流仅单实例有效(精度下降)，但服务可用。
    console.warn(
      '[mcp/rate-limit] UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN not set in production. ' +
      'Falling back to in-memory limiter (single-instance only).'
    );
  }

  // dev / test / 没 Upstash env 的生产：内存实现（同一进程内）
  return createInMemoryLimiter(60, 60_000);
}

/**
 * In-memory limiter（仅 dev/CI 用）— 形状与 @upstash/ratelimit 的 RatelimitResponse 对齐
 *
 * - 单实例 Map<identifier, timestamp[]>
 * - 滑动窗口手工实现（生产用 Upstash 的 slidingWindow）
 * - 返回字段：success / limit / remaining / reset / pending（无 retryAfter — 由调用方用 reset 计算）
 */
function createInMemoryLimiter(limit: number, windowMs: number) {
  const store = new Map<string, number[]>();
  return {
    limit: async (identifier: string) => {
      const nowMs = Date.now();
      const cutoff = nowMs - windowMs;
      const existing = store.get(identifier) ?? [];
      // 过滤时间窗口外的戳
      const recent = existing.filter((ts) => ts > cutoff);
      if (recent.length >= limit) {
        const oldestInWindow = recent[0] ?? nowMs;
        return {
          success: false,
          limit,
          remaining: 0,
          // reset 是 unix 秒（与 RatelimitResponse 一致）
          reset: Math.floor((oldestInWindow + windowMs) / 1000),
          pending: Promise.resolve(),
        };
      }
      recent.push(nowMs);
      store.set(identifier, recent);
      return {
        success: true,
        limit,
        remaining: limit - recent.length,
        reset: Math.floor((nowMs + windowMs) / 1000),
        pending: Promise.resolve(),
      };
    },
  };
}

/** 单例 limiter（懒初始化 — 首次调用时创建，避免启动时抛错） */
let cachedLimiter: Awaited<ReturnType<typeof createRateLimiter>> | null = null;
export function getRateLimiter() {
  if (!cachedLimiter) {
    cachedLimiter = createRateLimiter();
  }
  return cachedLimiter;
}

/**
 * 限流失败时返回的 HTTP 429 Response（含 Retry-After 头）
 * 符合 MCP 协议扩展语义：HTTP 429 + Retry-After + JSON-RPC 错误体
 */
export function rateLimitedResponse(retryAfterSec: number): Response {
  return new Response(
    JSON.stringify({
      jsonrpc: '2.0',
      error: {
        code: -32000,
        message: `Rate limit exceeded. Retry after ${retryAfterSec} seconds.`,
      },
      id: null,
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(retryAfterSec),
      },
    }
  );
}
