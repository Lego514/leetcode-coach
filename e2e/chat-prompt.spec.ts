import { expect, test, type Page } from '@playwright/test';

// 語音辨識換成測試可以送出結果的假物件
function installFakeRecognition() {
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
}

async function speak(page: Page, text: string) {
  await page.evaluate((text) => {
    const rec = (window as unknown as { __recognition: { onresult: (event: unknown) => void } }).__recognition;
    rec.onresult({ resultIndex: 0, results: [Object.assign([{ transcript: text }], { isFinal: true })] });
  }, text);
}

/** 講解練習講一段，停在檢討頁 */
async function explainDrill(page: Page) {
  await page.goto('/#/mock?problem=1&kind=explain');
  await page.getByLabel('Record my explanation').uncheck();
  await page.getByLabel('Transcribe what I say').check();
  await page.getByRole('button', { name: 'Start timer' }).click();
  await speak(page, 'I use a hash map from value to index and look up the complement as I go.');
  await page.getByRole('button', { name: 'Finish and review' }).click();
}

test('copies a prompt for my own ChatGPT or Claude without signing in, and saves the reply I paste back', { tag: '@desktop' }, async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.addInitScript(installFakeRecognition);
  await explainDrill(page);

  const review = page.getByRole('region', { name: 'Transcript' });
  await expect(review).toContainText('Use your own ChatGPT or Claude');
  await expect(review.getByRole('link', { name: 'Open ChatGPT' })).toHaveAttribute('href', 'https://chatgpt.com/');
  await expect(review.getByRole('link', { name: 'Open Claude' })).toHaveAttribute('href', 'https://claude.ai/new');

  // 用的是修正過的逐字稿
  await review.getByLabel('Transcript of this session').fill('I use a hash map from value to index, looking up target minus x.');
  await review.getByRole('button', { name: 'Copy prompt: feedback' }).click();
  await expect(page.getByRole('status')).toContainText('Copied');
  const feedback = await page.evaluate(() => navigator.clipboard.readText());
  expect(feedback).toContain('Score my explanation on five points');
  expect(feedback).toContain('Reply in English');
  expect(feedback).toContain('Problem: 1. Two Sum');
  expect(feedback).toContain('looking up target minus x.');

  await review.getByRole('button', { name: 'Copy prompt: interviewer follow-ups' }).click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain('Start with your first question.');

  await review.getByLabel('Paste the reply (optional, saved with this session)').fill('Total 6/10.\nAdd a walkthrough with [2, 7, 11, 15].');
  await page.getByRole('button', { name: /^Smooth/ }).click();
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  const history = page.getByRole('region', { name: /Past sessions/ });
  await history.getByText('Show the AI reply I pasted').click();
  await expect(history).toContainText('Add a walkthrough with [2, 7, 11, 15].');
});

test('shows the prompt to copy by hand when the browser blocks the clipboard', async ({ page }) => {
  await page.addInitScript(installFakeRecognition);
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: () => Promise.reject(new DOMException('blocked', 'NotAllowedError')) },
    });
  });
  await explainDrill(page);
  const review = page.getByRole('region', { name: 'Transcript' });
  await review.getByRole('button', { name: 'Copy prompt: feedback' }).click();
  await expect(review).toContainText('Select the text below and copy it yourself.');
  await expect(review.getByRole('textbox', { name: 'Prompt' })).toHaveValue(/Score my explanation on five points[\s\S]*look up the complement as I go\./);
});

test('copies a behavioral feedback prompt after practicing out loud', { tag: '@desktop' }, async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.addInitScript(installFakeRecognition);
  await page.goto('/#/stories/practice');
  await page.getByLabel('Record audio (stays on this device)').uncheck();
  await page.getByRole('button', { name: 'Start answering' }).click();
  await speak(page, 'When our release slipped I owned the fix and we shipped two days later.');
  await page.getByRole('button', { name: 'I’m done' }).click();

  await page.getByRole('button', { name: 'Copy prompt: feedback' }).click();
  const prompt = await page.evaluate(() => navigator.clipboard.readText());
  expect(prompt).toContain('Score my answer on five points');
  // 練習的題目會依日子換，不限定開頭
  expect(prompt).toMatch(/Question: \S.+\?/);
  expect(prompt).toContain('I owned the fix');

  await page.getByLabel('Paste the reply (optional, saved with this session)').fill('Situation 2, Task 1. Say what you owned.');
  await page.getByRole('button', { name: 'Save practice' }).click();
  const practice = page.getByRole('region', { name: 'Practice out loud' });
  await practice.getByText('Show the AI reply I pasted').click();
  await expect(practice).toContainText('Say what you owned.');
});
