/**
 * E2E SEO 基础设施验收 — 对应 [[Sitemap-Robots-Llms三件套审查与GSC提交指南-2026-08-11]] §11.2 健康检查方法论
 *
 * 覆盖（T-SI-XX）：
 * - T-SI-01 robots.txt：HTTP 200 + 含源站 `User-Agent: *` + `Sitemap: https://papeltools.com/sitemap.xml` + 关键 AI 爬虫规则
 * - T-SI-02 sitemap.xml：HTTP 200 + application/xml + 至少 30 条 <loc>
 * - T-SI-03 llms.txt：HTTP 200 + text/plain + 含 "# Papel Tools" + 含 "@modelcontextprotocol/sdk" 版本号
 * - T-SI-04 根路径：英文首页直接 200，/en/ 永久 308 回根路径
 *
 * 设计：使用 Playwright 的 request fixture（不发完整 browser，跳过 JS 执行，纯 HTTP）。
 * baseURL = http://localhost:3000（dev server），跑在 webServer 配置中。
 *
 * 注意：Cloudflare Prepend 行为（生产在源站段前注入 Managed Robots + Content Signal）
 * 是部署层行为，本地 dev server 跑在裸 Next.js 上不会有注入。
 * 因此本测试断言的是**源站段**——确保源站代码不会因重构意外丢失关键规则。
 * 生产层 Cloudflare 行为由 [[冷启动执行SOP-2026-08-11]] §三步骤 2 的手动实测保障。
 */
import { test, expect } from '@playwright/test';

test.describe('T-SI SEO 基础设施验收（本地 dev server）', () => {
  test('T-SI-01 /robots.txt 服务源站规则 + Sitemap 声明', async ({ request }) => {
    const response = await request.get('/robots.txt');
    expect(response.status(), 'robots.txt 必须 200').toBe(200);

    const ct = response.headers()['content-type'] ?? '';
    expect(ct, `Content-Type 应含 text/plain，实际: ${ct}`).toContain('text/plain');

    const body = await response.text();

    // 源站默认规则
    expect(body, '默认 User-Agent: *').toContain('User-Agent: *');
    expect(body, '默认 Allow: /').toContain('Allow: /');
    expect(body, '隔离 /api/').toContain('Disallow: /api/');
    expect(body, '隔离 /_next/').toContain('Disallow: /_next/');

    // AI 检索爬虫放行（GEO 四件套 + 传统搜索引擎）
    expect(body, '放行 OAI-SearchBot').toContain('OAI-SearchBot');
    expect(body, '放行 ChatGPT-User').toContain('ChatGPT-User');
    expect(body, '放行 PerplexityBot').toContain('PerplexityBot');
    expect(body, '放行 Claude-SearchBot').toContain('Claude-SearchBot');
    expect(body, '放行 Claude-User').toContain('Claude-User');
    expect(body, '放行 Googlebot').toContain('Googlebot');
    expect(body, '放行 Bingbot').toContain('Bingbot');

    // AI 训练爬虫屏蔽（隐私立场）
    expect(body, '屏蔽 GPTBot').toContain('GPTBot');
    expect(body, '屏蔽 CCBot').toContain('CCBot');
    expect(body, '屏蔽 ClaudeBot').toContain('ClaudeBot');

    // Sitemap 声明（必须对齐 apex canonical，2026-09-08 v1.2 切回 apex 永久锁定）
    expect(body, 'Sitemap 声明对齐 apex canonical').toContain(
      'Sitemap: https://papeltools.com/sitemap.xml'
    );

    // 不应混入旧 www 域名（防止 v1.1 的双 sitemap 污染）
    expect(body, '不应含 www Sitemap URL').not.toContain(
      'Sitemap: https://www.papeltools.com/sitemap.xml'
    );

    // 不应混入 Yandex 时代的 host: 字段（v1.0 已删除）
    expect(body, '不应含 host: 字段').not.toMatch(/^Host:/im);
  });

  test('T-SI-02 /sitemap.xml 服务标准 XML + 至少 30 URL', async ({ request }) => {
    const response = await request.get('/sitemap.xml');
    expect(response.status(), 'sitemap.xml 必须 200').toBe(200);

    const ct = response.headers()['content-type'] ?? '';
    expect(ct, `Content-Type 应含 xml，实际: ${ct}`).toMatch(/xml/);

    const body = await response.text();

    // 至少 30 条 <loc>（项目实际 39：36 三语 + 2 单语 + 1 llms.txt root）
    const locCount = (body.match(/<loc>/g) ?? []).length;
    expect(locCount, `sitemap 应至少 30 条 URL，实际 ${locCount}`).toBeGreaterThanOrEqual(30);

    // x-default hreflang 已落地（2026-08-11 commit 7dcc2a3）
    expect(body, '含 x-default hreflang').toContain('x-default');

    // 首页必须是根路径，sitemap 不应再提交会跳转的 /en/
    expect(body, '含英文根首页').toContain('<loc>https://papeltools.com/</loc>');
    expect(body, '不应含 /en/ 首页').not.toContain('<loc>https://papeltools.com/en/</loc>');
  });

  test('T-SI-03 /llms.txt 服务机器可读 Markdown 站点概要', async ({ request }) => {
    const response = await request.get('/llms.txt');
    expect(response.status(), 'llms.txt 必须 200').toBe(200);

    const ct = response.headers()['content-type'] ?? '';
    expect(ct, `Content-Type 应含 text/plain，实际: ${ct}`).toContain('text/plain');

    const body = await response.text();

    // H1 主标题（按 llmstxt.org 规范）
    expect(body, '含 H1 主标题').toContain('# Papel Tools');

    // MCP SDK 版本号（2026-08-11 commit bdeccf1 已修：0.2.0 → 1.29.0）
    expect(body, '含 MCP SDK 版本号 1.29.0').toContain('@modelcontextprotocol/sdk 1.29.0');
    expect(body, '不应残留错误版本号 0.2.0').not.toContain('@modelcontextprotocol/sdk 0.2.0');

    // 包含三语落地页（EN/ES/PT 各 4 个 scenario page）
    expect(body, '含英文场景页').toContain('/en/pdf-to-markdown-for-llm/');
    expect(body, '含西语场景页').toContain('/es/pdf-to-markdown-for-llm/');
    expect(body, '含葡语场景页').toContain('/pt/pdf-to-markdown-for-llm/');

    // 含 Privacy 段（品牌主张）
    expect(body, '含 Privacy 段').toMatch(/^## Privacy/im);
  });

  test('T-SI-04 根路径直接渲染英文首页，/en/ 永久 308 回根路径', async ({ request }) => {
    const root = await request.get('/');
    expect(root.status(), '根路径必须直接 200').toBe(200);
    expect(root.headers()['content-type'] ?? '').toContain('text/html');

    const rootHtml = await root.text();
    expect(rootHtml, '根路径必须是英文文档').toContain('<html lang="en"');
    expect(rootHtml, '根路径 canonical 指向自身').toMatch(
      /<link[^>]+rel="canonical"[^>]+href="https:\/\/papeltools\.com\/"/
    );

    const englishAlias = await request.get('/en/', { maxRedirects: 0 });
    expect(englishAlias.status(), '/en/ 必须永久重定向').toBe(308);
    const location = englishAlias.headers()['location'];
    expect(location, '/en/ 必须提供 Location').toBeTruthy();
    expect(new URL(location ?? '/', 'http://localhost:3000').pathname).toBe('/');

    const spanish = await request.get('/es/');
    expect(spanish.status(), '/es/ 必须保持 200').toBe(200);
    expect(await spanish.text(), '/es/ canonical 必须自指').toMatch(
      /<link[^>]+rel="canonical"[^>]+href="https:\/\/papeltools\.com\/es\/"/
    );
  });

  test('T-SI-05 从 /es/ 首页切换到 EN 时进入根路径', async ({ page }) => {
    await page.goto('/es/');
    await page.getByRole('button', { name: 'Switch language to EN' }).click();
    await page.waitForURL('/');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page).toHaveURL('/');
  });
});
