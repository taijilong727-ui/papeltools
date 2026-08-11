/**
 * json-samples — 10 个 MCP docs page 的 JSON 示例代码（静态 JS module）
 *
 * **为什么不用 i18n（messages.json）？**
 * Next.js 16 dev 模式下，next-intl `t()` 返回的 JSON 字符串（带 `{` `}`）
 * 会在 RSC 序列化时触发 `INVALID_MESSAGE: MALFORMED_ARGUMENT` 错误，
 * 即使放在 server component 的 dangerouslySetInnerHTML 里也无效。
 *
 * **绕过方法**：把 JSON 内容移到独立的 JS module，用 JS 模板字面量直接定义。
 * 这样字符串不经过 next-intl，避开 dev 模式的兼容性问题。
 *
 * **i18n 代价**：JSON 内容不参与翻译（3 语用同一份）。
 * **未来回滚**：如果 Next.js / next-intl 修复了这个 bug，把 `t('xxx')` 改回来即可。
 *
 * 详见 [[MCP文档页组件补全方案-2026-08-09]] §十一（这条注释本身就是坑的活档案）。
 */

// 注意：JSON 里的 `<` `>` 在 dangerouslySetInnerHTML 前会被 escapeHtml 处理，
// 但作为 JS 字符串字面量时不需要转义——直接写实际字符即可。

export const jsonSamples = {
  claudeDesktopConfig: `{
  "mcpServers": {
    "papeltools": {
      "url": "https://www.papeltools.com/api/mcp",
      "transport": "streamable-http"
    }
  }
}`,

  cursorConfig: `{
  "mcpServers": {
    "papeltools": {
      "url": "https://www.papeltools.com/api/mcp"
    }
  }
}`,

  vscodeConfig: `{
  "mcp": {
    "servers": {
      "papeltools": {
        "url": "https://www.papeltools.com/api/mcp",
        "type": "http"
      }
    }
  }
}`,

  convertPdfInput: `{
  "file": "<Base64-encoded PDF bytes>",
  "filename": "Annual-Report-2026.pdf",
  "options": {
    "maxPages": 50,
    "outputFormat": "markdown"
  }
}`,

  convertPdfOutput: `{
  "content": [{"type": "text", "text": "# Heading\\n\\nBody..."}],
  "structuredContent": {
    "filename": "Annual-Report-2026.md",
    "markdown": "...",
    "metadata": {"pages": 12, "words": 3421, "tokens": 4892, "ocr": false}
  }
}`,

  previewPdfInput: `{
  "file": "<Base64-encoded PDF bytes>",
  "filename": "optional"
}`,

  previewPdfOutput: `{
  "preview": "<Markdown, truncated to 4000 chars>",
  "truncated": true,
  "pageCount": 23
}`,

  listPdfOutput: `{
  "formats": [{
    "extension": "pdf",
    "mimeType": "application/pdf",
    "maxFileSizeBytes": 3145728,
    "maxPages": 50,
    "ocrSupported": false,
    "description": "Portable Document Format (text-based)"
  }]
}`,

  responseSuccess: `{
  "content": [{"type": "text", "text": "# Heading\\n\\nBody text..."}],
  "structuredContent": {
    "filename": "Report.md",
    "markdown": "...",
    "metadata": {"pages": 12, "words": 3421, "tokens": 4892, "ocr": false, "durationMs": 247}
  }
}`,

  responseError: `{
  "content": [{"type": "text", "text": "[file_too_big] File exceeds 3MB remote limit"}],
  "isError": true,
  "structuredContent": {
    "error": {
      "code": "file_too_big",
      "message": "File exceeds 3MB remote limit",
      "retryable": false
    }
  }
}`,
} as const;