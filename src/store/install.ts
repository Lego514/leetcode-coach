import { useSyncExternalStore } from 'react';

// Android 的 Chrome、桌面的 Chrome / Edge 可以安裝成 App：瀏覽器準備好時會發 beforeinstallprompt，
// 先收起來，使用者按「安裝 App」時再叫出系統的安裝視窗。這個事件很早就發，所以在 main.tsx 一開始就開始聽。

interface InstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferred: InstallPromptEvent | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function initInstallPrompt(): void {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e as InstallPromptEvent;
    emit();
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    emit();
  });
}

/** 可以安裝時回傳「叫出安裝視窗」的函式；不能安裝（已經裝了、瀏覽器不支援）時是 null */
export function useInstallPrompt(): (() => Promise<void>) | null {
  const event = useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => deferred,
  );
  if (!event) return null;
  return async () => {
    await event.prompt();
    await event.userChoice;
    // 一個事件只能叫一次視窗
    deferred = null;
    emit();
  };
}
