import { setRequestLocale } from 'next-intl/server';
import { LocaleDocument } from '@/components/i18n/LocaleDocument';

/**
 * 根路径英文布局
 *
 * route group 不改变 URL。它让 `/` 成为真实英文页面，
 * 同时与 /es、/pt 的 [locale] 分支复用同一个文档外壳。
 */
export default async function EnglishHomeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  setRequestLocale('en');
  return <LocaleDocument locale="en">{children}</LocaleDocument>;
}
