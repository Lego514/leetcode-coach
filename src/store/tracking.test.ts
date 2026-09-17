import { beforeEach, describe, expect, it } from 'vitest';
import { COLLECTION_SCHEMAS } from '../../shared/protocol';
import { recordAttempt, saveNote, setCompanies, updateSettings } from './actions';
import { CoachDB, db } from './db';
import { adoptAccount, wipeLocalData } from './sync';
import { applyRemote, findLocal, getSyncState, keyOf, markAllDirty, rebuildProgress, toSyncData } from './tracking';

beforeEach(async () => {
  await wipeLocalData(db);
});

describe('sync payloads', () => {
  it('produces data the server schema accepts, without local-only fields', async () => {
    await recordAttempt(1, 'hint', { hints: 1, minutes: 5 });
    await saveNote(1, { idea: 'two pointers' });
    await setCompanies(1, ['Google']);
    await updateSettings({ dailyNew: 4 });

    const attempt = (await db.attempts.toArray())[0];
    const attemptData = toSyncData('attempts', attempt);
    expect(attemptData).not.toHaveProperty('id');
    expect(attemptData).not.toHaveProperty('uid');
    expect(COLLECTION_SCHEMAS.attempts.data.parse(attemptData)).toEqual(attemptData);

    const noteData = toSyncData('notes', (await db.notes.get(1))!);
    expect(noteData).not.toHaveProperty('problemId');
    expect(COLLECTION_SCHEMAS.notes.data.safeParse(noteData).success).toBe(true);
    expect(COLLECTION_SCHEMAS.meta.data.safeParse(toSyncData('meta', (await db.meta.get(1))!)).success).toBe(true);
    expect(COLLECTION_SCHEMAS.settings.data.safeParse(toSyncData('settings', (await db.settings.get('app'))!)).success).toBe(true);
    expect(keyOf('attempts', attempt)).toBe(attempt.uid);
    expect(keyOf('notes', (await db.notes.get(1))!)).toBe('1');
  });

  it('applies remote records and keeps local-only fields', async () => {
    const uid = crypto.randomUUID();
    const id = await db.mocks.add({
      uid,
      problemId: 1,
      kind: 'full',
      day: '2026-09-16',
      startedAt: '2026-09-16T10:00:00.000Z',
      limitSec: 900,
      usedSec: 100,
      steps: [],
      reflection: 'old',
      audio: new Blob(['voice']),
    });
    await applyRemote(db, 'mocks', uid, false, {
      problemId: 1,
      kind: 'full',
      day: '2026-09-16',
      startedAt: '2026-09-16T10:00:00.000Z',
      limitSec: 900,
      usedSec: 100,
      steps: ['clarify'],
      reflection: 'new',
    });
    const updated = await db.mocks.get(id);
    expect(updated).toMatchObject({ id, uid, reflection: 'new', steps: ['clarify'] });
    expect(updated?.audio).toBeInstanceOf(Blob);

    await applyRemote(db, 'customProblems', '4000', false, {
      slug: 'x',
      title: 'X',
      difficulty: 'Hard',
      pattern: 'graphs',
      premium: false,
    });
    expect(await findLocal(db, 'customProblems', '4000')).toMatchObject({ id: 4000, custom: true });
    await applyRemote(db, 'customProblems', '4000', true, undefined);
    expect(await findLocal(db, 'customProblems', '4000')).toBeUndefined();
  });
});

describe('rebuildProgress', () => {
  it('matches the incremental schedule', async () => {
    await recordAttempt(1, 'fail', { day: '2026-09-01', at: new Date('2026-09-01T10:00:00Z') });
    await recordAttempt(1, 'hint', { day: '2026-09-02', at: new Date('2026-09-02T10:00:00Z') });
    await recordAttempt(1, 'solo', { day: '2026-09-04', at: new Date('2026-09-04T10:00:00Z') });
    const incremental = await db.progress.get(1);
    await db.progress.clear();
    await rebuildProgress(db, [1]);
    expect(await db.progress.get(1)).toEqual(incremental);
  });

  it('removes progress when no attempts remain', async () => {
    await recordAttempt(1, 'solo');
    await db.attempts.clear();
    await rebuildProgress(db, [1]);
    expect(await db.progress.get(1)).toBeUndefined();
  });
});

describe('accounts', () => {
  it('marks existing data with known timestamps when adopting a new account', async () => {
    await recordAttempt(1, 'solo', { at: new Date('2026-09-01T10:00:00Z') });
    await setCompanies(1, ['Meta']);
    await db.outbox.clear();
    await saveNote(1, { idea: 'x' });
    const pendingNote = await db.outbox.get('notes:1');

    const { merged } = await adoptAccount(db, { id: 'u1', email: 'a@b.co' });
    expect(merged).toBe(2);
    const attemptUid = (await db.attempts.toArray())[0].uid;
    expect(await db.outbox.get(`attempts:${attemptUid}`)).toMatchObject({ updatedAt: Date.parse('2026-09-01T10:00:00Z') });
    expect(await db.outbox.get('meta:1')).toMatchObject({ updatedAt: 0 });
    // 原本就在清單裡的修改保留真正的修改時間
    expect(await db.outbox.get('notes:1')).toEqual(pendingNote);
    expect(await getSyncState(db)).toMatchObject({ userId: 'u1', email: 'a@b.co', cursor: 0 });

    // 同一個帳號再次登入不會重新標記
    await db.outbox.clear();
    await db.syncState.update('state', { cursor: 42 });
    expect((await adoptAccount(db, { id: 'u1', email: 'new@b.co' })).merged).toBe(0);
    expect(await db.outbox.count()).toBe(0);
    expect(await getSyncState(db)).toMatchObject({ email: 'new@b.co', cursor: 42 });
  });

  it('marks nothing when there is no local data', async () => {
    expect(await markAllDirty(db)).toBe(0);
  });
});

describe('schema upgrade', () => {
  it('adds uids to attempts and mocks from version 1', async () => {
    const name = `upgrade-test-${crypto.randomUUID()}`;
    const { default: Dexie } = await import('dexie');
    const v1 = new Dexie(name);
    v1.version(1).stores({
      progress: 'problemId, due',
      attempts: '++id, problemId, day',
      notes: 'problemId',
      meta: 'problemId, *companies',
      patternNotes: 'patternId',
      mocks: '++id, problemId, day',
      customProblems: 'id',
      settings: 'key',
    });
    await v1.table('attempts').bulkAdd([
      { problemId: 1, day: '2026-09-01', at: '2026-09-01T00:00:00.000Z', rating: 'solo', mode: 'practice' },
      { problemId: 2, day: '2026-09-02', at: '2026-09-02T00:00:00.000Z', rating: 'hint', mode: 'practice' },
    ]);
    v1.close();

    const upgraded = new CoachDB(name);
    const attempts = await upgraded.attempts.toArray();
    expect(attempts).toHaveLength(2);
    expect(new Set(attempts.map((a) => a.uid)).size).toBe(2);
    expect(await upgraded.outbox.count()).toBe(0);
    upgraded.close();
    await Dexie.delete(name);
  });
});
