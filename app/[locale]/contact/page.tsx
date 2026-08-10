import Link from 'next/link';
import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { locales, isValidLocale, type Locale } from '@/lib/i18n/config';
import { getTranslations } from 'next-intl/server';
import {
  pageMetadata,
  breadcrumbJsonLd,
  absoluteUrl,
} from '@/lib/seo';
import { ContactForm } from '@/components/contact/ContactForm';
import { FAQItem } from '@/components/ui/FAQItem';

/**
 * 联系页 — 沿用 worldcup2026 同款 UX 模式（独立 Contact 页 + 双栏布局）
 *
 * 设计动机：纯 mailto: 链接在用户无邮件客户端时无响应（dev / Linux / 无头浏览器）。
 *           改成独立 Contact 页后：
 *           1) 邮箱地址直接展示，用户可复制或点 mailto:
 *           2) 提交表单给清晰的视觉反馈（感谢信息）
 *           3) FAQ 区块提供自助答案（bug 报告 / 功能请求 / MCP API），减轻邮件负担
 *
 * 内容结构（messages.{locale}.json 的 contact namespace）：
 * - Hero (h1 + intro)
 * - 双栏布局：
 *   - 左：联系信息卡片（邮箱 + 响应时间）
 *   - 右：表单卡片（姓名/邮箱/主题/消息，<ContactForm /> 客户端组件）
 * - FAQ 区块（3 个 papeltools 相关问题）
 * - 返回首页链接
 */

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  if (!isValidLocale(rawLocale)) return {};
  const locale = rawLocale as Locale;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'contact' });
  return pageMetadata(locale, '/contact', t('heroTitle'), t('heroDesc'));
}

export default async function ContactPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  if (!isValidLocale(rawLocale)) notFound();
  const locale = rawLocale as Locale;
  setRequestLocale(locale);
  const t = await getTranslations('contact');

  // BreadcrumbList JSON-LD
  const homeLabel = locale === 'es' ? 'Inicio' : locale === 'pt' ? 'Início' : 'Home';
  const breadcrumbLd = JSON.stringify(
    breadcrumbJsonLd([
      { name: homeLabel, url: absoluteUrl(locale, '') },
      { name: t('heroTitle'), url: absoluteUrl(locale, '/contact') },
    ])
  );

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: breadcrumbLd }}
      />
      <article className="max-w-[1000px] mx-auto px-6 py-16 md:py-24">
        {/* Hero */}
        <header className="mb-12 text-center max-w-[700px] mx-auto">
          <h1 className="headline-section mb-4 text-balance">{t('heroTitle')}</h1>
          <p className="text-[18px] text-[var(--color-ink-soft)] leading-relaxed">
            {t('heroDesc')}
          </p>
        </header>

        {/* 双栏布局：联系信息 + 表单 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Contact Info Card */}
          <div
            className="p-8 rounded-[var(--radius-md)] border border-[var(--color-rule)]"
            style={{ background: 'var(--color-paper-soft)' }}
          >
            <h2 className="text-[20px] font-medium mb-6">{t('getInTouch')}</h2>

            <div className="mb-5">
              <h3
                className="text-[14px] font-medium mb-1.5"
                style={{ color: 'var(--color-ink)' }}
              >
                📧 {t('emailLabel')}
              </h3>
              <p className="text-[14.5px] text-[var(--color-ink-soft)]">
                <a
                  href={`mailto:${t('emailAddress')}`}
                  className="font-mono hover:underline"
                  style={{ color: 'var(--color-accent)' }}
                >
                  {t('emailAddress')}
                </a>
                <br />
                <span className="text-[13px]">{t('emailResponse')}</span>
              </p>
            </div>

            <div
              className="p-4 rounded-[var(--radius-sm)] mt-6"
              style={{ background: 'var(--color-paper)' }}
            >
              <h4
                className="text-[13px] font-medium mb-1.5"
                style={{ color: 'var(--color-ink)' }}
              >
                ⏱️ {t('responseTimeHeading')}
              </h4>
              <p className="text-[13.5px] text-[var(--color-ink-soft)] leading-relaxed">
                {t('responseTimeText')}
              </p>
            </div>
          </div>

          {/* Contact Form Card */}
          <div
            className="p-8 rounded-[var(--radius-md)] border border-[var(--color-rule)]"
            style={{ background: 'var(--color-paper-soft)' }}
          >
            <h2 className="text-[20px] font-medium mb-6">{t('sendMessage')}</h2>
            <ContactForm />
          </div>
        </div>

        {/* FAQ Section */}
        <section
          className="mt-10 p-8 rounded-[var(--radius-md)] border border-[var(--color-rule)]"
          style={{ background: 'var(--color-paper-soft)' }}
        >
          <h2 className="text-[20px] font-medium mb-6">{t('faqTitle')}</h2>

          <div className="flex flex-col gap-2.5">
            <FAQItem question={t('faqBugQ')} answer={t('faqBugA')} />
            <FAQItem question={t('faqFeatureQ')} answer={t('faqFeatureA')} />
            <FAQItem question={t('faqMcpQ')} answer={t('faqMcpA')} />
          </div>
        </section>

        {/* Back to Home */}
        <div className="mt-12 text-center">
          <Link
            href={`/${locale === 'en' ? '' : `${locale}/`}`}
            className="text-[14.5px] font-medium hover:underline"
            style={{ color: 'var(--color-accent)' }}
          >
            {t('backToHome')}
          </Link>
        </div>
      </article>
    </>
  );
}