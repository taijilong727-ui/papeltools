'use client';

import { useTranslations } from 'next-intl';

/**
 * DonateLink — 捐赠入口（位置 A：ResultPanel 提示 + 位置 B：Footer 常驻入口共用）
 *
 * 隐私红线（PRD §FR-50 + 审查文档 §8.1）：
 * - ✅ 纯文本 <a href>，无 widget/iframe/嵌入式脚本 → 转换页零新增网络请求
 * - ✅ target="_blank" + rel="noopener noreferrer" 必须
 * - ❌ 禁止 Ko-fi / Buy Me a Coffee 嵌入式按钮（第三方脚本会破坏零上传承诺）
 */

interface DonateLinkProps {
  /** 'prompt' = 转换结果下低调提示；'footer' = Footer 链接形式 */
  variant?: 'prompt' | 'footer';
}

export function DonateLink({ variant = 'prompt' }: DonateLinkProps) {
  const t = useTranslations('donate');

  // 不同 variant 用不同文案
  const label =
    variant === 'prompt'
      ? `${t('resultPrompt')} ${t('resultCta')}`
      : t('footerLabel');

  // 样式：prompt 更小、更柔；footer 略大、与 footer 链接一致
  const className =
    variant === 'prompt'
      ? 'text-[12.5px] text-[var(--color-ink-soft)] hover:text-[var(--color-ink)] transition-colors'
      : 'text-[14.5px] text-[var(--color-ink-soft)] hover:text-[var(--color-ink)] transition-colors';

  return (
    <a
      href={t('urlKoFi')}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
    >
      {label}
    </a>
  );
}
