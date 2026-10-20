import { expect, test } from '@playwright/test';

// 每日提醒：瀏覽器的通知權限和推播訂閱換成假的（測試裡沒有推播服務，service worker 也關掉了），
// 確認設定頁會把訂閱和時間交給伺服器、關掉時取消。真的寄送在 server/test/push.test.ts 測。
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const KEY = 'e2e:push-sub';
    const fake = (endpoint: string) => ({
      endpoint,
      toJSON: () => ({ endpoint, keys: { p256dh: 'e2e-p256dh', auth: 'e2e-auth' } }),
      unsubscribe: async () => {
        localStorage.removeItem(KEY);
        return true;
      },
    });
    const pushManager = {
      getSubscription: async () => {
        const endpoint = localStorage.getItem(KEY);
        return endpoint ? fake(endpoint) : null;
      },
      subscribe: async () => {
        localStorage.setItem(KEY, 'https://push.example.test/e2e-device');
        return fake('https://push.example.test/e2e-device');
      },
    };
    const registration = { pushManager };
    Object.defineProperty(navigator.serviceWorker, 'ready', { get: () => Promise.resolve(registration) });
    navigator.serviceWorker.getRegistration = async () => registration as unknown as ServiceWorkerRegistration;
    Notification.requestPermission = async () => 'granted';
  });
});

test('turns the daily reminder on, changes the time, and turns it off @desktop', async ({ page }) => {
  // 沒登入：只說要登入
  await page.goto('/#/settings');
  const reminder = page.getByRole('region', { name: 'Daily reminder' });
  await expect(reminder).toContainText('Sign in to turn on daily reminders');

  await page.goto('/#/account');
  const account = page.getByRole('region', { name: 'Account & sync' });
  await account.getByRole('group', { name: 'Sign in or register' }).getByRole('button', { name: 'Register' }).click();
  await account.getByLabel('Email', { exact: true }).fill('reminder@e2e.test');
  await account.getByLabel('Password').fill('e2e-password-123');
  await account.getByRole('button', { name: 'Create account' }).last().click();
  await expect(account.getByText('reminder@e2e.test')).toBeVisible();

  await page.goto('/#/settings');
  const toggle = reminder.getByLabel('Remind me if I haven’t practiced today');
  await expect(toggle).not.toBeChecked();
  await reminder.getByLabel('Reminder time').selectOption('9');

  // 打開：訂閱交給伺服器，時區是瀏覽器的
  const subscribed = page.waitForRequest((r) => r.url().endsWith('/api/push/subscribe'));
  await toggle.click();
  const body = (await subscribed).postDataJSON();
  expect(body).toMatchObject({ endpoint: 'https://push.example.test/e2e-device', hour: 9, timeZone: 'America/Los_Angeles', locale: 'en' });
  await expect(toggle).toBeChecked();
  await expect(page.getByText('You’ll get a reminder at 09:00 every day')).toBeVisible();

  // 重新整理後還記得；改時間會再送一次
  await page.reload();
  await expect(toggle).toBeChecked();
  await expect(reminder.getByLabel('Reminder time')).toHaveValue('9');
  const changed = page.waitForRequest((r) => r.url().endsWith('/api/push/subscribe'));
  await reminder.getByLabel('Reminder time').selectOption('21');
  expect((await changed).postDataJSON()).toMatchObject({ hour: 21 });

  // 關掉
  const removed = page.waitForResponse((r) => r.url().endsWith('/api/push/unsubscribe'));
  await toggle.click();
  expect((await removed).status()).toBe(204);
  await expect(toggle).not.toBeChecked();
});
