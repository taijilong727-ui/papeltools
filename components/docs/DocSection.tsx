/**
 * DocSection — 文档章节容器（服务器组件）
 *
 * 用法：<DocSection title={t('xxxTitle')}>{children}</DocSection>
 *
 * 提供：
 * - <section> 语义化容器
 * - h2 标题（与全站 headline-section 风格保持一致）
 * - mb-12 视觉分隔（section 之间留白）
 */
interface DocSectionProps {
  title: string;
  children: React.ReactNode;
}

export function DocSection({ title, children }: DocSectionProps) {
  return (
    <section className="mb-12">
      <h2
        className="text-[24px] font-semibold mb-5 text-balance"
        style={{ color: 'var(--color-ink)' }}
      >
        {title}
      </h2>
      {children}
    </section>
  );
}