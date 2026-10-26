import { getTranslations, setRequestLocale } from 'next-intl/server';
import { pageMetadata } from '@/lib/seo';
import { HomePageContent } from '@/components/pages/HomePageContent';

/** 根路径直接渲染英文首页，不再重定向到 /en/。 */
export async function generateMetadata() {
  setRequestLocale('en');
  const t = await getTranslations({ locale: 'en', namespace: 'meta' });
  return pageMetadata('en', '', t('title'), t('description'));
}

export default async function EnglishHomePage() {
  setRequestLocale('en');
  return <HomePageContent locale="en" />;
}
