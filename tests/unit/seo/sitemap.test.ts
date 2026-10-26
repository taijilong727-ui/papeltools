import { describe, expect, it } from 'vitest';
import sitemap from '@/app/sitemap';

function dateOnly(value: string | Date | undefined): string | undefined {
  if (!value) return undefined;
  return new Date(value).toISOString().slice(0, 10);
}

describe('sitemap 路由与 lastmod', () => {
  const entries = sitemap();
  const byUrl = new Map(entries.map((entry) => [entry.url, entry]));

  it('只包含 38 个可收录 HTML 页面', () => {
    expect(entries).toHaveLength(38);
    expect(byUrl.has('https://papeltools.com/llms.txt')).toBe(false);
  });

  it('为本次修改的页面使用独立 lastmod，未修改页面保持旧日期', () => {
    expect(dateOnly(byUrl.get('https://papeltools.com/')?.lastModified)).toBe('2026-10-26');
    expect(
      dateOnly(byUrl.get('https://papeltools.com/en/pdf-to-markdown-for-llm/')?.lastModified)
    ).toBe('2026-10-26');
    expect(
      dateOnly(byUrl.get('https://papeltools.com/en/pdf-ocr-to-markdown/')?.lastModified)
    ).toBe('2026-08-11');
    expect(dateOnly(byUrl.get('https://papeltools.com/en/privacy/')?.lastModified)).toBe(
      '2026-08-11'
    );
  });
});
