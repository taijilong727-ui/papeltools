import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { type Locale } from '@/lib/i18n/config';
import { DonateLink } from '@/components/DonateLink';

/**
 * Footer — 纸感极简风格
 *
 * 结构：brand + 4 栏（product / resources / company）+ 版权 + 隐私徽标
 */
interface FooterProps {
  locale: Locale;
}

export function Footer({ locale }: FooterProps) {
  const t = useTranslations('footer');
  const homePath = locale === 'en' ? '/' : `/${locale}/`;

  return (
    <footer className="border-t border-[var(--color-rule)] py-14 pb-10">
      <div className="max-w-[1180px] mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-11">
          {/* Brand column */}
          <div className="md:col-span-1">
            <Link href={homePath} className="flex items-center gap-3 font-display font-bold text-[19px] tracking-tight">
              <span
                className="w-[30px] h-[30px] grid place-items-center rounded-[var(--radius-sm)]"
                style={{ background: 'var(--color-accent)', color: 'var(--color-accent-soft)' }}
                aria-hidden="true"
              >
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <path d="M14 2v6h6" />
                  <path d="M9 13h6M9 17h6" />
                </svg>
              </span>
              Papel&nbsp;Tools
            </Link>
            <p className="mt-4 text-[14px] text-[var(--color-ink-soft)] max-w-[300px]">
              {t('brandDesc')}
            </p>
          </div>

          {/* Product */}
          <div>
            <h4 className="font-mono text-[14px] tracking-[0.14em] uppercase text-[var(--color-ink-soft)] mb-4">
              {t('productHeading')}
            </h4>
            <ul role="list" className="flex flex-col gap-2.5 list-none">
              <li><a href={`${homePath}#converter`} className="text-[14.5px] text-[var(--color-ink-soft)] hover:text-[var(--color-ink)] transition-colors">{t('productCta')}</a></li>
              <li><Link href={`/${locale}/pdf-to-markdown-mcp`} className="text-[14.5px] text-[var(--color-ink-soft)] hover:text-[var(--color-ink)] transition-colors">{t('productMcp')}</Link></li>
              <li><Link href={`/${locale}/pdf-to-markdown-for-llm`} className="text-[14.5px] text-[var(--color-ink-soft)] hover:text-[var(--color-ink)] transition-colors">{t('productLlm')}</Link></li>
              <li><Link href={`/${locale}/pdf-to-markdown-for-obsidian`} className="text-[14.5px] text-[var(--color-ink-soft)] hover:text-[var(--color-ink)] transition-colors">{t('productObsidian')}</Link></li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="font-mono text-[14px] tracking-[0.14em] uppercase text-[var(--color-ink-soft)] mb-4">
              {t('resourcesHeading')}
            </h4>
            <ul role="list" className="flex flex-col gap-2.5 list-none">
              <li><Link href={`/${locale}/pdf-to-markdown-for-rag`} className="text-[14.5px] text-[var(--color-ink-soft)] hover:text-[var(--color-ink)] transition-colors">{t('resourcesRag')}</Link></li>
              <li><Link href={`/${locale}/pdf-to-markdown-free-no-upload`} className="text-[14.5px] text-[var(--color-ink-soft)] hover:text-[var(--color-ink)] transition-colors">{t('resourcesNoUpload')}</Link></li>
              <li><Link href={`/${locale}/mcp`} className="text-[14.5px] text-[var(--color-ink-soft)] hover:text-[var(--color-ink)] transition-colors">{t('resourcesMcp')}</Link></li>
              {/* TODO(P2): /blog 路由实现后恢复为 <Link href={`/${locale}/blog`}> — 当前无路由，降级为纯文本避免 404 */}
              <li><span className="text-[14.5px] text-[var(--color-ink-soft)] opacity-50 cursor-default">{t('resourcesBlog')}</span></li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="font-mono text-[14px] tracking-[0.14em] uppercase text-[var(--color-ink-soft)] mb-4">
              {t('companyHeading')}
            </h4>
            <ul role="list" className="flex flex-col gap-2.5 list-none">
              <li><Link href={`/${locale}/privacy`} className="text-[14.5px] text-[var(--color-ink-soft)] hover:text-[var(--color-ink)] transition-colors">{t('companyPrivacy')}</Link></li>
              <li><Link href={`/${locale}/terms`} className="text-[14.5px] text-[var(--color-ink-soft)] hover:text-[var(--color-ink)] transition-colors">{t('companyTerms')}</Link></li>
              <li><Link href={`/${locale}/contact`} className="text-[14.5px] text-[var(--color-ink-soft)] hover:text-[var(--color-ink)] transition-colors">{t('companyContact')}</Link></li>
              {/* TODO: GitHub 项目上线后恢复为 <a href="https://github.com/papeltools" ...> — 当前项目未实现，降级为纯文本避免 404 */}
              <li><span className="text-[14.5px] text-[var(--color-ink-soft)] opacity-50 cursor-default">{t('companyGithub')}</span></li>
              {/* 位置 B：Footer 常驻捐赠入口（共享 DonateLink 组件） */}
              <li><DonateLink variant="footer" /></li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="flex flex-wrap items-center gap-4 pt-7 border-t border-[var(--color-rule)] text-[13px] text-[var(--color-ink-soft)]">
          <span>{t('copyright')}</span>
          <span
            className="font-mono text-[12px] px-3 py-1 border border-[var(--color-rule)] rounded-full"
          >
            {t('engineBadge')}
          </span>
          <span
            className="inline-flex items-center gap-2 font-mono text-[12px] border border-[var(--color-rule)] rounded-full px-4 py-1.5 md:ml-auto"
          >
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="3" y="11" width="18" height="11" rx="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            {t('privacyBadge')}
          </span>
        </div>
      </div>
    </footer>
  );
}