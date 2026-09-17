import path from 'node:path';
import { serveStatic } from '@hono/node-server/serve-static';
import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { secureHeaders } from 'hono/secure-headers';
import { authRoutes, type MailOptions } from './auth/routes';
import { aiRoutes, type AiOptions } from './ai/routes';
import type { Database } from './db/client';
import { errorBody, HttpError, requestGuard, type AppDeps, type AppEnv } from './http';
import { syncRoutes } from './sync/routes';

export interface AppOptions {
  db: Database;
  allowedOrigins: string[];
  secureCookies: boolean;
  trustProxy?: boolean;
  /** 前端建置結果；有設定時同一個服務也提供網頁 */
  staticDir?: string;
  /** 沒有設定時 AI 回饋停用 */
  ai?: AiOptions;
  /** 沒有設定時忘記密碼停用 */
  mail?: MailOptions;
  now?: () => Date;
  log?: (message: string, error?: unknown) => void;
}

export function createApp(options: AppOptions) {
  const deps: AppDeps = {
    db: options.db,
    allowedOrigins: options.allowedOrigins,
    secureCookies: options.secureCookies,
    trustProxy: options.trustProxy ?? false,
    now: options.now ?? (() => new Date()),
    log: (message, error) => log(message, error),
  };
  const log = options.log ?? ((message, error) => console.error(message, error));

  const app = new Hono<AppEnv>();

  app.onError((err, c) => {
    if (err instanceof HttpError) {
      for (const [name, value] of Object.entries(err.headers)) c.header(name, value);
      return c.json(errorBody(err.code, err.message), err.status);
    }
    log(`Unhandled error on ${c.req.method} ${c.req.path}`, err);
    return c.json(errorBody('server_error', 'Something went wrong'), 500);
  });

  app.use('/api/*', secureHeaders());
  app.use('/api/*', async (c, next) => {
    await next();
    c.header('Cache-Control', 'no-store');
  });
  app.use(
    '/api/*',
    bodyLimit({
      maxSize: 5 * 1024 * 1024,
      onError: (c) => c.json(errorBody('payload_too_large', 'Request body is too large'), 413),
    }),
  );
  app.use('/api/*', requestGuard(deps.allowedOrigins));

  app.get('/api/health', (c) => c.json({ ok: true }));
  app.route('/api/auth', authRoutes(deps, options.mail));
  app.route('/api/sync', syncRoutes(deps));
  app.route('/api/ai', aiRoutes(deps, options.ai));
  app.all('/api/*', (c) => c.json(errorBody('not_found', 'Not found'), 404));

  if (options.staticDir) {
    // serveStatic 的 root 以目前工作目錄為基準
    const root = path.relative(process.cwd(), options.staticDir) || '.';
    app.use(
      '/assets/*',
      serveStatic({
        root,
        onFound: (_path, c) => {
          c.header('Cache-Control', 'public, max-age=31536000, immutable');
        },
      }),
    );
    app.use(
      '*',
      serveStatic({
        root,
        onFound: (_path, c) => {
          c.header('Cache-Control', 'no-cache');
        },
      }),
    );
    // 用的是 hash 路由，其他網址一律回首頁
    app.get('*', serveStatic({ root, path: 'index.html' }));
  }

  return app;
}

export type App = ReturnType<typeof createApp>;
