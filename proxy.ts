import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { locales } from '@/lib/i18n/config';

/**
 * i18n 代理（Next.js 16 替代 middleware.ts）
 *
 * 根路径 / 直接返回英文首页；/en/ 是历史别名，永久 308 回根路径。
 * /es/, /pt/ 及其子页面保持不变。
 *
 * 该规则在代码层完成，不需要 Vercel Dashboard 或 vercel.json 额外配置。
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 英文首页只保留根路径一个 canonical 入口
  if (pathname === '/en' || pathname === '/en/') {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    return NextResponse.redirect(url, 308);
  }

  // 其他 locale 页面正常进入 Next.js 路由
  const pathnameHasLocale = locales.some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  );
  if (pathnameHasLocale) return NextResponse.next();

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next|api|favicon|robots|og-image|.*\\..*).*)'],
};
