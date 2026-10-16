import { and, eq } from 'drizzle-orm';
import type { LoginMethods } from '../../../shared/protocol';
import type { Executor } from '../db/client';
import { oauthAccounts, users } from '../db/schema';

/** 這個帳號有沒有密碼、連了哪個 GitHub 帳號 */
export async function loginMethods(db: Executor, userId: string): Promise<LoginMethods> {
  const [row] = await db.select({ passwordHash: users.passwordHash }).from(users).where(eq(users.id, userId)).limit(1);
  const [github] = await db
    .select({ username: oauthAccounts.username })
    .from(oauthAccounts)
    .where(and(eq(oauthAccounts.userId, userId), eq(oauthAccounts.provider, 'github')))
    .limit(1);
  return { password: Boolean(row?.passwordHash), github: github?.username ?? null };
}
