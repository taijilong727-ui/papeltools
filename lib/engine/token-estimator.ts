/**
 * Token 估算 — PRD §4.1 FR-08
 *
 * 启发式：
 *   - 英文 ~ 4 字符/token
 *   - 中文 ~ 1.5 字/token
 *
 * 简单实现：统计 CJK 字符比例，按对应权重计算。
 * 精度足够 MVP（无需调用 tiktoken 这类重型库）。
 */

const CJK_RANGE = /[\u4e00-\u9fff\u3400-\u4dbf\u3040-\u30ff\uac00-\ud7af]/;

export function estimateTokens(text: string): number {
  if (!text) return 0;
  let cjkCount = 0;
  let otherCount = 0;
  for (const ch of text) {
    if (CJK_RANGE.test(ch)) cjkCount += 1;
    else otherCount += 1;
  }
  // 中文 1.5 字/token，英文 4 字符/token
  const cjkTokens = cjkCount / 1.5;
  const otherTokens = otherCount / 4;
  return Math.ceil(cjkTokens + otherTokens);
}

export function countWords(text: string): number {
  if (!text) return 0;
  // 中日韩字符按 1 词；其他按空格分词
  let count = 0;
  let inWord = false;
  for (const ch of text) {
    if (CJK_RANGE.test(ch)) {
      count += 1;
      inWord = false;
    } else if (/\s/.test(ch)) {
      inWord = false;
    } else {
      if (!inWord) {
        count += 1;
        inWord = true;
      }
    }
  }
  return count;
}

/** 数字格式化（如 1234 → "1,234"，1234.5 → "1.2K"） */
export function formatNumber(n: number): string {
  if (n < 1000) return n.toString();
  if (n < 1_000_000) return `${(n / 1000).toFixed(1)}K`;
  return `${(n / 1_000_000).toFixed(2)}M`;
}