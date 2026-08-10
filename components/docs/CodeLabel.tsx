/**
 * CodeLabel — 代码块标签（服务器组件）
 *
 * 用法：<CodeLabel>{t('inputLabel')}</CodeLabel>
 *
 * 渲染：小型 monospace 大写标签，用于 code block 上方
 * 例子渲染："INPUT" / "OUTPUT" / "SCHEMA"
 *
 * 与 CodeBlock 配合使用，组成 schema + JSON 示例的标准文档布局。
 */
interface CodeLabelProps {
  children: React.ReactNode;
}

export function CodeLabel({ children }: CodeLabelProps) {
  return (
    <div
      className="text-[11.5px] font-mono uppercase tracking-[0.1em] mt-4 mb-1.5"
      style={{ color: 'var(--color-ink-soft)' }}
    >
      {children}
    </div>
  );
}