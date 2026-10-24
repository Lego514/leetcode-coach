import { expect, test, type Page, type Route } from '@playwright/test';

// 自己的 AI 金鑰：瀏覽器直接呼叫 AI。測試裡攔下 Anthropic、OpenAI 的網址，換成假的回應，不會花到錢

const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET, POST, OPTIONS' };

/** 跨網域的請求要先回 CORS 預檢 */
async function fulfill(route: Route, json: unknown, status = 200) {
  if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS });
  return route.fulfill({ status, headers: CORS, json });
}

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
    const rec = (window as unknown as { __recognition: { onresult: (e: unknown) => void } }).__recognition;
    rec.onresult({ resultIndex: 0, results: [Object.assign([{ transcript: text }], { isFinal: true })] });
  }, text);
}

const feedback = {
  summary: 'Clear idea, but no example yet.',
  points: [
    { id: 'insight', score: 2, comment: 'You named the complement lookup.' },
    { id: 'structure', score: 2, comment: 'Hash map, and why.' },
    { id: 'walkthrough', score: 0, comment: 'Walk through [2,7,11,15].' },
    { id: 'complexity', score: 1, comment: 'Say why it is linear.' },
    { id: 'edge', score: 0, comment: 'Mention using the same index twice.' },
  ],
  strengths: ['Direct opening'],
  improvements: [{ quote: 'I use a hash map', suggestion: 'I store each value and its index in a hash map.' }],
  improvedScript: 'The key insight is that for each number I only need its complement.',
};

const claudeMessage = (text: string) => ({
  id: 'msg_test',
  type: 'message',
  role: 'assistant',
  model: 'claude-opus-5-5',
  content: [{ type: 'text', text }],
  stop_reason: 'end_turn',
  stop_sequence: null,
  usage: { input_tokens: 100, output_tokens: 50 },
});

test('adds my own Anthropic key and gets explanation feedback without signing in', async ({ page }) => {
  await page.addInitScript(installFakeRecognition);
  const serverAi: string[] = [];
  page.on('request', (r) => {
    if (r.url().includes('/api/ai/')) serverAi.push(r.url());
  });
  await page.route('https://api.anthropic.com/v1/models**', (route) =>
    fulfill(route, {
      data: [
        { type: 'model', id: 'claude-opus-5-5', display_name: 'Claude Opus 5.5', created_at: '2026-09-01T00:00:00Z' },
        { type: 'model', id: 'claude-haiku-5-5', display_name: 'Claude Haiku 5.5', created_at: '2026-09-01T00:00:00Z' },
      ],
      has_more: false,
      first_id: 'claude-opus-5-5',
      last_id: 'claude-haiku-5-5',
    }),
  );
  let headers: Record<string, string> = {};
  let body: Record<string, unknown> = {};
  await page.route('https://api.anthropic.com/v1/messages**', async (route) => {
    if (route.request().method() === 'POST') {
      headers = route.request().headers();
      body = route.request().postDataJSON();
    }
    await fulfill(route, claudeMessage(JSON.stringify(feedback)));
  });

  // 設定：貼上金鑰、測試連線、儲存
  await page.goto('/#/settings');
  const settings = page.getByRole('region', { name: 'Your own AI key' });
  await expect(settings.getByLabel('AI service')).toHaveValue('anthropic');
  await settings.getByLabel('API key', { exact: true }).fill('sk-ant-test-1234567890');
  await settings.getByRole('button', { name: 'Test connection' }).click();
  await expect(settings).toContainText('Connected. Found 2 models.');
  await expect(settings.getByLabel('Model')).toHaveValue('claude-opus-5-5');
  await settings.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(settings).toContainText('Using Anthropic (Claude) (claude-opus-5-5), key sk-ant…7890');
  await expect(settings.getByLabel('API key', { exact: true })).toHaveValue('');

  // 講解練習：沒登入也能拿 AI 回饋，沒有每日上限
  await page.goto('/#/mock?problem=1&kind=explain');
  await page.getByLabel('Record my explanation').uncheck();
  await page.getByLabel('Transcribe what I say').check();
  await page.getByRole('button', { name: 'Start timer' }).click();
  await speak(page, 'I use a hash map from value to index and look up the complement as I go.');
  await page.getByRole('button', { name: 'Finish and review' }).click();
  const review = page.getByRole('region', { name: 'Transcript' });
  await expect(review).toContainText('Using your own Anthropic (Claude) key, no daily limit');
  await review.getByRole('button', { name: 'Get AI feedback' }).click();
  await expect(review).toContainText('5 / 10.');
  await expect(review).toContainText('Clear idea, but no example yet.');

  // 直接從瀏覽器呼叫 Claude：自己的金鑰、跟伺服器同一份提示詞和 schema
  expect(headers['x-api-key']).toBe('sk-ant-test-1234567890');
  expect(headers['anthropic-dangerous-direct-browser-access']).toBe('true');
  expect(body).toMatchObject({ model: 'claude-opus-5-5', fallbacks: 'default', output_config: { effort: 'high', format: { type: 'json_schema' } } });
  expect(body.system).toContain('You coach software engineers');
  expect(serverAi).toEqual([]);

  // 刪掉金鑰後回到原本的狀態
  await page.goto('/#/settings');
  await page.getByRole('region', { name: 'Your own AI key' }).getByRole('button', { name: 'Remove key' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Removed the key from this browser.' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Your own AI key' })).not.toContainText('Using Anthropic');
});

test('thinks a problem through with AI, one question at a time, using my own OpenAI key', async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem('leetcode-coach:own-ai', JSON.stringify({ provider: 'openai', apiKey: 'sk-openai-test-123456', model: 'gpt-test' })),
  );
  const bodies: { messages: { role: string; content: string }[] }[] = [];
  const replies = ['What do you need to find for each number?', 'Right. How could you check that quickly instead of scanning again?'];
  await page.route('https://api.openai.com/v1/chat/completions', async (route) => {
    if (route.request().method() === 'POST') bodies.push(route.request().postDataJSON());
    await fulfill(route, { choices: [{ message: { content: replies[bodies.length - 1] ?? 'ok' }, finish_reason: 'stop' }] });
  });

  await page.goto('/#/practice/1');
  const hints = page.getByRole('region', { name: 'Hints' });
  await hints.getByRole('button', { name: 'Think it through with AI' }).click();
  const conversation = hints.getByRole('list', { name: 'Conversation with the AI' });
  await expect(conversation).toContainText('What do you need to find for each number?');
  // 開始時算用了第一層提示
  await expect(hints).toContainText('1 of 4 layers open');

  await hints.getByLabel('Answer the AI’s question, or say where you’re stuck…').fill('The complement, target minus the number.');
  await hints.getByRole('button', { name: 'Send' }).click();
  await expect(conversation).toContainText('How could you check that quickly');
  await expect(conversation.getByRole('listitem')).toHaveCount(3);

  // 系統提示要它不給程式碼；第二次帶著前面的對話
  const system = bodies[0].messages[0];
  expect(system.role).toBe('system');
  expect(system.content).toContain('"Two Sum" (Easy)');
  expect(system.content).toContain('Never write code or pseudocode');
  expect(bodies[0].messages[1]).toEqual({ role: 'user', content: 'I’m stuck. Can you help me think it through?' });
  expect(bodies[1].messages.map((m) => m.role)).toEqual(['system', 'user', 'assistant', 'user']);
});

test('points to Settings when there is no AI key yet', async ({ page }) => {
  await page.goto('/#/practice/1');
  const hints = page.getByRole('region', { name: 'Hints' });
  await expect(hints).toContainText('Add your own AI key in Settings to think it through with AI.');
  await hints.getByRole('link', { name: 'Settings' }).click();
  // 練習中離開要先確認
  await page.getByRole('dialog', { name: 'Leave this practice session?' }).getByRole('button', { name: 'Leave without recording' }).click();
  await expect(page.getByRole('region', { name: 'Your own AI key' })).toBeVisible();
});
