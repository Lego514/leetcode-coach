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

test('answers a behavioral question out loud with a story, checks it, and gets AI feedback', { tag: '@desktop' }, async ({ page }) => {
  await page.addInitScript(installFakeRecognition);
  const email = `star-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
  await page.goto('/#/account');
  const account = page.getByRole('region', { name: 'Account & sync' });
  await account.getByRole('group', { name: 'Sign in or register' }).getByRole('button', { name: 'Register' }).click();
  await account.getByLabel('Email', { exact: true }).fill(email);
  await account.getByLabel('Password').fill('e2e-password-123');
  await account.getByRole('button', { name: 'Create account' }).click();
  await expect(account.getByText(email)).toBeVisible();

  // 先寫一個「失敗」主題的故事
  await page.goto('/#/stories');
  await page.getByRole('button', { name: 'New story' }).click();
  await page.getByLabel('Title').fill('Pipeline fix');
  await page.getByRole('button', { name: 'Failure', exact: true }).click();
  await page.getByLabel('Action', { exact: true }).fill('I added retries and alerts.');
  await expect(page.getByText(/Saved at/)).toBeVisible();

  // 不呼叫真正的 Claude
  let sent: Record<string, unknown> | undefined;
  await page.route('**/api/ai/status', (route) => route.fulfill({ json: { available: true, dailyLimit: 20, usedToday: 0 } }));
  await page.route('**/api/ai/behavioral-feedback', async (route) => {
    sent = route.request().postDataJSON();
    await route.fulfill({
      json: {
        usedToday: 1,
        dailyLimit: 20,
        feedback: {
          summary: 'Specific story, but the result needs a number.',
          points: [
            { id: 'situation', score: 2, comment: 'Clear context.' },
            { id: 'task', score: 1, comment: 'Say what you owned.' },
            { id: 'action', score: 2, comment: 'Concrete steps.' },
            { id: 'result', score: 1, comment: 'Add a number.' },
            { id: 'ownership', score: 2, comment: 'You said I.' },
          ],
          strengths: ['Concrete fix'],
          improvements: [{ quote: 'it got better', suggestion: 'Say failures dropped from eight a month to zero.' }],
          improvedAnswer: 'During my internship, our nightly jobs failed about twice a week.',
        },
      },
    });
  });

  // 抽「失敗」主題的題目，預設用這個主題的故事回答
  await page.getByRole('link', { name: '← All stories' }).click();
  await page.getByRole('link', { name: 'Practice a question' }).click();
  await page.getByLabel('Theme').selectOption('failure');
  await expect(page.getByLabel('Answer with')).toHaveValue(/.+/);
  await expect(page.getByLabel('Answer with').locator('option:checked')).toHaveText('Pipeline fix');
  await page.getByLabel('Record audio (stays on this device)').uncheck();
  await page.getByRole('button', { name: 'Start answering' }).click();

  await expect(page.getByRole('heading', { level: 1, name: 'Answer out loud' })).toBeVisible();
  await speak(page, 'We had nightly jobs failing so I traced the race and I added retries and it got better');
  await expect(page.getByRole('region', { name: 'Live transcript' })).toContainText('I traced the race');
  await page.getByRole('button', { name: 'I’m done' }).click();

  // 看逐字稿、自評、拿 AI 回饋
  await expect(page.getByRole('heading', { level: 1, name: 'How did it go?' })).toBeVisible();
  const transcript = page.getByRole('region', { name: 'Transcript' });
  await expect(transcript).toContainText('“I” 2 times, “we” 1 time.');
  await transcript.getByRole('button', { name: 'Get AI feedback' }).click();
  await expect(transcript).toContainText('8 / 10.');
  await expect(transcript).toContainText('Your own part');
  await expect(transcript).toContainText('A stronger version of your answer');
  expect(sent).toMatchObject({ story: { title: 'Pipeline fix', action: 'I added retries and alerts.' }, language: 'en' });
  expect(String(sent?.question)).toMatch(/^(Tell me|Describe)/);

  await page.getByLabel('Action: the specific steps I took, as most of the answer').check();
  await page.getByRole('button', { name: 'Smooth' }).click();
  await page.getByRole('button', { name: 'Save practice' }).click();
  await expect(page.getByRole('status')).toContainText('Practice saved');
  const practice = page.getByRole('region', { name: 'Practice out loud' });
  await expect(practice).toContainText('Pipeline fix');
  await expect(practice).toContainText('8 / 10');
});
