import { describe, expect, it } from 'vitest';
import { LIST_IDS, PATTERN_IDS } from '../../shared/constants';
import { STUDY_LISTS } from '../data/lists';
import { PATTERN_ORDER } from '../data/patterns';
import { BUILTIN_PROBLEMS } from '../data/problems';
import { buildCatalog, inNewOrder, lookupProblem, newOrderOf, nextNewProblems, parseProblemList, problemsInList, skipPremium } from './catalog';

describe('built-in data', () => {
  it('has unique ids and slugs', () => {
    expect(new Set(BUILTIN_PROBLEMS.map((p) => p.id)).size).toBe(BUILTIN_PROBLEMS.length);
    expect(new Set(BUILTIN_PROBLEMS.map((p) => p.slug)).size).toBe(BUILTIN_PROBLEMS.length);
  });

  it('has lists of the advertised size that only reference known problems', () => {
    const ids = new Set(BUILTIN_PROBLEMS.map((p) => p.id));
    const sizes = Object.fromEntries(STUDY_LISTS.map((l) => [l.id, l.problemIds.length]));
    expect(sizes).toEqual({ neetcode150: 150, blind75: 75, grind169: 169 });
    expect(STUDY_LISTS.map((l) => l.id)).toEqual([...LIST_IDS]);
    for (const list of STUDY_LISTS) {
      expect(new Set(list.problemIds).size).toBe(list.problemIds.length);
      expect(list.problemIds.filter((id) => !ids.has(id))).toEqual([]);
    }
  });

  it('puts every built-in problem in at least one list', () => {
    const listed = new Set(STUDY_LISTS.flatMap((l) => l.problemIds));
    expect(BUILTIN_PROBLEMS.filter((p) => !listed.has(p.id)).map((p) => p.id)).toEqual([]);
  });

  it('keeps pattern cards in the shared id order', () => {
    expect(PATTERN_ORDER).toEqual([...PATTERN_IDS]);
  });

  it('uses only known patterns', () => {
    const known = new Set(PATTERN_ORDER);
    expect(BUILTIN_PROBLEMS.every((p) => known.has(p.pattern))).toBe(true);
  });
});

describe('catalog', () => {
  const custom = {
    id: 9999,
    slug: 'my-problem',
    title: 'My Problem',
    difficulty: 'Easy' as const,
    pattern: 'arrays' as const,
    premium: false,
    custom: true,
  };

  it('filters by list and keeps roadmap order', () => {
    const catalog = buildCatalog([custom]);
    const blind = problemsInList(catalog, 'blind75');
    expect(blind).toHaveLength(75);
    expect(blind[0].pattern).toBe('arrays');
    expect(blind.at(-1)!.pattern).toBe('bits');
    expect(problemsInList(catalog, 'custom')).toEqual([custom]);
    expect(problemsInList(catalog, 'all')).toHaveLength(BUILTIN_PROBLEMS.length + 1);
  });

  it('orders new problems by pattern or in Grind’s suggested order', () => {
    const catalog = buildCatalog([custom]);
    const grindIds = STUDY_LISTS.find((l) => l.id === 'grind169')!.problemIds;
    const grind = inNewOrder(problemsInList(catalog, 'grind169'), 'grind');
    // Grind 網站的前幾題：Two Sum、Valid Parentheses、Merge Two Sorted Lists、Best Time to Buy and Sell Stock
    expect(grind.slice(0, 4).map((p) => p.id)).toEqual([1, 20, 21, 121]);
    expect(grind.map((p) => p.id)).toEqual(grindIds);
    // 照模式就是原本的路線圖
    const byPattern = inNewOrder(problemsInList(catalog, 'grind169'), 'pattern');
    expect(byPattern).toEqual(problemsInList(catalog, 'grind169'));
    expect(byPattern[0].pattern).toBe('arrays');
  });

  it('puts problems outside Grind 169 last, still in roadmap order, in Grind’s suggested order', () => {
    const catalog = buildCatalog([custom]);
    const neet = problemsInList(catalog, 'neetcode150');
    const grindFirst = inNewOrder(neet, 'grind');
    expect(grindFirst).toHaveLength(neet.length);
    expect(grindFirst.slice(0, 3).map((p) => p.id)).toEqual([1, 20, 21]);
    const inGrind = new Set(STUDY_LISTS.find((l) => l.id === 'grind169')!.problemIds);
    const firstOutside = grindFirst.findIndex((p) => !inGrind.has(p.id));
    const tail = grindFirst.slice(firstOutside);
    expect(tail.every((p) => !inGrind.has(p.id))).toBe(true);
    expect(tail).toEqual(neet.filter((p) => !inGrind.has(p.id)));
    expect(nextNewProblems(grindFirst, (id) => id === 1, 2).map((p) => p.id)).toEqual([20, 21]);
  });

  it('defaults to Grind’s suggested order for Grind 169 and by pattern for the other lists', () => {
    expect(newOrderOf({ activeList: 'grind169' })).toBe('grind');
    expect(newOrderOf({ activeList: 'neetcode150' })).toBe('pattern');
    expect(newOrderOf({ activeList: 'grind169', newOrder: 'pattern' })).toBe('pattern');
    expect(newOrderOf({ activeList: 'blind75', newOrder: 'grind' })).toBe('grind');
  });

  it('ignores custom problems that collide with built-in ids', () => {
    const catalog = buildCatalog([{ ...custom, id: 1 }]);
    expect(catalog.byId.get(1)!.custom).toBe(false);
  });

  it('suggests the next unstarted problems', () => {
    const list = problemsInList(buildCatalog([]), 'neetcode150');
    const started = new Set([list[0].id, list[2].id]);
    const next = nextNewProblems(list, (id) => started.has(id), 2);
    expect(next.map((p) => p.id)).toEqual([list[1].id, list[3].id]);
    expect(nextNewProblems(list, () => false, 0)).toEqual([]);
  });
});

describe('lookupProblem', () => {
  const custom = {
    id: 3000,
    slug: 'my-problem',
    title: 'My Problem',
    difficulty: 'Easy' as const,
    pattern: 'arrays' as const,
    premium: false,
    custom: true,
  };
  const catalog = buildCatalog([custom]);

  it('finds problems by number, "number. title", URL, title, or slug', () => {
    expect(lookupProblem(catalog, '1')).toMatchObject({ kind: 'found', problem: { title: 'Two Sum' } });
    expect(lookupProblem(catalog, '#15')).toMatchObject({ kind: 'found', problem: { title: '3Sum' } });
    expect(lookupProblem(catalog, '1. Two Sum')).toMatchObject({ kind: 'found', problem: { id: 1 } });
    expect(lookupProblem(catalog, 'https://leetcode.com/problems/two-sum/description/')).toMatchObject({
      kind: 'found',
      problem: { id: 1 },
    });
    expect(lookupProblem(catalog, '  two sum ')).toMatchObject({ kind: 'found', problem: { id: 1 } });
    expect(lookupProblem(catalog, 'my-problem')).toMatchObject({ kind: 'found', problem: { id: 3000 } });
  });

  it('keeps what it can for problems that are not in the catalog', () => {
    expect(lookupProblem(catalog, '2999')).toEqual({ kind: 'missing', id: 2999 });
    expect(lookupProblem(catalog, 'https://leetcode.cn/problems/Some-New-Problem/')).toEqual({
      kind: 'missing',
      url: 'https://leetcode.com/problems/some-new-problem/',
    });
    expect(lookupProblem(catalog, 'something else')).toEqual({ kind: 'unknown' });
    expect(lookupProblem(catalog, '  ')).toEqual({ kind: 'empty' });
  });
});

describe('parseProblemList', () => {
  const catalog = buildCatalog([]);

  it('reads numbers, links, and titles separated by commas, new lines, or spaces between numbers', () => {
    const { found, unknown } = parseProblemList(catalog, '1, 15 146\nhttps://leetcode.com/problems/number-of-islands/\nLRU Cache\uff1b#1\nnot a problem');
    expect(found.map((p) => p.id)).toEqual([1, 15, 146, 200]);
    expect(unknown).toEqual(['not a problem']);
  });

  it('ignores empty input', () => {
    expect(parseProblemList(catalog, ' ,\n ')).toEqual({ found: [], unknown: [] });
  });
});

describe('skipping Premium problems', () => {
  const list = problemsInList(buildCatalog([]), 'neetcode150');
  const premium = list.filter((p) => p.premium);

  it('drops Premium problems you have not done, but keeps the ones you have', () => {
    expect(premium.length).toBeGreaterThan(0);
    expect(skipPremium(list, false, () => false)).toBe(list);
    const skipped = skipPremium(list, true, () => false);
    expect(skipped.some((p) => p.premium)).toBe(false);
    expect(skipped).toHaveLength(list.length - premium.length);
    // 做過的 Premium 題照樣留著複習
    const done = premium[0].id;
    expect(skipPremium(list, true, (id) => id === done).map((p) => p.id)).toContain(done);
  });
});
