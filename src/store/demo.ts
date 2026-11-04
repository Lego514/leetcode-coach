import { useLiveQuery } from 'dexie-react-hooks';
import { useSyncExternalStore } from 'react';
import { demoData } from '../lib/demo';
import type { Day } from '../lib/dates';
import { db, type AttemptRecord, type CardReviewRecord, type CoachDB, type MockRecord, type SettingsRecord } from './db';
import { wipeLocalData } from './sync';
import { rebuildAllProgress, track } from './tracking';

// 示範資料：第一次打開、還沒登入時，可以一鍵載入六週的練習紀錄看看所有功能。
// 載入和清除都只動這個瀏覽器，不記進待上傳清單：示範資料不會同步，清除時也不會刪到雲端的東西。
// 示範中登入的話，先把示範資料清掉再合併（cloud.ts），編出來的紀錄不會跑進真的帳號。
// 清除是把整個瀏覽器的資料清空，所以只有完全沒有自己的紀錄時才能載入（canTryDemo）；
// 唯一允許先存在的是設定（歡迎卡上有「調整計畫」），載入前先收起來，清除時放回去。

const KEY = 'leetcode-coach:demo';
const SAVED_SETTINGS_KEY = 'leetcode-coach:demo-saved-settings';
const listeners = new Set<() => void>();

function read(): boolean {
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

function write(on: boolean) {
  try {
    if (on) localStorage.setItem(KEY, '1');
    else localStorage.removeItem(KEY);
  } catch {
    // 存不了就只在這次有效
  }
  for (const listener of listeners) listener();
}

export function isDemo(): boolean {
  return read();
}

export function useDemo(): boolean {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    read,
  );
}

/**
 * 能不能載入示範資料：除了設定以外，這個瀏覽器什麼紀錄都沒有。
 * 只看有沒有做過題目不夠：只寫過筆記、故事或白板的人，清除示範資料時會一起被清掉
 */
export async function canTryDemo(database: CoachDB = db): Promise<boolean> {
  const tables = database.dataTables.filter((table) => table !== database.settings);
  const counts = await Promise.all(tables.map((table) => table.count()));
  return counts.every((n) => n === 0);
}

export function useCanTryDemo(): boolean | undefined {
  return useLiveQuery(() => canTryDemo(), []);
}

function saveSettings(settings: SettingsRecord | undefined) {
  try {
    if (settings) localStorage.setItem(SAVED_SETTINGS_KEY, JSON.stringify(settings));
    else localStorage.removeItem(SAVED_SETTINGS_KEY);
  } catch {
    // 存不了就只能回到預設設定
  }
}

function savedSettings(): SettingsRecord | undefined {
  try {
    const raw = localStorage.getItem(SAVED_SETTINGS_KEY);
    return raw ? (JSON.parse(raw) as SettingsRecord) : undefined;
  } catch {
    return undefined;
  }
}

export async function loadDemoData(today: Day): Promise<void> {
  // 有自己的紀錄時不載入：畫面上不會出現按鈕，這裡再擋一次
  if (!(await canTryDemo())) return;
  saveSettings(await db.settings.get('app'));
  const demo = demoData(today);
  await db.transaction('rw', [db.attempts, db.cardReviews, db.mocks, db.settings, db.progress, db.customProblems], async () => {
    await db.attempts.bulkPut(demo.attempts as unknown as AttemptRecord[]);
    await db.cardReviews.bulkPut(demo.cardReviews as unknown as CardReviewRecord[]);
    await db.mocks.bulkPut(demo.mocks as unknown as MockRecord[]);
    await db.settings.bulkPut(demo.settings as unknown as SettingsRecord[]);
    await rebuildAllProgress(db);
  });
  write(true);
}

/** 清掉示範資料，回到第一次打開的樣子；載入前自己調過的設定放回去（也記回待上傳清單，之後登入才同步得出去） */
export async function clearDemoData(): Promise<void> {
  await wipeLocalData(db);
  const settings = savedSettings();
  if (settings) {
    await db.transaction('rw', [db.settings, db.outbox], async () => {
      await db.settings.put(settings);
      await track(db, 'settings', 'app');
    });
  }
  saveSettings(undefined);
  write(false);
}

/** 匯入備份或清除所有資料之後，已經不是示範資料了 */
export function endDemo(): void {
  saveSettings(undefined);
  if (read()) write(false);
}
