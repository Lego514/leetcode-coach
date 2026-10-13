import { describe, expect, it } from 'vitest';
import { attemptDataSchema } from '../../shared/protocol';
import { BUILTIN_PROBLEMS } from '../data/problems';
import { stuckPatterns, summarizeStuck } from './stuck';

const byId = new Map(BUILTIN_PROBLEMS.map((p) => [p.id, p]));
const problemOf = (id: number) => byId.get(id);

// 1、217 是陣列與雜湊，20 是堆疊，70 是一維 DP
const attempts = [
  { problemId: 70, day: '2026-10-01', stuck: ['optimize' as const] },
  { problemId: 70, day: '2026-10-05', stuck: ['optimize' as const, 'edge' as const] },
  { problemId: 1, day: '2026-10-06', stuck: ['edge' as const] },
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
      ['edge', 2],
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

  it('syncs only known reasons', () => {
    const base = { problemId: 1, day: '2026-10-01', at: '2026-10-01T10:00:00.000Z', rating: 'hint', mode: 'practice' };
    expect(attemptDataSchema.safeParse({ ...base, stuck: ['edge', 'time'] }).success).toBe(true);
    expect(attemptDataSchema.safeParse({ ...base, stuck: ['lazy'] }).success).toBe(false);
  });
});
