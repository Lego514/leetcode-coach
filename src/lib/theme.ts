import { useSyncExternalStore } from 'react';

export type ThemeChoice = 'system' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';

const KEY = 'leetcode-coach:theme';

/** 和 index.html 的 theme-color 一致：瀏覽器網址列、iPhone 狀態列的顏色 */
const THEME_COLORS: Record<ResolvedTheme, string> = { light: '#f3f5f8', dark: '#0e1829' };

function readTheme(): ThemeChoice {
  try {
    const value = localStorage.getItem(KEY);
    return value === 'light' || value === 'dark' ? value : 'system';
  } catch {
    return 'system';
  }
}

export function applyTheme(choice: ThemeChoice = readTheme()): void {
  const root = document.documentElement;
  if (choice === 'system') delete root.dataset.theme;
  else root.dataset.theme = choice;
  // 手動選了和系統相反的外觀時，網址列的顏色也要跟著換
  for (const meta of document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')) {
    const own: ResolvedTheme = meta.media.includes('dark') ? 'dark' : 'light';
    meta.content = THEME_COLORS[choice === 'system' ? own : choice];
  }
}

// 外觀偏好只是個人便利設定，放在 localStorage 即可。
// 側邊欄的按鈕和設定頁共用這份狀態，任何一邊改了另一邊馬上跟著變。
let current: ThemeChoice | undefined;
const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getTheme(): ThemeChoice {
  current ??= readTheme();
  return current;
}

export function setTheme(choice: ThemeChoice): void {
  try {
    if (choice === 'system') localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, choice);
  } catch {
    // 無法儲存時仍然套用到這次的畫面
  }
  current = choice;
  applyTheme(choice);
  for (const listener of listeners) listener();
}

export function useTheme(): [ThemeChoice, (choice: ThemeChoice) => void] {
  return [useSyncExternalStore(subscribe, getTheme, getTheme), setTheme];
}

const DARK_QUERY = '(prefers-color-scheme: dark)';

function subscribeSystem(listener: () => void): () => void {
  if (typeof window === 'undefined' || !window.matchMedia) return () => {};
  const media = window.matchMedia(DARK_QUERY);
  media.addEventListener('change', listener);
  return () => media.removeEventListener('change', listener);
}

function systemTheme(): ResolvedTheme {
  return typeof window !== 'undefined' && window.matchMedia?.(DARK_QUERY).matches ? 'dark' : 'light';
}

/** 畫面上實際的外觀：跟隨系統時看系統是不是深色 */
export function resolveTheme(choice: ThemeChoice, system: ResolvedTheme): ResolvedTheme {
  return choice === 'system' ? system : choice;
}

/**
 * 快速切換按鈕的下一個選擇：換成相反的外觀；
 * 如果剛好和系統一樣，就回到「跟隨系統」，按兩下等於恢復原狀。
 */
export function toggledTheme(choice: ThemeChoice, system: ResolvedTheme): ThemeChoice {
  const next: ResolvedTheme = resolveTheme(choice, system) === 'dark' ? 'light' : 'dark';
  return next === system ? 'system' : next;
}

export function useResolvedTheme(): { resolved: ResolvedTheme; toggle: () => void } {
  const [choice] = useTheme();
  const system = useSyncExternalStore(subscribeSystem, systemTheme, () => 'light' as const);
  return { resolved: resolveTheme(choice, system), toggle: () => setTheme(toggledTheme(choice, system)) };
}
