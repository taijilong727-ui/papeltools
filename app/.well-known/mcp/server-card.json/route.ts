/**
 * MCP Server Card — 发现端点（PRD FR-35 注册与发现）
 *
 * 位置：/.well-known/mcp/server-card.json（注册发现标准路径）
 *
 * 与 lib/mcp/info.ts 共用元数据，确保：
 * - server name / version 单一来源
 * - /api/mcp initialize 响应 + server-card.json + MCP Registry 注册信息完全一致
 *
 * Next.js 路由：app/.well-known/mcp/server-card.json/route.ts
 * - 文件夹名结构对应 /.well-known/mcp/server-card.json 路径
 * - 返回 Content-Type: application/json（registry crawler 要求）
 *
 * 参考：
 * - https://github.com/modelcontextprotocol/registry（MCP Registry schema）
 * - https://docs.mcp.run/registry（MCP 服务器发现规范草案）
 */

import { NextResponse } from 'next/server';
import {
  MCP_SERVER_NAME,
  MCP_SERVER_VERSION,
  MCP_SERVER_DESCRIPTION,
  MCP_REMOTE_URL,
  MCP_REGISTRY_CATEGORIES,
} from '@/lib/mcp/info';

export const runtime = 'nodejs';

/**
 * 返回 MCP Server Card（注册发现用 JSON manifest）。
 *
 * 字段（对齐 MCP Registry draft-2026 schema）：
 * - name / version
 * - description
 * - transport: streamable-http
 * - url: 远程端点公开 URL
 * - tools: 静态声明（运行时从 /api/mcp tools/list 获取权威列表）
 * - capabilities: 与 server.ts McpServer capabilities 对齐
 * - categories / tags
 * - license: MIT
 */
export async function GET(): Promise<NextResponse> {
  const card = {
    schema_version: '1.0',
    name: MCP_SERVER_NAME,
    version: MCP_SERVER_VERSION,
    description: MCP_SERVER_DESCRIPTION,
    transport: {
      type: 'streamable-http',
      url: MCP_REMOTE_URL,
      // 强制 POST（GET/DELETE 在 stateless 模式无意义）
      methods: ['POST'],
      headers: {
        required: ['Content-Type: application/json'],
        accept: ['application/json', 'text/event-stream'],
      },
    },
    capabilities: {
      tools: {},
      // 不暴露 resources / prompts / completions（远程 MVP 不提供）
    },
    tools: [
      {
        name: 'convert_pdf',
        description:
          'Convert PDF (Base64-encoded, ≤3MB / ≤50 pages) to Markdown. Returns text + filename + metadata.',
      },
      {
        name: 'preview_pdf',
        description:
          'Convert PDF to Markdown preview (truncated to 4000 chars). Use to gauge quality before full convert.',
      },
      {
        name: 'list_supported_formats',
        description:
          'List supported formats + size/page limits + OCR support status for the remote endpoint.',
      },
    ],
    categories: [...MCP_REGISTRY_CATEGORIES],
    license: 'MIT',
    homepage: 'https://papeltools.com',
    // repository: 'https://github.com/papeltools/pdftomd' — GitHub 仓库未上线，暂不暴露避免 Agent 抓取后克隆失败
  };

  return NextResponse.json(card, {
    status: 200,
    headers: {
      // 静态发现文档可被 CDN 缓存（registry crawler 友好）
      'Cache-Control': 'public, max-age=300, s-maxage=3600',
    },
  });
}
