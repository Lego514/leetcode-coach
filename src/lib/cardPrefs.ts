import { isCardScope, type CardScope } from './cards';

// 微複習的個人偏好（範圍、休息秒數）只是這台裝置上的便利設定，放 localStorage 就好。
// 私密瀏覽或封鎖網站資料時讀寫會失敗，那就用預設值。

const SCOPE_KEY = 'leetcode-coach:cards-scope';
const REST_KEY = 'leetcode-coach:rest-seconds';

export const REST_PRESETS = [60, 90, 120, 180] as const;
export const DEFAULT_REST_SECONDS = 90;

export function loadScope(): CardScope {
  try {
    const value = localStorage.getItem(SCOPE_KEY);
    return value && isCardScope(value) ? value : 'all';
  } catch {
    return 'all';
  }
}

export function saveScope(scope: CardScope): void {
  try {
    localStorage.setItem(SCOPE_KEY, scope);
  } catch {
    // 存不了就只在這次有效
  }
}

export function loadRestSeconds(): number {
  try {
    const value = Number(localStorage.getItem(REST_KEY));
    return (REST_PRESETS as readonly number[]).includes(value) ? value : DEFAULT_REST_SECONDS;
  } catch {
    return DEFAULT_REST_SECONDS;
  }
}

export function saveRestSeconds(seconds: number): void {
  try {
    localStorage.setItem(REST_KEY, String(seconds));
  } catch {
    // 存不了就只在這次有效
  }
}
