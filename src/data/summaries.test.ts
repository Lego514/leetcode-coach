import { describe, expect, it } from 'vitest';
import { BUILTIN_PROBLEMS } from './problems';
import { SUMMARIES, summaryFor } from './summaries';
import { SUMMARIES_EN } from './summaries.en';

// 摘要只說題目要做什麼；出現這些字等於直接告訴你用哪個模式（題目名稱本來就有的除外，例如 Min Stack）
const GIVEAWAYS_EN = [
  /sliding window/i,
  /two pointers?/i,
  /binary search(?! tree)/i,
  /\bheap\b/i,
  /priority queue/i,
  /hash (map|set|table)/i,
  /dynamic programming/i,
  /\bdp\b/i,
  /\bbfs\b/i,
  /\bdfs\b/i,
  /backtrack/i,
  /greedy/i,
  /\btrie\b/i,
  /union.find/i,
  /\bstacks?\b/i,
  /monotonic/i,
  /prefix sum/i,
  /topological/i,
  /dijkstra/i,
  /\bxor\b/i,
];
const GIVEAWAYS_ZH = [/滑動視窗/, /雙指標/, /二分搜尋/, /堆積/, /雜湊/, /動態規劃/, /回溯/, /貪心/, /字典樹/, /並查集/, /單調/, /前綴和/, /拓樸/, /XOR/];

describe('problem summaries', () => {
  it('has a summary in both languages for every built-in problem, and nothing extra', () => {
    const ids = BUILTIN_PROBLEMS.map((p) => p.id).sort((a, b) => a - b);
    expect(Object.keys(SUMMARIES).map(Number).sort((a, b) => a - b)).toEqual(ids);
    expect(Object.keys(SUMMARIES_EN).map(Number).sort((a, b) => a - b)).toEqual(ids);
  });

  it('keeps them short, and the English ones free of Chinese', () => {
    for (const p of BUILTIN_PROBLEMS) {
      expect(SUMMARIES_EN[p.id].length, `${p.id}`).toBeLessThanOrEqual(120);
      expect(SUMMARIES[p.id].length, `${p.id}`).toBeLessThanOrEqual(70);
      expect(/[一-鿿]/.test(SUMMARIES_EN[p.id]), `${p.id}`).toBe(false);
    }
  });

  it('describes the task without naming the technique, unless the title already does', () => {
    for (const p of BUILTIN_PROBLEMS) {
      for (const word of GIVEAWAYS_EN) {
        if (word.test(p.title)) continue;
        expect(word.test(SUMMARIES_EN[p.id]), `${p.id} ${p.title}: ${word}`).toBe(false);
      }
      for (const word of GIVEAWAYS_ZH) expect(word.test(SUMMARIES[p.id]), `${p.id} ${p.title}: ${word}`).toBe(false);
    }
  });

  it('picks the summary for the interface language', () => {
    expect(summaryFor(1, 'en')).toBe(SUMMARIES_EN[1]);
    expect(summaryFor(1, 'zh-TW')).toBe(SUMMARIES[1]);
    expect(summaryFor(999999)).toBeUndefined();
  });
});
