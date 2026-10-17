import { useSyncExternalStore } from 'react';
import { demoData } from '../lib/demo';
import type { Day } from '../lib/dates';
import { db, type AttemptRecord, type CardReviewRecord, type SettingsRecord } from './db';
import { wipeLocalData } from './sync';
import { rebuildAllProgress } from './tracking';

// 示範資料：第一次打開、還沒登入時，可以一鍵載入六週的練習紀錄看看所有功能。
// 載入和清除都只動這個瀏覽器，不記進待上傳清單：示範資料不會同步，清除時也不會刪到雲端的東西。
// 示範中登入的話，先把示範資料清掉再合併（cloud.ts），編出來的紀錄不會跑進真的帳號。

const KEY = 'leetcode-coach:demo';
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

export async function loadDemoData(today: Day): Promise<void> {
  const demo = demoData(today);
  await db.transaction('rw', [db.attempts, db.cardReviews, db.settings, db.progress], async () => {
    await db.attempts.bulkPut(demo.attempts as unknown as AttemptRecord[]);
    await db.cardReviews.bulkPut(demo.cardReviews as unknown as CardReviewRecord[]);
    await db.settings.bulkPut(demo.settings as unknown as SettingsRecord[]);
    await rebuildAllProgress(db);
  });
  write(true);
}

/** 清掉示範資料，回到第一次打開的樣子 */
export async function clearDemoData(): Promise<void> {
  await wipeLocalData(db);
  write(false);
}

/** 匯入備份或清除所有資料之後，已經不是示範資料了 */
export function endDemo(): void {
  if (read()) write(false);
}
