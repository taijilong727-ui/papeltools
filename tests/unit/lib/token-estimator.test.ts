/**
 * Token 估算单元测试 — 对应测试策略 T-01-08
 *
 * 启发式（PRD §4.1 FR-08）：
 * - 英文 ~4 字符/token
 * - 中文 ~1.5 字/token
 */
import { describe, it, expect } from 'vitest';
import { estimateTokens, countWords, formatNumber } from '@/lib/engine/token-estimator';

describe('estimateTokens — token 估算', () => {
  it('空字符串 → 0', () => {
    expect(estimateTokens('')).toBe(0);
  });

  it('纯英文：4 字符/token，向上取整', () => {
    // "hello world" = 11 字符（含空格）→ 11/4 = 2.75 → 3
    expect(estimateTokens('hello world')).toBe(3);
    // "abcd" = 4 → 1
    expect(estimateTokens('abcd')).toBe(1);
  });

  it('纯中文：1.5 字/token，向上取整', () => {
    // "你好世界" = 4 字 → 4/1.5 = 2.67 → 3
    expect(estimateTokens('你好世界')).toBe(3);
  });

  it('中英混合：按比例加权', () => {
    // 英文 "abc"（3 字符 → 0.75）+ 中文 "你好"（2 字 → 1.33）≈ 2.08 → 3
    expect(estimateTokens('abc你好')).toBe(3);
  });

  it('标点/数字按英文权重计算', () => {
    // "1234567890" = 10 字符 → 2.5 → 3
    expect(estimateTokens('1234567890')).toBe(3);
  });
});

describe('countWords — 字数统计', () => {
  it('空字符串 → 0', () => {
    expect(countWords('')).toBe(0);
  });

  it('英文按空格分词', () => {
    expect(countWords('hello world')).toBe(2);
    expect(countWords('a b c d')).toBe(4);
  });

  it('中文逐字计词', () => {
    expect(countWords('你好世界')).toBe(4);
  });

  it('连续空格不重复计数', () => {
    expect(countWords('a   b')).toBe(2);
  });
});

describe('formatNumber — 数字格式化', () => {
  it('小于 1000 原样返回', () => {
    expect(formatNumber(0)).toBe('0');
    expect(formatNumber(999)).toBe('999');
  });

  it('千级 → 1 位小数 K', () => {
    expect(formatNumber(1234)).toBe('1.2K');
    expect(formatNumber(1000)).toBe('1.0K');
  });

  it('百万级 → 2 位小数 M', () => {
    expect(formatNumber(1_234_567)).toBe('1.23M');
  });
});
