// 每日提醒的推播：由 Workbox 產生的 service worker 用 importScripts 載入（vite.config.ts）。
// 伺服器送來的是 { title, body, url }，點通知時打開（或切到）App。

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : '' };
  }
  const base = self.registration.scope;
  event.waitUntil(
    self.registration.showNotification(data.title || 'LeetCode Coach', {
      body: data.body || '',
      icon: `${base}pwa-192.png`,
      badge: `${base}pwa-192.png`,
      // 同一天只留最新的一則
      tag: 'daily-reminder',
      data: { url: new URL(data.url || './', base).href },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || self.registration.scope;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      const open = windows.find((w) => w.url.startsWith(self.registration.scope));
      if (open) return open.focus();
      return self.clients.openWindow(url);
    }),
  );
});
