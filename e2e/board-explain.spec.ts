import { expect, test, type Page } from '@playwright/test';

// 語音辨識換成測試可以送出結果的假物件；麥克風當作沒有
function installFakes() {
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
  Object.defineProperty(navigator, 'mediaDevices', { value: undefined, configurable: true });
}

async function speak(page: Page, text: string) {
  await page.evaluate((text) => {
    const rec = (window as unknown as { __recognition: { onresult: (event: unknown) => void } }).__recognition;
    rec.onresult({ resultIndex: 0, results: [Object.assign([{ transcript: text }], { isFinal: true })] });
  }, text);
}

test('explains a problem’s whiteboard step by step, then reviews and saves it as a drill', async ({ page }) => {
  await page.addInitScript(installFakes);
  await page.goto('/#/board/1');
  await page.getByRole('button', { name: 'Array', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Record a few steps first, then explain them' })).toBeDisabled();
  await page.keyboard.press('s');
  await page.keyboard.press('s');

  // 照著步驟講：說明當提詞，不能自動播放、不能改步驟
  await page.getByRole('button', { name: /^Play all 2 steps/ }).click();
  await page.getByRole('textbox', { name: 'What happens in step 1' }).fill('Start with an empty map');
  await page.keyboard.press('Enter');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: /^Walk through your recorded steps/ }).click();
  const bar = page.getByRole('toolbar', { name: 'Explain' });
  await expect(bar).toContainText('Step 1 of 2');
  await expect(bar).toContainText('Start with an empty map');
  await expect(bar.getByRole('textbox')).toHaveCount(0);
  await expect(bar.getByRole('button', { name: 'Play (Space)' })).toHaveCount(0);
  await expect(bar.getByRole('button', { name: 'Delete step' })).toHaveCount(0);
  // 沒有麥克風也能講，只是沒有錄音
  await expect(bar).toContainText('This browser can’t record audio');

  await speak(page, 'I keep a hash map from each value to its index.');
  await expect(bar).toContainText('from each value to its index');
  await page.waitForTimeout(1200);
  await page.keyboard.press('ArrowRight');
  await expect(bar).toContainText('Step 2 of 2');
  await page.keyboard.press('Escape');

  // 回顧：每一步講了多久、逐字稿、自評
  const review = page.getByRole('dialog', { name: 'Review your explanation' });
  await expect(review).toBeVisible();
  await expect(review).toContainText('covered 2 of 2 steps');
  const times = review.getByRole('region', { name: 'Time on each step' });
  await expect(times.getByRole('listitem').first()).toContainText('Start with an empty map');
  await expect(times.getByRole('listitem').first()).toContainText(/0:0[1-9]/);
  await expect(review.getByRole('textbox', { name: 'Transcript of this session' })).toHaveValue('I keep a hash map from each value to its index.');
  await expect(review.getByRole('button', { name: 'Save as an explanation drill' })).toBeDisabled();
  await review.getByLabel('The key insight, i.e. why the approach works').check();
  await review.getByRole('button', { name: /^Smooth/ }).click();
  await review.getByRole('button', { name: 'Save as an explanation drill' }).click();
  await expect(page.getByRole('status')).toContainText('Saved to your explanation drills');
  await review.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(review).toBeHidden();

  // 存在模擬面試的紀錄裡，標上「白板」
  await page.goto('/#/mock');
  const history = page.getByRole('region', { name: /Past sessions/ });
  await expect(history).toContainText('Whiteboard');
  await expect(history).toContainText('Explanation drill');
  await expect(history).toContainText('Points 1/5');
});

test('explaining on the free whiteboard only reviews, without saving', async ({ page }) => {
  await page.addInitScript(installFakes);
  await page.goto('/#/board/scratch');
  await page.getByRole('button', { name: 'Array', exact: true }).click();
  await page.keyboard.press('s');
  await page.getByRole('button', { name: /^Walk through your recorded steps/ }).click();
  await speak(page, 'This is the array before we start.');
  await page.getByRole('toolbar', { name: 'Explain' }).getByRole('button', { name: 'I’m done' }).click();

  const review = page.getByRole('dialog', { name: 'Review your explanation' });
  await expect(review).toContainText('isn’t tied to a problem');
  await expect(review.getByRole('button', { name: 'Save as an explanation drill' })).toHaveCount(0);
  await expect(review.getByRole('button', { name: 'Get AI feedback' })).toHaveCount(0);

  // 再講一次：回到第 1 步
  await review.getByRole('button', { name: 'Explain again' }).click();
  await expect(review).toBeHidden();
  await expect(page.getByRole('toolbar', { name: 'Explain' })).toContainText('Step 1 of 1');
});
