import { describe, expect, it } from 'vitest';
import { CONFIRM_DAYS } from '../lib/srs';
import type { AttemptRecord } from './db';
import { explainLatest, progressFromAttempts } from './progress';

const attempt = (day: string, rest: Partial<AttemptRecord> = {}): AttemptRecord => ({
  uid: `${day}-${rest.rating ?? 'solo'}`,
  problemId: 20,
  day,
  at: `${day}T10:00:00Z`,
  rating: 'solo',
  mode: 'practice',
  ...rest,
});

describe('explanations', () => {
  it('marks a problem explained when the latest explanation was clear', () => {
    const attempts = [attempt('2026-10-01')];
    expect(progressFromAttempts(20, attempts, 0.9, 15)!.explained).toBeUndefined();
    expect(progressFromAttempts(20, attempts, 0.9, 15, [{ day: '2026-10-02', clear: true }])!.explained).toBe(true);
    // 之後又講了一次沒講好：掉回去
    const marks = [
      { day: '2026-10-02', clear: true },
      { day: '2026-10-20', clear: false },
    ];
    expect(progressFromAttempts(20, attempts, 0.9, 15, marks)!.explained).toBeUndefined();
  });

  it('counts a fast solve as Easy when it was explained clearly around then', () => {
    const fast = [attempt('2026-10-01', { minutes: 5 })];
    const plain = progressFromAttempts(20, fast, 0.9, 15)!;
    const explained = progressFromAttempts(20, fast, 0.9, 15, [{ day: '2026-10-03', clear: true }])!;
    expect(explained.interval).toBeGreaterThan(plain.interval);
    const why = explainLatest(fast, 0.9, 15, [{ day: '2026-10-03', clear: true }])!;
    expect(why.easy).toBe(true);
    expect(why.days).toBe(explained.interval);
  });
});

describe('explainLatest', () => {
  it('explains the latest attempt from the state just before it, matching the schedule', () => {
    // 故意打亂順序：照時間重播
    const attempts = [
      attempt('2026-10-01', { minutes: 40, rating: 'hint', hints: 4, stuck: ['pattern'] }),
      attempt('2026-09-01'),
      attempt('2026-09-05'),
    ];
    const why = explainLatest(attempts, 0.9, 15)!;
    const progress = progressFromAttempts(20, attempts, 0.9, 15)!;
    expect(why.days).toBe(progress.interval);
    expect(why.days).toBe(CONFIRM_DAYS);
    expect(why).toMatchObject({ rating: 'hint', first: false, gapDays: 26 });
    expect(why.factors.map((f) => f.kind)).toEqual(['time', 'hint', 'memoryStuck']);
    expect(explainLatest([], 0.9)).toBeNull();
  });

  it('includes the days moved to spread out a batch', () => {
    const why = explainLatest([attempt('2026-10-01', { mode: 'import', delayDays: 2 })], 0.9)!;
    const progress = progressFromAttempts(20, [attempt('2026-10-01', { mode: 'import', delayDays: 2 })], 0.9)!;
    expect(why.first).toBe(true);
    expect(why.days + why.delayDays).toBe(progress.interval + 2);
  });
});
