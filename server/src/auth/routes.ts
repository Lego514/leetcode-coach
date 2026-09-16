import { eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { credentialsSchema, deleteAccountSchema } from '../../../shared/protocol';
import { users } from '../db/schema';
import {
  clearSessionCookie,
  clientIp,
  HttpError,
  readJson,
  readSessionToken,
  requireUser,
  setSessionCookie,
  type AppDeps,
  type AppEnv,
} from '../http';
import { hashPassword, verifyAgainstDummy, verifyPassword } from './password';
import { RateLimiter } from './rate-limit';
import { createSession, deleteExpiredSessions, deleteSession, findSession, toPublicUser } from './sessions';

const MINUTE = 60 * 1000;

function isUniqueViolation(err: unknown): boolean {
  const e = err as { code?: string; cause?: { code?: string } } | null;
  return e?.code === '23505' || e?.cause?.code === '23505';
}

function limitOrThrow(limiter: RateLimiter, key: string): void {
  const result = limiter.hit(key);
  if (!result.allowed) {
    throw new HttpError(429, 'rate_limited', 'Too many attempts, try again later', {
      'Retry-After': String(result.retryAfterSec),
    });
  }
}

export function authRoutes(deps: AppDeps) {
  const { db } = deps;
  const now = () => deps.now().getTime();
  // 同一個 IP 每小時最多註冊 10 次；同一組 IP 與帳號 15 分鐘內最多試 10 次密碼
  const registerLimiter = new RateLimiter(10, 60 * MINUTE, now);
  const loginLimiter = new RateLimiter(10, 15 * MINUTE, now);
  const loginIpLimiter = new RateLimiter(50, 15 * MINUTE, now);

  return new Hono<AppEnv>()
    .post('/register', async (c) => {
      limitOrThrow(registerLimiter, clientIp(c, deps.trustProxy));
      const { email, password } = await readJson(c, credentialsSchema);
      const passwordHash = await hashPassword(password);

      let row;
      try {
        [row] = await db.insert(users).values({ email, passwordHash }).returning();
      } catch (err) {
        if (isUniqueViolation(err)) throw new HttpError(409, 'email_taken', 'This email is already registered');
        throw err;
      }
      const session = await createSession(db, row.id, deps.now());
      setSessionCookie(c, deps, session.token, session.expiresAt);
      return c.json({ user: toPublicUser(row) }, 201);
    })

    .post('/login', async (c) => {
      const ip = clientIp(c, deps.trustProxy);
      limitOrThrow(loginIpLimiter, ip);
      const { email, password } = await readJson(c, credentialsSchema);
      const key = `${ip}|${email}`;
      limitOrThrow(loginLimiter, key);

      const [row] = await db.select().from(users).where(eq(users.email, email)).limit(1);
      const ok = row ? await verifyPassword(password, row.passwordHash) : await verifyAgainstDummy(password);
      if (!row || !ok) throw new HttpError(401, 'invalid_credentials', 'Email or password is incorrect');

      loginLimiter.reset(key);
      await deleteExpiredSessions(db, deps.now());
      const session = await createSession(db, row.id, deps.now());
      setSessionCookie(c, deps, session.token, session.expiresAt);
      return c.json({ user: toPublicUser(row) });
    })

    .post('/logout', async (c) => {
      const token = readSessionToken(c, deps);
      if (token) await deleteSession(db, token);
      clearSessionCookie(c, deps);
      return c.body(null, 204);
    })

    // 沒登入時回 user: null（不是 401），讓前端啟動時不會在主控台留下錯誤
    .get('/me', async (c) => {
      const token = readSessionToken(c, deps);
      const session = token ? await findSession(db, token, deps.now()) : null;
      if (!session) {
        if (token) clearSessionCookie(c, deps);
        return c.json({ user: null });
      }
      if (session.renewed) setSessionCookie(c, deps, token!, session.expiresAt);
      return c.json({ user: session.user });
    })

    .post('/delete-account', requireUser(deps), async (c) => {
      const user = c.get('user');
      limitOrThrow(loginLimiter, `${clientIp(c, deps.trustProxy)}|${user.email}`);
      const { password } = await readJson(c, deleteAccountSchema);
      const [row] = await db.select().from(users).where(eq(users.id, user.id)).limit(1);
      if (!row || !(await verifyPassword(password, row.passwordHash))) {
        throw new HttpError(401, 'invalid_credentials', 'Password is incorrect');
      }
      // sessions 與 records 透過 ON DELETE CASCADE 一起刪除
      await db.delete(users).where(eq(users.id, user.id));
      clearSessionCookie(c, deps);
      return c.body(null, 204);
    });
}
