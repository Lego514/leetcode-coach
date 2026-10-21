import { timingSafeEqual } from 'node:crypto';
import { and, eq, sql } from 'drizzle-orm';
import { Hono } from 'hono';
import { pushSubscribeSchema, pushUnsubscribeSchema, type PushConfigResponse } from '../../../shared/protocol';
import { streakState } from '../../../shared/streak';
import { pushSubscriptions, records } from '../db/schema';
import { HttpError, readJson, requireUser, type AppDeps, type AppEnv } from '../http';

// 每日提醒：使用者在設定裡選幾點提醒，瀏覽器訂閱推播後把訂閱存在這裡。
// Render 免費方案閒置會睡，伺服器裡的計時器靠不住，所以由 GitHub Actions 每小時呼叫一次 POST /api/push/send-due（帶 CRON_SECRET），
// 這時候當地已經過了提醒時間、今天還沒練習的人，就寄一則提醒；練過了就不吵他。

export interface PushMessage {
  title: string;
  body: string;
  /** 點通知打開的頁面 */
  url: string;
}

export interface PushTarget {
  endpoint: string;
  p256dh: string;
  auth: string;
}

/** 寄一則推播；推播服務說這個訂閱已經失效（404、410）時回傳 gone，其他錯誤丟出來 */
export type PushSender = (target: PushTarget, message: PushMessage) => Promise<'sent' | 'gone'>;

export interface PushOptions {
  publicKey: string;
  send: PushSender;
  /** 排程呼叫 send-due 時要帶的密碼；沒設定就不能觸發寄送 */
  cronSecret?: string;
}

/** 某個時區現在的日期（YYYY-MM-DD）和幾點 */
export function localTime(now: Date, timeZone: string): { day: string; hour: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  return { day: `${get('year')}-${get('month')}-${get('day')}`, hour: Number(get('hour')) };
}

function validTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone });
    return true;
  } catch {
    return false;
  }
}

function daysBefore(day: string, n: number): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

/** 到昨天為止連續練習了幾天；跟網頁一樣，漏掉的日子有保護就不算斷 */
export function streakBefore(days: ReadonlySet<string>, today: string): number {
  return streakState([...days].filter((day) => day < today), today).streak;
}

/** 提醒的文字：有連續紀錄時提一下，比較有動力 */
export function reminderMessage(locale: string, streak: number): PushMessage {
  const url = './#/';
  if (locale === 'en') {
    return {
      title: 'LeetCode Coach',
      body: streak >= 2 ? `You’re on a ${streak}-day streak. One problem today keeps it going.` : 'You haven’t practiced today. Open today’s plan?',
      url,
    };
  }
  return {
    title: '刷題教練',
    body: streak >= 2 ? `已經連續 ${streak} 天了，今天也寫一題吧。` : '今天還沒練習，打開看看今天的題目吧。',
    url,
  };
}

function sameSecret(given: string, expected: string): boolean {
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function pushRoutes(deps: AppDeps, options: PushOptions | undefined) {
  const { db } = deps;

  return new Hono<AppEnv>()
    .get('/config', (c) => c.json({ publicKey: options?.publicKey ?? null } satisfies PushConfigResponse))

    .post('/subscribe', requireUser(deps), async (c) => {
      if (!options) throw new HttpError(404, 'not_found', 'Reminders are not set up on this server');
      const body = await readJson(c, pushSubscribeSchema);
      if (!validTimeZone(body.timeZone)) throw new HttpError(400, 'invalid_request', 'timeZone: unknown time zone');
      const user = c.get('user');
      // 今天的提醒時間已經過了：從明天開始提醒，不要一打開就收到
      const local = localTime(deps.now(), body.timeZone);
      const lastSentDay = local.hour >= body.hour ? local.day : null;
      const values = {
        userId: user.id,
        p256dh: body.keys.p256dh,
        auth: body.keys.auth,
        hour: body.hour,
        timeZone: body.timeZone,
        locale: body.locale,
        lastSentDay,
      };
      await db
        .insert(pushSubscriptions)
        .values({ endpoint: body.endpoint, ...values })
        .onConflictDoUpdate({ target: pushSubscriptions.endpoint, set: values });
      return c.body(null, 204);
    })

    .post('/unsubscribe', requireUser(deps), async (c) => {
      const body = await readJson(c, pushUnsubscribeSchema);
      await db
        .delete(pushSubscriptions)
        .where(and(eq(pushSubscriptions.endpoint, body.endpoint), eq(pushSubscriptions.userId, c.get('user').id)));
      return c.body(null, 204);
    })

    .post('/send-due', async (c) => {
      const secret = options?.cronSecret;
      const given = c.req.header('authorization')?.replace(/^Bearer\s+/i, '') ?? '';
      if (!options || !secret) throw new HttpError(404, 'not_found', 'Reminders are not set up on this server');
      if (!sameSecret(given, secret)) throw new HttpError(401, 'unauthorized', 'Wrong cron secret');

      const now = deps.now();
      const subs = await db.select().from(pushSubscriptions);
      let sent = 0;
      let skipped = 0;
      let removed = 0;
      for (const sub of subs) {
        const local = localTime(now, sub.timeZone);
        // 還沒到提醒時間，或今天已經處理過
        if (local.hour < sub.hour || sub.lastSentDay === local.day) continue;
        const days = await db
          .selectDistinct({ day: sql<string>`${records.data}->>'day'` })
          .from(records)
          .where(
            and(
              eq(records.userId, sub.userId),
              eq(records.collection, 'attempts'),
              eq(records.deleted, false),
              // 連續天數最多算一年
              sql`${records.data}->>'day' >= ${daysBefore(local.day, 366)}`,
            ),
          );
        const practiced = new Set(days.map((d) => d.day));
        await db.update(pushSubscriptions).set({ lastSentDay: local.day }).where(eq(pushSubscriptions.endpoint, sub.endpoint));
        if (practiced.has(local.day)) {
          skipped += 1;
          continue;
        }
        try {
          const result = await options.send(sub, reminderMessage(sub.locale, streakBefore(practiced, local.day)));
          if (result === 'gone') {
            await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, sub.endpoint));
            removed += 1;
          } else {
            sent += 1;
          }
        } catch (error) {
          // 一個推播服務出問題不影響其他人；明天再試
          deps.log?.('Push reminder failed', error);
        }
      }
      return c.json({ sent, skipped, removed });
    });
}
