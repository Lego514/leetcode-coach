import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import gifenc from 'gifenc';
import { demoData } from '../../src/lib/demo';

// README 的截圖和動畫共用：示範資料、假的語音辨識和 AI、示範帳號、把畫面編成 GIF。

export const OUT = path.resolve('docs/images');
// gifenc 是 CommonJS，只能整包匯入
const { applyPalette, GIFEncoder, quantize } = gifenc;
export const VIEWPORT = { width: 1280, height: 800 };

function dayOffset(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

/** 示範資料（跟 App 裡「用示範資料看看」同一份），包成備份檔從設定頁匯入 */
export function demoBackup() {
  const demo = demoData(dayOffset(0));
  return {
    app: 'leetcode-coach',
    version: 1,
    exportedAt: new Date().toISOString(),
    data: {
      progress: [],
      attempts: demo.attempts,
      notes: [],
      meta: [],
      patternNotes: [],
      // 講解練習：進度頁的講解曲線用
      mocks: demo.mocks,
      customProblems: [],
      settings: demo.settings,
      cardReviews: demo.cardReviews,
      stories: demo.stories,
      rehearsals: demo.rehearsals,
      boards: demo.boards,
    },
  };
}

export async function importDemo(page: Page) {
  const file = path.join(test.info().outputDir, 'demo-backup.json');
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(demoBackup()));
  await page.goto('/#/settings');
  await page.locator('input[type="file"]').setInputFiles(file);
  await page.getByRole('button', { name: 'Import and replace' }).click();
  await expect(page.getByRole('status')).toContainText('Backup imported.');
}

/** 不呼叫真正的 Claude、語音辨識換成可以餵句子的假物件，再登入這台測試伺服器上的示範帳號（AI 回饋要登入） */
export async function prepareDemoAccount(page: Page, email = 'demo@leetcode-coach.test'): Promise<void> {
  // 不呼叫真正的 Claude；語音辨識換成可以餵句子的假物件
  await page.addInitScript(() => {
    class FakeRecognition {
      lang = '';
      continuous = false;
      interimResults = false;
      onresult: ((event: unknown) => void) | null = null;
      onerror: ((event: unknown) => void) | null = null;
      onend: (() => void) | null = null;
      constructor() {
        (window as unknown as { __recognition: FakeRecognition }).__recognition = this;
      }
      start() {}
      stop() {
        setTimeout(() => this.onend?.(), 10);
      }
      abort() {}
    }
    const w = window as unknown as Record<string, unknown>;
    w.SpeechRecognition = FakeRecognition;
    w.webkitSpeechRecognition = FakeRecognition;
  });
  await page.route('**/api/ai/status', (route) => route.fulfill({ json: { available: true, dailyLimit: 20, usedToday: 2 } }));
  await page.route('**/api/ai/explanation-feedback', (route) =>
    route.fulfill({
      json: {
        usedToday: 3,
        dailyLimit: 20,
        feedback: {
          summary: 'Clear key insight and complexity. Walk through an example and name an edge case to make it complete.',
          points: [
            { id: 'insight', score: 2, comment: 'You explained why sorting lets two pointers skip duplicates.' },
            { id: 'structure', score: 2, comment: 'Sorting plus two pointers is justified against the hash set version.' },
            { id: 'walkthrough', score: 1, comment: 'You started an example but didn’t finish it.' },
            { id: 'complexity', score: 2, comment: 'O(n²) time and O(1) extra space, both explained.' },
            { id: 'edge', score: 0, comment: 'No edge cases, like all zeros.' },
          ],
          strengths: ['Led with the key insight', 'Compared it with the brute force'],
          improvements: [{ quote: 'and then I just move them', suggestion: 'Say which pointer moves and why: “if the sum is too small, move the left pointer right.”' }],
          improvedScript:
            'Sort the array, fix one number, and find the other two with two pointers. If the sum is too small, move the left pointer right; too big, move the right one left. Skip equal neighbors to avoid duplicate triplets. It runs in O(n²) time with O(1) extra space.',
        },
      },
    }),
  );

  await importDemo(page);
  // 登入（只有這台測試伺服器上的示範帳號），AI 回饋要登入才能用
  await page.goto('/#/account');
  const account = page.getByRole('region', { name: 'Account & sync' });
  await account.getByRole('button', { name: 'Register' }).click();
  await account.getByLabel('Email', { exact: true }).fill(email);
  await account.getByLabel('Password').fill('demo-password-123');
  await account.getByRole('button', { name: 'Create account' }).click();
  await expect(account.getByText(email)).toBeVisible();

}

/** 把一格一格的畫面（RGBA）編成 GIF；每一格自己的調色盤，字才清楚 */
export function writeGif(file: string, frames: { rgba: Uint8Array; delay: number }[], size: { width: number; height: number }): void {
  const gif = GIFEncoder();
  for (const { rgba, delay } of frames) {
    const colors = quantize(rgba, 256);
    gif.writeFrame(applyPalette(rgba, colors), size.width, size.height, { palette: colors, delay });
  }
  gif.finish();
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, gif.bytes());
}
