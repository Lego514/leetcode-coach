import { desc, eq } from 'drizzle-orm';
import { Hono } from 'hono';
import type { ReportKind } from '../../../shared/constants';
import {
  reportRequestSchema,
  reportResolveSchema,
  type ReportContext,
  type ReportItem,
  type ReportsResponse,
} from '../../../shared/protocol';
import { RateLimiter } from '../auth/rate-limit';
import { findSession } from '../auth/sessions';
import { reports, users } from '../db/schema';
import { clientIp, HttpError, readJson, readSessionToken, requireUser, setSessionCookie, type AppDeps, type AppEnv } from '../http';

const HOUR = 60 * 60 * 1000;
/** 收件匣一次最多列幾則；個人專案的量，夠看很久 */
const ADMIN_LIMIT = 500;
const OWN_LIMIT = 50;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** 管理者是 ADMIN_EMAILS 列出的帳號，可以看所有回報並標成已處理 */
export function isAdmin(adminEmails: readonly string[], email: string): boolean {
  return adminEmails.includes(email.toLowerCase());
}

type ReportRow = typeof reports.$inferSelect;

function toItem(row: ReportRow, from?: string | null): ReportItem {
  return {
    id: row.id,
    kind: row.kind as ReportKind,
    message: row.message,
    context: row.context as ReportContext,
    createdAt: row.createdAt.toISOString(),
    resolvedAt: row.resolvedAt?.toISOString() ?? null,
    ...(from === undefined ? {} : { from }),
  };
}

export function reportRoutes(deps: AppDeps, adminEmails: readonly string[]) {
  const { db } = deps;
  // 沒登入也能送，用 IP 擋大量灌水
  const sendLimiter = new RateLimiter(10, HOUR, () => deps.now().getTime());

  return new Hono<AppEnv>()
    .post('/', async (c) => {
      const hit = sendLimiter.hit(clientIp(c, deps.trustProxy));
      if (!hit.allowed) {
        throw new HttpError(429, 'rate_limited', 'Too many reports, try again later', { 'Retry-After': String(hit.retryAfterSec) });
      }
      const body = await readJson(c, reportRequestSchema);
      // 有登入就記下是誰送的，之後可以看處理進度；沒登入或登入過期也照樣收下
      const token = readSessionToken(c, deps);
      const session = token ? await findSession(db, token, deps.now()) : null;
      if (token && session?.renewed) setSessionCookie(c, deps, token, session.expiresAt);
      const [row] = await db
        .insert(reports)
        .values({
          userId: session?.user.id ?? null,
          kind: body.kind,
          message: body.message,
          contact: session ? null : body.contact || null,
          context: body.context,
          createdAt: deps.now(),
        })
        .returning({ id: reports.id });
      return c.json({ id: row.id }, 201);
    })

    .get('/', requireUser(deps), async (c) => {
      const user = c.get('user');
      let body: ReportsResponse;
      if (isAdmin(adminEmails, user.email)) {
        const rows = await db
          .select({ report: reports, email: users.email })
          .from(reports)
          .leftJoin(users, eq(reports.userId, users.id))
          .orderBy(desc(reports.createdAt))
          .limit(ADMIN_LIMIT);
        body = { admin: true, reports: rows.map((r) => toItem(r.report, r.email ?? r.report.contact)) };
      } else {
        const rows = await db
          .select()
          .from(reports)
          .where(eq(reports.userId, user.id))
          .orderBy(desc(reports.createdAt))
          .limit(OWN_LIMIT);
        body = { admin: false, reports: rows.map((r) => toItem(r)) };
      }
      return c.json(body);
    })

    .post('/:id/resolve', requireUser(deps), async (c) => {
      if (!isAdmin(adminEmails, c.get('user').email)) {
        throw new HttpError(403, 'forbidden', 'Only admins can update reports');
      }
      const id = c.req.param('id');
      if (!UUID.test(id)) throw new HttpError(404, 'not_found', 'Report not found');
      const { resolved } = await readJson(c, reportResolveSchema);
      const [row] = await db
        .update(reports)
        .set({ resolvedAt: resolved ? deps.now() : null })
        .where(eq(reports.id, id))
        .returning();
      if (!row) throw new HttpError(404, 'not_found', 'Report not found');
      return c.json({ report: toItem(row) });
    });
}
