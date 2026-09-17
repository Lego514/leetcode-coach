import { randomBytes } from 'node:crypto';
import { eq, isNotNull, lt, or } from 'drizzle-orm';
import type { Executor } from '../db/client';
import { passwordResets, sessions, users } from '../db/schema';
import { hashPassword } from './password';
import { sessionId } from './sessions';

/** 重設連結的有效時間 */
export const RESET_TTL_MS = 60 * 60 * 1000;

export function newResetToken(): string {
  return randomBytes(32).toString('base64url');
}

/** 產生重設連結用的 token；資料庫只存雜湊 */
export async function createReset(db: Executor, userId: string, now = new Date()): Promise<{ token: string; expiresAt: Date }> {
  const token = newResetToken();
  const expiresAt = new Date(now.getTime() + RESET_TTL_MS);
  // 同一個帳號只留最新的一張，之前寄出的連結立刻失效
  await db.delete(passwordResets).where(eq(passwordResets.userId, userId));
  await db.insert(passwordResets).values({ id: sessionId(token), userId, expiresAt });
  return { token, expiresAt };
}

/**
 * 用重設連結換新密碼：檢查 token 沒過期也沒用過，換掉密碼雜湊，
 * 標記 token 已使用，並登出這個帳號在所有裝置上的登入。
 */
export async function consumeReset(db: Executor, token: string, password: string, now = new Date()): Promise<string | null> {
  const id = sessionId(token);
  const [row] = await db
    .select({ userId: passwordResets.userId, expiresAt: passwordResets.expiresAt, usedAt: passwordResets.usedAt })
    .from(passwordResets)
    .where(eq(passwordResets.id, id))
    .limit(1);
  if (!row || row.usedAt !== null || row.expiresAt.getTime() <= now.getTime()) return null;

  const passwordHash = await hashPassword(password);
  await db.update(users).set({ passwordHash }).where(eq(users.id, row.userId));
  await db.update(passwordResets).set({ usedAt: now }).where(eq(passwordResets.id, id));
  await db.delete(sessions).where(eq(sessions.userId, row.userId));
  return row.userId;
}

/** 清掉過期或已經用過的紀錄 */
export async function deleteStaleResets(db: Executor, now = new Date()): Promise<void> {
  await db.delete(passwordResets).where(or(lt(passwordResets.expiresAt, now), isNotNull(passwordResets.usedAt)));
}
