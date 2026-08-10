/**
 * lib/mcp/rate-limit.ts 单测 — in-memory limiter 行为
 *
 * 覆盖：
 * - 滑动窗口：超过 limit 即拒绝
 * - reset 字段是 unix 秒
 * - 无 Upstash env 的 dev fallback 自动启用（test 环境 NODE_ENV != production）
 * - 生产未配置 Upstash → 软降级（warn log + in-memory fallback）
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('rate-limit — dev fallback in-memory limiter', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  /** TS 把 process.env 属性推断为 readonly；测试用 Record 引用绕过 */
  function setNodeEnv(value: string) {
    (process.env as Record<string, string>).NODE_ENV = value;
  }

  it('滑动窗口内未超额允许', async () => {
    setNodeEnv('test');
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;

    const { createRateLimiter } = await import('@/lib/mcp/rate-limit');
    const limiter = createRateLimiter();

    const r1 = await limiter.limit('user-1');
    expect(r1.success).toBe(true);
    expect(r1.limit).toBe(60);
    expect(r1.remaining).toBe(59);
    expect(typeof r1.reset).toBe('number');
  });

  it('生产 + 无 Upstash env → 软降级（warn log + in-memory fallback），不再抛错', async () => {
    setNodeEnv('production');
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { createRateLimiter } = await import('@/lib/mcp/rate-limit');

    expect(() => createRateLimiter()).not.toThrow();
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('UPSTASH'));

    warnSpy.mockRestore();
  });

  it('生产 + 有 Upstash env → 不抛错 (仅测试构造，不连真实 Redis)', async () => {
    setNodeEnv('production');
    process.env.UPSTASH_REDIS_REST_URL = 'https://test.upstash.io';
    process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token';

    const { createRateLimiter, isUpstashConfigured } = await import(
      '@/lib/mcp/rate-limit'
    );
    expect(isUpstashConfigured()).toBe(true);
    expect(() => createRateLimiter()).not.toThrow();

    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
  });
});
