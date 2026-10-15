import * as Sentry from '@sentry/node';

// 錯誤追蹤（Sentry）：有設定 SENTRY_DSN 才啟用。只送錯誤，不做效能追蹤。
// 隱私：不收帳號、cookie、標頭、請求內容（筆記、逐字稿、密碼都在裡面）、AI 的輸入輸出、資料庫的值和本機變數。

export type ReportError = (error: unknown, message: string) => void;

const DROPPED_INTEGRATIONS = new Set(['ProcessSession', 'Console', 'LocalVariablesAsync']);

export function initMonitoring(dsn: string | undefined, release: string | undefined): ReportError | undefined {
  if (!dsn) return undefined;
  Sentry.init({
    dsn,
    release,
    environment: 'production',
    tracesSampleRate: 0,
    dataCollection: {
      userInfo: false,
      cookies: false,
      httpHeaders: false,
      httpBodies: [],
      urlQueryParams: false,
      genAI: { inputs: false, outputs: false },
      databaseQueryData: false,
      stackFrameVariables: false,
    },
    // 不要 session 統計（會帶使用者識別）、console 的 log 和本機變數
    integrations: (defaults) => defaults.filter((i) => !DROPPED_INTEGRATIONS.has(i.name)),
    beforeSend: scrubEvent,
  });
  return (error, message) => {
    Sentry.captureException(error, { extra: { context: message } });
  };
}

/** 關閉前把還沒送出的錯誤送完 */
export async function flushMonitoring(): Promise<void> {
  await Sentry.close(2000);
}

/** 送出前再擋一次可能認得出使用者的東西 */
export function scrubEvent<T extends Sentry.ErrorEvent>(event: T): T {
  delete event.user;
  if (event.request) {
    delete event.request.cookies;
    delete event.request.headers;
    delete event.request.data;
    delete event.request.query_string;
    if (event.request.url) event.request.url = event.request.url.split('?')[0];
  }
  return event;
}
