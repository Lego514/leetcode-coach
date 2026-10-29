import { describe, expect, it } from 'vitest';
import { BUILTIN_PROBLEMS } from '../data/problems';
import {
  capDue,
  reviewsDoneOn,
  dueProblems,
  finishDay,
  longestStreak,
  monthBlocks,
  needsRewrite,
  reviewForecast,
  newProblemsStartedOn,
  planToTarget,
  practiceAttempts,
  practiceStreak,
  streakDays,
  summarizePatterns,
  weeklyCounts,
} from './stats';

describe('practiceStreak', () => {
  it('counts back from today, or from yesterday if today is empty', () => {
    expect(practiceStreak(['2026-09-14', '2026-09-15', '2026-09-16'], '2026-09-16')).toBe(3);
    expect(practiceStreak(['2026-09-14', '2026-09-15'], '2026-09-16')).toBe(2);
    expect(practiceStreak(['2026-09-13'], '2026-09-16')).toBe(0);
  });

  it('counts days with only flashcards', () => {
    const practiced = [{ day: '2026-09-14' }, { day: '2026-09-16' }];
    const cards = [{ day: '2026-09-15' }, { day: '2026-09-16' }];
    expect(practiceStreak(streakDays(practiced, cards), '2026-09-16')).toBe(3);
    // 沒有卡片那天：9/14 練習存了一次保護，9/15 用掉，連續天數不斷（9/15 不算進天數）
    expect(practiceStreak(streakDays(practiced, []), '2026-09-16')).toBe(2);
  });

  it('counts days with only behavioral practice', () => {
    expect(practiceStreak(streakDays([{ day: '2026-09-16' }], [], [{ day: '2026-09-15' }]), '2026-09-16')).toBe(2);
  });
});

describe('longestStreak', () => {
  it('finds the longest run of consecutive days, in any order', () => {
    expect(longestStreak([])).toBe(0);
    expect(longestStreak(['2026-09-16'])).toBe(1);
    expect(longestStreak(['2026-09-16', '2026-09-14', '2026-09-15', '2026-09-15', '2026-09-20', '2026-09-21'])).toBe(3);
    // 跨月也算連續
    expect(longestStreak(['2026-09-30', '2026-10-01', '2026-10-02'])).toBe(3);
  });
});

describe('weeklyCounts', () => {
  it('buckets by Monday-start week, oldest first', () => {
    const weeks = weeklyCounts(
      [{ day: '2026-09-16' }, { day: '2026-09-14' }, { day: '2026-09-13' }, { day: '2026-01-01' }],
      '2026-09-16',
      2,
    );
    expect(weeks).toEqual([
      { start: '2026-09-07', count: 1 },
      { start: '2026-09-14', count: 2 },
    ]);
  });
});

describe('summaries and queues', () => {
  const [a, b, c] = BUILTIN_PROBLEMS;
  const progress = new Map<number, { interval: number; due: string; explained?: boolean }>([
    [a.id, { interval: 30, due: '2026-10-01', explained: true }],
    [b.id, { interval: 1, due: '2026-09-10' }],
    [c.id, { interval: 4, due: '2026-09-16' }],
  ]);

  it('summarizes patterns in roadmap order', () => {
    const [first] = summarizePatterns(BUILTIN_PROBLEMS, progress);
    expect(first.pattern).toBe('arrays');
    expect(first.started).toBe(3);
    expect(first.mastered).toBe(1);
    // 記得住 30 天以上、但最近一次沒講清楚的，不算已熟練
    const unexplained = new Map(progress).set(a.id, { interval: 30, due: '2026-10-01' });
    expect(summarizePatterns(BUILTIN_PROBLEMS, unexplained)[0].mastered).toBe(0);
    expect(first.mastery).toBeGreaterThan(0);
    expect(first.mastery).toBeLessThan(1);
    expect(first.startedMastery).toBeGreaterThan(first.mastery);
  });

  it('returns due problems, most overdue first', () => {
    expect(dueProblems(BUILTIN_PROBLEMS, progress, '2026-09-16').map((p) => p.id)).toEqual([b.id, c.id]);
  });

  it('puts the problem you are most likely to have forgotten first', () => {
    // 同一天到期，但一題記得很牢、一題很快就會忘
    const states = new Map([
      [a.id, { interval: 20, due: '2026-09-16', stability: 20, lastReview: '2026-08-27' }],
      [b.id, { interval: 2, due: '2026-09-16', stability: 2, lastReview: '2026-09-10' }],
    ]);
    expect(dueProblems(BUILTIN_PROBLEMS, states, '2026-09-16').map((p) => p.id)).toEqual([b.id, a.id]);
  });
});

describe('planning', () => {
  it('spreads remaining problems over the days before the target', () => {
    expect(planToTarget(30, '2026-09-16', '2026-09-26')).toEqual({ daysLeft: 10, perDay: 3 });
    expect(planToTarget(31, '2026-09-16', '2026-09-26').perDay).toBe(4);
    expect(planToTarget(5, '2026-09-16', '2026-09-16').perDay).toBeNull();
  });

  it('estimates the finishing day', () => {
    expect(finishDay(6, 3, '2026-09-16')).toBe('2026-09-17');
    expect(finishDay(0, 3, '2026-09-16')).toBe('2026-09-16');
    expect(finishDay(5, 0, '2026-09-16')).toBeNull();
  });
});

describe('imported attempts', () => {
  const attempt = (problemId: number, day: string, mode: string, hour = 10) => ({
    problemId,
    day,
    at: `${day}T${String(hour).padStart(2, '0')}:00:00.000Z`,
    mode,
  });
  const attempts = [
    attempt(1, '2026-09-10', 'practice'),
    attempt(1, '2026-09-17', 'review'),
    attempt(2, '2026-09-17', 'practice', 9),
    attempt(3, '2026-09-17', 'import'),
    attempt(4, '2026-09-17', 'import', 8),
    attempt(4, '2026-09-17', 'practice', 11),
  ];

  it('counts only problems first practiced that day toward the daily goal', () => {
    expect(newProblemsStartedOn(attempts, '2026-09-17')).toBe(1);
    expect(newProblemsStartedOn(attempts, '2026-09-10')).toBe(1);
  });

  it('leaves imports out of activity stats', () => {
    expect(practiceAttempts(attempts).map((a) => a.problemId)).toEqual([1, 1, 2, 4]);
  });
});

describe('monthBlocks', () => {
  it('splits the week that crosses into a new month, so each month is its own block', () => {
    // 2026-09-28 是週一；10/1 是週四
    const blocks = monthBlocks('2026-09-28', '2026-10-06');
    expect(blocks.map((b) => b.first)).toEqual(['2026-09-28', '2026-10-01']);
    // 九月：一欄，只有週一到週三
    expect(blocks[0].weeks).toEqual([['2026-09-28', '2026-09-29', '2026-09-30', null, null, null, null]]);
    // 十月：第一欄從週四開始，下一欄是新的一週（到今天為止）
    expect(blocks[1].weeks).toEqual([
      [null, null, null, '2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04'],
      ['2026-10-05', '2026-10-06', null, null, null, null, null],
    ]);
  });

  it('covers every day of a year once', () => {
    const blocks = monthBlocks('2025-10-13', '2026-10-15');
    const days = blocks.flatMap((b) => b.weeks.flat()).filter((d) => d !== null);
    expect(days).toHaveLength(368);
    expect(new Set(days).size).toBe(368);
    expect(blocks).toHaveLength(13);
  });
});

describe('daily review limit', () => {
  const attempt = (problemId: number, day: string, at: string, mode = 'practice') => ({ problemId, day, at, mode, rating: 'solo' });

  it('counts reviews done today, leaving out problems first practiced today and imports', () => {
    const attempts = [
      attempt(1, '2026-09-10', '2026-09-10T10:00:00Z'),
      attempt(1, '2026-09-16', '2026-09-16T10:00:00Z', 'review'),
      attempt(2, '2026-09-11', '2026-09-11T10:00:00Z'),
      attempt(2, '2026-09-16', '2026-09-16T11:00:00Z'),
      attempt(2, '2026-09-16', '2026-09-16T12:00:00Z'),
      attempt(3, '2026-09-16', '2026-09-16T09:00:00Z'),
      attempt(4, '2026-09-16', '2026-09-16T09:00:00Z', 'import'),
    ];
    // 1 和 2 是以前練過的（2 今天練兩次只算一題），3 是今天的新題，4 是批次標記
    expect(reviewsDoneOn(attempts, '2026-09-16')).toBe(2);
  });

  it('keeps the first problems up to the limit, minus reviews already done', () => {
    const due = ['a', 'b', 'c', 'd', 'e'];
    expect(capDue(due, undefined, 3)).toEqual({ shown: due, later: 0 });
    expect(capDue(due, 3, 0)).toEqual({ shown: ['a', 'b', 'c'], later: 2 });
    expect(capDue(due, 3, 2)).toEqual({ shown: ['a'], later: 4 });
    expect(capDue(due, 3, 5)).toEqual({ shown: [], later: 5 });
    expect(capDue(['a'], 3, 0)).toEqual({ shown: ['a'], later: 0 });
  });
});

describe('reviewForecast', () => {
  const states = (...dues: string[]) => dues.map((due) => ({ due }));

  it('counts what comes due each day, with anything overdue landing today', () => {
    const days = reviewForecast(states('2026-09-10', '2026-09-16', '2026-09-17', '2026-09-17', '2026-09-30'), '2026-09-16', undefined, 0);
    expect(days.map((d) => d.day)).toEqual(['2026-09-16', '2026-09-17', '2026-09-18', '2026-09-19', '2026-09-20', '2026-09-21', '2026-09-22']);
    expect(days.map((d) => d.load)).toEqual([2, 2, 0, 0, 0, 0, 0]);
    expect(days.every((d) => d.waiting === 0)).toBe(true);
  });

  it('moves anything over the daily limit to later days, counting reviews already done today', () => {
    const days = reviewForecast(states('2026-09-16', '2026-09-16', '2026-09-16', '2026-09-17', '2026-09-17'), '2026-09-16', 2, 1);
    // 今天只剩一題的空間；剩下的兩題加上明天的兩題，每天兩題慢慢消化
    expect(days.slice(0, 4).map(({ due, load, waiting }) => ({ due, load, waiting }))).toEqual([
      { due: 3, load: 1, waiting: 2 },
      { due: 2, load: 2, waiting: 2 },
      { due: 0, load: 2, waiting: 0 },
      { due: 0, load: 0, waiting: 0 },
    ]);
  });
});

describe('needsRewrite', () => {
  it('asks for a rewrite until the problem is solved without help', () => {
    expect(needsRewrite(undefined)).toBe(false);
    expect(needsRewrite({ lastRating: 'solo' })).toBe(false);
    expect(needsRewrite({ lastRating: 'hint' })).toBe(true);
    expect(needsRewrite({ lastRating: 'solution' })).toBe(true);
    expect(needsRewrite({ lastRating: 'fail' })).toBe(true);
  });
});
