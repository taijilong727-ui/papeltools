'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { locales, localeLabels, type Locale } from '@/lib/i18n/config';

/**
 * Header — 纸感极简风格（参考 design/首页-多风格预览.html §HEADER）
 *
 * 结构：brand + nav + 语言切换器 + CTA
 * 行为：sticky top、滚动磨砂背景（玻璃感但保持纸感）
 */
interface HeaderProps {
  locale: Locale;
}

export function Header({ locale }: HeaderProps) {
  const t = useTranslations('nav');
  const tHeader = useTranslations('header');
  const tHero = useTranslations('hero');
  const pathname = usePathname();
  const router = useRouter();

  // 当前路径去掉 locale 前缀（用于构造切换后的 URL）
  const pathWithoutLocale = pathname.replace(/^\/(en|es|pt)/, '') || '/';

  // 切换语言：保留当前路径，仅替换前缀
  const handleLangSwitch = (target: Locale) => {
    if (target === locale) return;
    // 写入 cookie，供中间件/proxy 使用
    // - path=/：全站可读
    // - max-age=31536000：一年，与隐私页 §4 声明一致
    // - SameSite=Lax：防 CSRF
    // - Secure：仅 HTTPS 下发送（dev/本地 HTTP 自动跳过）
    const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
    const secureFlag = isHttps ? '; Secure' : '';
    // React Compiler immutability 规则无法理解 document.cookie 的 DOM 写入语义，
    // 但这是事件处理器内的合法浏览器 API 调用（非渲染期状态修改）→ 定向豁免
    // eslint-disable-next-line react-hooks/immutability
    document.cookie = `NEXT_LOCALE=${target}; path=/; max-age=31536000; SameSite=Lax${secureFlag}`;
    // 计算目标路径 — 始终带 locale 前缀，避免 Next.js 路由 404
    // （旧版"target === 'en' ? pathWithoutLocale : ..."导致切到 EN 时跳到根路径如 /pdf-to-markdown-for-llm/，
    //  触发 Next.js 404 因为 [locale] 动态段是路由必需）
    const isLocaleHome =
      pathname === '/' ||
      pathname === `/${locale}` ||
      pathname === `/${locale}/`;
    const targetPath =
      target === 'en' && isLocaleHome
        ? '/'
        : `/${target}${pathWithoutLocale === '/' ? '/' : pathWithoutLocale}`;
    router.push(targetPath);
  };

  const isHome = pathname === `/${locale}` || pathname === `/${locale}/` || pathname === '/';

  return (
    <header className="sticky top-0 z-50 backdrop-blur-md bg-[color-mix(in_srgb,var(--color-paper)_82%,transparent)] border-b border-[var(--color-rule)]">
      <div className="max-w-[1180px] mx-auto px-6 h-[68px] flex items-center gap-7">
        {/* Brand */}
        <Link
          href={`/${locale === 'en' ? '' : `${locale}/`}`}
          className="flex items-center gap-3 font-display font-bold text-[19px] tracking-tight hover:opacity-80 transition-opacity"
        >
          <span
            className="w-[30px] h-[30px] flex-shrink-0 grid place-items-center rounded-[var(--radius-sm)]"
            style={{ background: 'var(--color-accent)', color: 'var(--color-accent-soft)' }}
            aria-hidden="true"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <path d="M14 2v6h6" />
              <path d="M9 13h6M9 17h6" />
            </svg>
          </span>
          <span>
            Papel&nbsp;Tools
          </span>
        </Link>

        {/* Nav — 仅首页内跳转用 anchor；隐藏于小屏 */}
        <nav className="hidden md:flex gap-6 ml-auto" aria-label={t('navLabel')}>
          {isHome && (
            <>
              <a href="#converter" className="text-[14.5px] text-[var(--color-ink-soft)] hover:text-[var(--color-ink)] transition-colors">
                {t('converter')}
              </a>
              <a href="#features" className="text-[14.5px] text-[var(--color-ink-soft)] hover:text-[var(--color-ink)] transition-colors">
                {t('features')}
              </a>
              <a href="#compare" className="text-[14.5px] text-[var(--color-ink-soft)] hover:text-[var(--color-ink)] transition-colors">
                {t('compare')}
              </a>
              <a href="#scenarios" className="text-[14.5px] text-[var(--color-ink-soft)] hover:text-[var(--color-ink)] transition-colors">
                {t('scenarios')}
              </a>
              <a href="#faq" className="text-[14.5px] text-[var(--color-ink-soft)] hover:text-[var(--color-ink)] transition-colors">
                {t('faq')}
              </a>
              <a href="#mcp" className="text-[14.5px] text-[var(--color-ink-soft)] hover:text-[var(--color-ink)] transition-colors">
                {t('mcp')}
              </a>
            </>
          )}
        </nav>

        {/* Language Switcher */}
        <div
          className="flex items-center gap-1 p-1 border border-[var(--color-rule)] rounded-full"
          role="group"
          aria-label={tHeader('languageSwitcher')}
        >
          {locales.map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => handleLangSwitch(l)}
              className={`px-2.5 py-1 rounded-full font-mono text-[11.5px] tracking-[0.05em] transition-colors ${
                l === locale
                  ? 'text-[var(--color-accent-soft)]'
                  : 'text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]'
              }`}
              style={
                l === locale
                  ? { background: 'var(--color-accent)' }
                  : undefined
              }
              aria-pressed={l === locale}
              aria-label={`Switch language to ${localeLabels[l]}`}
            >
              {localeLabels[l]}
            </button>
          ))}
        </div>

        {/* CTA */}
        <a
          href={isHome ? '#converter' : `/${locale === 'en' ? '' : `${locale}/`}`}
          className="hidden sm:inline-flex items-center gap-2 px-5 py-3 rounded-[var(--radius-md)] font-display text-[16px] hover:-translate-y-0.5 transition-transform"
          style={{
            background: 'var(--color-accent)',
            color: 'var(--color-accent-soft)',
          }}
        >
          {tHeader('cta')}
        </a>
      </div>
    </header>
  );
}
