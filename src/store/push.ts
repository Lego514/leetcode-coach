import type { PushConfigResponse, PushSubscribeRequest } from '../../shared/protocol';
import type { Locale } from '../i18n';
import { apiRequest, type FetchLike } from './api';

// 每日提醒：這台裝置訂閱推播，伺服器在設定的時間、當天還沒練習時寄一則提醒（server/src/push/routes.ts）。
// 訂閱是每台裝置各自的，所以開關狀態看瀏覽器裡有沒有訂閱，提醒時間存在這台裝置。

const fetchImpl: FetchLike = (input, init) => fetch(input, init);
const HOUR_KEY = 'leetcode-coach:reminder-hour';
export const DEFAULT_REMINDER_HOUR = 20;

/** 這個瀏覽器能不能收推播；iPhone 要先加入主畫面、從主畫面打開才有 */
export function pushSupport(): 'ok' | 'install-first' | 'unsupported' {
  if (typeof window === 'undefined') return 'unsupported';
  if ('serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window) return 'ok';
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent);
  return ios ? 'install-first' : 'unsupported';
}

export async function fetchPushKey(): Promise<string | null> {
  try {
    return (await apiRequest<PushConfigResponse>(fetchImpl, '/api/push/config')).publicKey;
  } catch {
    return null;
  }
}

export function savedReminderHour(): number {
  try {
    const n = Number(localStorage.getItem(HOUR_KEY));
    return localStorage.getItem(HOUR_KEY) !== null && Number.isInteger(n) && n >= 0 && n <= 23 ? n : DEFAULT_REMINDER_HOUR;
  } catch {
    return DEFAULT_REMINDER_HOUR;
  }
}

function saveHour(hour: number) {
  try {
    localStorage.setItem(HOUR_KEY, String(hour));
  } catch {
    // 存不了只是下次顯示預設時間，提醒照樣由伺服器寄
  }
}

/** 等 service worker 準備好；開發模式沒有 service worker，等太久就放棄 */
async function registration(): Promise<ServiceWorkerRegistration | null> {
  const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), 10_000));
  return Promise.race([navigator.serviceWorker.ready, timeout]);
}

export async function currentSubscription(): Promise<PushSubscription | null> {
  if (pushSupport() !== 'ok') return null;
  const reg = await navigator.serviceWorker.getRegistration();
  return reg ? reg.pushManager.getSubscription() : null;
}

/** 公鑰是 base64url，訂閱時要換成位元組 */
function keyBytes(base64url: string): Uint8Array<ArrayBuffer> {
  const base64 = (base64url + '='.repeat((4 - (base64url.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i += 1) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

export type EnableResult = 'on' | 'denied' | 'unavailable';

/** 打開提醒或改時間：要通知權限、訂閱推播，再把訂閱和時間交給伺服器 */
export async function enableReminder(publicKey: string, hour: number, locale: Locale): Promise<EnableResult> {
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return 'denied';
  const reg = await registration();
  if (!reg) return 'unavailable';
  const subscription =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(publicKey) }));
  const json = subscription.toJSON();
  const body: PushSubscribeRequest = {
    endpoint: subscription.endpoint,
    keys: { p256dh: json.keys?.p256dh ?? '', auth: json.keys?.auth ?? '' },
    hour,
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    locale,
  };
  await apiRequest<void>(fetchImpl, '/api/push/subscribe', { method: 'POST', body });
  saveHour(hour);
  return 'on';
}

/** 關掉提醒：伺服器刪掉訂閱，瀏覽器也取消 */
export async function disableReminder(): Promise<void> {
  const subscription = await currentSubscription();
  if (!subscription) return;
  await apiRequest<void>(fetchImpl, '/api/push/unsubscribe', { method: 'POST', body: { endpoint: subscription.endpoint } });
  await subscription.unsubscribe();
}
