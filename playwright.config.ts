import { defineConfig, devices } from '@playwright/test';

// 端對端測試跑的是正式環境的建置：同一個 Node 服務提供網頁與 API。
// 先執行 npm run build:all（npm run test:e2e 會自動建置）。
// 預設用記憶體裡的 PGlite；設定 E2E_DATABASE_URL 就改連真正的 PostgreSQL（CI 就是這樣跑的）。
const PORT = 4310;
const baseURL = `http://localhost:${PORT}`;

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
    // iPhone 上所有瀏覽器都用 WebKit，IndexedDB 的行為跟 Chromium 不完全一樣
    { name: 'iphone', use: { ...devices['iPhone 13'] } },
  ],
  webServer: {
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
    },
  },
});
