import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { locales, defaultLocale, isValidLocale } from '@/lib/i18n/config';

/**
 * i18n 代理（Next.js 16 替代 middleware.ts）：根路径 / 自动协商到合适 locale
 *
 * 优先级（PRD §FR-43）：
 *   1. URL 路径 /es/, /pt/ → 直接使用
 *   2. Cookie NEXT_LOCALE（用户手动切换过）→ 用此值
 *   3. Accept-Language 头 → 自动检测
 *   4. 默认 → en
 *
 * Next.js 16 hybrid 模式下 proxy 在生产边缘也会执行（不再仅限 static export），
 * 因此 / 永远重定向到 /<locale>/（包括默认 en），避免用户落到不存在的 / 路由。
 * vercel.json 删除了之前的 / → /en/ 永久重定向以避免冲突。
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 已包含 locale 前缀 → 跳过
  const pathnameHasLocale = locales.some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  );
  if (pathnameHasLocale) return NextResponse.next();

  // 仅处理根路径
  if (pathname !== '/') return NextResponse.next();

  // 协商 locale
  const cookieLocale = request.cookies.get('NEXT_LOCALE')?.value;
  let target = defaultLocale;

  if (cookieLocale && isValidLocale(cookieLocale)) {
    target = cookieLocale;
  } else {
    const acceptLanguage = request.headers.get('accept-language') ?? '';
    if (acceptLanguage.toLowerCase().includes('pt')) target = 'pt';
    else if (acceptLanguage.toLowerCase().includes('es')) target = 'es';
  }

  // 总是重定向到 /<locale>/（含默认 en）—— Next.js 16 没有 / 路由（只有 [locale]/）
  const url = request.nextUrl.clone();
  url.pathname = `/${target}/`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ['/((?!_next|api|favicon|robots|og-image|.*\\..*).*)'],
};