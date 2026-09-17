import { registerSW } from 'virtual:pwa-register';
import { markUpdateReady, setUpdateHandler } from './lib/appUpdate';

/** 每小時檢查一次新版，回到分頁時也檢查一次 */
const CHECK_INTERVAL_MS = 60 * 60 * 1000;

/**
 * 註冊 service worker 並接手「什麼時候重新載入」。
 * autoUpdate 模式預設會在新版啟用時立刻重新載入頁面，
 * 這裡改成先通知畫面，練習或模擬面試進行中就等離開那一頁再套用（見 lib/appUpdate）。
 */
export function initPwaUpdates(): void {
  const updateSW = registerSW({
    immediate: true,
    onRegisteredSW: (_swUrl, registration) => {
      if (!registration) return;
      const check = () => {
        if (document.visibilityState === 'visible') void registration.update();
      };
      window.setInterval(check, CHECK_INTERVAL_MS);
      document.addEventListener('visibilitychange', check);
    },
    // autoUpdate 模式走這個；prompt 模式走 onNeedRefresh
    onNeedReload: () => markUpdateReady(),
    onNeedRefresh: () => markUpdateReady(),
  });

  setUpdateHandler(async () => {
    await updateSW(true);
    window.location.reload();
  });
}
