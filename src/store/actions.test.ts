import { beforeEach, describe, expect, it } from 'vitest';
import {
  addCustomProblem,
  deleteCustomProblem,
  deleteMock,
  parseSlug,
  recordAttempt,
  resetProgress,
  saveMock,
  saveNote,
  setCompanies,
  updateSettings,
  ValidationError,
} from './actions';
import { BackupError, clearAllData, exportBackup, parseBackup, restoreBackup } from './backup';
import { db } from './db';
import { wipeLocalData } from './sync';

beforeEach(async () => {
  await wipeLocalData(db);
});

const outbox = async () =>
  (await db.outbox.toArray()).map((e) => `${e.collection}:${e.deleted ? 'del' : 'put'}`).sort();

const mock = {
  problemId: 1,
  kind: 'full' as const,
  day: '2026-09-16',
  startedAt: '2026-09-16T10:00:00.000Z',
  limitSec: 900,
  usedSec: 600,
  steps: ['clarify'],
  reflection: '',
};

describe('recordAttempt', () => {
  it('creates progress and an attempt, then updates on the next attempt', async () => {
    await recordAttempt(1, 'solution', { day: '2026-09-16' });
    let progress = await db.progress.get(1);
    expect(progress).toMatchObject({ interval: 1, due: '2026-09-17', firstDay: '2026-09-16', attempts: 1 });

    await recordAttempt(1, 'solo', { day: '2026-09-17', minutes: 12, mode: 'review' });
    progress = await db.progress.get(1);
    expect(progress).toMatchObject({
      interval: 4,
      due: '2026-09-21',
      firstDay: '2026-09-16',
      attempts: 2,
      lastRating: 'solo',
    });

    const attempts = await db.attempts.where('problemId').equals(1).toArray();
    expect(attempts.map((a) => [a.day, a.rating, a.mode, a.minutes])).toEqual([
      ['2026-09-16', 'solution', 'practice', undefined],
      ['2026-09-17', 'solo', 'review', 12],
    ]);
    expect(new Set(attempts.map((a) => a.uid)).size).toBe(2);
    expect(await outbox()).toEqual(['attempts:put', 'attempts:put']);
  });

  it('stores hint usage only when present', async () => {
    await recordAttempt(1, 'hint', { day: '2026-09-16', hints: 2, minutes: 20 });
    await recordAttempt(2, 'solution', { day: '2026-09-16', hints: 0, sawSolution: true });
    await recordAttempt(3, 'solo', { day: '2026-09-16', hints: 0, sawSolution: false });
    const byProblem = new Map((await db.attempts.toArray()).map((a) => [a.problemId, a]));
    expect(byProblem.get(1)).toMatchObject({ hints: 2, minutes: 20 });
    expect(byProblem.get(1)).not.toHaveProperty('sawSolution');
    expect(byProblem.get(2)).toMatchObject({ sawSolution: true });
    expect(byProblem.get(2)).not.toHaveProperty('hints');
    expect(byProblem.get(3)).not.toHaveProperty('hints');
    expect(byProblem.get(3)).not.toHaveProperty('sawSolution');
  });

  it('resets progress but keeps notes, and records deletions', async () => {
    await recordAttempt(1, 'solo', { day: '2026-09-16' });
    await saveNote(1, { idea: 'hash map' });
    await db.outbox.clear();
    await resetProgress(1);
    expect(await db.progress.get(1)).toBeUndefined();
    expect(await db.attempts.count()).toBe(0);
    expect((await db.notes.get(1))?.idea).toBe('hash map');
    expect(await outbox()).toEqual(['attempts:del']);
  });
});

describe('notes, tags, settings', () => {
  it('merges note patches', async () => {
    await saveNote(1, { idea: 'hash map' });
    await saveNote(1, { time: 'O(n)' });
    expect(await db.notes.get(1)).toMatchObject({ idea: 'hash map', time: 'O(n)', language: 'python' });
    expect(await db.outbox.toArray()).toEqual([expect.objectContaining({ id: 'notes:1', deleted: false })]);
  });

  it('cleans company tags and removes empty records', async () => {
    await setCompanies(1, [' Google ', 'Google', 'Meta  Platforms', '']);
    expect((await db.meta.get(1))?.companies).toEqual(['Google', 'Meta Platforms']);
    await setCompanies(1, []);
    expect(await db.meta.get(1)).toBeUndefined();
    expect(await db.outbox.get('meta:1')).toMatchObject({ deleted: true });
  });

  it('merges settings with defaults and can clear the target date', async () => {
    await updateSettings({ targetDate: '2026-11-01' });
    expect(await db.settings.get('app')).toMatchObject({
      activeList: 'neetcode150',
      dailyNew: 3,
      targetDate: '2026-11-01',
    });
    await updateSettings({ targetDate: undefined });
    expect((await db.settings.get('app'))?.targetDate).toBeUndefined();
    expect(await outbox()).toEqual(['settings:put']);
  });
});

describe('custom problems', () => {
  const input = {
    id: 3000,
    title: 'Test',
    slug: 'test-problem',
    difficulty: 'Easy' as const,
    pattern: 'arrays' as const,
  };

  it('parses slugs from urls', () => {
    expect(parseSlug('https://leetcode.com/problems/two-sum/description/')).toBe('two-sum');
    expect(parseSlug(' Two-Sum ')).toBe('two-sum');
    expect(parseSlug('not a slug')).toBe('');
  });

  it('rejects duplicates and built-in ids', async () => {
    await addCustomProblem(input);
    await expect(addCustomProblem(input)).rejects.toBeInstanceOf(ValidationError);
    await expect(addCustomProblem({ ...input, id: 1 })).rejects.toMatchObject({ code: 'builtin_exists', problemId: 1 });
    await expect(addCustomProblem({ ...input, id: 3001, slug: 'not a url' })).rejects.toMatchObject({ code: 'invalid_url' });
  });

  it('deletes everything that belongs to a custom problem', async () => {
    await addCustomProblem(input);
    await recordAttempt(3000, 'solo');
    await saveNote(3000, { idea: 'x' });
    await saveMock({ ...mock, problemId: 3000 });
    await deleteCustomProblem(3000);
    expect(await db.customProblems.count()).toBe(0);
    expect(await db.progress.count()).toBe(0);
    expect(await db.attempts.count()).toBe(0);
    expect(await db.notes.count()).toBe(0);
    expect(await db.mocks.count()).toBe(0);
    expect(await outbox()).toEqual(['attempts:del', 'customProblems:del', 'mocks:del', 'notes:del']);
  });
});

describe('mocks', () => {
  it('gives each mock a uid and tracks deletion', async () => {
    await saveMock(mock);
    const [saved] = await db.mocks.toArray();
    expect(saved.uid).toMatch(/^[0-9a-f-]{36}$/);
    await deleteMock(saved.id!);
    expect(await db.outbox.get(`mocks:${saved.uid}`)).toMatchObject({ deleted: true });
  });
});

describe('backup', () => {
  it('round-trips data without audio and marks restored data for upload', async () => {
    await recordAttempt(1, 'solo', { day: '2026-09-16' });
    await saveNote(1, { idea: 'hash map' });
    await db.mocks.add({ ...mock, uid: crypto.randomUUID(), audio: new Blob(['x']) });

    const file = parseBackup(JSON.stringify(await exportBackup()));
    expect(file.data.mocks[0]).not.toHaveProperty('audio');

    await wipeLocalData(db);
    await restoreBackup(file);
    expect(await db.progress.get(1)).toMatchObject({ due: '2026-09-20' });
    expect((await db.notes.get(1))?.idea).toBe('hash map');
    expect(await db.mocks.count()).toBe(1);
    expect(await outbox()).toEqual(['attempts:put', 'mocks:put', 'notes:put']);
  });

  it('adds uids to attempts from older backups', async () => {
    const legacy = {
      app: 'leetcode-coach',
      version: 1,
      exportedAt: '2026-09-01T00:00:00.000Z',
      data: {
        progress: [],
        attempts: [{ id: 7, problemId: 1, day: '2026-09-01', at: '2026-09-01T00:00:00.000Z', rating: 'solo', mode: 'practice' }],
        notes: [],
        meta: [],
        patternNotes: [],
        mocks: [],
        customProblems: [],
        settings: [],
      },
    };
    await restoreBackup(parseBackup(JSON.stringify(legacy)));
    const [attempt] = await db.attempts.toArray();
    expect(attempt.uid).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('turns everything into deletions when clearing all data', async () => {
    await recordAttempt(1, 'solo');
    await updateSettings({ dailyNew: 5 });
    await db.outbox.clear();
    await clearAllData();
    expect(await db.attempts.count()).toBe(0);
    expect(await db.settings.count()).toBe(0);
    expect(await outbox()).toEqual(['attempts:del', 'settings:del']);
  });

  it('rejects files that are not backups', () => {
    const codeOf = (text: string) => {
      try {
        parseBackup(text);
        return 'ok';
      } catch (err) {
        return (err as BackupError).code;
      }
    };
    expect(codeOf('nope')).toBe('not_json');
    expect(codeOf('{"app":"other"}')).toBe('not_backup');
    expect(codeOf('{"app":"leetcode-coach","version":2,"data":{}}')).toBe('unsupported_version');
    expect(codeOf('{"app":"leetcode-coach","version":1,"data":{}}')).toBe('incomplete');
  });
});
