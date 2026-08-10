/**
 * 远程 MCP 端点 — /api/mcp（Streamable HTTP over JSON-RPC）
 *
 * 职责链：
 * 1. 限流检查（@upstash/ratelimit）— 返回 429 + Retry-After
 * 2. Origin 白名单（生产）— 返回 403
 * 3. 必需 header 校验（POST → Content-Type + Accept）
 * 4. 委派给 stateless transport → McpServer → lib/mcp/tools.ts
 * 5. 返回 transport.handleRequest 结果（JSON-RPC 响应）
 *
 * GET / DELETE：MCP Streamable HTTP 规范允许，但 stateless 模式下不持久化 → 返回 405
 * （按 spec 这是合法行为；stateless 模式典型最小集只支持 POST）
 *
 * 关于 trailingSlash：
 * - next.config.ts `trailingSlash: true` 影响 HTML 页（/mcp → /mcp/）
 * - 对 /api/* route **不**强制尾斜杠（API 路由始终 /api/mcp 无 slash）
 * - Vercel 部署实测验证
 *
 * 关于路由签名：
 * - Next.js 16 强制 export GET/POST/DELETE 形式（不可用 handler default export）
 * - runtime: 'nodejs' 强制 Node（不用 edge，pdf.js 需 Node）
 *
 * 参考：docs/MCP实现分析与架构影响-2026-08-07.md §六（实施路径 #3, #5）
 */

import { NextRequest } from 'next/server';
import { createMcpServer } from '@/lib/mcp/server';
import { createStatelessTransport } from '@/lib/mcp/transport';
import {
  getClientIp,
  isOriginAllowed,
  originRejectedResponse,
} from '@/lib/mcp/origin';
import {
  getRateLimiter,
  rateLimitedResponse,
} from '@/lib/mcp/rate-limit';

// 强制 Node runtime（MCP SDK 使用 Node-only API + pdf.js 需 Node）
export const runtime = 'nodejs';

// 每次请求 fresh 实例，避免冷启动间状态泄漏
export const dynamic = 'force-dynamic';

// 路由签名：Next.js 16 App Router 要求 export GET/POST/DELETE 分别处理
export async function POST(request: NextRequest): Promise<Response> {
  // 1. 限流检查
  const ip = getClientIp(request);
  const limiter = getRateLimiter();
  const limitResult = await limiter.limit(ip);
  if (!limitResult.success) {
    // reset 是 Unix 秒 timestamp；retryAfter = reset - now
    const retryAfter = Math.max(1, limitResult.reset - Math.floor(Date.now() / 1000));
    return rateLimitedResponse(retryAfter);
  }

  // 2. Origin 校验（生产）
  const origin = request.headers.get('origin');
  if (!isOriginAllowed(origin)) {
    return originRejectedResponse();
  }

  // 3. 必需 header 校验（MCP Streamable HTTP 规范）
  const contentType = request.headers.get('content-type');
  if (!contentType || !contentType.toLowerCase().includes('application/json')) {
    return badRequestResponse('Content-Type must be application/json');
  }
  const accept = request.headers.get('accept') ?? '';
  if (
    !accept.includes('application/json') &&
    !accept.includes('text/event-stream')
  ) {
    return notAcceptableResponse();
  }

  // 4. 委派给 stateless transport
  try {
    const server = createMcpServer();
    const transport = createStatelessTransport();
    await server.connect(transport);
    return transport.handleRequest(request);
  } catch (err) {
    // 兜底 — transport/server 内部错误
    console.error('[api/mcp] Internal error:', err);
    return internalErrorResponse(
      err instanceof Error ? err.message : 'Unknown internal error'
    );
  }
}

/** GET：stateless 模式不支持（SSE 长连接会被 function timeout 中断） */
export async function GET(): Promise<Response> {
  return methodNotAllowedResponse(['POST']);
}

/** DELETE：stateless 模式无 session 可删 */
export async function DELETE(): Promise<Response> {
  return methodNotAllowedResponse(['POST']);
}

/** 健康检查 / 配置信息（开发与监控用） */
export async function OPTIONS(request: NextRequest): Promise<Response> {
  // 预检：浏览器 MCP 客户端需 Access-Control-Allow-Origin 才不会拒绝
  // — 与 POST 同走 origin 白名单（dev/test 跳过；prod + 空 Origin 放行）
  const origin = request.headers.get('origin');
  const allowOrigin = isOriginAllowed(origin) ? (origin ?? '*') : '';

  const headers: Record<string, string> = {
    Allow: 'POST, OPTIONS',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Accept, Mcp-Session-Id',
    'Access-Control-Max-Age': '86400',
  };
  if (allowOrigin) {
    headers['Access-Control-Allow-Origin'] = allowOrigin;
    // 多 Origin 动态回显时 Vary: Origin 是规范要求（防止 CDN 缓存错配）
    if (allowOrigin !== '*') headers['Vary'] = 'Origin';
  }

  return new Response(null, { status: 204, headers });
}

/* ---------------- 辅助：JSON-RPC 错误响应 ---------------- */

function badRequestResponse(message: string): Response {
  return new Response(
    JSON.stringify({
      jsonrpc: '2.0',
      error: { code: -32700, message: `Parse error: ${message}` },
      id: null,
    }),
    {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}

function notAcceptableResponse(): Response {
  return new Response(
    JSON.stringify({
      jsonrpc: '2.0',
      error: {
        code: -32000,
        message: 'Accept must include application/json or text/event-stream',
      },
      id: null,
    }),
    {
      status: 406,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}

function methodNotAllowedResponse(allow: string[]): Response {
  return new Response(
    JSON.stringify({
      jsonrpc: '2.0',
      error: {
        code: -32000,
        message: `Method not allowed. Use: ${allow.join(', ')}`,
      },
      id: null,
    }),
    {
      status: 405,
      headers: {
        'Content-Type': 'application/json',
        Allow: allow.join(', '),
      },
    }
  );
}

function internalErrorResponse(message: string): Response {
  return new Response(
    JSON.stringify({
      jsonrpc: '2.0',
      error: { code: -32603, message: `Internal error: ${message}` },
      id: null,
    }),
    {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}

/**
 * 配置构建提示（不响应，仅用于下一步文档同步）
 *
 * 当前路由配置：
 * - runtime: nodejs
 * - dynamic: force-dynamic（每次 cold start fresh）
 * - 支持方法：POST / OPTIONS
 * - 限制：
 *   - 文件 ≤ 3MB Base64 解码后（PRD M-11）
 *   - 每 IP 每分钟 60 次（配置 hardcoded；如需调整改 rate-limit.ts）
 *   - 生产 Origin 白名单（环境变量 ALLOWED_ORIGINS 逗号分隔）
 *
 * 部署所需环境变量：
 * - UPSTASH_REDIS_REST_URL：生产必填
 * - UPSTASH_REDIS_REST_TOKEN：生产必填
 * - ALLOWED_ORIGINS：可选；为空时所有 Origin 拒绝（fail-closed）
 */
