// 網頁的 Content-Security-Policy：建置時由 vite.config.ts 放進 index.html 的 <meta>，
// Cloudflare 和 Node 伺服器送出的是同一份 HTML，所以兩邊的規則一定一樣。
// 最重要的是 script-src 'self'：只能執行我們自己網站上的檔案。使用者自己的 AI 金鑰存在 localStorage，
// 頁面上能跑的程式都讀得到，所以不能讓別人塞進來的程式跑起來。
// frame-ancestors 放在 <meta> 裡沒有作用，改在回應的標頭（public/_headers、server/src/app.ts）。

/** 使用者自己的金鑰直接從瀏覽器呼叫的 AI 服務（src/lib/llm.ts） */
export const AI_ORIGINS = ['https://api.anthropic.com', 'https://api.openai.com', 'https://openrouter.ai'] as const;

export interface CspSources {
  /** 白板共用房間的伺服器（VITE_COLLAB_URL），要同時允許 http(s) 和 ws(s) */
  collabUrl?: string;
  /** 錯誤追蹤的 DSN（VITE_SENTRY_DSN），只需要它的網域 */
  sentryDsn?: string;
}

function originOf(url: string | undefined): string | null {
  if (!url) return null;
  try {
    const { protocol, host } = new URL(url);
    return protocol === 'http:' || protocol === 'https:' ? `${protocol}//${host}` : null;
  } catch {
    // 設定寫錯的話建置照樣成功，只是那個服務會被擋，跟沒設定一樣
    return null;
  }
}

function socketOrigin(httpOrigin: string): string {
  return httpOrigin.replace(/^http/, 'ws');
}

export function connectSources({ collabUrl, sentryDsn }: CspSources): string[] {
  const collab = originOf(collabUrl);
  const sentry = originOf(sentryDsn);
  return ["'self'", ...AI_ORIGINS, ...(collab ? [collab, socketOrigin(collab)] : []), ...(sentry ? [sentry] : [])];
}

export function contentSecurityPolicy(sources: CspSources): string {
  const directives: Record<string, string[]> = {
    'default-src': ["'self'"],
    'script-src': ["'self'"],
    // React 和白板會寫 style 屬性；樣式塞不進可以執行的程式，代價比較小
    'style-src': ["'self'", "'unsafe-inline'"],
    // 分享圖片、匯出的白板、錄下來的講解都是 blob: 或 data:
    'img-src': ["'self'", 'data:', 'blob:'],
    'media-src': ["'self'", 'blob:'],
    'font-src': ["'self'", 'data:'],
    'connect-src': connectSources(sources),
    'worker-src': ["'self'"],
    'manifest-src': ["'self'"],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
  };
  return Object.entries(directives)
    .map(([name, values]) => `${name} ${values.join(' ')}`)
    .join('; ');
}
