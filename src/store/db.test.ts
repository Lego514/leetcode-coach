import Dexie from 'dexie';
import { describe, expect, it } from 'vitest';
import { CoachDB } from './db';

describe('database upgrade to FSRS', () => {
  it('rebuilds every problem’s schedule from its attempts, leaving the attempts as they were', async () => {
    const name = `upgrade-${crypto.randomUUID()}`;
    // 第 4 版的資料庫：排程是舊的 SM-2 算的，沒有穩定度
    const old = new Dexie(name);
    old.version(4).stores({
      progress: 'problemId, due',
      attempts: '++id, problemId, day, &uid',
      notes: 'problemId',
      meta: 'problemId, *companies',
      patternNotes: 'patternId',
      mocks: '++id, problemId, day, &uid',
      customProblems: 'id',
      settings: 'key',
      outbox: 'id',
      syncState: 'key',
      cardReviews: '++id, cardId, day, &uid',
      boards: 'id',
    });
    await old.table('attempts').bulkAdd([
      { uid: 'a', problemId: 1, day: '2026-09-01', at: '2026-09-01T10:00:00.000Z', rating: 'solo', mode: 'practice' },
      { uid: 'b', problemId: 1, day: '2026-09-03', at: '2026-09-03T10:00:00.000Z', rating: 'solo', mode: 'review' },
      { uid: 'c', problemId: 7, day: '2026-09-02', at: '2026-09-02T10:00:00.000Z', rating: 'fail', mode: 'practice' },
    ]);
    await old.table('progress').bulkPut([
      { problemId: 1, reps: 2, ease: 2.7, interval: 10, lapses: 0, due: '2026-09-13', lastRating: 'solo', lastDay: '2026-09-03', firstDay: '2026-09-01', attempts: 2 },
      { problemId: 99, reps: 1, ease: 2.6, interval: 4, lapses: 0, due: '2026-09-05', lastRating: 'solo', lastDay: '2026-09-01', firstDay: '2026-09-01', attempts: 1 },
    ]);
    old.close();

    const upgraded = new CoachDB(name);
    const progress = await upgraded.progress.orderBy('problemId').toArray();
    expect(progress.map((p) => p.problemId)).toEqual([1, 7]);
    expect(progress[0]).toMatchObject({ lastReview: '2026-09-03', attempts: 2, firstDay: '2026-09-01' });
    expect(progress[0].stability).toBeGreaterThan(2.3065);
    expect(progress[0]).not.toHaveProperty('ease');
    expect(progress[1]).toMatchObject({ lapses: 1, reps: 0 });
    expect(await upgraded.attempts.count()).toBe(3);
    upgraded.close();
  });
});
