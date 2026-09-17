import { describe, expect, it } from 'vitest';
import { BUILTIN_PROBLEMS } from '../data/problems';
import {
  dueProblems,
  finishDay,
  newProblemsStartedOn,
  planToTarget,
  practiceAttempts,
  practiceStreak,
  summarizePatterns,
  weeklyCounts,
} from './stats';

describe('practiceStreak', () => {
  it('counts back from today, or from yesterday if today is empty', () => {
    expect(practiceStreak(['2026-09-14', '2026-09-15', '2026-09-16'], '2026-09-16')).toBe(3);
    expect(practiceStreak(['2026-09-14', '2026-09-15'], '2026-09-16')).toBe(2);
    expect(practiceStreak(['2026-09-13'], '2026-09-16')).toBe(0);
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
  const progress = new Map([
    [a.id, { interval: 30, due: '2026-10-01' }],
    [b.id, { interval: 1, due: '2026-09-10' }],
    [c.id, { interval: 4, due: '2026-09-16' }],
  ]);

  it('summarizes patterns in roadmap order', () => {
    const [first] = summarizePatterns(BUILTIN_PROBLEMS, progress);
    expect(first.pattern).toBe('arrays');
    expect(first.started).toBe(3);
    expect(first.mastered).toBe(1);
    expect(first.mastery).toBeGreaterThan(0);
    expect(first.mastery).toBeLessThan(1);
    expect(first.startedMastery).toBeGreaterThan(first.mastery);
  });

  it('returns due problems, most overdue first', () => {
    expect(dueProblems(BUILTIN_PROBLEMS, progress, '2026-09-16').map((p) => p.id)).toEqual([b.id, c.id]);
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
