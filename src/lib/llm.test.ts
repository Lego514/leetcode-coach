import { afterEach, describe, expect, it, vi } from 'vitest';
import { EXPLANATION_SCHEMA, normalizeFeedback } from '../../shared/ai';
import { hintSystemPrompt } from './aiHint';
import { askJson, chat, extractJson, listModels, LlmError, type LlmConfig } from './llm';

const feedback = {
  summary: 'Clear overall.',
  points: [
    { id: 'insight', score: 2, comment: 'Good.' },
    { id: 'structure', score: 1, comment: 'Say why a map.' },
    { id: 'walkthrough', score: 0, comment: 'Missing.' },
    { id: 'complexity', score: 2, comment: 'Right.' },
    { id: 'edge', score: 1, comment: 'Mention duplicates.' },
  ],
  strengths: ['Direct'],
  improvements: [{ quote: 'I use map', suggestion: 'I store each value in a hash map.' }],
  improvedScript: 'The key insight is...',
};

type Call = { url: string; init?: RequestInit };

/** 假的 fetch：照順序回應，記下每次呼叫 */
function fakeFetch(responses: { status?: number; body: unknown }[]) {
  const calls: Call[] = [];
  const fn = vi.fn(async (url: string, init?: RequestInit) => {
    calls.push({ url, init });
    const next = responses.shift() ?? { status: 500, body: {} };
    return new Response(JSON.stringify(next.body), { status: next.status ?? 200, headers: { 'content-type': 'application/json' } });
  });
  vi.stubGlobal('fetch', fn);
  return calls;
}

const reply = (content: string) => ({ choices: [{ message: { content }, finish_reason: 'stop' }] });
const openai: LlmConfig = { provider: 'openai', apiKey: 'sk-test', model: 'gpt-test' };
const request = { system: 'Grade it.', message: 'transcript', schema: EXPLANATION_SCHEMA, normalize: normalizeFeedback };

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('OpenAI-compatible providers', () => {
  it('asks for strict JSON and normalizes the reply with the shared rules', async () => {
    const calls = fakeFetch([{ body: reply(JSON.stringify(feedback)) }]);
    const result = await askJson(openai, request);
    expect(result.points.map((p) => p.score)).toEqual([2, 1, 0, 2, 1]);
    expect(calls[0].url).toBe('https://api.openai.com/v1/chat/completions');
    const headers = calls[0].init!.headers as Record<string, string>;
    expect(headers.authorization).toBe('Bearer sk-test');
    const body = JSON.parse(calls[0].init!.body as string);
    expect(body.model).toBe('gpt-test');
    expect(body.response_format).toMatchObject({ type: 'json_schema', json_schema: { strict: true } });
    // 不支援 json_schema 的模型也照得到格式
    expect(body.messages[0].content).toContain('matches this JSON schema');
  });

  it('falls back to json_object, then to the prompt alone, when a model rejects the format', async () => {
    const calls = fakeFetch([
      { status: 400, body: { error: { message: 'response_format not supported' } } },
      { status: 400, body: { error: { message: 'json_object not supported' } } },
      { body: reply(`Here you go:\n\`\`\`json\n${JSON.stringify(feedback)}\n\`\`\``) },
    ]);
    const result = await askJson({ provider: 'openrouter', apiKey: 'sk-or', model: 'some/model' }, request);
    expect(result.summary).toBe('Clear overall.');
    expect(calls.map((c) => JSON.parse(c.init!.body as string).response_format?.type)).toEqual(['json_schema', 'json_object', undefined]);
    expect(calls[0].url).toBe('https://openrouter.ai/api/v1/chat/completions');
  });

  it('turns HTTP errors into reasons the screen can explain', async () => {
    fakeFetch([{ status: 401, body: { error: { message: 'bad key' } } }]);
    await expect(askJson(openai, request)).rejects.toMatchObject({ reason: 'key' });
    fakeFetch([{ status: 429, body: {} }]);
    await expect(chat(openai, 'Be brief.', [{ role: 'user', content: 'hi' }])).rejects.toMatchObject({ reason: 'busy' });
    fakeFetch([{ body: reply('not json at all') }]);
    await expect(askJson(openai, request)).rejects.toMatchObject({ reason: 'invalid_output' });
  });

  it('lists chat models, and checks an OpenRouter key before listing', async () => {
    fakeFetch([{ body: { data: [{ id: 'whisper-1' }, { id: 'gpt-b' }, { id: 'text-embedding-3' }, { id: 'gpt-a' }] } }]);
    expect(await listModels({ provider: 'openai', apiKey: 'sk' })).toEqual(['gpt-a', 'gpt-b']);
    const calls = fakeFetch([{ body: { data: { label: 'key' } } }, { body: { data: [{ id: 'b/m' }, { id: 'a/m' }] } }]);
    expect(await listModels({ provider: 'openrouter', apiKey: 'sk-or' })).toEqual(['a/m', 'b/m']);
    expect(calls.map((c) => c.url)).toEqual(['https://openrouter.ai/api/v1/key', 'https://openrouter.ai/api/v1/models']);
  });
});

describe('extractJson', () => {
  it('finds the object even with text or fences around it', () => {
    expect(extractJson('```json\n{"a":1}\n```')).toEqual({ a: 1 });
    expect(() => extractJson('nothing here')).toThrow(LlmError);
  });
});

describe('AI hint prompt', () => {
  it('asks for Socratic guidance without code, in the user’s language, with their notes', () => {
    const prompt = hintSystemPrompt({
      title: 'Two Sum',
      difficulty: 'Easy',
      language: 'zh-TW',
      stuckStep: 'Optimize',
      notes: { brute: 'Try every pair', keep: '' },
    });
    expect(prompt).toContain('"Two Sum" (Easy)');
    expect(prompt).toContain('Never write code or pseudocode');
    expect(prompt).toContain('Reply in Traditional Chinese (Taiwan)');
    expect(prompt).toContain('stuck at the "Optimize" step');
    expect(prompt).toContain('Brute force: Try every pair');
    expect(prompt).not.toContain('What to keep');
  });
});
