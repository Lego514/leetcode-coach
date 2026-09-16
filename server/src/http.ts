import type { Context, MiddlewareHandler } from 'hono';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import type { z } from 'zod';
import type { ApiErrorBody, ApiErrorCode, PublicUser } from '../../shared/protocol';
import type { Database } from './db/client';
import { findSession } from './auth/sessions';

export interface AppDeps {
  db: Database;
  allowedOrigins: string[];
  secureCookies: boolean;
  trustProxy: boolean;
  now: () => Date;
}

export type AppEnv = {
  Variables: {
    user: PublicUser;
    sessionToken: string;
  };
};

export class HttpError extends Error {
  constructor(
    readonly status: ContentfulStatusCode,
    readonly code: ApiErrorCode,
    message: string,
    readonly headers: Record<string, string> = {},
  ) {
    super(message);
  }
}

export function errorBody(code: ApiErrorCode, message: string): ApiErrorBody {
  return { error: { code, message } };
}

/** 讀 JSON 並用 schema 驗證，格式不對就回 400 */
export async function readJson<T extends z.ZodType>(c: Context, schema: T): Promise<z.infer<T>> {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    throw new HttpError(400, 'invalid_request', 'Request body must be valid JSON');
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const where = issue?.path.length ? `${issue.path.join('.')}: ` : '';
    throw new HttpError(400, 'invalid_request', `${where}${issue?.message ?? 'Invalid request'}`);
  }
  return parsed.data;
}

const UNSAFE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * 防止跨站請求偽造：
 * - 寫入請求一律要 JSON，瀏覽器跨站送 JSON 必須先經過 CORS 預檢，而這個 API 不開放 CORS。
 * - 有 Origin 標頭時必須是允許的來源；Sec-Fetch-Site 標示跨站時直接拒絕。
 */
export function requestGuard(allowedOrigins: string[]): MiddlewareHandler {
  return async (c, next) => {
    if (UNSAFE_METHODS.has(c.req.method)) {
      const contentType = c.req.header('content-type') ?? '';
      if (!/^application\/json\b/i.test(contentType)) {
        throw new HttpError(415, 'unsupported_media_type', 'Requests must use Content-Type: application/json');
      }
      const origin = c.req.header('origin');
      const sameOrigin = new URL(c.req.url).origin;
      if (origin && origin !== sameOrigin && !allowedOrigins.includes(origin)) {
        throw new HttpError(403, 'forbidden_origin', 'Origin is not allowed');
      }
      const fetchSite = c.req.header('sec-fetch-site');
      if (fetchSite === 'cross-site') {
        throw new HttpError(403, 'forbidden_origin', 'Cross-site requests are not allowed');
      }
    }
    await next();
  };
}

export function cookieName(secure: boolean): string {
  // __Host- 前綴要求 Secure、Path=/ 且不能指定網域，只在 HTTPS 使用
  return secure ? '__Host-coach_session' : 'coach_session';
}

export function setSessionCookie(c: Context, deps: AppDeps, token: string, expiresAt: Date): void {
  setCookie(c, cookieName(deps.secureCookies), token, {
    httpOnly: true,
    secure: deps.secureCookies,
    sameSite: 'Lax',
    path: '/',
    expires: expiresAt,
  });
}

export function clearSessionCookie(c: Context, deps: AppDeps): void {
  deleteCookie(c, cookieName(deps.secureCookies), { path: '/', secure: deps.secureCookies });
}

export function readSessionToken(c: Context, deps: AppDeps): string | undefined {
  const token = getCookie(c, cookieName(deps.secureCookies));
  return token && token.length <= 128 ? token : undefined;
}

/** 需要登入的路由：驗證 session，快過期時順便延長 cookie */
export function requireUser(deps: AppDeps): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    const token = readSessionToken(c, deps);
    const session = token ? await findSession(deps.db, token, deps.now()) : null;
    if (!token || !session) {
      if (token) clearSessionCookie(c, deps);
      throw new HttpError(401, 'unauthorized', 'Sign in required');
    }
    if (session.renewed) setSessionCookie(c, deps, token, session.expiresAt);
    c.set('user', session.user);
    c.set('sessionToken', token);
    await next();
  };
}

export function clientIp(c: Context, trustProxy: boolean): string {
  if (trustProxy) {
    const forwarded = c.req.header('x-forwarded-for')?.split(',')[0]?.trim();
    if (forwarded) return forwarded;
  }
  const incoming = (c.env as { incoming?: { socket?: { remoteAddress?: string } } } | undefined)?.incoming;
  return incoming?.socket?.remoteAddress ?? 'unknown';
}
