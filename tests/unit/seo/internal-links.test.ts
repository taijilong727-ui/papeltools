import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

type MessageFile = {
  landing: Record<string, Record<string, string>>;
};

const sources = ['llm', 'obsidian', 'rag', 'noUpload', 'mcpSeo', 'ocr', 'tables', 'gratis'];

function loadMessages(locale: 'en' | 'es' | 'pt'): MessageFile {
  const file = path.resolve(__dirname, `../../../messages/${locale}.json`);
  return JSON.parse(readFileSync(file, 'utf-8')) as MessageFile;
}

function inboundCount(messages: MessageFile, target: string): number {
  return sources.filter((source) => {
    const namespace = messages.landing[source];
    if (!namespace) return false;

    return [1, 2, 3].some((index) => namespace[`relatedLink${index}Href`] === target);
  }).length;
}

describe('落地页正文内链覆盖', () => {
  const targetsByLocale = {
    en: ['/pdf-ocr-to-markdown', '/pdf-to-markdown-with-tables'],
    es: ['/pdf-a-markdown-gratis', '/pdf-ocr-to-markdown', '/pdf-to-markdown-with-tables'],
    pt: ['/converter-pdf-em-markdown-gratis', '/pdf-ocr-to-markdown', '/pdf-to-markdown-with-tables'],
  } as const;

  for (const locale of ['en', 'es', 'pt'] as const) {
    it(`${locale} 的核心长尾页至少有两个正文入链`, () => {
      const messages = loadMessages(locale);

      for (const target of targetsByLocale[locale]) {
        expect(inboundCount(messages, target), `${locale} ${target} 入链不足`).toBeGreaterThanOrEqual(2);
      }
    });
  }
});
