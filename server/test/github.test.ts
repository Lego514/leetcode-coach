import { createHash } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { MeResponse } from '../../shared/protocol';
import { ORIGIN, startTestServer, TestClient, type TestServer } from './helpers';

// 假的 GitHub：授權時記下 PKCE 的 challenge，換 token 時檢查 verifier 對不對
interface FakeAccount {
  id: number;
  login: string;
  emails: { email: string; primary: boolean; verified: boolean }[];
}

function fakeGithub() {
  const accounts = new Map<string, FakeAccount>();
  const codes = new Map<string, { login: string; challenge: string; redirectUri: string }>();
  let n = 0;
  return {
    add(account: FakeAccount) {
      accounts.set(account.login, account);
    },
    /** 使用者在 GitHub 按「授權」：回傳授權碼 */
    approve(authorize: URL, login: string): string {
      n += 1;
      const code = `code-${n}`;
      codes.set(code, {
        login,
        challenge: authorize.searchParams.get('code_challenge')!,
        redirectUri: authorize.searchParams.get('redirect_uri')!,
      });
      return code;
    },
    fetch: (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(String(input));
      if (url.pathname === '/login/oauth/access_token') {
        const body = JSON.parse(String(init?.body)) as Record<string, string>;
        const grant = codes.get(body.code);
        codes.delete(body.code);
        const pkceOk = grant && createHash('sha256').update(body.code_verifier).digest('base64url') === grant.challenge;
        if (!grant || !pkceOk || body.client_secret !== 'shh' || body.redirect_uri !== grant.redirectUri) {
          return Response.json({ error: 'bad_verification_code' });
        }
        return Response.json({ access_token: `token-${grant.login}` });
      }
      const login = new Headers(init?.headers).get('authorization')?.replace('Bearer token-', '') ?? '';
      const account = accounts.get(login);
      if (!account) return new Response('unauthorized', { status: 401 });
      if (url.pathname === '/user') return Response.json({ id: account.id, login: account.login });
      if (url.pathname === '/user/emails') return Response.json(account.emails);
      return new Response('not found', { status: 404 });
    }) as typeof fetch,
  };
}

let server: TestServer;
let github: ReturnType<typeof fakeGithub>;

beforeEach(async () => {
  github = fakeGithub();
  github.add({ id: 1, login: 'octo', emails: [{ email: 'Octo@Example.com', primary: true, verified: true }] });
  github.add({ id: 2, login: 'mona', emails: [{ email: 'mona@example.com', primary: true, verified: true }] });
  github.add({ id: 3, login: 'ghost', emails: [{ email: 'ghost@example.com', primary: true, verified: false }] });
  server = await startTestServer({
    github: {
      clientId: 'client-1',
      clientSecret: 'shh',
      appUrl: ORIGIN,
      oauthBaseUrl: 'https://gh.test',
      apiBaseUrl: 'https://api.gh.test',
      fetch: github.fetch,
    },
  });
});

afterEach(() => server.close());

/** 走一次「用 GitHub 登入」：回傳最後回到網站的位置 */
async function viaGithub(client: TestClient, login: string, intent: 'signin' | 'link' = 'signin') {
  const start = await client.request('GET', `/api/auth/github/start?intent=${intent}`);
  expect(start.status).toBe(302);
  const authorize = new URL(start.headers.get('location')!);
  const code = github.approve(authorize, login);
  const back = await client.request('GET', `/api/auth/github/callback?code=${code}&state=${authorize.searchParams.get('state')}`);
  expect(back.status).toBe(302);
  return new URL(back.headers.get('location')!).hash;
}

async function me(client: TestClient): Promise<MeResponse> {
  return (await client.request('GET', '/api/auth/me')).json() as Promise<MeResponse>;
}

describe('GitHub sign-in', () => {
  it('sends the browser to GitHub with a state and a PKCE challenge', async () => {
    const client = new TestClient(server.app);
    const res = await client.request('GET', '/api/auth/github/start');
    const url = new URL(res.headers.get('location')!);
    expect(url.origin + url.pathname).toBe('https://gh.test/login/oauth/authorize');
    expect(url.searchParams.get('client_id')).toBe('client-1');
    expect(url.searchParams.get('redirect_uri')).toBe(`${ORIGIN}/api/auth/github/callback`);
    expect(url.searchParams.get('scope')).toBe('read:user user:email');
    expect(url.searchParams.get('code_challenge_method')).toBe('S256');
    expect(url.searchParams.get('state')).toMatch(/^[\w-]{43}$/);
    expect(res.headers.getSetCookie().join()).toMatch(/coach_oauth=.*HttpOnly.*SameSite=Lax/i);
  });

  it('creates an account from a verified GitHub email, then signs back into it', async () => {
    const client = new TestClient(server.app);
    expect(await viaGithub(client, 'octo')).toBe('#/account?github=signed-up');
    const first = await me(client);
    expect(first.user?.email).toBe('octo@example.com');
    expect(first.login).toEqual({ password: false, github: 'octo' });
    expect(first.providers).toEqual({ github: true });

    const other = new TestClient(server.app);
    expect(await viaGithub(other, 'octo')).toBe('#/account?github=signed-in');
    expect((await me(other)).user?.id).toBe(first.user?.id);
    // 沒有密碼：用密碼登入一律失敗
    expect((await other.login('octo@example.com', 'anything at all')).status).toBe(401);
  });

  it('never merges into an existing account by email; it can be linked after signing in', async () => {
    const client = new TestClient(server.app);
    await client.register('mona@example.com');
    await client.request('POST', '/api/auth/logout');

    expect(await viaGithub(client, 'mona')).toBe('#/account?github=email-taken');
    expect((await me(client)).user).toBeNull();

    await client.login('mona@example.com');
    expect(await viaGithub(client, 'mona', 'link')).toBe('#/account?github=linked');
    expect((await me(client)).login).toEqual({ password: true, github: 'mona' });

    await client.request('POST', '/api/auth/logout');
    expect(await viaGithub(client, 'mona')).toBe('#/account?github=signed-in');
    expect((await me(client)).user?.email).toBe('mona@example.com');
  });

  it('refuses a GitHub account that is already linked to someone else', async () => {
    const owner = new TestClient(server.app);
    await viaGithub(owner, 'octo');
    const someone = new TestClient(server.app);
    await someone.register('someone@example.com');
    expect(await viaGithub(someone, 'octo', 'link')).toBe('#/account?github=in-use');
    expect((await me(someone)).login?.github).toBeNull();
  });

  it('does nothing when the state does not match or the person cancels', async () => {
    const client = new TestClient(server.app);
    const start = await client.request('GET', '/api/auth/github/start');
    const code = github.approve(new URL(start.headers.get('location')!), 'octo');
    const forged = await client.request('GET', `/api/auth/github/callback?code=${code}&state=someone-elses-state`);
    expect(new URL(forged.headers.get('location')!).hash).toBe('#/account?github=failed');
    expect((await me(client)).user).toBeNull();

    // 沒有先開始（沒有 state cookie）也不行
    const stranger = new TestClient(server.app);
    const noCookie = await stranger.request('GET', '/api/auth/github/callback?code=x&state=y');
    expect(new URL(noCookie.headers.get('location')!).hash).toBe('#/account?github=failed');

    await client.request('GET', '/api/auth/github/start');
    const cancelled = await client.request('GET', '/api/auth/github/callback?error=access_denied');
    expect(new URL(cancelled.headers.get('location')!).hash).toBe('#/account?github=cancelled');
  });

  it('fails when the PKCE verifier does not match', async () => {
    const client = new TestClient(server.app);
    const start = await client.request('GET', '/api/auth/github/start');
    const authorize = new URL(start.headers.get('location')!);
    // 授權碼是發給另一個 challenge 的（例如被攔截後拿去別的瀏覽器用）
    authorize.searchParams.set('code_challenge', 'not-the-real-challenge');
    const code = github.approve(authorize, 'octo');
    const back = await client.request('GET', `/api/auth/github/callback?code=${code}&state=${authorize.searchParams.get('state')}`);
    expect(new URL(back.headers.get('location')!).hash).toBe('#/account?github=failed');
    expect((await me(client)).user).toBeNull();
  });

  it('needs a verified email to create an account', async () => {
    const client = new TestClient(server.app);
    expect(await viaGithub(client, 'ghost')).toBe('#/account?github=no-email');
    expect((await me(client)).user).toBeNull();
  });

  it('disconnects GitHub only when the account also has a password', async () => {
    const githubOnly = new TestClient(server.app);
    await viaGithub(githubOnly, 'octo');
    const refused = await githubOnly.request('POST', '/api/auth/github/unlink');
    expect(refused.status).toBe(409);
    expect(((await refused.json()) as { error: { code: string } }).error.code).toBe('last_login_method');

    const both = new TestClient(server.app);
    await both.register('mona@example.com');
    await viaGithub(both, 'mona', 'link');
    const res = await both.request('POST', '/api/auth/github/unlink');
    expect(await res.json()).toEqual({ login: { password: true, github: null } });
  });

  it('deletes a GitHub-only account after typing its email', async () => {
    const client = new TestClient(server.app);
    await viaGithub(client, 'octo');
    expect((await client.request('POST', '/api/auth/delete-account', { confirmEmail: 'wrong@example.com' })).status).toBe(401);
    expect((await client.request('POST', '/api/auth/delete-account', { confirmEmail: 'Octo@Example.com' })).status).toBe(204);
    // 再用 GitHub 登入就是新帳號
    expect(await viaGithub(new TestClient(server.app), 'octo')).toBe('#/account?github=signed-up');
  });
});

describe('without GitHub configured', () => {
  it('says so, and has no GitHub routes', async () => {
    const plain = await startTestServer();
    try {
      const client = new TestClient(plain.app);
      expect((await me(client)).providers).toEqual({ github: false });
      expect((await client.request('GET', '/api/auth/github/start')).status).toBe(404);
    } finally {
      await plain.close();
    }
  });
});
