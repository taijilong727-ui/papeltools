/**
 * ToolDoc — 工具文档卡片（服务器组件）
 *
 * 用法：
 *   <ToolDoc name={t('toolName')} summary={t('toolSummary')}>
 *     <CodeLabel>{t('inputLabel')}</CodeLabel>
 *     <CodeBlock language="json">{...}</CodeBlock>
 *   </ToolDoc>
 *
 * 渲染：边框卡片，monospace 工具名 + 简短描述 + 子内容（通常是 CodeLabel + CodeBlock 配对）。
 * 替代 <article> + 自定义 layout，让 McpDocsPage 文档布局统一。
 */
interface ToolDocProps {
  name: string;
  summary: string;
  children: React.ReactNode;
}

export function ToolDoc({ name, summary, children }: ToolDocProps) {
  return (
    <article
      className="mb-8 p-6 rounded-[var(--radius-md)] border"
      style={{
        background: 'var(--color-paper-soft)',
        borderColor: 'var(--color-rule)',
      }}
    >
      <h3
        className="text-[18px] font-semibold mb-2 font-mono"
        style={{ color: 'var(--color-ink)' }}
      >
        {name}
      </h3>
      <p
        className="text-[14.5px] leading-[1.7] mb-4"
        style={{ color: 'var(--color-ink-soft)' }}
      >
        {summary}
      </p>
      <div>{children}</div>
    </article>
  );
}