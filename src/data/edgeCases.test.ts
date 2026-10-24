import { describe, expect, it } from 'vitest';
import { EDGE_CASES, edgeCaseList } from './edgeCases';
import { EDGE_CASES_EN } from './edgeCases.en';
import { BUILTIN_PROBLEMS } from './problems';

describe('edge cases', () => {
  it('has edge cases in both languages for every built-in problem, and nothing extra', () => {
    const ids = BUILTIN_PROBLEMS.map((p) => p.id).sort((a, b) => a - b);
    expect(Object.keys(EDGE_CASES).map(Number).sort((a, b) => a - b)).toEqual(ids);
    expect(Object.keys(EDGE_CASES_EN).map(Number).sort((a, b) => a - b)).toEqual(ids);
  });

  it('keeps the English ones free of Chinese, and every item non-empty', () => {
    for (const p of BUILTIN_PROBLEMS) {
      expect(/[一-鿿]/.test(EDGE_CASES_EN[p.id]), `${p.id}`).toBe(false);
      for (const locale of ['en', 'zh-TW'] as const) {
        const items = edgeCaseList(p.id, locale);
        expect(items.length, `${p.id} ${locale}`).toBeGreaterThan(0);
        expect(items.length, `${p.id} ${locale}`).toBeLessThanOrEqual(4);
        for (const item of items) expect(item.length, `${p.id} ${locale}: ${item}`).toBeGreaterThan(1);
      }
    }
  });

  it('splits the text into a list without the trailing period', () => {
    expect(edgeCaseList(217, 'en')).toEqual([
      'Empty or single-element array (no duplicates)',
      'duplicates far apart',
      'negative and very large values',
    ]);
    expect(edgeCaseList(206, 'zh-TW')).toEqual(['空串列', '只有一個節點']);
    expect(edgeCaseList(999999)).toEqual([]);
  });
});
