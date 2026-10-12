import { expect, test, type Page } from '@playwright/test';

// 語音辨識換成測試可以送出結果的假物件；念問題的語音記下來，不真的發出聲音
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
  const spoken: string[] = [];
  w.__spoken = spoken;
  Object.defineProperty(window, 'speechSynthesis', {
    configurable: true,
    value: { cancel() {}, speak: (u: { text: string }) => spoken.push(u.text) },
  });
}

async function speak(page: Page, text: string) {
  await page.evaluate((text) => {
    const rec = (window as unknown as { __recognition: { onresult: (event: unknown) => void } }).__recognition;
    rec.onresult({ resultIndex: 0, results: [Object.assign([{ transcript: text }], { isFinal: true })] });
  }, text);
}

test('answers the interviewer’s follow-up questions out loud, gets them graded, and keeps them in the history', { tag: '@desktop' }, async ({ page }) => {
  await page.addInitScript(installFakes);
  const email = `probe-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
  await page.goto('/#/account');
  const account = page.getByRole('region', { name: 'Account & sync' });
  await account.getByRole('group', { name: 'Sign in or register' }).getByRole('button', { name: 'Register' }).click();
  await account.getByLabel('Email', { exact: true }).fill(email);
  await account.getByLabel('Password').fill('e2e-password-123');
  await account.getByRole('button', { name: 'Create account' }).click();
  await expect(account.getByText(email)).toBeVisible();

  // 不呼叫真正的 Claude
  let graded: Record<string, unknown> | undefined;
  await page.route('**/api/ai/status', (route) => route.fulfill({ json: { available: true, dailyLimit: 20, usedToday: 3 } }));
  await page.route('**/api/ai/follow-up-questions', (route) =>
    route.fulfill({
      json: {
        usedToday: 4,
        dailyLimit: 20,
        questions: [
          { kind: 'edge', question: 'What if the same number shows up twice?', intent: 'Whether you thought about duplicates.' },
          { kind: 'optimize', question: 'Can you do it without the extra map?', intent: 'Whether you can weigh time against memory.' },
        ],
      },
    }),
  );
  await page.route('**/api/ai/follow-up-grade', async (route) => {
    graded = route.request().postDataJSON();
    await route.fulfill({
      json: {
        usedToday: 5,
        dailyLimit: 20,
        grade: {
          summary: 'Direct answers, but justify the trade-off.',
          answers: [
            { score: 2, comment: 'Correct.', betterAnswer: 'I check the map before inserting, so a duplicate pairs with the earlier index.' },
            { score: 1, comment: 'Mention sorting with two pointers.', betterAnswer: 'If I sort first, two pointers need O(1) extra space, but sorting costs O(n log n).' },
          ],
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
  await review.getByRole('button', { name: 'Let the interviewer ask' }).click();
  await expect(review).toContainText('Question 1 of 2');
  await expect(review).toContainText('What if the same number shows up twice?');
  await expect(review).toContainText('16 of 20 left today');
  // 問題會念出來
  await expect.poll(() => page.evaluate(() => (window as unknown as { __spoken: string[] }).__spoken)).toEqual(['What if the same number shows up twice?']);

  // 第一題打字回答，第二題開口回答
  await review.getByLabel('Your answer to question 1').fill('I check the map before inserting.');
  await review.getByRole('button', { name: 'Next question' }).click();
  await expect(review).toContainText('Can you do it without the extra map?');
  await review.getByRole('button', { name: 'Answer in English' }).click();
  await speak(page, 'I could sort and use two pointers.');
  await expect(review.getByLabel('Your answer to question 2')).toHaveValue('I could sort and use two pointers.');
  await review.getByRole('button', { name: 'Done', exact: true }).click();
  await review.getByRole('button', { name: 'Previous' }).click();
  await expect(review.getByLabel('Your answer to question 1')).toHaveValue('I check the map before inserting.');
  await review.getByRole('button', { name: 'Next question' }).click();
  await expect(review.getByLabel('Your answer to question 2')).toHaveValue('I could sort and use two pointers.');

  await review.getByRole('button', { name: 'Done answering, grade me' }).click();
  await expect(review).toContainText('3 / 4.');
  await expect(review).toContainText('Direct answers, but justify the trade-off.');
  await expect(review).toContainText('What the interviewer is checking: Whether you thought about duplicates.');
  await expect(review).toContainText('A stronger answer: If I sort first');
  await expect(review).toContainText('15 of 20 left today');
  expect(graded).toMatchObject({
    problem: { id: 1, title: 'Two Sum' },
    answers: [
      { question: 'What if the same number shows up twice?', answer: 'I check the map before inserting.' },
      { question: 'Can you do it without the extra map?', answer: 'I could sort and use two pointers.' },
    ],
  });

  await page.getByRole('button', { name: /^Smooth/ }).click();
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  const history = page.getByRole('region', { name: /Past sessions/ });
  await history.getByText('Show interviewer follow-ups (2)').click();
  await expect(history).toContainText('A stronger answer: I check the map before inserting');
});
