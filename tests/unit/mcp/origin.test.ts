/**
 * lib/mcp/origin.ts 单测 — Origin 校验 + 客户端 IP 提取
 *
 * 覆盖：
 * - 生产 + 白名单 → allow
 * - 生产 + Origin 不在白名单 → reject
 * - 生产 + 未配置白名单 → reject（非空 Origin 全部拒绝）
 * - 非生产 → 一律 allow
 * - getClientIp 优先级
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { NextRequest } from 'next/server';

function makeNextRequest(headers: Record<string, string>): NextRequest {
  return {
    headers: {
      get: (name: string) => headers[name.toLowerCase()] ?? null,
    },
  } as unknown as NextRequest;
}

describe('isOriginAllowed — Origin 校验', () => {
  const originalEnv = { ...process.env };

  /** TS 把 process.env 属性推断为 readonly；测试中通过 env 对象引用绕过 */
  function setNodeEnv(value: string) {
    (process.env as Record<string, string>).NODE_ENV = value;
  }

  beforeEach(() => {
    // 默认 test 环境
    setNodeEnv('test');
    delete process.env.ALLOWED_ORIGINS;
  });

  afterEach(() => {
    setNodeEnv(originalEnv.NODE_ENV ?? 'test');
    delete process.env.ALLOWED_ORIGINS;
  });

  it('dev 模式：无 Origin → allow', async () => {
    const { isOriginAllowed } = await import('@/lib/mcp/origin');
    expect(isOriginAllowed(null)).toBe(true);
  });

  it('dev 模式：任意 Origin → allow', async () => {
    const { isOriginAllowed } = await import('@/lib/mcp/origin');
    expect(isOriginAllowed('https://anywhere.example')).toBe(true);
  });

  it('生产 + 白名单命中 → allow', async () => {
    setNodeEnv('production');
    process.env.ALLOWED_ORIGINS = 'https://app.example.com,https://admin.example.com';

    const { isOriginAllowed } = await import('@/lib/mcp/origin');
    expect(isOriginAllowed('https://app.example.com')).toBe(true);
    expect(isOriginAllowed('https://admin.example.com')).toBe(true);
  });

  it('生产 + 白名单未命中 → reject', async () => {
    setNodeEnv('production');
    process.env.ALLOWED_ORIGINS = 'https://allowed.example.com';

    const { isOriginAllowed } = await import('@/lib/mcp/origin');
    expect(isOriginAllowed('https://evil.example.com')).toBe(false);
  });

  it('生产 + 未配置白名单 + 非空 Origin → reject (fail-closed)', async () => {
    setNodeEnv('production');
    delete process.env.ALLOWED_ORIGINS;

    const { isOriginAllowed } = await import('@/lib/mcp/origin');
    expect(isOriginAllowed('https://anywhere.example')).toBe(false);
  });

  it('生产 + 无 Origin → allow (CLI / 同源 Agent)', async () => {
    setNodeEnv('production');
    delete process.env.ALLOWED_ORIGINS;

    const { isOriginAllowed } = await import('@/lib/mcp/origin');
    expect(isOriginAllowed(null)).toBe(true);
  });
});

describe('getClientIp — 客户端 IP 提取优先级', () => {
  it('x-forwarded-for 第一段优先', async () => {
    const { getClientIp } = await import('@/lib/mcp/origin');
    const req = makeNextRequest({
      'x-forwarded-for': '1.2.3.4, 10.0.0.1',
    });
    expect(getClientIp(req)).toBe('1.2.3.4');
  });

  it('缺失 x-forwarded-for → x-real-ip', async () => {
    const { getClientIp } = await import('@/lib/mcp/origin');
    const req = makeNextRequest({ 'x-real-ip': '5.6.7.8' });
    expect(getClientIp(req)).toBe('5.6.7.8');
  });

  it('都缺失 → cf-connecting-ip', async () => {
    const { getClientIp } = await import('@/lib/mcp/origin');
    const req = makeNextRequest({ 'cf-connecting-ip': '9.10.11.12' });
    expect(getClientIp(req)).toBe('9.10.11.12');
  });

  it('全缺失 → anonymous', async () => {
    const { getClientIp } = await import('@/lib/mcp/origin');
    expect(getClientIp(makeNextRequest({}))).toBe('anonymous');
  });
});
