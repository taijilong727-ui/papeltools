/**
 * MCP Server 工厂 — 把 lib/mcp/tools.ts 的工具定义注册到 McpServer
 *
 * 设计原则：
 * - 业务逻辑（Base64 解码、引擎调用、错误分类）全部来自 `lib/mcp/tools.ts`
 * - 本文件只做"注册 + 序列化"，不重写转换逻辑（与方案 §四"勿分叉逻辑"锁定决策一致）
 * - callback 中调用统一 `serializeToolResult` / `serializeHandlerError` 包装输出
 *
 * 能力声明：
 * - capabilities.tools = {} — 服务端声明支持 tools 能力（list/call）
 * - 不暴露 resources / prompts / completions（远程 MVP 不提供）
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { AnySchema } from '@modelcontextprotocol/sdk/server/zod-compat.js';
import { mcpTools } from './tools';
import {
  MCP_SERVER_NAME,
  MCP_SERVER_VERSION,
  MCP_SERVER_DESCRIPTION,
} from './info';
import { serializeToolResult, serializeHandlerError } from './serialize';
import { ConversionError } from '../engine/types';

/**
 * 创建一个装配好的 McpServer 实例。
 * 每次请求新建一个 server（stateless 模式 + Vercel Serverless 冷启动友好）。
 */
export function createMcpServer(): McpServer {
  const server = new McpServer(
    {
      name: MCP_SERVER_NAME,
      version: MCP_SERVER_VERSION,
    },
    {
      capabilities: {
        // 显式声明支持 tools；空对象表示支持 list + call，但无 listChanged 通知
        tools: {},
      },
      // 服务说明（用于 initialize 响应 instructions 字段）
      instructions: MCP_SERVER_DESCRIPTION,
    }
  );

  // 注册 3 个工具（convert_pdf / preview_pdf / list_supported_formats）
  for (const tool of mcpTools) {
    server.registerTool(
      tool.name,
      {
        description: tool.description,
        // tools.ts 的 schema 是 z.ZodTypeAny（v4 $ZodType），与 SDK 内部 AnySchema 同一类型
        // 用 unknown 桥接避免 SDK 内部 v4/v3 类型分支污染业务代码
        inputSchema: tool.schema as unknown as AnySchema,
      },
      // callback 入参: 协议层已用 schema 校验过，但 TS 类型无法精确推导；
      // 运行时再次 parse 是 no-op（已校验）
      async (rawArgs: unknown) => {
        // 1. 参数解析 (zod)
        let parsed: Parameters<typeof tool.handler>[0];
        try {
          parsed = tool.schema.parse(rawArgs) as Parameters<typeof tool.handler>[0];
        } catch (zodErr) {
          // zod 错误 — 不属于引擎 ConversionError 语义，直接序列化 tool-call error
          const message =
            zodErr instanceof Error ? zodErr.message : String(zodErr);
          return {
            content: [
              {
                type: 'text' as const,
                text: `Invalid tool arguments: ${message}`,
              },
            ],
            isError: true,
            structuredContent: {
              error: { code: 'invalid_params', message },
            },
          };
        }

        // 2. handler 调用 + 错误处理
        try {
          const result = await tool.handler(parsed);
          return serializeToolResult(tool.name, result);
        } catch (err) {
          // ConversionError 与其他异常都走统一序列化（带 cause/stack 便于诊断）
          return serializeHandlerError(err);
        }
      }
    );
  }

  return server;
}
