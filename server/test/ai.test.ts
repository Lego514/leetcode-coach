import { afterEach, describe, expect, it } from 'vitest';
import type { AiStatus, ExplanationFeedback, FeedbackRequest, FeedbackResponse } from '../../shared/protocol';
import { buildUserMessage, FeedbackError, normalizeFeedback, type FeedbackGenerator } from '../src/ai/feedback';
import { aiUsage } from '../src/db/schema';
import { startTestServer, TestClient, type TestServer } from './helpers';

const request: FeedbackRequest = {
  problem: { id: 1, title: 'Two Sum', difficulty: 'Easy', pattern: 'Arrays & Hashing' },
  transcript: 'I use a hash map from value to index and look up the complement as I go.',
  seconds: 95,
  language: 'zh-TW',
};

const feedback: ExplanationFeedback = {
  summary: '思路清楚，但少了例子。',
  points: [
    { id: 'insight', score: 2, comment: '有說明補數。' },
    { id: 'structure', score: 2, comment: '有說明 hash map。' },
    { id: 'walkthrough', score: 0, comment: '沒有走過例子。' },
    { id: 'complexity', score: 0, comment: '沒有提到複雜度。' },
    { id: 'edge', score: 0, comment: '沒有提到邊界情況。' },
  ],
  strengths: ['一開始就講出關鍵觀察'],
  improvements: [{ quote: 'as I go', suggestion: '改成 while iterating once through the array' }],
  improvedScript: 'The key insight is ...',
};

let server: TestServer | undefined;

afterEach(async () => {
  await server?.close();
  server = undefined;
});

async function signedIn(ai?: { generate: FeedbackGenerator; dailyLimit: number }, email = `user-${Math.random()}@example.com`) {
  server = await startTestServer({ ai: ai && { allowedEmails: '*', ...ai } });
  const client = new TestClient(server.app);
  expect((await client.register(email)).status).toBe(201);
  return client;
}

describe('explanation feedback API', () => {
  it('requires sign-in', async () => {
    server = await startTestServer();
    const client = new TestClient(server.app);
    expect((await client.request('POST', '/api/ai/explanation-feedback', request)).status).toBe(401);
    expect((await client.request('GET', '/api/ai/status')).status).toBe(401);
  });

  it('reports that AI is off when no API key is configured', async () => {
    const client = await signedIn();
    const status = (await (await client.request('GET', '/api/ai/status')).json()) as AiStatus;
    expect(status).toEqual({ available: false, reason: 'not_configured', dailyLimit: 0, usedToday: 0 });
    const res = await client.request('POST', '/api/ai/explanation-feedback', request);
    expect(res.status).toBe(503);
    expect((await res.json()).error.code).toBe('ai_unavailable');
  });

  it('returns feedback, records usage, and enforces the daily limit', async () => {
    const calls: FeedbackRequest[] = [];
    const client = await signedIn({
      dailyLimit: 2,
      generate: async (input) => {
        calls.push(input);
        return { feedback, usage: { inputTokens: 1000, outputTokens: 400 } };
      },
    });

    const first = await client.request('POST', '/api/ai/explanation-feedback', request);
    expect(first.status).toBe(200);
    const body = (await first.json()) as FeedbackResponse;
    expect(body).toEqual({ feedback, usedToday: 1, dailyLimit: 2 });
    expect(calls).toEqual([request]);

    expect((await client.request('POST', '/api/ai/explanation-feedback', request)).status).toBe(200);
    const blocked = await client.request('POST', '/api/ai/explanation-feedback', request);
    expect(blocked.status).toBe(429);
    expect((await blocked.json()).error.code).toBe('ai_quota_exceeded');
    expect(calls).toHaveLength(2);

    const [usage] = await server!.database.db.select().from(aiUsage);
    expect(usage).toMatchObject({ day: '2026-09-16', requests: 2, inputTokens: 2000, outputTokens: 800 });
    const status = (await (await client.request('GET', '/api/ai/status')).json()) as AiStatus;
    expect(status).toEqual({ available: true, dailyLimit: 2, usedToday: 2 });

    // 隔天重新計算
    server!.clock.now = new Date('2026-09-17T00:00:01Z');
    expect((await client.request('POST', '/api/ai/explanation-feedback', request)).status).toBe(200);
  });

  it('does not count failed requests against the limit', async () => {
    let fail = true;
    const client = await signedIn({
      dailyLimit: 1,
      generate: async () => {
        if (fail) throw new FeedbackError('refused', 'declined', { inputTokens: 50, outputTokens: 0 });
        return { feedback, usage: { inputTokens: 10, outputTokens: 10 } };
      },
    });

    const refused = await client.request('POST', '/api/ai/explanation-feedback', request);
    expect(refused.status).toBe(422);
    expect((await refused.json()).error.code).toBe('ai_failed');

    fail = false;
    expect((await client.request('POST', '/api/ai/explanation-feedback', request)).status).toBe(200);
    const [usage] = await server!.database.db.select().from(aiUsage);
    expect(usage).toMatchObject({ requests: 1, inputTokens: 60, outputTokens: 10 });
  });

  it('validates the request', async () => {
    const client = await signedIn({ dailyLimit: 5, generate: async () => ({ feedback, usage: { inputTokens: 0, outputTokens: 0 } }) });
    const res = await client.request('POST', '/api/ai/explanation-feedback', { ...request, transcript: 'too short' });
    expect(res.status).toBe(400);
    const [usage] = await server!.database.db.select().from(aiUsage);
    expect(usage).toBeUndefined();
  });

  it('keeps each user to a few requests per minute', async () => {
    const client = await signedIn({ dailyLimit: 100, generate: async () => ({ feedback, usage: { inputTokens: 0, outputTokens: 0 } }) });
    for (let i = 0; i < 5; i++) {
      expect((await client.request('POST', '/api/ai/explanation-feedback', request)).status).toBe(200);
    }
    expect((await client.request('POST', '/api/ai/explanation-feedback', request)).status).toBe(429);
  });
});

describe('feedback prompt and output', () => {
  it('puts the problem, time, language, and transcript in the message', () => {
    const message = buildUserMessage(request);
    expect(message).toContain('Problem: 1. Two Sum (Easy, pattern: Arrays & Hashing)');
    expect(message).toContain('Speaking time: 1:35');
    expect(message).toContain('Feedback language: Traditional Chinese (Taiwan)');
    expect(message).toContain(`<transcript>\n${request.transcript}\n</transcript>`);
  });

  it('orders points, drops duplicates and bad scores, and trims lists', () => {
    const normalized = normalizeFeedback({
      summary: '  ok  ',
      points: [
        { id: 'edge', score: 1, comment: 'e' },
        { id: 'insight', score: 2, comment: 'i' },
        { id: 'insight', score: 0, comment: 'duplicate' },
        { id: 'complexity', score: 5, comment: 'bad score' },
        { id: 'unknown', score: 1, comment: 'x' },
      ],
      strengths: ['a', '', 'b', 'c', 'd'],
      improvements: [{ quote: 'q', suggestion: '' }, ...Array.from({ length: 6 }, (_, i) => ({ quote: `q${i}`, suggestion: `s${i}` }))],
      improvedScript: 'x'.repeat(5000),
    });
    expect(normalized.summary).toBe('ok');
    expect(normalized.points.map((p) => [p.id, p.score])).toEqual([
      ['insight', 2],
      ['edge', 1],
    ]);
    expect(normalized.strengths).toEqual(['a', 'b', 'c']);
    expect(normalized.improvements.map((i) => i.quote)).toEqual(['q0', 'q1', 'q2', 'q3']);
    expect(normalized.improvedScript).toHaveLength(4000);
  });
});

describe('AI allowlist', () => {
  const generate: FeedbackGenerator = async () => ({ feedback, usage: { inputTokens: 1, outputTokens: 1 } });

  async function withAllowlist(allowedEmails: string[] | '*', email: string) {
    server = await startTestServer({ ai: { generate, dailyLimit: 5, allowedEmails } });
    const client = new TestClient(server.app);
    expect((await client.register(email)).status).toBe(201);
    return client;
  }

  it('lets listed accounts use AI, ignoring case', async () => {
    const client = await withAllowlist(['ray@example.com'], 'Ray@Example.com');
    const status = (await (await client.request('GET', '/api/ai/status')).json()) as AiStatus;
    expect(status).toEqual({ available: true, dailyLimit: 5, usedToday: 0 });
    expect((await client.request('POST', '/api/ai/explanation-feedback', request)).status).toBe(200);
  });

  it('turns other accounts away before spending anything', async () => {
    let called = false;
    server = await startTestServer({
      ai: {
        dailyLimit: 5,
        allowedEmails: ['ray@example.com'],
        generate: async () => {
          called = true;
          return { feedback, usage: { inputTokens: 1, outputTokens: 1 } };
        },
      },
    });
    const friend = new TestClient(server.app);
    await friend.register('friend@example.com');

    const status = (await (await friend.request('GET', '/api/ai/status')).json()) as AiStatus;
    expect(status).toEqual({ available: false, reason: 'not_allowed', dailyLimit: 0, usedToday: 0 });
    const res = await friend.request('POST', '/api/ai/explanation-feedback', request);
    expect(res.status).toBe(403);
    expect((await res.json()).error.code).toBe('ai_not_allowed');
    expect(called).toBe(false);
    const [usage] = await server.database.db.select().from(aiUsage);
    expect(usage).toBeUndefined();
  });

  it('lets nobody in when the list is empty', async () => {
    const client = await withAllowlist([], 'ray@example.com');
    expect((await client.request('POST', '/api/ai/explanation-feedback', request)).status).toBe(403);
  });

  it('lets every account in with *', async () => {
    const client = await withAllowlist('*', 'anyone@example.com');
    expect((await client.request('POST', '/api/ai/explanation-feedback', request)).status).toBe(200);
  });
});
