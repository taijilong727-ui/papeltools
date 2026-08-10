/**
 * FAQItem — 可展开/折叠的 FAQ 单条（服务器组件，原生 <details>）
 *
 * **解决"无展开提示"问题**：
 * 之前各页面用 `<details>` + `<summary className="list-none">` 隐藏了浏览器默认三角箭头，
 * 但没补任何替代指示——用户看不出来是可点击展开的。
 *
 * **统一模式**：
 * - 用原生 `<details>` + `<summary>`（免客户端状态、SSR 友好、键盘可访问）
 * - 加自定义 chevron SVG（`list-none` 隐藏默认三角，用 SVG 替代）
 * - Tailwind v4 的 `group-open:rotate-180` 实现展开时旋转动画
 *
 * **多选行为**：使用浏览器原生 `<details>`，**允许多个同时展开**。
 * （如需"单选手风琴"互斥行为——参考 `components/sections/FAQSection.tsx` 的 'use client' + useState 模式）
 *
 * 用法：
 *   <FAQItem question="..." answer="..." />
 *
 * 用于：LandingPage、GratisLandingPage、McpDocsPage、contact/page 共 4 处 FAQ
 */
interface FAQItemProps {
  /** 问题（summary 显示的文字） */
  question: string;
  /** 答案（details 内容，可纯字符串） */
  answer: string;
}

export function FAQItem({ question, answer }: FAQItemProps) {
  return (
    <details
      className="group overflow-hidden"
      style={{
        border: '1px solid var(--color-rule)',
        borderRadius: 'var(--radius-md)',
        background: 'var(--color-paper-soft)',
      }}
    >
      <summary
        className="cursor-pointer flex items-center justify-between gap-4 px-5 py-4 text-[15.5px] font-medium list-none"
        style={{ color: 'var(--color-ink)' }}
      >
        <span className="flex-1">{question}</span>
        {/* 展开指示 chevron——`<details open>` 时旋转 180°（Tailwind v4 group-open: 钩子） */}
        <svg
          viewBox="0 0 24 24"
          width="16"
          height="16"
          fill="none"
          stroke="var(--color-ink-soft)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className="flex-shrink-0 transition-transform duration-200 group-open:rotate-180"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </summary>
      <p
        className="px-5 pb-4 text-[14.5px] leading-[1.75]"
        style={{ color: 'var(--color-ink-soft)' }}
      >
        {answer}
      </p>
    </details>
  );
}