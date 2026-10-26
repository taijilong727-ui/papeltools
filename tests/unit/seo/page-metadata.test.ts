import { describe, expect, it } from 'vitest';
import { pageMetadata, webSiteJsonLd } from '@/lib/seo';

describe('pageMetadata — 首页 canonical 与 hreflang', () => {
  it('英文首页 canonical、en hreflang 和 x-default 都指向根路径', () => {
    const metadata = pageMetadata('en', '', 'Title', 'Description');

    expect(metadata.alternates?.canonical).toBe('https://papeltools.com/');
    expect(metadata.alternates?.languages).toMatchObject({
      en: 'https://papeltools.com/',
      'es-419': 'https://papeltools.com/es/',
      'pt-br': 'https://papeltools.com/pt/',
      'x-default': 'https://papeltools.com/',
    });
  });

  it('西语首页 canonical 指向 /es/', () => {
    const metadata = pageMetadata('es', '', 'Título', 'Descripción');

    expect(metadata.alternates?.canonical).toBe('https://papeltools.com/es/');
    expect(metadata.alternates?.languages).toMatchObject({
      en: 'https://papeltools.com/',
      'es-419': 'https://papeltools.com/es/',
      'x-default': 'https://papeltools.com/',
    });
  });

  it('英文子页面仍保留 /en/ 前缀', () => {
    const metadata = pageMetadata('en', '/pdf-to-markdown-for-llm', 'Title', 'Description');

    expect(metadata.alternates?.canonical).toBe(
      'https://papeltools.com/en/pdf-to-markdown-for-llm/'
    );
  });

  it('WebSite JSON-LD 不声明不存在的 SearchAction', () => {
    const schema = webSiteJsonLd('en');

    expect(schema).not.toHaveProperty('potentialAction');
  });
});
