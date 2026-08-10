import Link from 'next/link';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { Locale } from '@/lib/i18n/config';
import { DocSection as Section } from './DocSection';
import { CopyButton } from './CopyButton';
import { CodeLabel as Label } from './CodeLabel';
import { ToolDoc as Tool } from './ToolDoc';
import { jsonSamples } from './json-samples';
import { FAQItem } from '@/components/ui/FAQItem';

/** HTML 转义——JSON 里可能出现的 3 个字符（& < >） */
function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * McpDocsPage — MCP 开发者文档页
 *
 * 与 LandingPage 10 要素营销布局不同——这是纯文档式布局：
 * - H1 + intro
 * - 多个 sections(Configuration / Tools / Limits / Privacy / Response format / Source)
 * - 每个工具有 schema + 示例 JSON 代码块
 * - 限制表
 * - 4 个 FAQ
 * - 相关链接
 *
 * 内容来源：messages.{en,es,pt}.json → landing.mcp
 * 注意：此 namespace 是为 /mcp 文档页专门设计，与 /pdf-to-markdown-mcp/ 营销页的 landing.mcpSeo 不同。
 */

export async function McpDocsPage({ locale }: { locale: Locale }) {
  // next-intl: 每个 async server component 都要自己调一次 setRequestLocale，
  // async 上下文不会跨组件边界共享——没这一行 getTranslations 可能在子组件里返回空。
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'landing.mcp' });
  const homePath = locale === 'en' ? '/' : `/${locale}/`;

  // 内联代码块渲染——完全绕过 CodeBlock 组件，
  // 解决 Next.js 16 RSC 序列化对 `{` `}` 的 MALFORMED_ARGUMENT 错误。
  //
  // **不用 useId**：async server component 不能调 React hooks（hook 上下文缺失）。
  // 用确定的字符串 ID：每个 i18n key 天然唯一，无需 hook 生成。
  function renderCode(language: string, content: string, idKey: string) {
    const id = `code-${idKey}`;
    return (
      <div className="relative group my-3">
        <span
          className="absolute top-2 left-3 text-[10.5px] font-mono uppercase tracking-[0.08em] opacity-60"
          style={{ color: 'var(--color-ink-soft)' }}
          aria-hidden="true"
        >
          {language}
        </span>
        <pre
          className="overflow-x-auto pt-8 pb-4 px-4 rounded-[var(--radius-md)] border text-[13px] leading-[1.65] font-mono"
          style={{
            background: 'var(--color-paper)',
            borderColor: 'var(--color-rule)',
            color: 'var(--color-ink)',
          }}
        >
          <code
            id={id}
            dangerouslySetInnerHTML={{ __html: escapeHtml(content) }}
          />
        </pre>
        <CopyButton targetId={id} language={language} />
      </div>
    );
  }

  // FAQ 4 条
  const faqItems = [
    { q: t('faq1Q'), a: t('faq1A') },
    { q: t('faq2Q'), a: t('faq2A') },
    { q: t('faq3Q'), a: t('faq3A') },
    { q: t('faq4Q'), a: t('faq4A') },
  ];

  // 限制表（6 行）
  const limitsTable: ReadonlyArray<readonly [string, string]> = t.raw('limitsTable');

  return (
    <article className="max-w-[860px] mx-auto px-6 py-16 md:py-24">
      {/* H1 + intro */}
      <h1 className="headline-section mb-6 text-balance">{t('h1')}</h1>
      <p className="text-[18px] text-[var(--color-ink-soft)] leading-relaxed mb-14">
        {t('intro')}
      </p>

      {/* Configuration section */}
      <Section title={t('configTitle')}>
        <p className="text-[15.5px] leading-[1.75] text-[var(--color-ink-soft)] mb-5">
          {t('configIntro')}
        </p>

        <h3 className="text-[17px] font-semibold mt-6 mb-2 text-[var(--color-ink)]">
          {t('claudeDesktopTitle')}
        </h3>
        {renderCode('json', jsonSamples.claudeDesktopConfig, 'claude-desktop-config')}
        <p className="text-[14.5px] leading-[1.7] text-[var(--color-ink-soft)] mt-2">
          {t('claudeDesktopRestart')}
        </p>

        <h3 className="text-[17px] font-semibold mt-7 mb-2 text-[var(--color-ink)]">
          {t('cursorTitle')}
        </h3>
        {renderCode('json', jsonSamples.cursorConfig, 'cursor-config')}
        <p className="text-[14.5px] leading-[1.7] text-[var(--color-ink-soft)] mt-2">
          {t('cursorNote')}
        </p>

        <h3 className="text-[17px] font-semibold mt-7 mb-2 text-[var(--color-ink)]">
          {t('vscodeTitle')}
        </h3>
        {renderCode('json', jsonSamples.vscodeConfig, 'vscode-config')}
        <p className="text-[14.5px] leading-[1.7] text-[var(--color-ink-soft)] mt-2">
          {t('vscodeNote')}
        </p>
      </Section>

      {/* Tools section */}
      <Section title={t('toolsTitle')}>
        <p className="text-[15.5px] leading-[1.75] text-[var(--color-ink-soft)] mb-6">
          {t('toolsIntro')}
        </p>

        {/* convert_pdf */}
        <Tool
          name={t('convertPdfName')}
          summary={t('convertPdfSummary')}
        >
          <Label>{t('convertPdfInputLabel')}</Label>
          {renderCode('json', jsonSamples.convertPdfInput, 'convert-pdf-input')}
          <Label>{t('convertPdfOutputLabel')}</Label>
          {renderCode('json', jsonSamples.convertPdfOutput, 'convert-pdf-output')}
        </Tool>

        {/* preview_pdf */}
        <Tool
          name={t('previewPdfName')}
          summary={t('previewPdfSummary')}
        >
          <Label>{t('previewPdfInputLabel')}</Label>
          {renderCode('json', jsonSamples.previewPdfInput, 'preview-pdf-input')}
          <Label>{t('previewPdfOutputLabel')}</Label>
          {renderCode('json', jsonSamples.previewPdfOutput, 'preview-pdf-output')}
        </Tool>

        {/* list_supported_formats */}
        <Tool
          name={t('listPdfName')}
          summary={t('listPdfSummary')}
        >
          <Label>{t('listPdfOutputLabel')}</Label>
          {renderCode('json', jsonSamples.listPdfOutput, 'list-pdf-output')}
        </Tool>
      </Section>

      {/* Limits section */}
      <Section title={t('limitsTitle')}>
        <p className="text-[15.5px] leading-[1.75] text-[var(--color-ink-soft)] mb-4">
          {t('limitsIntro')}
        </p>
        <div
          className="overflow-hidden"
          style={{
            border: '1px solid var(--color-rule)',
            borderRadius: 'var(--radius-md)',
          }}
        >
          <table className="w-full text-[14px]">
            <thead>
              <tr style={{ background: 'var(--color-paper-soft)' }}>
                <th
                  className="text-left px-4 py-3 font-medium"
                  style={{ color: 'var(--color-ink-soft)', width: '40%' }}
                />
                <th
                  className="text-left px-4 py-3 font-semibold"
                  style={{ color: 'var(--color-ink)' }}
                />
              </tr>
            </thead>
            <tbody>
              {Array.from(limitsTable).map((row, i) => (
                <tr
                  key={i}
                  style={{ borderTop: '1px solid var(--color-rule)' }}
                >
                  <td
                    className="px-4 py-3 font-medium"
                    style={{ color: 'var(--color-ink-soft)' }}
                  >
                    {row[0]}
                  </td>
                  <td
                    className="px-4 py-3"
                    style={{ color: 'var(--color-ink)' }}
                  >
                    {row[1]}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {/* Privacy section */}
      <Section title={t('privacyTitle')}>
        <p className="text-[15.5px] leading-[1.75] text-[var(--color-ink-soft)]">
          {t('privacyBody')}
        </p>
      </Section>

      {/* Response format section */}
      <Section title={t('responseTitle')}>
        <p className="text-[15.5px] leading-[1.75] text-[var(--color-ink-soft)] mb-4">
          {t('responseIntro')}
        </p>
        <h3 className="text-[15.5px] font-semibold mt-4 mb-2 text-[var(--color-ink-soft)]">
          {t('responseSuccessLabel')}
        </h3>
        {renderCode('json', jsonSamples.responseSuccess, 'response-success')}
        <h3 className="text-[15.5px] font-semibold mt-5 mb-2 text-[var(--color-ink-soft)]">
          {t('responseErrorLabel')}
        </h3>
        {renderCode('json', jsonSamples.responseError, 'response-error')}
      </Section>

      {/* Source code section */}
      <Section title={t('sourceTitle')}>
        <p className="text-[15.5px] leading-[1.75] text-[var(--color-ink-soft)] mb-4">
          {t('sourceBody')}
        </p>
        {/* TODO: GitHub 仓库上线后恢复为 <Link href="https://github.com/papeltools/pdftomd"> — 当前未实现，降级为灰色占位避免 404 */}
        <span
          className="inline-flex items-center gap-2 text-[14.5px] font-medium font-mono opacity-50 cursor-default"
          style={{ color: 'var(--color-ink-soft)' }}
        >
          {t('githubLinkLabel')}
          <svg
            viewBox="0 0 24 24"
            width="14"
            height="14"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M7 17 17 7M17 7H7m10 0v10" />
          </svg>
        </span>
      </Section>

      {/* Local development section */}
      <Section title={t('localDevTitle')}>
        <p className="text-[15.5px] leading-[1.75] text-[var(--color-ink-soft)] mb-4">
          {t('localDevBody')}
        </p>
        {/* TODO: GitHub 仓库上线后恢复为 <Code language="bash"> — 当前未实现，降级为占位文本避免 404 */}
        <p className="text-[14.5px] leading-[1.75] italic opacity-70" style={{ color: 'var(--color-ink-soft)' }}>
          {t('localDevCmd')}
        </p>
      </Section>

      {/* FAQ */}
      <Section title={t('faqTitle')}>
        <p className="text-[15.5px] mb-5" style={{ color: 'var(--color-ink-soft)' }}>
          {t('faqSubtitle')}
        </p>
        <div className="flex flex-col gap-2.5">
          {faqItems.map((item, i) => (
            <FAQItem key={i} question={item.q} answer={item.a} />
          ))}
        </div>
      </Section>

      {/* Related link */}
      <section className="mt-10 pt-6 border-t" style={{ borderColor: 'var(--color-rule)' }}>
        <h3
          className="text-[16px] font-semibold mb-3"
          style={{ color: 'var(--color-ink)' }}
        >
          {t('relatedTitle')}
        </h3>
        <Link
          href={`/${locale}${t('relatedLink1Href')}`}
          className="text-[14.5px] font-medium hover:underline"
          style={{ color: 'var(--color-accent)' }}
        >
          {t('relatedLink1Label')}
        </Link>
      </section>

      {/* Back to home */}
      <div className="mt-10 pt-6 border-t" style={{ borderColor: 'var(--color-rule)' }}>
        <Link
          href={homePath}
          className="text-[14.5px] font-medium hover:underline"
          style={{ color: 'var(--color-accent)' }}
        >
          {t('backToHome')}
        </Link>
      </div>
    </article>
  );
}