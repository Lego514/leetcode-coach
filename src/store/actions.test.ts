import { beforeEach, describe, expect, it } from 'vitest';
import {
  addCustomProblem,
  deleteCustomProblem,
  parseSlug,
  recordAttempt,
  resetProgress,
  saveNote,
  setCompanies,
  updateSettings,
  ValidationError,
} from './actions';
import { clearAllData, exportBackup, parseBackup, restoreBackup } from './backup';
import { db } from './db';

beforeEach(async () => {
  await clearAllData();
});

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
  });

  it('resets progress but keeps notes', async () => {
    await recordAttempt(1, 'solo', { day: '2026-09-16' });
    await saveNote(1, { idea: 'hash map' });
    await resetProgress(1);
    expect(await db.progress.get(1)).toBeUndefined();
    expect(await db.attempts.count()).toBe(0);
    expect((await db.notes.get(1))?.idea).toBe('hash map');
  });
});

describe('notes, tags, settings', () => {
  it('merges note patches', async () => {
    await saveNote(1, { idea: 'hash map' });
    await saveNote(1, { time: 'O(n)' });
    expect(await db.notes.get(1)).toMatchObject({ idea: 'hash map', time: 'O(n)', language: 'python' });
  });

  it('cleans company tags and removes empty records', async () => {
    await setCompanies(1, [' Google ', 'Google', 'Meta  Platforms', '']);
    expect((await db.meta.get(1))?.companies).toEqual(['Google', 'Meta Platforms']);
    await setCompanies(1, []);
    expect(await db.meta.get(1)).toBeUndefined();
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
    await expect(addCustomProblem({ ...input, id: 1 })).rejects.toThrow('內建題庫');
  });

  it('deletes everything that belongs to a custom problem', async () => {
    await addCustomProblem(input);
    await recordAttempt(3000, 'solo');
    await saveNote(3000, { idea: 'x' });
    await deleteCustomProblem(3000);
    expect(await db.customProblems.count()).toBe(0);
    expect(await db.progress.count()).toBe(0);
    expect(await db.attempts.count()).toBe(0);
    expect(await db.notes.count()).toBe(0);
  });
});

describe('backup', () => {
  it('round-trips data without audio', async () => {
    await recordAttempt(1, 'solo', { day: '2026-09-16' });
    await saveNote(1, { idea: 'hash map' });
    await db.mocks.add({
      problemId: 1,
      kind: 'full',
      day: '2026-09-16',
      startedAt: '2026-09-16T10:00:00.000Z',
      limitSec: 900,
      usedSec: 600,
      steps: ['clarify'],
      reflection: '',
      audio: new Blob(['x']),
    });

    const file = parseBackup(JSON.stringify(await exportBackup()));
    expect(file.data.mocks[0]).not.toHaveProperty('audio');

    await clearAllData();
    await restoreBackup(file);
    expect(await db.progress.get(1)).toMatchObject({ due: '2026-09-20' });
    expect((await db.notes.get(1))?.idea).toBe('hash map');
    expect(await db.mocks.count()).toBe(1);
  });

  it('rejects files that are not backups', () => {
    expect(() => parseBackup('nope')).toThrow('JSON');
    expect(() => parseBackup('{"app":"other"}')).toThrow('備份檔');
    expect(() => parseBackup('{"app":"leetcode-coach","version":1,"data":{}}')).toThrow('缺少');
  });
});
