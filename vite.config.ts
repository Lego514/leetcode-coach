/// <reference types="vitest/config" />
import { sentryVitePlugin } from '@sentry/vite-plugin';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

// 開發時把 /api 轉給本機的後端，瀏覽器看到的是同一個網域，cookie 才能正常運作
const apiProxy = { '/api': { target: 'http://localhost:8787', changeOrigin: false } };

// Render 和 GitHub Actions 建置時會提供 commit，回報問題時附上，才知道是哪一版
const version = (process.env.RENDER_GIT_COMMIT ?? process.env.GITHUB_SHA ?? 'dev').slice(0, 7);

// 錯誤追蹤的 DSN 前後端共用：Render 上只要設定 SENTRY_DSN，建前端時也會用到（DSN 本來就是公開的）
if (process.env.SENTRY_DSN && !process.env.VITE_SENTRY_DSN) process.env.VITE_SENTRY_DSN = process.env.SENTRY_DSN;

// 有 Sentry 的 token 時（Render 上）才產生 source map：上傳給 Sentry 之後就刪掉，
// 錯誤訊息會指到原本的 TypeScript，但網站上不會公開 source map
const sentryUpload = Boolean(process.env.SENTRY_AUTH_TOKEN && process.env.SENTRY_ORG && process.env.SENTRY_PROJECT);

export default defineConfig({
  server: {
    port: 5173,
    // 5173 被占用時直接報錯，不要換埠號（換了埠號就會看到另一份本機資料）
    strictPort: true,
    proxy: apiProxy,
  },
  preview: {
    port: 4173,
    strictPort: true,
    proxy: apiProxy,
  },
  // 相對路徑，方便部署到 GitHub Pages 之類的子路徑
  base: './',
  define: {
    __APP_VERSION__: JSON.stringify(version),
  },
  build: {
    sourcemap: sentryUpload ? 'hidden' : false,
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // 由 src/pwa.ts 自己註冊，才能決定什麼時候重新載入
      injectRegister: null,
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: '刷題教練',
        short_name: '刷題教練',
        description: 'LeetCode 面試準備：學習路徑、間隔複習、筆記與模擬面試',
        lang: 'zh-Hant-TW',
        start_url: './',
        scope: './',
        display: 'standalone',
        theme_color: '#f3f5f8',
        background_color: '#f3f5f8',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        // API 一律走網路，不要被 service worker 當成頁面回應
        navigateFallbackDenylist: [/^\/api\//],
        // 新版啟用後立刻接管，不用等所有分頁關掉
        clientsClaim: true,
        skipWaiting: true,
      },
    }),
    sentryUpload
      ? sentryVitePlugin({
          org: process.env.SENTRY_ORG,
          project: process.env.SENTRY_PROJECT,
          authToken: process.env.SENTRY_AUTH_TOKEN,
          release: { name: version },
          sourcemaps: { filesToDeleteAfterUpload: ['./dist/**/*.map'] },
          telemetry: false,
        })
      : null,
  ],
  test: {
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}'],
    setupFiles: ['./src/test/setup.ts'],
  },
});
