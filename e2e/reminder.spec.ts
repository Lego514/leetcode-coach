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

async function register(page: import('@playwright/test').Page, email: string) {
  await page.goto('/#/account');
  const account = page.getByRole('region', { name: 'Account & sync' });
  await account.getByRole('group', { name: 'Sign in or register' }).getByRole('button', { name: 'Register' }).click();
  await account.getByLabel('Email', { exact: true }).fill(email);
  await account.getByLabel('Password').fill('e2e-password-123');
  await account.getByRole('button', { name: 'Create account' }).last().click();
  await expect(account.getByText(email)).toBeVisible();
}

const card = (page: import('@playwright/test').Page) => page.getByRole('complementary', { name: /reminder/ });
const todayHeading = (page: import('@playwright/test').Page) => page.getByRole('heading', { name: 'Today', level: 1 });

// 註冊有每個 IP 每小時 10 次的限制，整套 e2e 共用一台伺服器，所以要登入的情境都放在這一個測試裡
test('turns the reminder on from Today, changes it in Settings, turns it off, and can say no thanks @desktop', async ({ page }) => {
  // 沒登入：設定頁只說要登入，今天頁不放提醒卡
  await page.goto('/#/settings');
  const reminder = page.getByRole('region', { name: 'Daily reminder' });
  await expect(reminder).toContainText('Sign in to turn on daily reminders');
  await page.goto('/');
  await expect(todayHeading(page)).toBeVisible();
  await expect(card(page)).toHaveCount(0);

  await register(page, 'reminder@e2e.test');

  // 今天頁一鍵打開：時間是預設的 20:00，時區是瀏覽器的
  await page.goto('/');
  await expect(card(page)).toContainText('Get a daily practice reminder');
  const subscribed = page.waitForRequest((r) => r.url().endsWith('/api/push/subscribe'));
  await card(page).getByRole('button', { name: 'Remind me at 20:00' }).click();
  expect((await subscribed).postDataJSON()).toMatchObject({
    endpoint: 'https://push.example.test/e2e-device',
    hour: 20,
    timeZone: 'America/Los_Angeles',
    locale: 'en',
  });
  await expect(card(page)).toHaveCount(0);
  await expect(page.getByText('You’ll get a reminder at 20:00 every day')).toBeVisible();
  await page.reload();
  await expect(todayHeading(page)).toBeVisible();
  await expect(card(page)).toHaveCount(0);

  // 設定頁看得到已經打開；改時間會再送一次
  await page.goto('/#/settings');
  const toggle = reminder.getByLabel('Remind me if I haven’t practiced today');
  await expect(toggle).toBeChecked();
  await expect(reminder.getByLabel('Reminder time')).toHaveValue('20');
  const changed = page.waitForRequest((r) => r.url().endsWith('/api/push/subscribe'));
  await reminder.getByLabel('Reminder time').selectOption('9');
  expect((await changed).postDataJSON()).toMatchObject({ hour: 9 });

  // 關掉
  const removed = page.waitForResponse((r) => r.url().endsWith('/api/push/unsubscribe'));
  await toggle.click();
  expect((await removed).status()).toBe(204);
  await expect(toggle).not.toBeChecked();

  // 關掉之後今天頁又會問；按「不用了」就不再出現
  await page.goto('/');
  await expect(card(page)).toContainText('Remind me at 09:00');
  await card(page).getByRole('button', { name: 'No thanks' }).click();
  await expect(card(page)).toHaveCount(0);
  await page.reload();
  await expect(todayHeading(page)).toBeVisible();
  await expect(card(page)).toHaveCount(0);
});

const IPHONE_SAFARI =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';

test.describe('on iPhone', () => {
  test.use({ viewport: { width: 390, height: 844 }, userAgent: IPHONE_SAFARI });

  test('Safari asks to add the app to the home screen first, in place of the sign-in banner @desktop', async ({ page }) => {
    await page.goto('/');
    await expect(card(page)).toContainText('Tap Share at the bottom of Safari, choose Add to Home Screen');
    await expect(page.getByRole('complementary', { name: /Sign in/ })).toHaveCount(0);
  });

  test('another browser is pointed to Safari @desktop', async ({ page }) => {
    await page.addInitScript(() => {
      // 不碰真的剪貼簿：其他平行跑的測試也會讀寫它
      Object.defineProperty(navigator, 'clipboard', { get: () => ({ writeText: async (text: string) => void ((window as { copied?: string }).copied = text) }) });
      // iPhone 上的 Chrome：user agent 裡有 CriOS
      Object.defineProperty(navigator, 'userAgent', { get: () => 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/130.0.0.0 Mobile/15E148 Safari/604.1' });
    });
    await page.goto('/');
    await expect(card(page)).toContainText('open this page in Safari');
    await card(page).getByRole('button', { name: 'Copy link' }).click();
    await expect(page.getByText('Link copied. Paste it into Safari.')).toBeVisible();
    expect(await page.evaluate(() => (window as { copied?: string }).copied)).toMatch(/^http:\/\/localhost:\d+\/$/);
  });

  test('opened from the home screen, asks to sign in with GitHub @desktop', async ({ page }) => {
    await page.addInitScript(() => Object.defineProperty(navigator, 'standalone', { get: () => true }));
    await page.goto('/');
    await expect(card(page)).toContainText('Sign in to get daily reminders');
    await expect(card(page).getByRole('link', { name: 'Sign in with GitHub' })).toHaveAttribute('href', /api\/auth\/github\/start\?intent=signin/);
  });
});
