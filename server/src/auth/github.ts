import { createHash, randomBytes } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import { Hono, type Context } from 'hono';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import type { GithubResult } from '../../../shared/protocol';
import { oauthAccounts, users } from '../db/schema';
import { clientIp, HttpError, readSessionToken, requireUser, setSessionCookie, type AppDeps, type AppEnv } from '../http';
import { loginMethods } from './methods';
import { RateLimiter } from './rate-limit';
import { createSession, findSession } from './sessions';

// 用 GitHub 登入（OAuth 2.0 授權碼流程加 PKCE）：
// 1. /start 產生 state 和 PKCE 的 verifier，存在只有這個瀏覽器有的 cookie，轉到 GitHub
// 2. GitHub 轉回 /callback，比對 state，用授權碼和 verifier 換 access token，讀 GitHub 帳號和驗證過的 email
// 3. 已經連結的 GitHub 帳號直接登入；登入中的人選「連結 GitHub」就連到目前的帳號；
//    都不是的話用 GitHub 的 email 開新帳號。email 已經有人註冊時不會自動合併（避免被冒用），
//    請對方先用密碼登入，再到帳號頁連結。
// 結束後回到網站的 #/account?github=<結果>。

export interface GithubOptions {
  clientId: string;
  clientSecret: string;
  /** 網站的網址：callback 是 <appUrl>/api/auth/github/callback，結束後回到 <appUrl>/#/account */
  appUrl: string;
  /** 換成假的 GitHub（測試用） */
  oauthBaseUrl?: string;
  apiBaseUrl?: string;
  fetch?: typeof fetch;
}

type Intent = 'signin' | 'link';

interface GithubIdentity {
  id: string;
  login: string;
  /** 驗證過的 email（小寫）；沒有就是 null */
  email: string | null;
}

const STATE_TTL_SEC = 10 * 60;
const MINUTE = 60 * 1000;

function stateCookieName(secure: boolean): string {
  return secure ? '__Host-coach_oauth' : 'coach_oauth';
}

function random(): string {
  return randomBytes(32).toString('base64url');
}

/** PKCE：送給 GitHub 的 challenge 是 verifier 的 SHA-256 */
export function codeChallenge(verifier: string): string {
  return createHash('sha256').update(verifier).digest('base64url');
}

export function githubRoutes(deps: AppDeps, options: GithubOptions) {
  const { db } = deps;
  const oauthBase = (options.oauthBaseUrl ?? 'https://github.com').replace(/\/+$/, '');
  const apiBase = (options.apiBaseUrl ?? 'https://api.github.com').replace(/\/+$/, '');
  const appUrl = options.appUrl.replace(/\/+$/, '');
  const redirectUri = `${appUrl}/api/auth/github/callback`;
  const fetchImpl = options.fetch ?? fetch;
  // 同一個 IP 15 分鐘內最多開始 30 次
  const startLimiter = new RateLimiter(30, 15 * MINUTE, () => deps.now().getTime());

  const back = (c: Context, result: GithubResult) => c.redirect(`${appUrl}/#/account?github=${result}`, 302);

  async function identityFor(code: string, verifier: string): Promise<GithubIdentity> {
    const tokenRes = await fetchImpl(`${oauthBase}/login/oauth/access_token`, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: options.clientId,
        client_secret: options.clientSecret,
        code,
        redirect_uri: redirectUri,
        code_verifier: verifier,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    const token = (await tokenRes.json()) as { access_token?: string; error?: string };
    if (!tokenRes.ok || !token.access_token) throw new Error(`GitHub token exchange failed: ${token.error ?? tokenRes.status}`);

    const headers = {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token.access_token}`,
      'User-Agent': 'leetcode-coach',
      'X-GitHub-Api-Version': '2022-11-28',
    };
    const [userRes, emailsRes] = await Promise.all([
      fetchImpl(`${apiBase}/user`, { headers, signal: AbortSignal.timeout(10_000) }),
      fetchImpl(`${apiBase}/user/emails`, { headers, signal: AbortSignal.timeout(10_000) }),
    ]);
    if (!userRes.ok) throw new Error(`GitHub user lookup failed: ${userRes.status}`);
    const user = (await userRes.json()) as { id?: number | string; login?: string };
    if (user.id === undefined || !user.login) throw new Error('GitHub returned no user id');
    const emails = emailsRes.ok ? ((await emailsRes.json()) as { email: string; primary?: boolean; verified?: boolean }[]) : [];
    const verified = emails.filter((e) => e.verified);
    const email = (verified.find((e) => e.primary) ?? verified[0])?.email?.trim().toLowerCase() ?? null;
    return { id: String(user.id), login: user.login, email };
  }

  async function currentUserId(c: Context): Promise<string | null> {
    const token = readSessionToken(c, deps);
    const session = token ? await findSession(db, token, deps.now()) : null;
    return session?.user.id ?? null;
  }

  async function signInAs(c: Context, userId: string): Promise<void> {
    const session = await createSession(db, userId, deps.now());
    setSessionCookie(c, deps, session.token, session.expiresAt);
  }

  return new Hono<AppEnv>()
    .get('/start', (c) => {
      const limit = startLimiter.hit(clientIp(c, deps.trustProxy));
      if (!limit.allowed) throw new HttpError(429, 'rate_limited', 'Too many attempts, try again later');
      const intent: Intent = c.req.query('intent') === 'link' ? 'link' : 'signin';
      const state = random();
      const verifier = random();
      setCookie(c, stateCookieName(deps.secureCookies), `${intent}.${state}.${verifier}`, {
        httpOnly: true,
        secure: deps.secureCookies,
        // GitHub 轉回來是一般的網頁跳轉（GET），Lax 的 cookie 會帶上
        sameSite: 'Lax',
        path: '/',
        maxAge: STATE_TTL_SEC,
      });
      const url = new URL(`${oauthBase}/login/oauth/authorize`);
      url.search = new URLSearchParams({
        client_id: options.clientId,
        redirect_uri: redirectUri,
        scope: 'read:user user:email',
        state,
        code_challenge: codeChallenge(verifier),
        code_challenge_method: 'S256',
        allow_signup: 'true',
      }).toString();
      return c.redirect(url.toString(), 302);
    })

    .get('/callback', async (c) => {
      const saved = getCookie(c, stateCookieName(deps.secureCookies));
      deleteCookie(c, stateCookieName(deps.secureCookies), { path: '/', secure: deps.secureCookies });
      const [intent, state, verifier] = saved?.split('.') ?? [];
      // 對方在 GitHub 按了取消
      if (c.req.query('error') === 'access_denied') return back(c, 'cancelled');
      const code = c.req.query('code');
      // state 不對：不是從這個瀏覽器開始的登入（可能是偽造的連結），什麼都不做
      if (!code || !state || !verifier || c.req.query('state') !== state) return back(c, 'failed');

      let github: GithubIdentity;
      try {
        github = await identityFor(code, verifier);
      } catch (err) {
        deps.log?.('GitHub sign-in failed', err);
        return back(c, 'failed');
      }

      const [linked] = await db
        .select({ userId: oauthAccounts.userId })
        .from(oauthAccounts)
        .where(and(eq(oauthAccounts.provider, 'github'), eq(oauthAccounts.providerUserId, github.id)))
        .limit(1);
      const current = intent === 'link' ? await currentUserId(c) : null;

      if (linked) {
        if (current) return back(c, linked.userId === current ? 'linked' : 'in-use');
        await db
          .update(oauthAccounts)
          .set({ username: github.login })
          .where(and(eq(oauthAccounts.provider, 'github'), eq(oauthAccounts.providerUserId, github.id)));
        await signInAs(c, linked.userId);
        return back(c, 'signed-in');
      }

      if (current) {
        const methods = await loginMethods(db, current);
        // 已經連了另一個 GitHub 帳號
        if (methods.github) return back(c, 'in-use');
        await db.insert(oauthAccounts).values({ provider: 'github', providerUserId: github.id, userId: current, username: github.login });
        return back(c, 'linked');
      }

      if (!github.email) return back(c, 'no-email');
      const [taken] = await db.select({ id: users.id }).from(users).where(eq(users.email, github.email)).limit(1);
      if (taken) return back(c, 'email-taken');

      const userId = await db.transaction(async (tx) => {
        const [row] = await tx.insert(users).values({ email: github.email!, passwordHash: null }).returning({ id: users.id });
        await tx.insert(oauthAccounts).values({ provider: 'github', providerUserId: github.id, userId: row.id, username: github.login });
        return row.id;
      });
      await signInAs(c, userId);
      return back(c, 'signed-up');
    })

    // 取消連結；沒有密碼時不行，不然就沒辦法登入了
    .post('/unlink', requireUser(deps), async (c) => {
      const user = c.get('user');
      const methods = await loginMethods(db, user.id);
      if (!methods.password) {
        throw new HttpError(409, 'last_login_method', 'Set a password before disconnecting GitHub, or you could not sign in');
      }
      await db.delete(oauthAccounts).where(and(eq(oauthAccounts.userId, user.id), eq(oauthAccounts.provider, 'github')));
      return c.json({ login: await loginMethods(db, user.id) });
    });
}
