import { describe, expect, it } from 'vitest';
import { BUILTIN_PROBLEMS } from '../data/problems';
import { progressFromAttempts } from '../store/progress';
import type { AttemptRecord } from '../store/db';
import { demoData } from './demo';

const today = '2026-10-16';
let n = 0;
const demo = demoData(today, () => `uid-${(n += 1)}`);
const attempts = demo.attempts as unknown as AttemptRecord[];

describe('demo data', () => {
  it('only uses real problems and never dates anything after today', () => {
    const ids = new Set(BUILTIN_PROBLEMS.map((p) => p.id));
    expect(attempts.every((a) => ids.has(a.problemId))).toBe(true);
    expect(attempts.every((a) => a.day <= today && a.day >= '2026-09-01')).toBe(true);
    expect(new Set(attempts.map((a) => a.uid)).size).toBe(attempts.length);
    expect(demo.cardReviews.every((r) => (r.day as string) <= today)).toBe(true);
  });

  it('looks like real use: a few dozen problems, a recent streak, and only a handful of reviews due', () => {
    const problems = new Set(attempts.map((a) => a.problemId));
    expect(problems.size).toBeGreaterThan(20);
    // 最近一週每天都有練
    for (let i = 0; i < 5; i += 1) {
      const day = `2026-10-${String(16 - i).padStart(2, '0')}`;
      expect(attempts.some((a) => a.day === day)).toBe(true);
    }
    const due = [...problems].filter((id) => {
      const state = progressFromAttempts(id, attempts.filter((a) => a.problemId === id), 0.9);
      return state !== null && state.due <= today;
    });
    expect(due.length).toBeGreaterThan(0);
    expect(due.length).toBeLessThanOrEqual(10);
  });
});
