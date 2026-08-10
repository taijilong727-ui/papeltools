'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

/**
 * ContactForm — 客户端表单组件
 *
 * 行为：submit 时根据当前填写内容在用户端生成 mailto: 草稿，
 * 触发 `window.location.href` 启动系统邮件客户端。
 * 整个流程不向 Papel Tools 或第三方发送请求：
 * - 静态站无后端，承诺不增加新的网络调用
 * - 失败兜底：若 mailto: 客户端被拦截/未安装，仍可保留输入并提示
 *
 * 未来若要接入真实后端（Formspree / Resend / 自建 API），
 *       只需替换 buildMailto 与 openDraft 调用即可，表单结构保持不变。
 */

const SUBJECT_VALUE_TO_LABEL: Record<string, string> = {
  general: 'contact.subjectGeneral',
  correction: 'contact.subjectCorrection',
  feedback: 'contact.subjectFeedback',
  partnership: 'contact.subjectPartnership',
  other: 'contact.subjectOther',
};

type Status = 'idle' | 'opening' | 'opened' | 'error';

export function ContactForm() {
  const t = useTranslations('contact');
  const [status, setStatus] = useState<Status>('idle');

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const name = String(data.get('name') ?? '').trim();
    const senderEmail = String(data.get('email') ?? '').trim();
    const subjectValue = String(data.get('subject') ?? 'general');
    const message = String(data.get('message') ?? '').trim();
    const toAddress = String(t('emailAddress') ?? '').trim();

    const subjectLabelKey = SUBJECT_VALUE_TO_LABEL[subjectValue] ?? 'contact.subjectGeneral';
    const subjectLabel = String(t.raw(subjectLabelKey) ?? t('subjectGeneral'));
    const subjectText = `[Papel Tools] ${subjectLabel}`;

    const bodyLines = [
      `${t('nameLabel')}: ${name}`,
      `${t('emailLabel')}: ${senderEmail}`,
      '',
      message,
    ];
    const body = bodyLines.join('\n');

    const mailtoUrl = buildMailtoUrl(toAddress, subjectText, body);
    if (!mailtoUrl) {
      setStatus('error');
      return;
    }

    setStatus('opening');
    // 启动系统邮件客户端：浏览器或 OS 接管，触发后 status 立即归位
    // 以允许用户调整或重试
    const opened = openDraft(mailtoUrl);
    setStatus(opened ? 'opened' : 'error');
    // 不自动清空输入，避免邮件客户端未能打开时丢失内容
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate={false}>
      <div>
        <label
          htmlFor="contact-name"
          className="block text-[13.5px] font-medium mb-1.5"
          style={{ color: 'var(--color-ink)' }}
        >
          {t('nameLabel')}
        </label>
        <input
          type="text"
          id="contact-name"
          name="name"
          required
          className="w-full px-4 py-2.5 text-[14.5px] rounded-[var(--radius-sm)] border border-[var(--color-rule)] focus:border-[var(--color-accent)] focus:outline-none transition-colors"
          style={{ background: 'var(--color-paper)', color: 'var(--color-ink)' }}
          placeholder={t('namePlaceholder')}
        />
      </div>

      <div>
        <label
          htmlFor="contact-email"
          className="block text-[13.5px] font-medium mb-1.5"
          style={{ color: 'var(--color-ink)' }}
        >
          {t('emailLabel')}
        </label>
        <input
          type="email"
          id="contact-email"
          name="email"
          required
          className="w-full px-4 py-2.5 text-[14.5px] rounded-[var(--radius-sm)] border border-[var(--color-rule)] focus:border-[var(--color-accent)] focus:outline-none transition-colors"
          style={{ background: 'var(--color-paper)', color: 'var(--color-ink)' }}
          placeholder={t('emailPlaceholder')}
        />
      </div>

      <div>
        <label
          htmlFor="contact-subject"
          className="block text-[13.5px] font-medium mb-1.5"
          style={{ color: 'var(--color-ink)' }}
        >
          {t('subjectLabel')}
        </label>
        <select
          id="contact-subject"
          name="subject"
          required
          defaultValue="general"
          className="w-full px-4 py-2.5 text-[14.5px] rounded-[var(--radius-sm)] border border-[var(--color-rule)] focus:border-[var(--color-accent)] focus:outline-none transition-colors"
          style={{ background: 'var(--color-paper)', color: 'var(--color-ink)' }}
        >
          <option value="general">{t('subjectGeneral')}</option>
          <option value="correction">{t('subjectCorrection')}</option>
          <option value="feedback">{t('subjectFeedback')}</option>
          <option value="partnership">{t('subjectPartnership')}</option>
          <option value="other">{t('subjectOther')}</option>
        </select>
      </div>

      <div>
        <label
          htmlFor="contact-message"
          className="block text-[13.5px] font-medium mb-1.5"
          style={{ color: 'var(--color-ink)' }}
        >
          {t('messageLabel')}
        </label>
        <textarea
          id="contact-message"
          name="message"
          rows={5}
          required
          className="w-full px-4 py-2.5 text-[14.5px] rounded-[var(--radius-sm)] border border-[var(--color-rule)] focus:border-[var(--color-accent)] focus:outline-none transition-colors resize-y"
          style={{ background: 'var(--color-paper)', color: 'var(--color-ink)' }}
          placeholder={t('messagePlaceholder')}
        />
      </div>

      <button
        type="submit"
        disabled={status === 'opening'}
        className="px-6 py-3 text-[14.5px] font-medium rounded-[var(--radius-sm)] transition-opacity disabled:opacity-50 disabled:cursor-not-allowed mt-1"
        style={{ background: 'var(--color-accent)', color: 'var(--color-accent-soft)' }}
      >
        {status === 'opening' ? '...' : t('sendButton')}
      </button>

      {(status === 'opened' || status === 'error') && (
        <p
          className="text-[13.5px] text-center mt-1"
          style={{ color: 'var(--color-accent)' }}
          role="status"
        >
          {t('thanks')}
        </p>
      )}
    </form>
  );
}

/**
 * 根据本地化文案生成 mailto: URL。导出供测试用。
 * RFC 6068 mailto: 形如 `mailto:user@example.com?subject=...&body=...`，
 * 主题与正文都需用 encodeURIComponent 转义。
 */
export function buildMailtoUrl(
  to: string,
  subject: string,
  body: string
): string | null {
  const safeTo = to.trim();
  if (!safeTo) return null;
  const params = new URLSearchParams();
  if (subject) params.set('subject', subject);
  if (body) params.set('body', body);
  const query = params.toString();
  return `mailto:${encodeURIComponent(safeTo)}${query ? `?${query}` : ''}`;
}

/**
 * 触发系统邮件客户端；返回是否成功派发到处理器。
 * `window.location.href = mailto:` 在无 handler 时仍会静默失败，
 * 此处无法区分，因此保守地认为已“派发”。
 */
function openDraft(mailtoUrl: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    window.location.href = mailtoUrl;
    return true;
  } catch {
    return false;
  }
}
