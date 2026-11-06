import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createStory, saveNote, updateSettings } from './actions';
import { db } from './db';
import { canTryDemo, clearDemoData, isDemo, loadDemoData } from './demo';
import { wipeLocalData } from './sync';

/** 假的 localStorage；測試環境是 Node，沒有 */
function fakeStorage() {
  const data = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
  });
  return data;
}

beforeEach(async () => {
  fakeStorage();
  await wipeLocalData(db);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const TODAY = '2026-11-04';

describe('demo data', () => {
  it('can be tried only when the browser has nothing of yours but settings', async () => {
    expect(await canTryDemo()).toBe(true);
    await updateSettings({ dailyNew: 5 });
    expect(await canTryDemo()).toBe(true);
    await saveNote(217, { idea: 'Use a set' });
    expect(await canTryDemo()).toBe(false);
  });

  it('is not offered to someone who only wrote behavioral stories', async () => {
    await createStory();
    expect(await canTryDemo()).toBe(false);
    // 直接呼叫也不會載入，免得清除時把故事一起清掉
    await loadDemoData(TODAY);
    expect(isDemo()).toBe(false);
    expect(await db.attempts.count()).toBe(0);
    expect(await db.stories.count()).toBe(1);
  });

  it('puts your own settings back when cleared, ready to sync later', async () => {
    await updateSettings({ dailyNew: 5, activeList: 'blind75' });
    await loadDemoData(TODAY);
    expect(isDemo()).toBe(true);
    expect(await db.attempts.count()).toBeGreaterThan(0);
    expect((await db.settings.get('app'))?.activeList).toBe('neetcode150');

    // 故事、練習講一題和白板也一起載入，但不記進待上傳清單，不會同步
    expect(await db.stories.count()).toBeGreaterThan(0);
    expect(await db.rehearsals.count()).toBeGreaterThan(0);
    expect(await db.boards.count()).toBeGreaterThan(0);
    expect((await db.outbox.toArray()).map((e) => e.collection)).toEqual(['settings']);

    await clearDemoData();
    expect(isDemo()).toBe(false);
    expect(await db.attempts.count()).toBe(0);
    expect(await db.stories.count()).toBe(0);
    expect(await db.rehearsals.count()).toBe(0);
    expect(await db.boards.count()).toBe(0);
    expect(await db.settings.get('app')).toMatchObject({ dailyNew: 5, activeList: 'blind75' });
    expect((await db.outbox.toArray()).map((e) => e.key)).toEqual(['app']);
  });

  it('goes back to the defaults when you had no settings', async () => {
    await loadDemoData(TODAY);
    await clearDemoData();
    expect(await db.settings.get('app')).toBeUndefined();
    expect(await db.outbox.count()).toBe(0);
  });
});
