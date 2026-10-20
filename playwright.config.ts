import { defineConfig, devices } from '@playwright/test';
import webpush from 'web-push';

// 端對端測試跑的是正式環境的建置：同一個 Node 服務提供網頁與 API。
// 先執行 npm run build:all（npm run test:e2e 會自動建置）。
// 預設用記憶體裡的 PGlite；設定 E2E_DATABASE_URL 就改連真正的 PostgreSQL（CI 就是這樣跑的）。
// 設定 E2E_BASE_URL 就測已經在跑的服務（CI 用這個測 Docker 容器），不自己啟動伺服器。
const PORT = 4310;
const external = process.env.E2E_BASE_URL;
const baseURL = external ?? `http://localhost:${PORT}`;
// 每日提醒：每次跑測試產生一對新的推播金鑰，不放進 repo（e2e/reminder.spec.ts）
const vapid = webpush.generateVAPIDKeys();

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL,
    locale: 'en-US',
    timezoneId: 'America/Los_Angeles',
    // service worker 會快取頁面，測試之間互相影響
    serviceWorkers: 'block',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    // iPhone 上所有瀏覽器都用 WebKit，IndexedDB 的行為跟 Chromium 不完全一樣。
    // 標 @desktop 的測試不在這裡跑：它們需要登入，而 WebKit 在 http://localhost 上
    // 不接受 Secure cookie（正式站是 HTTPS，不受影響）；或是用到只在桌面版側邊欄的按鈕。
    { name: 'iphone', use: { ...devices['iPhone 13'] }, grepInvert: /@desktop/ },
  ],
  webServer: external
    ? undefined
    : [
        {
          command: 'npm start',
          url: `${baseURL}/api/health`,
          // 每次都用新的伺服器，記憶體資料庫和登入次數限制才會重設
          reuseExistingServer: false,
          timeout: 60_000,
          env: {
            NODE_ENV: 'production',
            PORT: String(PORT),
            APP_ORIGINS: baseURL,
            DATABASE_URL: process.env.E2E_DATABASE_URL ?? 'pglite:memory',
            // e2e/feedback.spec.ts 用這個帳號看收件匣
            ADMIN_EMAILS: 'admin@e2e.test',
            // 用 GitHub 登入：連到下面的假 GitHub（e2e/github-login.spec.ts）
            GITHUB_CLIENT_ID: 'e2e-client',
            GITHUB_CLIENT_SECRET: 'e2e-secret',
            GITHUB_OAUTH_URL: 'http://localhost:4320',
            GITHUB_API_URL: 'http://localhost:4320',
            VAPID_PUBLIC_KEY: vapid.publicKey,
            VAPID_PRIVATE_KEY: vapid.privateKey,
            VAPID_SUBJECT: 'mailto:e2e@example.test',
            CRON_SECRET: 'e2e-cron',
          },
        },
        {
          command: 'node e2e/fake-github.mjs',
          url: 'http://localhost:4320/health',
          reuseExistingServer: false,
          timeout: 30_000,
        },
      ],
});
