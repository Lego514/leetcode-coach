import { createHash, randomBytes } from 'node:crypto';
import { eq, lt } from 'drizzle-orm';
import type { PublicUser } from '../../../shared/protocol';
import type { Executor } from '../db/client';
import { sessions, users } from '../db/schema';

export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
/** 剩下不到 15 天就自動延長，常用的人不會突然被登出 */
const RENEW_WITHIN_MS = 15 * 24 * 60 * 60 * 1000;

export function newSessionToken(): string {
  return randomBytes(32).toString('base64url');
}

/** 資料庫只存 token 的雜湊 */
export function sessionId(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function toPublicUser(row: { id: string; email: string; createdAt: Date }): PublicUser {
  return { id: row.id, email: row.email, createdAt: row.createdAt.toISOString() };
}

export async function createSession(db: Executor, userId: string, now = new Date()): Promise<{ token: string; expiresAt: Date }> {
  const token = newSessionToken();
  const expiresAt = new Date(now.getTime() + SESSION_TTL_MS);
  await db.insert(sessions).values({ id: sessionId(token), userId, expiresAt });
  return { token, expiresAt };
}

export interface ActiveSession {
  user: PublicUser;
  expiresAt: Date;
  /** 這次查詢時順便延長了期限，呼叫端要更新 cookie */
  renewed: boolean;
}

export async function findSession(db: Executor, token: string, now = new Date()): Promise<ActiveSession | null> {
  const id = sessionId(token);
  const [row] = await db
    .select({ expiresAt: sessions.expiresAt, userId: users.id, email: users.email, createdAt: users.createdAt })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(eq(sessions.id, id))
    .limit(1);
  if (!row) return null;

  if (row.expiresAt.getTime() <= now.getTime()) {
    await db.delete(sessions).where(eq(sessions.id, id));
    return null;
  }

  const user = toPublicUser({ id: row.userId, email: row.email, createdAt: row.createdAt });
  if (row.expiresAt.getTime() - now.getTime() < RENEW_WITHIN_MS) {
    const expiresAt = new Date(now.getTime() + SESSION_TTL_MS);
    await db.update(sessions).set({ expiresAt }).where(eq(sessions.id, id));
    return { user, expiresAt, renewed: true };
  }
  return { user, expiresAt: row.expiresAt, renewed: false };
}

export async function deleteSession(db: Executor, token: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.id, sessionId(token)));
}

export async function deleteExpiredSessions(db: Executor, now = new Date()): Promise<void> {
  await db.delete(sessions).where(lt(sessions.expiresAt, now));
}
