import { defineConfig, devices } from '@playwright/test';
import base from './playwright.config';

// README 用的截圖：npm run screenshots（會先建置），圖存到 docs/images/。
// 跟端對端測試用同一個正式建置的伺服器（記憶體資料庫），資料是腳本自己產生的示範資料。
export default defineConfig({
  ...base,
  testDir: './scripts/screenshots',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  projects: [{ name: 'screenshots', use: { ...devices['Desktop Chrome'], deviceScaleFactor: 2 } }],
});
