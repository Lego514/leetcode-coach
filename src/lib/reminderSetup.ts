// 今天頁的「每日提醒」引導卡：依裝置和帳號狀態，只顯示下一步要做的事。
// iPhone 要先用 Safari 加入主畫面、從主畫面打開才收得到推播，這一步最容易卡住，所以最先處理。

export type ReminderStep =
  /** 不用顯示：伺服器沒開提醒、已經開了、按過「不用了」，或這個瀏覽器收不到 */
  | 'none'
  /** iPhone 的 Safari：加入主畫面 */
  | 'install-ios'
  /** iPhone 上的其他瀏覽器（Chrome 等）：要改用 Safari 才能加入主畫面 */
  | 'use-safari'
  /** 從主畫面打開了但還沒登入：提醒由伺服器寄，要先登入 */
  | 'sign-in'
  /** 一顆按鈕打開提醒 */
  | 'enable';

export interface ReminderEnv {
  /** 伺服器有設定推播金鑰 */
  available: boolean;
  dismissed: boolean;
  ios: boolean;
  /** iPhone 上的 Safari（不是 Chrome、Firefox 或 App 內建的瀏覽器） */
  iosSafari: boolean;
  /** 從主畫面打開（加入主畫面或安裝成 App） */
  standalone: boolean;
  /** 這個瀏覽器能收推播 */
  pushReady: boolean;
  signedIn: boolean;
  /** 這台裝置已經開了提醒 */
  subscribed: boolean;
}

export function reminderStep(env: ReminderEnv): ReminderStep {
  if (!env.available || env.dismissed || env.subscribed) return 'none';
  if (env.ios && !env.standalone) return env.iosSafari ? 'install-ios' : 'use-safari';
  if (!env.pushReady) return 'none';
  // 沒安裝、沒登入的人，今天頁已經有登入的提示；裝到主畫面的人是為了提醒來的，才在這裡請他登入
  if (!env.signedIn) return env.standalone ? 'sign-in' : 'none';
  return 'enable';
}

/** 從瀏覽器的 user agent 判斷 iPhone、iPad（iPadOS 的 Safari 會假裝成 Mac，用觸控點數分辨） */
export function detectIos(userAgent: string, maxTouchPoints: number): { ios: boolean; iosSafari: boolean } {
  const ios = /iPhone|iPad|iPod/.test(userAgent) || (/Macintosh/.test(userAgent) && maxTouchPoints > 1);
  // iPhone 上的 Chrome、Firefox、Edge 和 App 內建瀏覽器都不能加入主畫面收通知
  const otherBrowser = /CriOS|FxiOS|EdgiOS|OPiOS|GSA\/|Instagram|FBAN|FBAV|Line\//.test(userAgent);
  return { ios, iosSafari: ios && !otherBrowser };
}
