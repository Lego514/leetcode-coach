import { expect, test, type Page } from '@playwright/test';

// 瀏覽器的語音辨識要連 Google 的服務，測試裡換成可以由測試程式送出結果的假物件
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

interface FakeRecognitionHandle {
  onresult: (event: unknown) => void;
  onerror: (event: unknown) => void;
}

async function speak(page: Page, text: string, isFinal = true) {
  await page.evaluate(
    ({ text, isFinal }) => {
      const rec = (window as unknown as { __recognition: FakeRecognitionHandle }).__recognition;
      const result = Object.assign([{ transcript: text }], { isFinal });
      rec.onresult({ resultIndex: 0, results: [result] });
    },
    { text, isFinal },
  );
}

test.describe('explanation drill with a transcript', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(installFakeRecognition);
  });

  test('shows live text, reports stats, and saves it as the explanation script', async ({ page }) => {
    // 先寫一份講解稿，稍後會被逐字稿取代
    await page.goto('/#/problems/1');
    await page.getByLabel('Explanation script').fill('Old script');
    await expect(page.getByText(/Saved at/)).toBeVisible();

    await page.goto('/#/mock?problem=1&kind=explain');
    await expect(page.getByRole('button', { name: 'Explanation drill' })).toHaveAttribute('aria-pressed', 'true');
    await page.getByLabel('Record my explanation').uncheck();
    await page.getByLabel('Transcribe what I say').check();
    await page.getByRole('button', { name: 'Start timer' }).click();

    const live = page.getByRole('region', { name: 'Transcript' });
    await expect(live).toContainText('Start explaining in English');
    await expect(live).toContainText('Listening');

    await speak(page, 'The key', false);
    await expect(live).toContainText('The key');
    await speak(page, 'The key insight is to use a hash map, basically.');
    await speak(page, 'Um so it runs in linear time.');
    await expect(live).toContainText('The key insight is to use a hash map, basically. Um so it runs in linear time.');

    await page.getByRole('button', { name: 'Pause' }).click();
    await expect(live).toContainText('Paused');
    await page.getByRole('button', { name: 'Resume' }).click();
    await expect(live).toContainText('Listening');

    await page.getByLabel('The key insight, i.e. why the approach works').check();
    await page.getByRole('button', { name: 'Finish and review' }).click();

    const review = page.getByRole('region', { name: 'Transcript' });
    const textarea = review.getByLabel('Transcript of this session');
    await expect(textarea).toHaveValue('The key insight is to use a hash map, basically. Um so it runs in linear time.');
    await expect(review).toContainText('17 words');
    await expect(review).toContainText('Filler words: “basically” ×1, “um” ×1');

    // 修正辨識錯誤後存成講解稿
    await textarea.fill('The key insight is to store each value in a hash map. It runs in linear time.');
    await expect(review).toContainText('No common filler words detected.');
    // 沒登入時提示登入後才能用 AI 回饋
    await expect(review).toContainText('Sign in to use AI feedback.');
    await review.getByRole('button', { name: 'Save as this problem’s script' }).click();
    const replace = page.getByRole('dialog', { name: 'Replace your explanation script?' });
    await replace.getByRole('button', { name: 'Replace' }).click();
    await expect(page.getByRole('status')).toContainText('Saved as your explanation script.');

    // 講完之後直接顯示參考講法對照
    const reference = page.getByRole('region', { name: /^Reference explanation/ });
    await expect(reference).toContainText('Compare it with how you just explained it');
    await expect(reference).toContainText('The key insight is that for each number x');

    await page.getByRole('button', { name: /^Smooth/ }).click();
    await page.getByRole('button', { name: 'Save', exact: true }).click();

    const history = page.getByRole('region', { name: /Past sessions/ });
    await history.getByText('Show transcript').click();
    await expect(history).toContainText('store each value in a hash map');

    await page.goto('/#/problems/1');
    await expect(page.getByLabel('Explanation script')).toHaveValue(
      'The key insight is to store each value in a hash map. It runs in linear time.',
    );
  });

  test('explains why the transcript stopped', async ({ page }) => {
    await page.goto('/#/mock?problem=1&kind=explain');
    await page.getByLabel('Record my explanation').uncheck();
    await page.getByLabel('Transcribe what I say').check();
    await page.getByRole('button', { name: 'Start timer' }).click();

    await page.evaluate(() => {
      (window as unknown as { __recognition: FakeRecognitionHandle }).__recognition.onerror({ error: 'network' });
    });
    await expect(page.getByRole('region', { name: 'Transcript' })).toContainText('needs an internet connection');
  });
});

test('disables the transcript option when the browser cannot recognize speech', async ({ page }) => {
  await page.addInitScript(() => {
    const w = window as unknown as Record<string, unknown>;
    delete w.SpeechRecognition;
    delete w.webkitSpeechRecognition;
  });
  await page.goto('/#/mock');
  await expect(page.getByLabel('Transcribe what I say')).toBeDisabled();
  await expect(page.getByText('This browser doesn’t support speech recognition')).toBeVisible();
});

test('gets AI feedback for the transcript and saves the model answer', { tag: '@desktop' }, async ({ page }) => {
  await page.addInitScript(installFakeRecognition);
  const email = `ai-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
  await page.goto('/#/settings');
  const account = page.getByRole('region', { name: 'Account & sync' });
  await account.getByRole('group', { name: 'Sign in or register' }).getByRole('button', { name: 'Register' }).click();
  await account.getByLabel('Email', { exact: true }).fill(email);
  await account.getByLabel('Password').fill('e2e-password-123');
  await account.getByRole('button', { name: 'Create account' }).click();
  await expect(account.getByText(email)).toBeVisible();

  // 不呼叫真正的 Claude：攔下 AI 的 API，回傳固定的結果
  let requestBody: Record<string, unknown> | undefined;
  await page.route('**/api/ai/status', (route) =>
    route.fulfill({ json: { available: true, dailyLimit: 20, usedToday: 3 } }),
  );
  await page.route('**/api/ai/explanation-feedback', async (route) => {
    requestBody = route.request().postDataJSON();
    await route.fulfill({
      json: {
        usedToday: 4,
        dailyLimit: 20,
        feedback: {
          summary: 'Clear idea, but no example or edge cases.',
          points: [
            { id: 'insight', score: 2, comment: 'You explained the complement lookup.' },
            { id: 'structure', score: 2, comment: 'Hash map is justified.' },
            { id: 'walkthrough', score: 0, comment: 'No example.' },
            { id: 'complexity', score: 1, comment: 'Time only, no space.' },
            { id: 'edge', score: 0, comment: 'No edge cases.' },
          ],
          strengths: ['Led with the key insight'],
          improvements: [{ quote: 'as I go', suggestion: 'Say "in a single pass over the array".' }],
          improvedScript: 'The key insight is that for each number we only need its complement.',
        },
      },
    });
  });

  await page.goto('/#/mock?problem=1&kind=explain');
  await page.getByLabel('Record my explanation').uncheck();
  await page.getByLabel('Transcribe what I say').check();
  await page.getByRole('button', { name: 'Start timer' }).click();
  await speak(page, 'I use a hash map from value to index and look up the complement as I go.');
  await page.getByRole('button', { name: 'Finish and review' }).click();

  const review = page.getByRole('region', { name: 'Transcript' });
  await expect(review).toContainText('17 of 20 left today');
  await review.getByRole('button', { name: 'Get AI feedback' }).click();
  await expect(review).toContainText('5 / 10.');
  await expect(review).toContainText('Clear idea, but no example or edge cases.');
  await expect(review).toContainText('Time and space complexity');
  await expect(review).toContainText('16 of 20 left today');
  expect(requestBody).toMatchObject({
    problem: { id: 1, title: 'Two Sum', difficulty: 'Easy', pattern: 'Arrays & Hashing' },
    transcript: 'I use a hash map from value to index and look up the complement as I go.',
    language: 'en',
  });

  await review.getByRole('button', { name: 'Save the model answer as my script' }).click();
  await expect(page.getByRole('status')).toContainText('Saved as your explanation script.');

  await page.getByRole('button', { name: /^Smooth/ }).click();
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  const history = page.getByRole('region', { name: /Past sessions/ });
  await history.getByText('Show AI feedback').click();
  await expect(history).toContainText('Led with the key insight');

  await page.goto('/#/problems/1');
  await expect(page.getByLabel('Explanation script')).toHaveValue(
    'The key insight is that for each number we only need its complement.',
  );
});
