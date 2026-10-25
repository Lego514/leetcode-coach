import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { demoData } from '../../src/lib/demo';

// README 的截圖，淺色和深色各一張。資料是 src/lib/demo.ts 的示範紀錄（約六週的練習），不是任何人的真實資料。
// 執行：npm run screenshots（最後再跑 capybara.ts 畫卡皮巴拉的動畫）

const OUT = path.resolve('docs/images');
const VIEWPORT = { width: 1280, height: 800 };

function dayOffset(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

/** 示範資料（跟 App 裡「用示範資料看看」同一份），包成備份檔從設定頁匯入 */
function demoBackup() {
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
    },
  };
}

async function importDemo(page: Page) {
  const file = path.join(test.info().outputDir, 'demo-backup.json');
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(demoBackup()));
  await page.goto('/#/settings');
  await page.locator('input[type="file"]').setInputFiles(file);
  await page.getByRole('button', { name: 'Import and replace' }).click();
  await expect(page.getByRole('status')).toContainText('Backup imported.');
}

/** 準備好畫面一次，再切換淺色、深色各截一張（同一個畫面，不用再操作一次） */
async function shoot(page: Page, name: string, prepare: () => Promise<void>) {
  await page.emulateMedia({ colorScheme: 'light' });
  await prepare();
  for (const scheme of ['light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme: scheme });
    // 等字型和動畫穩定
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(OUT, `${name}-${scheme}.png`) });
  }
}

test('README screenshots', async ({ page }) => {
  test.setTimeout(180_000);
  await page.setViewportSize(VIEWPORT);
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
  await account.getByLabel('Email', { exact: true }).fill('demo@leetcode-coach.test');
  await account.getByLabel('Password').fill('demo-password-123');
  await account.getByRole('button', { name: 'Create account' }).click();
  await expect(account.getByText('demo@leetcode-coach.test')).toBeVisible();

  mkdirSync(OUT, { recursive: true });

  // 1. 今天頁：今天的目標、演算法樹、右上角的卡皮巴拉和對話框，下面是複習和新題
  await shoot(page, 'today', async () => {
    await page.goto('/');
    await expect(page.getByRole('region', { name: /^New problems for today/ })).toBeVisible();
    await expect(page.locator('.today-card-pet')).toBeVisible();
    // 登入後會出現每日提醒的引導卡，先關掉，今天的目標才完整露出來
    await page.getByRole('button', { name: 'No thanks' }).click();
    await page.evaluate(() => window.scrollTo(0, 0));
  });

  // 2. 計時練習：解題步驟一次一步，計時、卡住了、寫完了在下面
  await shoot(page, 'practice', async () => {
    await page.goto('/#/practice/15');
    // 一打開就開始計時；寫第一步，再到第二步寫例子和邊界情況
    const steps = page.getByRole('region', { name: 'Solving steps' });
    await steps.getByLabel('What the problem asks').fill('Return unique triplets that sum to 0; the input can have duplicates.');
    await steps.getByRole('button', { name: 'Next' }).click();
    await steps.getByRole('textbox', { name: 'Example', exact: true }).fill('[-1, 0, 1, 2, -1, -4] gives [-1, -1, 2] and [-1, 0, 1].');
    await steps.getByLabel('Edge cases').fill('All zeros; fewer than three numbers.');
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    await expect(page.getByText('Saving…')).toHaveCount(0, { timeout: 5000 });
    await page.evaluate(() => window.scrollTo(0, 0));
  });

  // 3. 白板：滑動視窗的模板
  await shoot(page, 'whiteboard', async () => {
    await page.goto('/#/board/3');
    await page.getByRole('button', { name: /^Sliding window/ }).click();
    await page.keyboard.press('Escape');
    // 等「儲存中」變成已儲存
    await expect(page.getByText('Saving…')).toHaveCount(0, { timeout: 5000 });
  });

  // 4. 講解練習：逐字稿和 AI 回饋
  await shoot(
    page,
    'ai-feedback',
    async () => {
      await page.goto('/#/mock?problem=15&kind=explain');
      await page.getByLabel('Record my explanation').uncheck();
      await page.getByLabel('Transcribe what I say').check();
      await page.getByRole('button', { name: 'Start timer' }).click();
      for (const point of ['The key insight, i.e. why the approach works', 'Which data structure you used, and why', 'Time and space complexity']) {
        await page.getByLabel(point).check();
      }
      await page.evaluate((text) => {
        const rec = (window as unknown as { __recognition: { onresult: (event: unknown) => void } }).__recognition;
        rec.onresult({ resultIndex: 0, results: [Object.assign([{ transcript: text }], { isFinal: true })] });
      }, 'So the key insight is to sort the array first, fix one number, and find the other two with two pointers, and then I just move them. It runs in O of n squared time and constant extra space.');
      await page.getByRole('button', { name: 'Finish and review' }).click();
      const review = page.getByRole('region', { name: 'Transcript' });
      await review.getByRole('button', { name: 'Get AI feedback' }).click();
      await expect(review).toContainText('7 / 10.');
      // 捲到 AI 回饋的地方
      await review.getByRole('heading', { name: 'AI feedback' }).evaluate((el) => {
        window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 24);
      });
    },
  );

  // 5. 進度頁的演算法樹
  await shoot(page, 'progress', async () => {
    await page.goto('/#/progress');
    const tree = page.getByRole('region', { name: 'Algorithm tree' });
    await expect(tree).toBeVisible();
    // 捲到樹的那一張（同一頁換網址不會自己捲）
    await tree.evaluate((el) => {
      window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 24);
    });
  });

  // 6. 講解能力的進步曲線（示範資料有 8 次講解練習）
  await shoot(page, 'explaining', async () => {
    await page.goto('/#/progress');
    const sheet = page.getByRole('region', { name: 'Explaining' });
    await expect(sheet).toContainText('8 explanation drills');
    await sheet.evaluate((el) => {
      window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 24);
    });
  });
});
