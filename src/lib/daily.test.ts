import { describe, expect, it } from 'vitest';
import type { PatternId } from '../data/patterns';
import { BUILTIN_PROBLEMS, type Problem } from '../data/problems';
import { buildCatalog, problemsInList } from './catalog';
import { pickNewProblems, strugglingPatterns } from './daily';

// NeetCode 150，照路線圖順序（陣列 → 雙指標 → 滑動視窗 …）
const catalog = buildCatalog([]);
const list = problemsInList(catalog, 'neetcode150');
const inPattern = (pattern: PatternId) => list.filter((p) => p.pattern === pattern);
const ids = (picks: { problem: Problem }[]) => picks.map((p) => p.problem.id);

describe('picking new problems', () => {
  it('in roadmap order, takes the next unstarted problems of the list', () => {
    const done = new Set(inPattern('arrays').slice(0, 2).map((p) => p.id));
    const picks = pickNewProblems({ list, started: (id) => done.has(id), count: 3, mode: 'roadmap' });
    expect(ids(picks)).toEqual(inPattern('arrays').slice(2, 5).map((p) => p.id));
    expect(picks.every((p) => p.reason === 'next')).toBe(true);
  });

  it('mixes in one problem from another pattern, preferring one already learned and least recently practiced', () => {
    // 陣列學到一半，雙指標和滑動視窗都碰過一題；滑動視窗比較久沒練
    const done = new Set([
      ...inPattern('arrays').slice(0, 3).map((p) => p.id),
      inPattern('two-pointers')[0].id,
      inPattern('sliding-window')[0].id,
    ]);
    const lastPracticed = new Map<PatternId, string>([
      ['two-pointers', '2026-10-14'],
      ['sliding-window', '2026-10-01'],
    ]);
    const picks = pickNewProblems({ list, started: (id) => done.has(id), count: 3, mode: 'mixed', lastPracticed });
    expect(picks.map((p) => p.reason)).toEqual(['next', 'next', 'mix']);
    expect(picks.slice(0, 2).every((p) => p.problem.pattern === 'arrays')).toBe(true);
    expect(picks[2].problem).toBe(inPattern('sliding-window')[1]);
  });

  it('on day one, previews the next pattern instead', () => {
    const picks = pickNewProblems({ list, started: () => false, count: 3, mode: 'mixed' });
    expect(picks.map((p) => p.problem.pattern)).toEqual(['arrays', 'arrays', 'two-pointers']);
  });

  it('adds an easier problem from a pattern you keep getting stuck on', () => {
    const done = new Set([...inPattern('arrays').map((p) => p.id), ...inPattern('two-pointers').slice(0, 2).map((p) => p.id)]);
    const binary = inPattern('binary-search');
    const picks = pickNewProblems({
      list,
      started: (id) => done.has(id) || id === binary[0].id,
      count: 3,
      mode: 'mixed',
      struggling: ['binary-search'],
    });
    expect(picks.map((p) => p.reason)).toEqual(['next', 'reinforce', 'mix']);
    const reinforce = picks[1].problem;
    expect(reinforce.pattern).toBe('binary-search');
    // 這個模式裡最簡單、還沒做過的
    const easiest = Math.min(...binary.slice(1).map((p) => ['Easy', 'Medium', 'Hard'].indexOf(p.difficulty)));
    expect(['Easy', 'Medium', 'Hard'].indexOf(reinforce.difficulty)).toBe(easiest);
    // 穿插的不會跟鞏固的同一個模式
    expect(picks[2].problem.pattern).not.toBe('binary-search');
  });

  it('keeps one problem a day on the roadmap, and never repeats a problem', () => {
    const one = pickNewProblems({ list, started: () => false, count: 1, mode: 'mixed', struggling: ['trees'] });
    expect(one.map((p) => p.reason)).toEqual(['next']);
    const many = pickNewProblems({ list, started: () => false, count: 10, mode: 'mixed', struggling: ['trees'] });
    expect(new Set(ids(many)).size).toBe(10);
  });

  it('focuses on one pattern, then falls back to the roadmap when it is done', () => {
    const graphs = inPattern('graphs');
    const picks = pickNewProblems({ list, started: () => false, count: 3, mode: 'focus', focus: 'graphs' });
    expect(ids(picks)).toEqual(graphs.slice(0, 3).map((p) => p.id));
    expect(picks.every((p) => p.reason === 'focus')).toBe(true);

    const allButOne = new Set(graphs.slice(0, -1).map((p) => p.id));
    const last = pickNewProblems({ list, started: (id) => allButOne.has(id), count: 3, mode: 'focus', focus: 'graphs' });
    expect(last.map((p) => p.reason)).toEqual(['focus', 'next', 'next']);
    expect(last[1].problem.pattern).toBe('arrays');
  });
});

describe('struggling patterns', () => {
  const problemOf = (id: number) => BUILTIN_PROBLEMS.find((p) => p.id === id);
  const twoSum = 1; // arrays
  const search = 704; // binary-search
  const validParens = 20; // stack

  it('counts solutions read, still stuck, and stuck reasons in the window, worst first', () => {
    const attempts = [
      { problemId: search, day: '2026-10-10', rating: 'solution' },
      { problemId: search, day: '2026-10-12', rating: 'hint', stuck: ['edge'] },
      { problemId: search, day: '2026-10-13', rating: 'fail' },
      { problemId: validParens, day: '2026-10-11', rating: 'solution' },
      { problemId: validParens, day: '2026-10-14', rating: 'fail' },
      // 只卡一次不算
      { problemId: twoSum, day: '2026-10-14', rating: 'solution' },
      // 太久以前、或今天的（今天的清單已經排好了）不算
      { problemId: twoSum, day: '2026-08-01', rating: 'fail' },
      { problemId: twoSum, day: '2026-10-15', rating: 'fail' },
      // 自己解出來不算
      { problemId: twoSum, day: '2026-10-13', rating: 'solo' },
    ];
    expect(strugglingPatterns(attempts, problemOf, '2026-09-15', '2026-10-15')).toEqual(['binary-search', 'stack']);
  });
});
