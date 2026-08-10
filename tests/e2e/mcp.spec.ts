/**
 * MCP 端点 E2E 冒烟测试 — 固化 docs/MCP-PHASE1-IMPLEMENTATION-2026-08-08.md §5.3 的端到端 smoke
 *
 * 覆盖：
 * - §5.3 五步：GET→405 / 无 Content-Type→400 / initialize→serverInfo / tools/list→3 tools /
 *   convert_pdf 真实 PDF→markdown
 * - 扩展：错误 Accept→406、list_supported_formats 能力声明、preview_pdf、空文件错误路径（file_empty）
 *
 * 运行方式：
 *   npx playwright test tests/e2e/mcp.spec.ts --reporter=list
 * （playwright.config.ts 的 webServer 自动起 npm run dev，端口 3000 已存在则复用）
 *
 * 注意（见 docs/MCP本地连接测试指南-2026-08-10）：
 * - 请求必须带 Accept 头：route.ts 校验含 application/json 或 text/event-stream，否则 406
 * - URL 必须带尾斜杠 /api/mcp/（next.config.ts trailingSlash: true 会重定向无斜杠版本）
 * - dev 模式限流为进程内 in-memory（'anonymous' 桶 60/min），本文件约 10 次请求，安全
 * - stateless 模式（sessionIdGenerator: undefined）下 initialize 后无需 notifications/initialized
 */
import { test, expect } from '@playwright/test';
import type { APIRequestContext } from '@playwright/test';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const fixture = (name: string) => path.join(__dirname, '..', 'fixtures', name);

/** MCP 端点（必须带尾斜杠） */
const MCP_ENDPOINT = '/api/mcp/';

/** 标准 Accept 头（route.ts 要求） */
const MCP_ACCEPT = 'application/json, text/event-stream';

/** 发送 JSON-RPC 请求的辅助函数（data 为对象 → Playwright 自动加 application/json） */
async function rpc(
  request: APIRequestContext,
  method: string,
  params: Record<string, unknown> = {},
  id = 1
) {
  return request.post(MCP_ENDPOINT, {
    headers: { Accept: MCP_ACCEPT },
    data: { jsonrpc: '2.0', id, method, params },
  });
}

test.describe('MCP 端点冒烟（§5.3 固化）', () => {
  // 串行：initialize 失败则后续工具调用无意义，避免级联误报
  test.describe.configure({ mode: 'serial' });
  // dev server 首次按需编译路由 + 引擎加载可能较慢，放宽超时
  test.setTimeout(120_000);

  test('TEST 1: GET /api/mcp/ → 405 Method Not Allowed', async ({ request }) => {
    const res = await request.get(MCP_ENDPOINT);
    expect(res.status()).toBe(405);
    const body = await res.json();
    expect(body.error).toBeDefined();
  });

  test('TEST 2: POST 无 Content-Type → 400 Parse error', async ({ request }) => {
    // 以字符串 body 发送，避免 Playwright 自动加 application/json
    const res = await request.post(MCP_ENDPOINT, {
      data: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize' }),
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error?.code).toBe(-32700);
  });

  test('POST 错误 Accept（text/html）→ 406 Not Acceptable', async ({ request }) => {
    const res = await request.post(MCP_ENDPOINT, {
      headers: { Accept: 'text/html' },
      data: { jsonrpc: '2.0', id: 1, method: 'initialize' },
    });
    expect(res.status()).toBe(406);
  });

  test('TEST 3: initialize → 200 + serverInfo.name=papeltools-mcp', async ({ request }) => {
    const res = await rpc(request, 'initialize', {
      protocolVersion: '2025-11-25',
      capabilities: {},
      clientInfo: { name: 'e2e-smoke', version: '1.0.0' },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.result?.serverInfo?.name).toBe('papeltools-mcp');
    expect(body.result?.serverInfo?.version).toBe('0.1.0');
    // 服务端声明了 tools 能力
    expect(body.result?.capabilities?.tools).toBeDefined();
  });

  test('TEST 4: tools/list → 3 个工具', async ({ request }) => {
    const res = await rpc(request, 'tools/list');
    expect(res.status()).toBe(200);
    const body = await res.json();
    const names = body.result?.tools?.map((t: { name: string }) => t.name) ?? [];
    expect(names).toEqual(
      expect.arrayContaining(['convert_pdf', 'preview_pdf', 'list_supported_formats'])
    );
    expect(names).toHaveLength(3);
  });

  test('list_supported_formats → pdf / 3MB / 50 页 / 无 OCR', async ({ request }) => {
    const res = await rpc(request, 'tools/call', {
      name: 'list_supported_formats',
      arguments: {},
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    const formats = body.result?.structuredContent?.formats;
    expect(formats).toHaveLength(1);
    expect(formats[0]).toMatchObject({
      extension: 'pdf',
      mimeType: 'application/pdf',
      maxFileSizeBytes: 3 * 1024 * 1024,
      maxPages: 50,
      ocrSupported: false,
    });
  });

  test('TEST 5: convert_pdf（真实 PDF）→ markdown + metadata', async ({ request }) => {
    const pdfBase64 = readFileSync(fixture('sample-text.pdf')).toString('base64');
    const res = await rpc(request, 'tools/call', {
      name: 'convert_pdf',
      arguments: { file: pdfBase64, filename: 'sample-text.pdf' },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    // 成功结果不应带 isError
    expect(body.result?.isError ?? false).toBe(false);
    const sc = body.result?.structuredContent;
    expect(sc?.markdown.length).toBeGreaterThan(0);
    expect(sc?.metadata?.pages).toBeGreaterThanOrEqual(1);
    expect(sc?.filename).toMatch(/\.md$/);
  });

  test('preview_pdf → preview 非空 + pageCount', async ({ request }) => {
    const pdfBase64 = readFileSync(fixture('sample-text.pdf')).toString('base64');
    const res = await rpc(request, 'tools/call', {
      name: 'preview_pdf',
      arguments: { file: pdfBase64 },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    const sc = body.result?.structuredContent;
    expect(sc?.preview.length).toBeGreaterThan(0);
    expect(sc?.pageCount).toBeGreaterThanOrEqual(1);
  });

  test('错误路径：空 file → isError（SDK 输入校验拦截，无 structuredContent）', async ({ request }) => {
    const res = await rpc(request, 'tools/call', {
      name: 'convert_pdf',
      arguments: { file: '' },
    });
    // 业务错误走 HTTP 200 + isError: true（见 docs/MCP-PHASE1-IMPLEMENTATION §3.4）
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.result?.isError).toBe(true);
    // 实测：SDK 用注册的 inputSchema 在回调前拦截（zod min(1)），返回 -32602 文本、
    // 不经过 lib/mcp/server.ts 的 invalid_params 分支（该分支对已注册 schema 是死代码）
    const text = body.result?.content?.[0]?.text ?? '';
    expect(text).toContain('MCP error -32602');
    expect(text).toContain('Invalid arguments for tool convert_pdf');
    expect(body.result?.structuredContent).toBeUndefined();
  });

  test('错误路径：空白 file（Base64 解码 0 字节）→ isError + code=file_empty', async ({ request }) => {
    const res = await rpc(request, 'tools/call', {
      name: 'convert_pdf',
      arguments: { file: '   ' },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.result?.isError).toBe(true);
    // 非空串但解码后 0 字节 → 业务层 file_empty
    expect(body.result?.structuredContent?.error?.code).toBe('file_empty');
  });
});
