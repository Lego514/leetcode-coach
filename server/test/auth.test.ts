import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from '../src/auth/password';
import { RateLimiter } from '../src/auth/rate-limit';
import { sessions } from '../src/db/schema';
import { startTestServer, TestClient, type TestServer } from './helpers';

let server: TestServer;

beforeEach(async () => {
  server = await startTestServer();
});

afterEach(async () => {
  await server.close();
});

describe('passwords', () => {
  it('hashes with a random salt and verifies', async () => {
    const a = await hashPassword('hunter22hunter22');
    const b = await hashPassword('hunter22hunter22');
    expect(a).not.toBe(b);
    expect(a.startsWith('scrypt$32768$8$1$')).toBe(true);
    expect(await verifyPassword('hunter22hunter22', a)).toBe(true);
    expect(await verifyPassword('wrong password', a)).toBe(false);
    expect(await verifyPassword('hunter22hunter22', 'garbage')).toBe(false);
  });
});

describe('register / login / logout', () => {
  it('registers, keeps the session, and signs out', async () => {
    const client = new TestClient(server.app);
    const res = await client.register('  Ray@Example.com ');
    expect(res.status).toBe(201);
    const { user } = await res.json();
    expect(user).toMatchObject({ email: 'ray@example.com' });
    expect(user).not.toHaveProperty('passwordHash');
    expect(res.headers.get('set-cookie')).toMatch(/coach_session=.+HttpOnly.+SameSite=Lax/i);

    expect((await client.whoami())?.id).toBe(user.id);

    expect((await client.request('POST', '/api/auth/logout')).status).toBe(204);
    expect(client.sessionCookie).toBeUndefined();
    expect(await client.whoami()).toBeNull();
    expect(await server.database.db.select().from(sessions)).toHaveLength(0);
  });

  it('stores only a hash of the session token', async () => {
    const client = new TestClient(server.app);
    await client.register('ray@example.com');
    const [row] = await server.database.db.select().from(sessions);
    expect(row.id).toHaveLength(64);
    expect(row.id).not.toBe(client.sessionCookie);
  });

  it('rejects duplicate emails and weak input', async () => {
    const client = new TestClient(server.app);
    await client.register('ray@example.com');
    const dup = await new TestClient(server.app).register('RAY@example.com');
    expect(dup.status).toBe(409);
    expect((await dup.json()).error.code).toBe('email_taken');

    const weak = await new TestClient(server.app).request('POST', '/api/auth/register', { email: 'a@b.co', password: 'short' });
    expect(weak.status).toBe(400);
    expect((await weak.json()).error.code).toBe('invalid_request');

    const badEmail = await new TestClient(server.app).register('not-an-email');
    expect(badEmail.status).toBe(400);
  });

  it('logs in with the right password only', async () => {
    await new TestClient(server.app).register('ray@example.com');
    const client = new TestClient(server.app);

    const wrong = await client.login('ray@example.com', 'wrong password!!');
    expect(wrong.status).toBe(401);
    expect((await wrong.json()).error.code).toBe('invalid_credentials');

    const unknown = await client.login('nobody@example.com');
    expect(unknown.status).toBe(401);
    expect((await unknown.json()).error.code).toBe('invalid_credentials');

    const ok = await client.login('Ray@Example.com');
    expect(ok.status).toBe(200);
    expect(await client.whoami()).toMatchObject({ email: 'ray@example.com' });
  });

  it('expires sessions and renews ones that are used', async () => {
    const client = new TestClient(server.app);
    await client.register('ray@example.com');
    const start = server.clock.now.getTime();
    const day = 24 * 60 * 60 * 1000;

    // 20 天後使用：剩不到 15 天，自動延長
    server.clock.now = new Date(start + 20 * day);
    const renewed = await client.request('GET', '/api/auth/me');
    expect(renewed.status).toBe(200);
    expect(renewed.headers.get('set-cookie')).toMatch(/coach_session=/);

    // 延長後 45 天仍然有效（原本 30 天就會過期）
    server.clock.now = new Date(start + 45 * day);
    expect(await client.whoami()).not.toBeNull();

    // 再過 31 天沒用就過期，cookie 也會被清掉
    server.clock.now = new Date(start + 45 * day + 31 * day);
    expect(await client.whoami()).toBeNull();
    expect(client.sessionCookie).toBeUndefined();
  });

  it('rate-limits repeated failed logins', async () => {
    await new TestClient(server.app).register('ray@example.com');
    const client = new TestClient(server.app);
    for (let i = 0; i < 10; i += 1) {
      expect((await client.login('ray@example.com', `wrong password ${i}`)).status).toBe(401);
    }
    const limited = await client.login('ray@example.com');
    expect(limited.status).toBe(429);
    expect(limited.headers.get('retry-after')).toBeTruthy();
  });

  it('deletes the account and all of its data', async () => {
    const client = new TestClient(server.app);
    await client.register('ray@example.com');
    await client.sync(0, [{ collection: 'settings', key: 'app', updatedAt: 1, deleted: false, data: { activeList: 'blind75', dailyNew: 2, language: 'python' } }]);

    const wrong = await client.request('POST', '/api/auth/delete-account', { password: 'nope nope nope' });
    expect(wrong.status).toBe(401);

    const res = await client.request('POST', '/api/auth/delete-account', { password: 'correct horse battery' });
    expect(res.status).toBe(204);
    expect(await client.whoami()).toBeNull();
    expect((await new TestClient(server.app).login('ray@example.com')).status).toBe(401);
    // 可以用同一個 email 重新註冊，且沒有舊資料
    const again = new TestClient(server.app);
    expect((await again.register('ray@example.com')).status).toBe(201);
    expect((await again.sync(0, [])).changes).toEqual([]);
  });
});

describe('request guard', () => {
  it('rejects non-JSON writes and foreign origins', async () => {
    const client = new TestClient(server.app);
    const form = await client.request('POST', '/api/auth/login', undefined, { 'content-type': 'application/x-www-form-urlencoded' });
    expect(form.status).toBe(415);

    const evil = new TestClient(server.app, 'https://evil.example');
    const res = await evil.register('ray@example.com');
    expect(res.status).toBe(403);
    expect((await res.json()).error.code).toBe('forbidden_origin');

    const crossSite = await client.request('POST', '/api/auth/logout', undefined, { 'sec-fetch-site': 'cross-site' });
    expect(crossSite.status).toBe(403);
  });

  it('answers unknown API routes with JSON 404 and disables caching', async () => {
    const res = await new TestClient(server.app).request('GET', '/api/nope');
    expect(res.status).toBe(404);
    expect(res.headers.get('cache-control')).toBe('no-store');
    expect((await res.json()).error.code).toBe('not_found');
  });

  it('requires sign-in for sync', async () => {
    const res = await new TestClient(server.app).request('POST', '/api/sync', { cursor: 0, changes: [] });
    expect(res.status).toBe(401);
  });
});

describe('RateLimiter', () => {
  it('allows up to the limit per window', () => {
    let now = 0;
    const limiter = new RateLimiter(2, 1000, () => now);
    expect(limiter.hit('a').allowed).toBe(true);
    expect(limiter.hit('a').allowed).toBe(true);
    expect(limiter.hit('a')).toEqual({ allowed: false, retryAfterSec: 1 });
    expect(limiter.hit('b').allowed).toBe(true);
    now = 1000;
    expect(limiter.hit('a').allowed).toBe(true);
  });
});
