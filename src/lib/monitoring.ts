import type { BrowserOptions, ErrorEvent } from '@sentry/react';

// 錯誤追蹤（Sentry）：出錯時自動回報，不用等使用者按「回報問題」。
// 只有建置時設定了 VITE_SENTRY_DSN 才會載入 Sentry（獨立的 chunk），沒設定就什麼都不做。
// 隱私：不送帳號、email、cookie、網址參數，也不記 console 的內容，只送錯誤本身。

const DSN = import.meta.env.VITE_SENTRY_DSN;

let capture: ((error: unknown) => void) | null = null;

export async function initMonitoring(): Promise<void> {
  if (!DSN || capture) return;
  const Sentry = await import('./sentry');
  Sentry.init(sentryOptions(DSN));
  capture = (error) => Sentry.captureException(error);
}

/** 程式自己接住、但不該發生的錯誤（例如路由的錯誤頁） */
export function reportError(error: unknown): void {
  capture?.(error);
}

export function sentryOptions(dsn: string): BrowserOptions {
  return {
    dsn,
    release: __APP_VERSION__,
    environment: import.meta.env.MODE,
    // 帳號、cookie、標頭、網址參數、本機變數都不收；筆記和逐字稿只在請求內容裡，也不收
    dataCollection: {
      userInfo: false,
      cookies: false,
      httpHeaders: false,
      httpBodies: [],
      urlQueryParams: false,
      stackFrameVariables: false,
    },
    // 只要錯誤，不做效能追蹤
    tracesSampleRate: 0,
    beforeSend: scrubEvent,
    beforeBreadcrumb: (crumb) => (crumb.category === 'console' ? null : crumb),
  };
}

/** 送出前拿掉可能認得出使用者的東西 */
export function scrubEvent(event: ErrorEvent): ErrorEvent {
  delete event.user;
  if (event.request) {
    delete event.request.cookies;
    delete event.request.headers;
    delete event.request.data;
    if (event.request.url) event.request.url = stripQuery(event.request.url);
    delete event.request.query_string;
  }
  // 換頁和連線的紀錄也有網址（重設密碼的連結是 #/reset?token=…）
  for (const crumb of event.breadcrumbs ?? []) {
    if (!crumb.data) continue;
    for (const key of ['url', 'from', 'to']) {
      const value: unknown = crumb.data[key];
      if (typeof value === 'string') crumb.data = { ...crumb.data, [key]: stripQuery(value) };
    }
  }
  return event;
}

/** 網址只留路徑：查詢參數可能帶著重設密碼的 token 之類的東西 */
export function stripQuery(url: string): string {
  const cut = url.indexOf('?');
  if (cut < 0) return url;
  const hash = url.indexOf('#', cut);
  return url.slice(0, cut) + (hash >= 0 ? stripHashQuery(url.slice(hash)) : '');
}

function stripHashQuery(hash: string): string {
  const cut = hash.indexOf('?');
  return cut < 0 ? hash : hash.slice(0, cut);
}
