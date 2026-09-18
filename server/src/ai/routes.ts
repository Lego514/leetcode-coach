import { and, eq, sql } from 'drizzle-orm';
import { Hono } from 'hono';
import { feedbackRequestSchema, type AiStatus, type FeedbackResponse } from '../../../shared/protocol';
import { RateLimiter } from '../auth/rate-limit';
import { aiUsage } from '../db/schema';
import { HttpError, readJson, requireUser, type AppDeps, type AppEnv } from '../http';
import { FeedbackError, type FeedbackGenerator } from './feedback';

export interface AiOptions {
  generate: FeedbackGenerator;
  /** 每位使用者每天（UTC）最多呼叫幾次 */
  dailyLimit: number;
  /** 可以使用的帳號 email（小寫）；'*' 表示所有登入的帳號 */
  allowedEmails: string[] | '*';
}

export function isAllowed(ai: AiOptions, email: string): boolean {
  return ai.allowedEmails === '*' || ai.allowedEmails.includes(email.toLowerCase());
}

const MINUTE = 60 * 1000;

export function aiRoutes(deps: AppDeps, ai: AiOptions | undefined) {
  const { db } = deps;
  // 連續按按鈕時擋下來；每日上限另外存在資料庫，重新啟動也不會歸零
  const burstLimiter = new RateLimiter(5, MINUTE, () => deps.now().getTime());
  const today = () => deps.now().toISOString().slice(0, 10);

  async function usedToday(userId: string): Promise<number> {
    const [row] = await db
      .select({ requests: aiUsage.requests })
      .from(aiUsage)
      .where(and(eq(aiUsage.userId, userId), eq(aiUsage.day, today())));
    return row?.requests ?? 0;
  }

  return new Hono<AppEnv>()
    .get('/status', requireUser(deps), async (c) => {
      const user = c.get('user');
      const allowed = ai !== undefined && isAllowed(ai, user.email);
      const body: AiStatus = {
        available: allowed,
        ...(ai === undefined ? { reason: 'not_configured' as const } : allowed ? {} : { reason: 'not_allowed' as const }),
        dailyLimit: allowed ? ai.dailyLimit : 0,
        usedToday: await usedToday(user.id),
      };
      return c.json(body);
    })
    .post('/explanation-feedback', requireUser(deps), async (c) => {
      if (!ai) throw new HttpError(503, 'ai_unavailable', 'AI feedback is not configured on this server');
      if (!isAllowed(ai, c.get('user').email)) {
        throw new HttpError(403, 'ai_not_allowed', 'AI feedback is not enabled for this account');
      }
      const userId = c.get('user').id;
      const burst = burstLimiter.hit(userId);
      if (!burst.allowed) {
        throw new HttpError(429, 'rate_limited', 'Too many requests, try again later', {
          'Retry-After': String(burst.retryAfterSec),
        });
      }
      const request = await readJson(c, feedbackRequestSchema);
      const day = today();

      // 先佔用一次額度，已經用完時不會寫入任何資料
      const reserved = await db
        .insert(aiUsage)
        .values({ userId, day, requests: 1 })
        .onConflictDoUpdate({
          target: [aiUsage.userId, aiUsage.day],
          set: { requests: sql`${aiUsage.requests} + 1` },
          setWhere: sql`${aiUsage.requests} < ${ai.dailyLimit}`,
        })
        .returning({ requests: aiUsage.requests });
      if (reserved.length === 0) {
        throw new HttpError(429, 'ai_quota_exceeded', `Daily limit of ${ai.dailyLimit} reached`);
      }

      const addUsage = (requests: number, usage?: { inputTokens: number; outputTokens: number }) =>
        db
          .update(aiUsage)
          .set({
            requests: sql`${aiUsage.requests} + ${requests}`,
            inputTokens: sql`${aiUsage.inputTokens} + ${usage?.inputTokens ?? 0}`,
            outputTokens: sql`${aiUsage.outputTokens} + ${usage?.outputTokens ?? 0}`,
          })
          .where(and(eq(aiUsage.userId, userId), eq(aiUsage.day, day)));

      let result;
      try {
        result = await ai.generate(request);
      } catch (err) {
        // 失敗的請求不算次數，但已經產生的 token 照樣記下來
        await addUsage(-1, err instanceof FeedbackError ? err.usage : undefined);
        if (err instanceof FeedbackError) {
          const status = err.reason === 'busy' ? 503 : err.reason === 'refused' ? 422 : 502;
          throw new HttpError(status, 'ai_failed', err.message);
        }
        throw err;
      }
      await addUsage(0, result.usage);

      const body: FeedbackResponse = {
        feedback: result.feedback,
        usedToday: reserved[0].requests,
        dailyLimit: ai.dailyLimit,
      };
      return c.json(body);
    });
}
