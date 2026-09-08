/**
 * llms.txt — AI 爬虫 Markdown 站点概要
 *
 * 参考规范：https://llmstxt.org/
 * 用途：给 LLM 爬虫（Claude / ChatGPT / Perplexity / Google AI）提供站点结构化摘要，
 * 提升 GEO（Generative Engine Optimization）效果。
 *
 * 路由：/llms.txt — Next.js App Router 自动根据文件名映射（app/llms.txt/route.ts）。
 *
 * 注：本文件不是 JSON-LD，是给 LLM 直接消费的纯文本 Markdown，
 * 因此故意简洁、可读，不嵌入 schema.org 结构。
 */

import { NextResponse } from 'next/server';
import { MCP_SDK_VERSION } from '@/lib/mcp/info';

export const runtime = 'nodejs';

/** Next.js 静态导出要求 force-static（与 robots.ts / sitemap.ts 一致） */
export const dynamic = 'force-static';

const SITE_URL = 'https://papeltools.com';
const MCP_REMOTE_URL = `${SITE_URL}/api/mcp`;
const MCP_TRANSPORT_NAME = 'WebStandardStreamableHTTPServerTransport';
const TECH_PDF2MD = '@pdf2md/core';
const TECH_MCP_SDK = `@modelcontextprotocol/sdk ${MCP_SDK_VERSION}`;
const TECH_RATELIMIT = '@upstash/ratelimit (slidingWindow 60/min) + in-memory dev fallback';

export async function GET() {
  const body = `# Papel Tools

> Privacy-first PDF to Markdown converter running 100% in your browser. Files never leave your device. Free, no signup, no limits. Built for humans and AI agents.

Papel Tools converts PDF documents to clean Markdown (GitHub-flavored Markdown tables, LaTeX math formulas, hierarchical headings). Conversion happens entirely in your browser using PDF.js — no server, no upload, no API call. Open DevTools → Network during conversion and you will see zero document requests. The website converter stays 100% in-browser; only the hosted MCP endpoint handles files server-side.

The product has three surfaces:
- Web converter (zero-upload, 100% in-browser, 200 MB limit)
- Remote MCP server at ${SITE_URL}/api/mcp (Streamable HTTP, 3 MB / 50 pages limit, server-side conversion, never forwarded to third parties)
- Local npm stdio package (planned for Phase 2)

## Homepage

- [Papel Tools — PDF to Markdown, in your browser](${SITE_URL}/): The main converter. Drag any text-based PDF onto the page, get clean Markdown with token count + per-page metadata, copy or download. Free, no signup, files never leave your device.
- [Privacidad / Privacy](${SITE_URL}/es/privacy/): How we keep the zero-upload promise. Verifiable in DevTools.
- [Privacidade](${SITE_URL}/pt/privacy/): Como mantemos a promessa de zero upload. Verificável no DevTools.

## Scenario landing pages (English)

- [PDF to Markdown for LLMs](${SITE_URL}/en/pdf-to-markdown-for-llm/): Convert papers and textbooks to Markdown ready to paste into ChatGPT, Claude, or Gemini. Includes token count.
- [PDF to Markdown for Obsidian](${SITE_URL}/en/pdf-to-markdown-for-obsidian/): Drop a paper into your vault with headings, lists, and tables intact. Plain Markdown, no proprietary markup.
- [PDF to Markdown for RAG](${SITE_URL}/en/pdf-to-markdown-for-rag/): Clean, chunkable Markdown for vector databases. Consistent header hierarchy for predictable chunking.
- [Free PDF to Markdown, no upload](${SITE_URL}/en/pdf-to-markdown-free-no-upload/): The only compliant option for confidential documents. Verifiable zero-upload.

## Scenario landing pages (Spanish)

- [PDF a Markdown para LLMs](${SITE_URL}/es/pdf-to-markdown-for-llm/): Convierte papers y libros en Markdown listo para ChatGPT, Claude o Gemini.
- [PDF a Markdown para Obsidian](${SITE_URL}/es/pdf-to-markdown-for-obsidian/): Suelta papers en tu vault con encabezados, listas y tablas intactas.
- [PDF a Markdown para RAG](${SITE_URL}/es/pdf-to-markdown-for-rag/): Markdown limpio y troceable para bases de datos vectoriales.
- [PDF a Markdown gratis, sin subida](${SITE_URL}/es/pdf-to-markdown-free-no-upload/): La única opción conforme para documentos confidenciales.

## Scenario landing pages (Portuguese)

- [PDF para Markdown para LLMs](${SITE_URL}/pt/pdf-to-markdown-for-llm/): Converta papers e livros em Markdown pronto para ChatGPT, Claude ou Gemini.
- [PDF para Markdown para Obsidian](${SITE_URL}/pt/pdf-to-markdown-for-obsidian/): Solte papers no seu vault com títulos, listas e tabelas intactos.
- [PDF para Markdown para RAG](${SITE_URL}/pt/pdf-to-markdown-for-rag/): Markdown limpo e segmentável para bancos vetoriais.
- [PDF para Markdown grátis, sem upload](${SITE_URL}/pt/pdf-to-markdown-free-no-upload/): A única opção em conformidade para documentos confidenciais.

## Long-tail landing pages

- [PDF to Markdown MCP server](${SITE_URL}/en/pdf-to-markdown-mcp/): SEO landing for the MCP keyword. One-command install for Claude Desktop, Cursor, VS Code.
- [Convert scanned PDF to Markdown](${SITE_URL}/en/pdf-ocr-to-markdown/): On-device OCR in the browser for English, Spanish, and Portuguese. The first run downloads same-origin model and WebAssembly resources; your PDF bytes are never uploaded.
- [PDF to Markdown with tables](${SITE_URL}/en/pdf-to-markdown-with-tables/): GFM tables preserved, LaTeX math, header hierarchy intact.
- [Convertir PDF a Markdown gratis (ES)](${SITE_URL}/es/pdf-a-markdown-gratis/): Spanish long-tail. Sin subida, sin registro, en español.
- [Converter PDF em Markdown grátis (PT)](${SITE_URL}/pt/converter-pdf-em-markdown-gratis/): Portuguese long-tail. Sem upload, sem cadastro, em português.

## MCP server

- [MCP server for PDF to Markdown](${SITE_URL}/en/mcp/): Hosted Streamable HTTP endpoint at ${MCP_REMOTE_URL}. 3 tools: convert_pdf, preview_pdf, list_supported_formats. Free tier 60 requests/minute/IP.
- [Server card JSON](${SITE_URL}/.well-known/mcp/server-card.json): Machine-readable discovery manifest.

## Tech stack

- Conversion: ${TECH_PDF2MD} (pdf.js v5, Node legacy build)
- MCP: ${TECH_MCP_SDK} (raw SDK, stateless ${MCP_TRANSPORT_NAME})
- Framework: Next.js 16 (hybrid mode — pages SSG, /api/mcp Serverless Function)
- i18n: next-intl v4 (English / Spanish / Portuguese pt-BR)
- Rate limit: ${TECH_RATELIMIT}
- Deployment: Vercel (Cloudflare Pages option removed in 2026-08-08)

## Conversion limits

| Surface | File size | Pages | OCR | Privacy |
|---|---|---|---|---|
| Web converter | 200 MB | single file per session | on-device Tesseract.js (EN/ES/PT) | 100% in-browser, zero PDF upload; first OCR run downloads same-origin model resources |
| Remote MCP server | 3 MB | 50 max | not supported (returns JSON-RPC error) | one upload to our server, never third parties |
| Local stdio package | (planned) | (planned) | (planned Phase 2) | 100% on local machine |

## Conversion output guarantees

- Tables → clean GitHub-flavored Markdown (GFM)
- Math formulas → LaTeX (not garbled Unicode)
- Heading hierarchy preserved (H1 → H6)
- Token count shown next to word count (estimates for LLM context windows)
- Source metadata extracted (title, author, subject, keywords, creation date)
- On-device OCR for scanned PDFs (EN/ES/PT); review accuracy before reusing results

## Honest limitations (advertising surface = delivery surface)

- No OCR in the remote MCP endpoint. Scanned PDFs sent there return a clear JSON-RPC error. The web converter offers on-device OCR with Tesseract.js for English, Spanish, and Portuguese.
- No encrypted PDFs in v1.
- No batch conversion in MVP (single-file workflow, 200 MB browser limit per file).
- No CSV / Excel export — Markdown output only (use pandoc for downstream conversion).
- No analytics on this site today; the converter does not send document telemetry.

## Privacy

- All web conversion runs in your browser via PDF.js — no upload, no server, no API call, no tracking on the converter page.
- The remote MCP endpoint uploads your file once to our server for conversion. Files are never forwarded to any third party, never stored, never logged.
- Fonts are self-hosted with next/font; the first OCR run may download same-origin model and WebAssembly resources. Your PDF bytes and extracted text are never uploaded.
- AI training crawlers (GPTBot, CCBot, ClaudeBot, anthropic-ai, Bytespider) are blocked in robots.txt.
- AI retrieval crawlers (OAI-SearchBot, ChatGPT-User, PerplexityBot, Claude-SearchBot, Claude-User, Googlebot, Bingbot) are explicitly allowed.

## Open source

- Web converter uses PDF.js (Mozilla, BSD-2-Clause) and @pdf2md/core under their respective licenses.
- Web OCR uses Tesseract.js (Apache-2.0); OCR model assets are served from this site.
- The Papel Tools application repository is not public yet and will be linked here when it is released.

## Optional

For programmatic / agent integration:

- MCP remote URL: ${MCP_REMOTE_URL}
- MCP server card (JSON): ${SITE_URL}/.well-known/mcp/server-card.json
- Tools exposed: convert_pdf, preview_pdf, list_supported_formats
- Streamable HTTP transport, stateless, 60 requests/minute/IP default limit
- Authentication: Origin whitelist (production). IP-based rate limit via @upstash/ratelimit.
`;

  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      // AI 爬虫友好 — 短缓存以便更新后快速生效
      'Cache-Control': 'public, max-age=300, s-maxage=3600',
    },
  });
}