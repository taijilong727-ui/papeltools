import 'server-only';
import { type Locale } from './config';
import type enDict from '@/messages/en.json';
import type esDict from '@/messages/es.json';
import type ptDict from '@/messages/pt.json';

/**
 * 字典类型：所有语言共用同一结构（来自 en.json）
 */
export type Dictionary = typeof enDict;

/**
 * 服务端按 locale 加载字典
 *
 * 注意：标注 'server-only' 后，客户端组件应通过 NextIntlClientProvider 拿到 messages。
 * （审查文档 4.2：getLocaleOrThrow 是死代码，已删除）
 */
const dictionaries: Record<Locale, () => Promise<Dictionary>> = {
  en: () => import('@/messages/en.json').then((m) => m.default),
  es: () => import('@/messages/es.json').then((m) => m.default),
  pt: () => import('@/messages/pt.json').then((m) => m.default),
};

export async function getDictionary(locale: Locale): Promise<Dictionary> {
  const loader = dictionaries[locale];
  return loader();
}