import { expect, test, type Route } from '@playwright/test';

// 講解練習用打字：不方便出聲的地方也能練，照樣請 AI 回饋；複習頁可以直接去講一次，講完回來評分

const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET, POST, OPTIONS' };

async function fulfill(route: Route, json: unknown) {
  if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS });
  return route.fulfill({ status: 200, headers: CORS, json });
}

const feedback = {
  summary: 'Clear idea and complexity; walk through an example next time.',
  points: [
    { id: 'insight', score: 2, comment: 'You named the complement lookup.' },
    { id: 'structure', score: 2, comment: 'Hash map, and why.' },
    { id: 'walkthrough', score: 0, comment: 'Walk through [2,7,11,15].' },
    { id: 'complexity', score: 2, comment: 'Linear, with the reason.' },
    { id: 'edge', score: 1, comment: 'Say why you check before inserting.' },
  ],
  strengths: ['Direct opening'],
  improvements: [{ quote: 'I use a hash map', suggestion: 'I store each value and its index in a hash map.' }],
  improvedScript: 'The key insight is that for each number I only need its complement.',
};

const EXPLANATION =
  'The key insight is that for each number I only need its complement. I keep a hash map from value to index, so each lookup is O(1), and the whole pass is O(n) time and O(n) space.';

test('types an explanation where talking isn’t possible, and gets AI feedback on it', async ({ page }) => {
  // 自己的 AI 金鑰：瀏覽器直接呼叫，測試裡攔下來換成假的回應
  await page.addInitScript(() =>
    localStorage.setItem('leetcode-coach:own-ai', JSON.stringify({ provider: 'anthropic', apiKey: 'sk-ant-test-1234567890', model: 'claude-opus-5-5' })),
  );
  let message = '';
  await page.route('https://api.anthropic.com/v1/messages**', async (route) => {
    if (route.request().method() === 'POST') message = route.request().postDataJSON().messages[0].content;
    await fulfill(route, {
      id: 'msg_test',
      type: 'message',
      role: 'assistant',
      model: 'claude-opus-5-5',
      content: [{ type: 'text', text: JSON.stringify(feedback) }],
      stop_reason: 'end_turn',
      stop_sequence: null,
      usage: { input_tokens: 100, output_tokens: 50 },
    });
  });

  await page.goto('/#/mock?problem=1&kind=explain');
  const how = page.getByRole('group', { name: 'How' });
  await expect(how.getByRole('button', { name: 'Out loud' })).toHaveAttribute('aria-pressed', 'true');
  await how.getByRole('button', { name: 'Typed' }).click();
  await expect(page.getByText('For places where you can’t talk')).toBeVisible();
  // 打字不錄音、不開語音辨識，預設五分鐘
  await expect(page.getByLabel('Record my explanation')).toHaveCount(0);
  await expect(page.getByLabel('Time (minutes)')).toHaveAttribute('placeholder', '5');
  await page.getByRole('button', { name: 'Start timer' }).click();

  // 邊看講解的架構邊打，打的字算字數；沒有錄音的區塊
  const box = page.getByRole('textbox', { name: 'Your explanation, in English' });
  await expect(box).toBeFocused();
  await expect(page.getByRole('region', { name: 'Recording' })).toHaveCount(0);
  await box.fill(EXPLANATION);
  await expect(page.getByRole('region', { name: 'Type your explanation' })).toContainText('40 words');
  await page.getByLabel('The key insight, i.e. why the approach works').check();
  await page.getByRole('button', { name: 'Finish and review' }).click();

  // 檢討：打的講解可以改，只算字數（沒有語速和口頭禪），沒有錄音可以播
  const review = page.getByRole('region', { name: 'Your typed explanation' });
  await expect(review.getByRole('textbox', { name: 'Your explanation, in English' })).toHaveValue(EXPLANATION);
  await expect(review).toContainText('40 words');
  await expect(review).not.toContainText('words per minute');
  await expect(page.getByRole('region', { name: 'Listen back' })).toHaveCount(0);

  // AI 知道這是打的，不是語音辨識
  await review.getByRole('button', { name: 'Get AI feedback' }).click();
  await expect(review).toContainText('Claude scores your typed explanation');
  await expect(review).toContainText('7 / 10.');
  expect(message).toContain('Typed, not spoken');
  expect(message).toContain('Writing time:');
  expect(message).not.toContain('Speaking time');

  // 自評問的是寫得順不順
  const rating = page.getByRole('region', { name: 'How did writing it go?' });
  await expect(rating.getByRole('button', { name: /^Couldn’t write it/ })).toBeVisible();
  await rating.getByRole('button', { name: /^Smooth/ }).click();
  await page.getByRole('button', { name: 'Save', exact: true }).click();

  // 紀錄標「打字」，可以打開看打的講解
  const history = page.getByRole('region', { name: /Past sessions/ });
  await expect(history.locator('.chip', { hasText: 'Typed' })).toBeVisible();
  await history.getByText('Show typed explanation').click();
  await expect(history).toContainText('for each number I only need its complement');
});

test('explains a problem from the review page, then comes back to rate it', async ({ page }) => {
  const DAY = 24 * 60 * 60 * 1000;
  const start = new Date('2026-10-19T12:00:00');
  await page.clock.setFixedTime(start);
  await page.goto('/#/problems?list=neetcode150');
  await page.getByRole('button', { name: 'Mark problems I solved before' }).click();
  await page.getByRole('region', { name: /^Arrays & Hashing/ }).getByRole('checkbox', { name: 'Select Two Sum' }).check();
  await page.getByRole('region', { name: 'Mark problems you solved before' }).last().getByRole('button', { name: 'Mark 1 problem' }).click();
  await expect(page.getByRole('status')).toContainText('Scheduled 1 problem for review');

  // 兩天後到期：回想完先講一次
  await page.clock.setFixedTime(new Date(start.getTime() + 2 * DAY));
  await page.goto('/#/review');
  await page.reload();
  await expect(page.getByRole('heading', { level: 2, name: '1. Two Sum' })).toBeVisible();
  await page.getByRole('link', { name: 'Explain it now' }).click();
  await expect(page).toHaveURL(/#\/mock\?problem=1&kind=explain&from=review$/);
  await expect(page.getByRole('group', { name: 'Session type' }).getByRole('button', { name: 'Explanation drill' })).toHaveAttribute('aria-pressed', 'true');
  await page.getByLabel('Record my explanation').uncheck();
  await page.getByRole('button', { name: 'Start timer' }).click();
  await expect(page.getByRole('heading', { level: 1, name: '1. Two Sum' })).toBeVisible();
  await page.getByRole('button', { name: 'Finish and review' }).click();
  await page.getByRole('button', { name: /^Smooth/ }).click();
  await page.getByRole('button', { name: 'Save', exact: true }).click();

  // 存好回到複習頁，這題還在，接著看筆記、評分
  await expect(page).toHaveURL(/#\/review$/);
  await expect(page.getByRole('heading', { level: 2, name: '1. Two Sum' })).toBeVisible();
  await page.getByRole('button', { name: 'Show my notes' }).click();
  await page.getByRole('button', { name: /^Solved alone/ }).click();
  await expect(page.getByRole('status')).toContainText('Two Sum');
});
