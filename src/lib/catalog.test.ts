import { describe, expect, it } from 'vitest';
import { LIST_IDS, PATTERN_IDS } from '../../shared/constants';
import { STUDY_LISTS } from '../data/lists';
import { PATTERN_ORDER } from '../data/patterns';
import { BUILTIN_PROBLEMS } from '../data/problems';
import { buildCatalog, nextNewProblems, problemsInList } from './catalog';

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
