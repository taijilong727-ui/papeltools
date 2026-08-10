/**
 * MCP Streamable HTTP Transport 工厂（stateless 模式，适配 Vercel Serverless）
 *
 * 设计（docs/MCP实现分析与架构影响-2026-08-07.md §四 #4.3）：
 * - `sessionIdGenerator: undefined` — 关键！禁用 session map，stateless
 * - `enableJsonResponse: true` — 直接 JSON 响应（非 SSE 流），
 *   适合三件全为 request/response 模式的工具，无 SSE 收益
 * - 每请求新建 transport + server（MCP SDK 1.30.x 单 transport 单连接）
 *
 * 为什么不用长 connection / SSE？
 * - Serverless 函数 cold start 友好：每次 fresh transport
 * - 三件工具无流式输出需求（Markdown 全文一次性返回）
 * - 减少客户端兼容成本（不开 SSE → client 不用管 stream 协商）
 *
 * 未来演进（Phase 2 OCR）：
 * - OCR 可能耗时 > 30s → 切 SSE 流式进度
 * - 届时改 enableJsonResponse: false，客户端走 SSE
 */

import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';

/**
 * 创建一个 stateless 的 WebStandard transport 实例。
 *
 * @returns 每次调用返回新实例（与 createMcpServer 配对使用）
 */
export function createStatelessTransport(): WebStandardStreamableHTTPServerTransport {
  return new WebStandardStreamableHTTPServerTransport({
    // 关键：undefined = stateless，不生成 session id、不维护 session map
    sessionIdGenerator: undefined,
    // 关键：纯 JSON 响应（无 SSE 流）— 三件工具都是 request/response
    enableJsonResponse: true,
    // DNS 重绑定保护关闭：Origin/Host 由 lib/mcp/origin.ts 自管（支持 Vercel preview 子域）
    enableDnsRebindingProtection: false,
  });
}
