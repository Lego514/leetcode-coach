import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { PNG } from 'pngjs';
import { OUT, prepareDemoAccount, writeGif } from './helpers';

// README 第一屏的動畫：一天怎麼用這個 App，六個畫面各停幾秒，左下角一行說明現在在做什麼。
// 淺色、深色各一個，1 倍解析度（檔案才不會太大）。資料是示範資料，AI 回饋是假的（不呼叫 Claude）。

const SIZE = { width: 1100, height: 680 };

/** 左下角的說明：只在錄動畫時加進畫面，不是 App 的一部分 */
async function label(page: Page, text: string) {
  await page.evaluate((value) => {
    let el = document.getElementById('tour-label');
    if (!el) {
      el = document.createElement('div');
      el.id = 'tour-label';
      Object.assign(el.style, {
        position: 'fixed',
        left: '16px',
        bottom: '16px',
        zIndex: '2147483647',
        padding: '10px 16px',
        borderRadius: '10px',
        background: 'rgba(22, 35, 58, 0.92)',
        color: '#fff',
        font: '600 17px/1.35 "Schibsted Grotesk Variable", system-ui, sans-serif',
        boxShadow: '0 6px 20px rgba(0,0,0,0.25)',
        maxWidth: '640px',
        pointerEvents: 'none',
      });
      document.body.append(el);
    }
    el.textContent = value;
  }, text);
}

for (const scheme of ['light', 'dark'] as const) {
  test(`README tour animation (${scheme})`, async ({ browser }) => {
    test.setTimeout(240_000);
    const context = await browser.newContext({ viewport: SIZE, deviceScaleFactor: 1, locale: 'en-US', colorScheme: scheme });
    const page = await context.newPage();
    // 伺服器在兩次之間不會清空，每次用不同的示範帳號
    await prepareDemoAccount(page, `tour-${scheme}@leetcode-coach.test`);

    const frames: { rgba: Uint8Array; delay: number }[] = [];
    const frame = async (text: string, delay: number) => {
      await label(page, text);
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(500);
      frames.push({ rgba: new Uint8Array(PNG.sync.read(await page.screenshot()).data), delay });
    };

    // 1. 今天要做什麼
    await page.goto('/');
    await expect(page.getByRole('region', { name: /^New problems for today/ })).toBeVisible();
    await page.getByRole('button', { name: 'No thanks' }).click();
    await page.evaluate(() => window.scrollTo(0, 0));
    await frame('1  Today: reviews that are due and new problems, sized to your time', 3500);

    // 2. 計時練習，一次一個面試步驟
    await page.goto('/#/practice/15');
    const steps = page.getByRole('region', { name: 'Solving steps' });
    await steps.getByLabel('What the problem asks').fill('Return unique triplets that sum to 0; the input can have duplicates.');
    await steps.getByRole('button', { name: 'Next' }).click();
    await steps.getByRole('textbox', { name: 'Example', exact: true }).fill('[-1, 0, 1, 2, -1, -4] gives [-1, -1, 2] and [-1, 0, 1].');
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    await page.evaluate(() => window.scrollTo(0, 0));
    await frame('2  Solve it on LeetCode with a timer and the interview steps', 3000);

    // 3. 記錄：卡在哪、為什麼隔這幾天複習
    await page.getByRole('group', { name: 'While solving' }).getByRole('button', { name: 'I’m done' }).click();
    const record = page.getByRole('region', { name: 'Record this attempt' });
    await record.getByRole('button', { name: /^Needed a hint/ }).click();
    await record.getByRole('button', { name: 'Logic / edge cases' }).click();
    await record.getByLabel('What exactly tripped you up (optional)').fill('Forgot to skip duplicate numbers');
    await record.evaluate((el) => window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 16));
    await frame('3  Record how it went; spaced repetition (FSRS) picks when to review it next', 4000);

    // 4. 用英文講一次，AI 照五個重點回饋
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
    }, 'So the key insight is to sort the array first, fix one number, and find the other two with two pointers. It runs in O of n squared time and constant extra space.');
    await page.getByRole('button', { name: 'Finish and review' }).click();
    const review = page.getByRole('region', { name: 'Transcript' });
    await review.getByRole('button', { name: 'Get AI feedback' }).click();
    await expect(review).toContainText('7 / 10.');
    await review.getByRole('heading', { name: 'AI feedback' }).evaluate((el) => window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 16));
    await frame('4  Explain it out loud in English; AI scores five points and suggests a better answer', 4500);

    // 5. 參考板書一步一步播放
    await page.goto('/#/board/206?view=reference');
    const playback = page.getByRole('toolbar', { name: 'Step playback' });
    await expect(playback).toContainText('Step 1 of');
    await expect(page.locator('.board-zoom-value')).not.toHaveText('100%');
    // 停下自動播放，自己一步一步按，每一格停一樣久
    const pause = playback.getByRole('button', { name: /^Pause/ });
    if (await pause.isVisible()) await pause.click();
    for (const step of [1, 3, 5, 7]) {
      while (!(await playback.textContent())?.includes(`Step ${step} of`)) await playback.getByRole('button', { name: 'Next step' }).click();
      await frame('5  Reference boards walk through each solution, one step at a time', step === 7 ? 3000 : 1800);
    }

    // 6. 演算法樹跟著練習長大
    await page.goto('/#/progress');
    const tree = page.getByRole('region', { name: 'Algorithm tree' });
    await expect(tree).toBeVisible();
    await tree.evaluate((el) => window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 16));
    await frame('6  Your algorithm tree grows as you practice and remember', 4000);

    writeGif(path.join(OUT, `tour-${scheme}.gif`), frames, SIZE);
    await context.close();
  });
}
