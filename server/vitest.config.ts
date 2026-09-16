import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
    setupFiles: ['./test/setup.ts'],
    // PGlite 啟動與 scrypt 雜湊都需要一點時間
    testTimeout: 20_000,
    hookTimeout: 30_000,
  },
});
