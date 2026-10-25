import { useSyncExternalStore } from 'react';
import { isHeadItem, type HeadItem } from '../lib/companion';

// 卡皮巴拉現在戴哪一個道具、哪些道具已經慶祝過。
// 收集到什麼是從練習紀錄算出來的（lib/companion.ts），這裡只存個人的外觀選擇，
// 跟深色模式、App 圖示一樣放在這台裝置的 localStorage。

const WEARING_KEY = 'leetcode-coach:wearing';
const SEEN_KEY = 'leetcode-coach:items-seen';

export type WearingChoice = HeadItem | 'none' | null;

function readWearing(): WearingChoice {
  try {
    const value = localStorage.getItem(WEARING_KEY);
    return value === 'none' || isHeadItem(value) ? value : null;
  } catch {
    return null;
  }
}

let current: WearingChoice | undefined;
const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getWearing(): WearingChoice {
  if (current === undefined) current = readWearing();
  return current;
}

/** 選要戴哪一個；'none' 是什麼都不戴。今天頁和進度頁馬上一起換 */
export function setWearing(choice: HeadItem | 'none'): void {
  try {
    localStorage.setItem(WEARING_KEY, choice);
  } catch {
    // 無法儲存時仍然套用到這次的畫面
  }
  current = choice;
  for (const listener of listeners) listener();
}

export function useWearing(): WearingChoice {
  return useSyncExternalStore(subscribe, getWearing, getWearing);
}

/** 已經慶祝過的道具；還沒記過是 null */
export function readSeenItems(): string[] | null {
  try {
    const value = localStorage.getItem(SEEN_KEY);
    if (value === null) return null;
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : null;
  } catch {
    return null;
  }
}

export function writeSeenItems(items: readonly string[]): void {
  try {
    localStorage.setItem(SEEN_KEY, JSON.stringify(items));
  } catch {
    // 存不了就下次再慶祝一次
  }
}
