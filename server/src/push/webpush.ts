import webpush from 'web-push';
import type { PushSender } from './routes';

/**
 * 用 VAPID 金鑰寄推播（Web Push 協定，Chrome、Firefox、Safari 都一樣）。
 * subject 是推播服務出問題時聯絡得到你的網址或 mailto:。
 */
export function createWebPushSender(publicKey: string, privateKey: string, subject: string): PushSender {
  const vapidDetails = { subject, publicKey, privateKey };
  return async (target, message) => {
    try {
      await webpush.sendNotification(
        { endpoint: target.endpoint, keys: { p256dh: target.p256dh, auth: target.auth } },
        JSON.stringify(message),
        // 一天內送不到就不用送了，隔天又是新的提醒
        { vapidDetails, TTL: 12 * 60 * 60, urgency: 'normal' },
      );
      return 'sent';
    } catch (error) {
      // 使用者取消了通知權限、或解除安裝：推播服務回 404 或 410，這個訂閱可以刪掉
      const status = (error as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) return 'gone';
      throw error;
    }
  };
}
