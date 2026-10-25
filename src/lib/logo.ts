import { useSyncExternalStore } from 'react';
import acornUrl from '../assets/logos/acorn.svg';
import sproutUrl from '../assets/logos/sprout.svg';
import treeUrl from '../assets/logos/tree.svg';

// App 的圖示可以自己選：方格（原本的）、方格長成的樹、一根小芽、一顆橡實。
// 跟深色模式一樣是個人的外觀偏好，只存在這台裝置（localStorage）。
// 換的是側邊欄的 logo 和瀏覽器分頁的小圖示；加到手機桌面的 App 圖示在安裝時就固定了，網頁換不了。

export const LOGOS = ['grid', 'tree', 'sprout', 'acorn'] as const;
export type LogoChoice = (typeof LOGOS)[number];

const KEY = 'leetcode-coach:logo';

/** 每個圖示的檔案；方格就是原本的 favicon */
export const LOGO_URLS: Record<LogoChoice, string> = { grid: './favicon.svg', tree: treeUrl, sprout: sproutUrl, acorn: acornUrl };

/** 存的值不認得（或沒存）就用方格 */
export function parseLogo(value: string | null | undefined): LogoChoice {
  return LOGOS.find((id) => id === value) ?? 'grid';
}

function readLogo(): LogoChoice {
  try {
    return parseLogo(localStorage.getItem(KEY));
  } catch {
    return 'grid';
  }
}

/** 瀏覽器分頁的小圖示跟著換 */
export function applyLogo(choice: LogoChoice = readLogo()): void {
  const link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
  if (link) link.href = LOGO_URLS[choice];
}

// 側邊欄和設定頁共用這份狀態，任何一邊改了另一邊馬上跟著變
let current: LogoChoice | undefined;
const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getLogo(): LogoChoice {
  current ??= readLogo();
  return current;
}

export function setLogo(choice: LogoChoice): void {
  try {
    if (choice === 'grid') localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, choice);
  } catch {
    // 無法儲存時仍然套用到這次的畫面
  }
  current = choice;
  applyLogo(choice);
  for (const listener of listeners) listener();
}

export function useLogo(): [LogoChoice, (choice: LogoChoice) => void] {
  return [useSyncExternalStore(subscribe, getLogo, getLogo), setLogo];
}
