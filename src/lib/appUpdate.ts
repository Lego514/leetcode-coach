import { useSyncExternalStore } from 'react';

// service worker 下載好新版後，等到使用者不在計時中的頁面才重新載入，
// 免得練習或模擬面試進行到一半被打斷。

type Listener = () => void;

const listeners = new Set<Listener>();
let ready = false;
let handler: (() => Promise<void>) | null = null;

function emit() {
  for (const listener of listeners) listener();
}

/** service worker 註冊時提供「套用新版並重新載入」的方法 */
export function setUpdateHandler(fn: () => Promise<void>): void {
  handler = fn;
}

/** 新版已經下載好 */
export function markUpdateReady(): void {
  if (ready) return;
  ready = true;
  emit();
}

export function isUpdateReady(): boolean {
  return ready;
}

export function subscribeUpdate(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useUpdateReady(): boolean {
  return useSyncExternalStore(subscribeUpdate, isUpdateReady, () => false);
}

export async function applyUpdate(): Promise<void> {
  if (!handler) {
    window.location.reload();
    return;
  }
  await handler();
}

/** 計時中的頁面不自動重新載入；其餘頁面隨時可以 */
export function canReloadNow(pathname: string): boolean {
  return !/^\/(practice|mock)\b/.test(pathname);
}

/** 測試用：清掉狀態 */
export function resetUpdateState(): void {
  ready = false;
  handler = null;
  listeners.clear();
}
