/**
 * MCP 服务元数据 — 单一来源（server-card.json + initialize 响应共用）
 *
 * 参考：PRD FR-35（注册与发现）+ docs/MCP实现分析与架构影响-2026-08-07.md §六
 *
 * 注意：MCP 协议版本由客户端 initialize 时声明，SDK 内部协商；
 * 此处不硬编码 protocolVersion。MCP_SERVER_VERSION 与 package.json 对齐。
 */

export const MCP_SERVER_NAME = 'papeltools-mcp';

/**
 * 与 package.json "version" 字段保持一致（手动同步）。
 * 升级引擎或新增工具时同步 bump 此处 + server-card.json + package.json。
 */
export const MCP_SERVER_VERSION = '0.2.0';

/**
 * 服务描述（用于 initialize 响应 + server-card.json）
 * 明确说明：
 * - 远程端"一次上传"语义（与浏览器端零上传原则不冲突 — 隐私边界见 AGENTS.md 锁定决策）
 * - 文本型 PDF only（OCR 留给 P2）
 * - 大小/页数限制
 */
export const MCP_SERVER_DESCRIPTION =
  'Privacy-first PDF to Markdown conversion tools for AI agents. Text-based PDFs up to 3MB / 50 pages. Server-side conversion (one upload to our server, never forwarded to third parties). No OCR in remote MVP.';

/** 远程端点公开 URL — FR-35 注册发现（Agent 配置时使用）
 *
 * 优先从 env `MCP_REMOTE_URL` 读取，staging / preview 部署可指向不同 URL；
 * 默认生产 URL：`https://papeltools.com/api/mcp`。
 */
export const MCP_REMOTE_URL =
  process.env.MCP_REMOTE_URL ?? 'https://papeltools.com/api/mcp';

/** MCP Registry 注册类别 */
export const MCP_REGISTRY_CATEGORIES = [
  'document-processing',
  'productivity',
  'text-extraction',
] as const;
