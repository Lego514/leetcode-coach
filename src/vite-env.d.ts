/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

/** 建置時的 git commit（前 7 碼），回報問題時附上；本機開發是 dev */
declare const __APP_VERSION__: string;

interface ImportMetaEnv {
  /** 白板共用房間的伺服器（dsa-whiteboard 的 Cloudflare Worker）；沒設定就不能共用 */
  readonly VITE_COLLAB_URL?: string;
  /** 錯誤追蹤（Sentry）的 DSN；本來就是公開的，沒設定就不載入 Sentry */
  readonly VITE_SENTRY_DSN?: string;
}
