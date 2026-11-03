import { describe, expect, it } from 'vitest';
import { attemptDataSchema } from '../../shared/protocol';
import { BUILTIN_PROBLEMS } from '../data/problems';
import { stuckKinds, stuckPatterns, summarizeStuck, toggleStuck } from './stuck';

const byId = new Map(BUILTIN_PROBLEMS.map((p) => [p.id, p]));
const problemOf = (id: number) => byId.get(id);

// 1、217 是陣列與雜湊，20 是堆疊，70 是一維 DP
const attempts = [
  { problemId: 70, day: '2026-10-01', stuck: ['optimize' as const] },
  // 舊紀錄的漏了邊界、有 bug 算進「邏輯／邊界」；同一次有兩個也只算一次
  { problemId: 70, day: '2026-10-05', stuck: ['optimize' as const, 'edge' as const, 'bug' as const] },
  { problemId: 1, day: '2026-10-06', stuck: ['logic' as const, 'syntax' as const] },
  { problemId: 217, day: '2026-10-07', stuck: ['optimize' as const] },
  { problemId: 20, day: '2026-10-08' },
  { problemId: 20, day: '2026-10-09', stuck: [] },
  // 太久以前，不算
  { problemId: 20, day: '2026-06-01', stuck: ['bug' as const] },
];

describe('stuck reasons', () => {
  it('counts each reason in the window, most frequent first, with the patterns where it happens', () => {
    const summary = summarizeStuck(attempts, problemOf, '2026-09-01');
    expect(summary.attempts).toBe(4);
    expect(summary.reasons.map((r) => [r.reason, r.count])).toEqual([
      ['optimize', 3],
      ['logic', 2],
      ['syntax', 1],
    ]);
    expect(summary.reasons[0].patterns).toEqual([
      { pattern: 'dp-1d', count: 2 },
      { pattern: 'arrays', count: 1 },
    ]);
  });

  it('finds the patterns I keep getting stuck in lately', () => {
    expect([...stuckPatterns(attempts, problemOf, '2026-09-01')].sort()).toEqual(['arrays', 'dp-1d']);
    expect([...stuckPatterns(attempts, problemOf, '2026-10-07')]).toEqual([]);
    expect([...stuckPatterns(attempts, problemOf, '2026-01-01', 3)]).toEqual([]);
  });

  it('maps old reasons onto the current ones, keeping the old “ran out of time”', () => {
    expect(stuckKinds(['bug', 'pattern', 'edge'])).toEqual(['pattern', 'logic']);
    expect(stuckKinds(['time', 'syntax'])).toEqual(['syntax', 'time']);
    expect(stuckKinds(undefined)).toEqual([]);
    const summary = summarizeStuck([{ problemId: 1, day: '2026-10-01', stuck: ['time'] }], problemOf, '2026-09-01');
    expect(summary.reasons.map((r) => r.reason)).toEqual(['time']);
  });

  it('toggles a reason in option order and keeps old codes that have no option', () => {
    expect(toggleStuck([], 'logic')).toEqual(['logic']);
    expect(toggleStuck(['logic'], 'pattern')).toEqual(['pattern', 'logic']);
    expect(toggleStuck(['pattern', 'logic'], 'logic')).toEqual(['pattern']);
    // 改舊紀錄：時間不夠沒有選項了，但留在紀錄裡
    expect(toggleStuck(['logic', 'time'], 'syntax')).toEqual(['syntax', 'logic', 'time']);
  });

  it('syncs the current reasons and the old ones, so older devices are not rejected', () => {
    const base = { problemId: 1, day: '2026-10-01', at: '2026-10-01T10:00:00.000Z', rating: 'hint', mode: 'practice' };
    expect(attemptDataSchema.safeParse({ ...base, stuck: ['syntax', 'logic'] }).success).toBe(true);
    expect(attemptDataSchema.safeParse({ ...base, stuck: ['edge', 'bug', 'time'] }).success).toBe(true);
    expect(attemptDataSchema.safeParse({ ...base, stuck: ['lazy'] }).success).toBe(false);
  });
});
