import { useSyncExternalStore } from 'react';
import { LLM_PROVIDERS, type LlmConfig } from '../lib/llm';

// 使用者自己的 AI 金鑰：只存在這個瀏覽器的 localStorage。
// 刻意不經過 actions.ts 和同步的待上傳清單，金鑰永遠不會送到我們的伺服器，也不會出現在其他裝置。

const STORAGE_KEY = 'leetcode-coach:own-ai';

function read(): LlmConfig | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as Partial<LlmConfig>;
    if (!value.provider || !(LLM_PROVIDERS as readonly string[]).includes(value.provider) || !value.apiKey || !value.model) return null;
    return { provider: value.provider, apiKey: value.apiKey, model: value.model };
  } catch {
    // 私密瀏覽或封鎖網站資料時讀不到，當作沒設定
    return null;
  }
}

let current: LlmConfig | null = read();
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

/** 存起來；存不了（例如私密瀏覽）時只在這次開著的頁面有效 */
export function saveOwnAi(config: LlmConfig): void {
  current = { provider: config.provider, apiKey: config.apiKey.trim(), model: config.model.trim() };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  } catch {
    // 存不了就算了，這次還是能用
  }
  emit();
}

export function clearOwnAi(): void {
  current = null;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // 一樣忽略
  }
  emit();
}

/** 目前設定的金鑰；沒有是 null */
export function ownAi(): LlmConfig | null {
  return current;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  // 別的分頁改了也跟著更新
  const onStorage = (e: StorageEvent) => {
    if (e.key !== STORAGE_KEY) return;
    current = read();
    listener();
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
}

export function useOwnAi(): LlmConfig | null {
  return useSyncExternalStore(subscribe, () => current);
}

/** 畫面上顯示的金鑰：只露出開頭和最後四碼 */
export function maskKey(key: string): string {
  if (key.length <= 12) return '••••';
  return `${key.slice(0, 6)}…${key.slice(-4)}`;
}
