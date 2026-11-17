import { describe, expect, it } from 'vitest';
import { proxyApi, toApiRequest } from './proxy';

const API = 'https://api.example.onrender.com';

describe('edge proxy', () => {
  it('sends /api requests to the server with the same path, query, method, cookies and body', async () => {
    const request = new Request('https://coach.example.dev/api/sync/pull?since=5', {
      method: 'POST',
      headers: { cookie: 'session=abc', origin: 'https://coach.example.dev', 'content-type': 'application/json', 'x-forwarded-for': '6.6.6.6' },
      body: JSON.stringify({ a: 1 }),
    });
    const out = toApiRequest(request, API, '203.0.113.7');
    expect(out.url).toBe(`${API}/api/sync/pull?since=5`);
    expect(out.method).toBe('POST');
    expect(out.headers.get('cookie')).toBe('session=abc');
    // 瀏覽器的 Origin 原樣轉過去，伺服器照 APP_ORIGINS 檢查
    expect(out.headers.get('origin')).toBe('https://coach.example.dev');
    // 使用者自己帶的 X-Forwarded-For 不算數，換成 Cloudflare 看到的 IP
    expect(out.headers.get('x-forwarded-for')).toBe('203.0.113.7');
    expect(out.headers.get('x-forwarded-host')).toBe('coach.example.dev');
    expect(out.redirect).toBe('manual');
    expect(await out.json()).toEqual({ a: 1 });
  });

  it('passes responses through untouched, including cookies and redirects', async () => {
    const reply = new Response(null, { status: 302, headers: { location: 'https://github.com/login/oauth/authorize', 'set-cookie': 'gh_state=x; Secure; HttpOnly' } });
    const response = await proxyApi(new Request('https://coach.example.dev/api/auth/github/start'), API, null, async () => reply);
    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toBe('https://github.com/login/oauth/authorize');
    expect(response.headers.get('set-cookie')).toContain('gh_state=x');
  });

  it('answers 503 in the API error format when the server cannot be reached', async () => {
    const response = await proxyApi(new Request('https://coach.example.dev/api/health'), API, null, async () => {
      throw new TypeError('network');
    });
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ error: { code: 'unavailable' } });
  });
});
