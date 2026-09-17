import { liveQuery, type Subscription } from 'dexie';
import { useSyncExternalStore } from 'react';
import type { PublicUser } from '../../shared/protocol';
import { ApiError, apiRequest, errorCode, type ClientErrorCode, type FetchLike } from './api';
import { db } from './db';
import { adoptAccount, detachAccount, runSync, SyncAbortedError, wipeLocalData } from './sync';
import { getSyncState } from './tracking';

// 帳號狀態與自動同步。整個 App 只有一份，用 useCloud() 讀取。

export type AccountStatus =
  | { kind: 'loading' }
  /** 連不到同步伺服器（例如只部署了靜態網頁），只能在本機使用 */
  | { kind: 'unavailable' }
  | { kind: 'signed-out'; expiredEmail?: string }
  | { kind: 'signed-in'; user: Pick<PublicUser, 'id' | 'email'> };

export type SyncPhase = 'idle' | 'syncing' | 'offline' | 'error';

export interface CloudState {
  account: AccountStatus;
  phase: SyncPhase;
  lastSyncedAt?: number;
  /** 最近一次同步失敗的原因 */
  error?: ClientErrorCode | 'unknown';
}

const PUSH_DELAY_MS = 1500;
const RETRY_MS = 30_000;
const POLL_MS = 5 * 60_000;
const STALE_MS = 60_000;

const fetchImpl: FetchLike = (input, init) => fetch(input, init);

let state: CloudState = { account: { kind: 'loading' }, phase: 'idle' };
const listeners = new Set<() => void>();

function setState(patch: Partial<CloudState>) {
  state = { ...state, ...patch };
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useCloud(): CloudState {
  return useSyncExternalStore(subscribe, () => state);
}

/* ---------- 自動同步 ---------- */

let running: Promise<void> | null = null;
let rerun = false;
let retryTimer: number | undefined;
let pushTimer: number | undefined;
let pollTimer: number | undefined;
let outboxWatch: Subscription | undefined;

function signedIn() {
  return state.account.kind === 'signed-in';
}

function scheduleRetry() {
  window.clearTimeout(retryTimer);
  retryTimer = window.setTimeout(() => void syncNow(), RETRY_MS);
}

async function syncLoop() {
  do {
    rerun = false;
    setState({ phase: 'syncing' });
    try {
      await runSync(db, fetchImpl);
      const { lastSyncedAt } = await getSyncState(db);
      setState({ phase: 'idle', error: undefined, lastSyncedAt });
    } catch (err) {
      if (err instanceof SyncAbortedError) return;
      if (err instanceof ApiError && err.code === 'unauthorized') {
        await sessionExpired();
        return;
      }
      const offline = err instanceof ApiError && (err.code === 'network_error' || err.code === 'unavailable');
      setState({ phase: offline ? 'offline' : 'error', error: errorCode(err) });
      scheduleRetry();
      return;
    }
  } while (rerun && signedIn());
}

/** 立刻同步；已經在同步時，結束後再跑一次 */
export function syncNow(): Promise<void> {
  if (!signedIn()) return Promise.resolve();
  if (running) {
    rerun = true;
    return running;
  }
  running = syncLoop().finally(() => {
    running = null;
  });
  return running;
}

function onOnline() {
  void syncNow();
}

function onVisible() {
  if (document.visibilityState === 'visible' && Date.now() - (state.lastSyncedAt ?? 0) > STALE_MS) void syncNow();
}

function startAutoSync() {
  stopAutoSync();
  // 待上傳清單有變動時，稍等一下再一起上傳
  outboxWatch = liveQuery(async () => {
    const rows = await db.outbox.toArray();
    return rows.length === 0 ? '' : `${rows.length}:${Math.max(...rows.map((r) => r.updatedAt))}`;
  }).subscribe({
    next: (signature) => {
      if (!signature) return;
      window.clearTimeout(pushTimer);
      pushTimer = window.setTimeout(() => void syncNow(), PUSH_DELAY_MS);
    },
    error: () => {},
  });
  window.addEventListener('online', onOnline);
  document.addEventListener('visibilitychange', onVisible);
  pollTimer = window.setInterval(() => {
    if (document.visibilityState === 'visible') void syncNow();
  }, POLL_MS);
}

function stopAutoSync() {
  outboxWatch?.unsubscribe();
  outboxWatch = undefined;
  window.clearTimeout(pushTimer);
  window.clearTimeout(retryTimer);
  window.clearInterval(pollTimer);
  window.removeEventListener('online', onOnline);
  document.removeEventListener('visibilitychange', onVisible);
}

async function sessionExpired() {
  stopAutoSync();
  const saved = await getSyncState(db);
  setState({ account: { kind: 'signed-out', expiredEmail: saved.email }, phase: 'idle', error: undefined });
}

async function enter(user: Pick<PublicUser, 'id' | 'email'>) {
  await adoptAccount(db, user);
  const saved = await getSyncState(db);
  setState({ account: { kind: 'signed-in', user: { id: user.id, email: user.email } }, lastSyncedAt: saved.lastSyncedAt, error: undefined });
  startAutoSync();
  await syncNow();
}

/* ---------- 帳號 ---------- */

let initialized = false;

/** App 啟動時呼叫一次：確認登入狀態，登入中就開始同步 */
export async function initCloud(): Promise<void> {
  if (initialized) return;
  initialized = true;
  const saved = await getSyncState(db);
  try {
    const { user } = await apiRequest<{ user: PublicUser | null }>(fetchImpl, '/api/auth/me');
    if (user) await enter(user);
    else setState({ account: { kind: 'signed-out', expiredEmail: saved.userId ? saved.email : undefined } });
  } catch (err) {
    if (saved.userId && saved.email) {
      // 離線時照樣當作已登入，恢復連線後再同步
      setState({
        account: { kind: 'signed-in', user: { id: saved.userId, email: saved.email } },
        phase: 'offline',
        lastSyncedAt: saved.lastSyncedAt,
        error: errorCode(err),
      });
      startAutoSync();
      scheduleRetry();
    } else {
      setState({ account: { kind: 'unavailable' } });
    }
  }
}

/** 重新檢查伺服器是否可用（「目前連不到同步伺服器」時使用） */
export async function retryConnection(): Promise<void> {
  initialized = false;
  setState({ account: { kind: 'loading' } });
  await initCloud();
}

export async function signIn(mode: 'login' | 'register', email: string, password: string): Promise<void> {
  const { user } = await apiRequest<{ user: PublicUser }>(fetchImpl, `/api/auth/${mode}`, {
    method: 'POST',
    body: { email, password },
  });
  await enter(user);
}

/** 寄出重設密碼的信；伺服器一律回成功，不透露 email 是否註冊過 */
export async function requestPasswordReset(email: string): Promise<void> {
  await apiRequest(fetchImpl, '/api/auth/forgot-password', { method: 'POST', body: { email } });
}

/** 用信裡的連結設定新密碼，成功後直接登入 */
export async function resetPassword(token: string, password: string): Promise<void> {
  const { user } = await apiRequest<{ user: PublicUser }>(fetchImpl, '/api/auth/reset-password', {
    method: 'POST',
    body: { token, password },
  });
  await enter(user);
}

/** 登出；keepData 為 false 時清除這個瀏覽器裡的資料 */
export async function signOut({ keepData }: { keepData: boolean }): Promise<void> {
  if (signedIn()) await syncNow();
  stopAutoSync();
  try {
    await apiRequest(fetchImpl, '/api/auth/logout', { method: 'POST' });
  } catch {
    // 離線時照樣登出本機；伺服器上的 session 會自然過期
  }
  if (keepData) await detachAccount(db);
  else await wipeLocalData(db);
  setState({ account: { kind: 'signed-out' }, phase: 'idle', lastSyncedAt: undefined, error: undefined });
}

/** 刪除帳號與雲端資料；這個瀏覽器裡的資料保留 */
export async function deleteAccount(password: string): Promise<void> {
  await apiRequest(fetchImpl, '/api/auth/delete-account', { method: 'POST', body: { password } });
  stopAutoSync();
  await detachAccount(db);
  setState({ account: { kind: 'signed-out' }, phase: 'idle', lastSyncedAt: undefined, error: undefined });
}
