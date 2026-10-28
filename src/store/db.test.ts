import Dexie from 'dexie';
import { describe, expect, it } from 'vitest';
import { CONFIRM_DAYS, replay } from '../lib/srs';
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

describe('database upgrade that weighs time and confirms shaky solves', () => {
  it('reschedules from the attempts with their minutes, and brings hinted problems back within a week', async () => {
    const name = `upgrade-time-${crypto.randomUUID()}`;
    // 第 7 版的資料庫：排程沒有看寫題時間，看了提示也可能排到很久以後
    const old = new Dexie(name);
    old.version(7).stores({
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
      stories: 'id',
      rehearsals: '++id, day, &uid',
    });
    const slow = [
      // Two Sum 是 Easy，目標 15 分鐘：第二次花了 30 分鐘
      { uid: 'a', problemId: 1, day: '2026-09-01', at: '2026-09-01T10:00:00.000Z', rating: 'solo', mode: 'practice', minutes: 10 },
      { uid: 'b', problemId: 1, day: '2026-09-20', at: '2026-09-20T10:00:00.000Z', rating: 'solo', mode: 'review', minutes: 30 },
    ];
    const hinted = [
      { uid: 'c', problemId: 20, day: '2026-03-01', at: '2026-03-01T10:00:00.000Z', rating: 'solo', mode: 'import' },
      { uid: 'd', problemId: 20, day: '2026-10-20', at: '2026-10-20T10:00:00.000Z', rating: 'hint', mode: 'review', minutes: 12 },
    ];
    await old.table('attempts').bulkAdd([...slow, ...hinted]);
    // 舊的排程：沒有看時間、也沒有一週確認
    const before = replay(slow as never)!;
    await old.table('progress').bulkPut([
      { problemId: 1, ...before, lastRating: 'solo', lastDay: '2026-09-20', firstDay: '2026-09-01', attempts: 2 },
      { problemId: 20, ...replay(hinted as never)!, lastRating: 'hint', lastDay: '2026-10-20', firstDay: '2026-03-01', attempts: 2 },
    ]);
    old.close();

    const upgraded = new CoachDB(name);
    const [twoSum, parentheses] = await upgraded.progress.orderBy('problemId').toArray();
    expect(twoSum.stability).toBeLessThan(before.stability);
    expect(parentheses.interval).toBeLessThanOrEqual(CONFIRM_DAYS);
    expect(await upgraded.attempts.count()).toBe(4);
    upgraded.close();
  });
});

describe('database upgrade that weighs hint depth and where you got stuck', () => {
  it('brings a problem back within a week when you could not see the pattern', async () => {
    const name = `upgrade-stuck-${crypto.randomUUID()}`;
    // 第 8 版的資料庫：排程還沒看卡在哪
    const old = new Dexie(name);
    const stores = {
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
      stories: 'id',
      rehearsals: '++id, day, &uid',
    };
    old.version(7).stores(stores);
    old.version(8).stores({});
    const attempts = [
      { uid: 'a', problemId: 20, day: '2026-03-01', at: '2026-03-01T10:00:00.000Z', rating: 'solo', mode: 'import' },
      { uid: 'b', problemId: 20, day: '2026-10-20', at: '2026-10-20T10:00:00.000Z', rating: 'solo', mode: 'review', minutes: 12, stuck: ['pattern'] },
    ];
    await old.table('attempts').bulkAdd(attempts);
    // 舊的排程：只看時間，排到很久以後
    const before = replay(attempts.map((a) => ({ ...a, stuck: undefined })) as never)!;
    await old.table('progress').put({ problemId: 20, ...before, lastRating: 'solo', lastDay: '2026-10-20', firstDay: '2026-03-01', attempts: 2 });
    old.close();
    expect(before.interval).toBeGreaterThan(CONFIRM_DAYS);

    const upgraded = new CoachDB(name);
    const progress = await upgraded.progress.get(20);
    expect(progress?.interval).toBe(CONFIRM_DAYS);
    upgraded.close();
  });
});
