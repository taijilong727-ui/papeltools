import 'server-only';
import { getRequestConfig } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { isValidLocale, type Locale } from './config';
import { getDictionary } from './dictionaries';

/**
 * next-intl 服务端请求配置
 *
 * 静态导出模式下仍保留此文件供 next-intl 插件识别。
 * 实际数据通过 `getDictionary` 加载（dictionaries 已标 'server-only'，互引安全）。
 *
 * 注意：标注了 'server-only'，禁止在客户端组件中直接 import。
 */
export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  if (!requested || !isValidLocale(requested)) {
    notFound();
  }
  const locale = requested as Locale;
  const messages = await getDictionary(locale);
  return {
    locale,
    messages,
    timeZone: 'UTC',
    now: new Date(),
  };
});