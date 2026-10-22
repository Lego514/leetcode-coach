import { describe, expect, it } from 'vitest';
import { FREEZE_EVERY, streakState } from '../../shared/streak';
import type { Problem } from '../data/problems';
import { addDays } from './dates';
import { conquests, isReady, nextMilestone, paceOf, patternLevels, progressBefore, readiness, weekSummary, winsFor } from './motivation';
import { schedule, type Rating } from './srs';

const run = (start: string, n: number) => Array.from({ length: n }, (_, i) => addDays(start, i));

describe('streakState', () => {
  it('earns a shield every week in a row and uses it on a missed day', () => {
    const week = run('2026-10-01', FREEZE_EVERY);
    expect(streakState(week, '2026-10-07')).toMatchObject({ streak: 7, freezes: 1, untilFreeze: 7, practicedToday: true, frozen: [] });
    // 10/8 沒練，10/9 回來：保護用掉，連續天數不斷（沒練的那天不算進天數）
    expect(streakState([...week, '2026-10-09'], '2026-10-09')).toMatchObject({ streak: 8, freezes: 0, frozen: ['2026-10-08'] });
  });

  it('breaks without a shield, and does not count today until you practice', () => {
    expect(streakState(run('2026-10-01', 3), '2026-10-05')).toMatchObject({ streak: 0, freezes: 0, untilFreeze: 7 });
    expect(streakState(run('2026-10-01', 3), '2026-10-04')).toMatchObject({ streak: 3, practicedToday: false, untilFreeze: 4 });
  });

  it('keeps at most two shields, and each covers one missed day', () => {
    const days = run('2026-09-01', 21);
    const full = streakState(days, '2026-09-21');
    expect(full).toMatchObject({ streak: 21, freezes: 2, untilFreeze: 0 });
    // 連續漏兩天用掉兩次，第三天就斷了
    expect(streakState([...days, '2026-09-24'], '2026-09-24')).toMatchObject({ streak: 22, frozen: ['2026-09-22', '2026-09-23'] });
    expect(streakState([...days, '2026-09-25'], '2026-09-25')).toMatchObject({ streak: 1, freezes: 0 });
  });
});

const problem = (id: number, pattern: Problem['pattern'], difficulty: Problem['difficulty'] = 'Medium'): Problem => ({
  id,
  slug: `p-${id}`,
  title: `Problem ${id}`,
  difficulty,
  pattern,
  premium: false,
  custom: false,
});

/** 照順序做幾次之後的排程 */
function stateAfter(steps: [Rating, string][]) {
  let state: ReturnType<typeof schedule> | undefined;
  for (const [rating, day] of steps) state = schedule(state, rating, day);
  return { ...state!, lastRating: steps[steps.length - 1][0] };
}

describe('readiness', () => {
  const today = '2026-10-21';
  it('counts a problem only when solved alone last time and still remembered', () => {
    expect(isReady(undefined, today)).toBe(false);
    expect(isReady(stateAfter([['hint', '2026-10-20']]), today)).toBe(false);
    expect(isReady(stateAfter([['solo', '2026-10-20']]), today)).toBe(true);
    // 很久以前自己解出，現在大概忘了
    expect(isReady(stateAfter([['solo', '2026-06-01']]), today)).toBe(false);
  });

  it('splits by difficulty', () => {
    const problems = [problem(1, 'arrays', 'Easy'), problem(2, 'arrays'), problem(3, 'two-pointers')];
    const progress = new Map([
      [1, stateAfter([['solo', '2026-10-20']])],
      [2, stateAfter([['hint', '2026-10-20']])],
    ]);
    expect(readiness(problems, progress, today)).toEqual({
      ready: 1,
      total: 3,
      byDifficulty: [
        { difficulty: 'Easy', ready: 1, total: 1 },
        { difficulty: 'Medium', ready: 0, total: 2 },
        { difficulty: 'Hard', ready: 0, total: 0 },
      ],
    });
  });
});

describe('patternLevels and wins', () => {
  const today = '2026-10-21';
  const list = [problem(1, 'binary-search'), problem(2, 'binary-search'), problem(3, 'binary-search'), problem(4, 'stack')];

  it('levels a pattern up as more of its problems are solvable now', () => {
    const levels = (progress: Map<number, ReturnType<typeof stateAfter>>) =>
      patternLevels(list, progress, today).map((p) => `${p.pattern}:${p.level}`);
    expect(levels(new Map())).toEqual(['stack:0', 'binary-search:0']);
    expect(levels(new Map([[1, stateAfter([['hint', '2026-10-20']])]]))).toEqual(['stack:0', 'binary-search:1']);
    // 3 題裡 2 題現在會（四成以上）
    const two = new Map([
      [1, stateAfter([['solo', '2026-10-20']])],
      [2, stateAfter([['solo', '2026-10-20']])],
    ]);
    expect(levels(two)).toEqual(['stack:0', 'binary-search:2']);
    // 精通要八成，而且隔一週以上複習過
    const settled = stateAfter([
      ['solo', '2026-09-01'],
      ['solo', '2026-09-05'],
      ['solo', '2026-09-20'],
      ['solo', '2026-10-20'],
    ]);
    expect(levels(new Map([1, 2, 3].map((id) => [id, settled])))).toEqual(['stack:0', 'binary-search:3']);
  });

  it('celebrates conquering a problem and reaching a new level', () => {
    const before = new Map([
      [1, stateAfter([['solo', '2026-10-20']])],
      [2, stateAfter([['hint', '2026-10-19']])],
    ]);
    const after = new Map(before).set(2, stateAfter([['hint', '2026-10-19'], ['solo', today]]));
    expect(winsFor(list[1], list, before, after, today)).toEqual([
      { kind: 'conquered', problem: list[1], lastRating: 'hint' },
      { kind: 'levelUp', pattern: 'binary-search', level: 2 },
    ]);
    // 第一次就自己解出不算征服；只到「練習中」不慶祝
    expect(winsFor(list[3], list, new Map(), new Map([[4, stateAfter([['hint', today]])]]), today)).toEqual([]);
  });
});

describe('weekly recap', () => {
  const attempt = (problemId: number, day: string, rating: Rating, extra: { mode?: string; minutes?: number } = {}) => ({
    problemId,
    day,
    at: `${day}T10:00:00.000Z`,
    rating,
    mode: 'practice',
    ...extra,
  });
  const attempts = [
    attempt(1, '2026-10-06', 'hint', { minutes: 30 }),
    attempt(2, '2026-10-07', 'solo', { minutes: 20 }),
    attempt(1, '2026-10-13', 'solo', { mode: 'review', minutes: 15 }),
    attempt(3, '2026-10-14', 'solo', { mode: 'import' }),
  ];

  it('finds problems solved alone after needing help', () => {
    expect(conquests(attempts)).toEqual([{ problemId: 1, day: '2026-10-13' }]);
  });

  it('sums a week, counting flashcard days as practice and leaving out bulk-marked problems', () => {
    expect(weekSummary(attempts, ['2026-10-08'], '2026-10-06')).toEqual({
      days: 3,
      sessions: 2,
      newProblems: 2,
      conquered: 0,
      solo: 1,
      minutes: 50,
    });
    expect(weekSummary(attempts, [], '2026-10-13')).toMatchObject({ days: 1, sessions: 1, newProblems: 0, conquered: 1, solo: 1 });
  });

  it('rebuilds the schedule as of an earlier day', () => {
    const before = progressBefore(attempts, '2026-10-13', 0.9);
    expect([...before.keys()]).toEqual([1, 2]);
    expect(before.get(1)?.lastRating).toBe('hint');
  });
});

describe('next milestone', () => {
  const today = '2026-10-21';
  const list = [problem(1, 'stack'), problem(2, 'stack'), problem(3, 'stack'), problem(4, 'stack'), problem(5, 'stack'), problem(6, 'binary-search')];

  it('points at the started pattern closest to “Got it”, counting sprouts you can rewrite', () => {
    const progress = new Map([
      [1, stateAfter([['solo', '2026-10-20']])],
      [2, stateAfter([['hint', '2026-10-20']])],
    ]);
    // 5 題要 2 題現在會，還差 1 題；有 1 題小芽
    expect(nextMilestone(list, progress, today)).toEqual({ kind: 'pattern', pattern: 'stack', needed: 1, level: 2, sprouts: 1 });
  });

  it('falls back to the next 5% of readiness', () => {
    expect(nextMilestone(list, new Map(), today)).toEqual({ kind: 'readiness', needed: 1, percent: 5 });
    const all = new Map(list.map((p) => [p.id, stateAfter([['solo', '2026-10-20']])]));
    expect(nextMilestone(list, all, today)).toBeNull();
  });
});

describe('pace', () => {
  const at = (day: string, rating: Rating, minutes?: number) => ({ problemId: 1, day, at: `${day}T10:00:00.000Z`, rating, mode: 'practice', minutes });

  it('compares the latest try with the first one and the best solo time before it', () => {
    expect(paceOf([at('2026-10-01', 'hint', 42), at('2026-10-05', 'solo', 25), at('2026-10-20', 'solo', 18)])).toEqual({
      first: 42,
      previousBest: 25,
      now: 18,
    });
    expect(paceOf([at('2026-10-01', 'hint')])).toEqual({ first: undefined, previousBest: undefined, now: undefined });
  });
});
