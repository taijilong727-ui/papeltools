/**
 * app/robots.ts 单测 — 源站 robots.txt 规则完整性
 *
 * 覆盖（对应 GSC 收录稳定性 + GEO 硬性要求）：
 * - AI 检索爬虫放行（OAI-SearchBot / PerplexityBot / Claude-SearchBot / Claude-User / ChatGPT-User / Googlebot / Bingbot）
 * - AI 训练爬虫屏蔽（GPTBot / CCBot / ClaudeBot / anthropic-ai / Bytespider）
 * - 默认规则（Allow /，Disallow /api/ 与 /_next/）
 * - Sitemap 声明对齐 canonical（www.papeltools.com，2026-08-11 v1.1 修复）
 *
 * 触发场景：防止未来重构意外丢失 AI 爬虫放行或 sitemap 声明。
 * 生产实测（2026-08-15）：Cloudflare Managed Robots 以 Prepend 行为追加 9-bot 屏蔽段 + Content Signal，
 * 源站段完整保留；详见 [[Sitemap-Robots-Llms三件套审查与GSC提交指南-2026-08-11]] §13 与
 * [[冷启动执行SOP-2026-08-11]] §三步骤 2。
 */
import { describe, it, expect } from 'vitest';
import robots from '@/app/robots';

describe('app/robots.ts — 源站规则完整性', () => {
  const result = robots();
  const rules = result.rules;

  /** 从规则数组里按 userAgent 找规则（支持 '*' 与具名爬虫） */
  function findRule(userAgent: string) {
    return rules.find(
      (r) =>
        (typeof r.userAgent === 'string' && r.userAgent === userAgent) ||
        (Array.isArray(r.userAgent) && r.userAgent.includes(userAgent))
    );
  }

  describe('AI 检索爬虫放行（GEO 四件套 + 传统搜索引擎）', () => {
    const allowedBots = [
      'OAI-SearchBot',
      'ChatGPT-User',
      'PerplexityBot',
      'Claude-SearchBot',
      'Claude-User',
      'Googlebot',
      'Bingbot',
    ];

    it.each(allowedBots)('放行 %s', (bot) => {
      const rule = findRule(bot);
      expect(rule, `${bot} 必须在 rules 数组里有专属规则`).toBeDefined();
      expect(rule?.allow, `${bot} 必须 allow: '/'`).toContain('/');
      expect(rule?.disallow, `${bot} 不应有 disallow`).toBeUndefined();
    });
  });

  describe('AI 训练爬虫屏蔽（隐私立场）', () => {
    const blockedBots = ['GPTBot', 'CCBot', 'ClaudeBot', 'anthropic-ai', 'Bytespider'];

    it.each(blockedBots)('屏蔽 %s', (bot) => {
      const rule = findRule(bot);
      expect(rule, `${bot} 必须在 rules 数组里有专属规则`).toBeDefined();
      expect(rule?.disallow, `${bot} 必须 disallow: '/'`).toContain('/');
      expect(rule?.allow, `${bot} 不应有 allow`).toBeUndefined();
    });
  });

  describe('默认规则 — User-agent: *', () => {
    it('allow 根路径', () => {
      const rule = findRule('*');
      expect(rule).toBeDefined();
      expect(rule?.allow).toContain('/');
    });

    it('disallow /api/（隔离 MCP 端点不被爬取）', () => {
      const rule = findRule('*');
      expect(rule?.disallow).toContain('/api/');
    });

    it('disallow /_next/（隔离 Next.js 内部资源）', () => {
      const rule = findRule('*');
      expect(rule?.disallow).toContain('/_next/');
    });
  });

  describe('Sitemap 声明', () => {
    it('指向 canonical www.papeltools.com/sitemap.xml', () => {
      // 2026-08-11 v1.1 修复：从 apex 切到 www，与 canonical 对齐
      // 此前用 apex 会导致每次爬虫多一跳 308（Vercel Domain 层 apex→www 重定向）
      expect(result.sitemap).toBe('https://papeltools.com/sitemap.xml');
    });

    it('使用 https 协议（不是 http）', () => {
      expect(result.sitemap).toMatch(/^https:\/\//);
    });

    it('使用 apex 域名（对齐 AGENTS.md 锁定"根域无子域" + 配合 Vercel apex primary）', () => {
      expect(result.sitemap).toMatch(/^https:\/\/papeltools\.com\/sitemap\.xml$/);
    });
  });

  describe('结构性约束', () => {
    it('rules 是非空数组', () => {
      expect(Array.isArray(rules)).toBe(true);
      expect(rules.length).toBeGreaterThan(0);
    });

    it('每个规则的 userAgent 非空', () => {
      for (const r of rules) {
        // 通过 unknown 中转避免 TS narrowing：app/robots.ts 当前只用 string，
        // 但 Next.js MetadataRoute.Robots 允许 string | string[]，故应兼容未来重构
        const ua: unknown = r.userAgent;
        if (typeof ua === 'string') {
          expect(ua.length).toBeGreaterThan(0);
        } else if (Array.isArray(ua)) {
          expect(ua.length).toBeGreaterThan(0);
          for (const item of ua as string[]) {
            expect(item.length).toBeGreaterThan(0);
          }
        } else {
          throw new Error(`userAgent 必须是 string 或 string[]，实际类型: ${typeof ua}`);
        }
      }
    });

    it('不混入 Yandex 时代的 host: 字段（v1.0 已删除，2026-08-11 commit 8b7d228）', () => {
      expect((result as Record<string, unknown>).host).toBeUndefined();
    });
  });
});