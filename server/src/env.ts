import { existsSync } from 'node:fs';
import path from 'node:path';

export interface Env {
  port: number;
  /** postgres://… 連到 PostgreSQL；pglite:<資料夾> 或 pglite:memory 使用內嵌的 PGlite */
  databaseUrl: string;
  /** 允許發出寫入請求的網頁來源 */
  allowedOrigins: string[];
  production: boolean;
  /** 在反向代理後面時，從 X-Forwarded-For 取得使用者 IP */
  trustProxy: boolean;
  /** 前端建置結果的資料夾；有設定時由這個服務一起提供網頁 */
  staticDir?: string;
  /** 沒有設定就停用 AI 回饋 */
  anthropicApiKey?: string;
  /** 每位使用者每天最多幾次 AI 回饋 */
  aiDailyLimit: number;
  /** 沒有設定就停用忘記密碼 */
  brevoApiKey?: string;
  mailFrom?: string;
  mailFromName: string;
  /** 信件裡連結用的網址 */
  appUrl?: string;
}

export class EnvError extends Error {}

export function loadEnv(source: NodeJS.ProcessEnv, serverRoot: string): Env {
  const production = source.NODE_ENV === 'production';

  const port = Number(source.PORT ?? 8787);
  if (!Number.isInteger(port) || port <= 0 || port > 65535) throw new EnvError(`PORT is invalid: ${source.PORT}`);

  const databaseUrl = source.DATABASE_URL?.trim() || (production ? '' : `pglite:${path.join(serverRoot, '.data', 'pglite')}`);
  if (!databaseUrl) throw new EnvError('DATABASE_URL is required in production');

  // Render 會自動提供 RENDER_EXTERNAL_URL，其他平台請設定 APP_ORIGINS
  const origins = source.APP_ORIGINS ?? source.RENDER_EXTERNAL_URL ?? (production ? '' : 'http://localhost:5173');
  const allowedOrigins = origins
    .split(',')
    .map((o) => o.trim().replace(/\/+$/, ''))
    .filter(Boolean);
  if (production && allowedOrigins.length === 0) throw new EnvError('APP_ORIGINS is required in production');

  const defaultStatic = path.resolve(serverRoot, '..', 'dist');
  const staticDir = source.STATIC_DIR ? path.resolve(source.STATIC_DIR) : production && existsSync(defaultStatic) ? defaultStatic : undefined;

  const aiDailyLimit = Number(source.AI_DAILY_LIMIT ?? 20);
  if (!Number.isInteger(aiDailyLimit) || aiDailyLimit < 1 || aiDailyLimit > 1000) {
    throw new EnvError(`AI_DAILY_LIMIT is invalid: ${source.AI_DAILY_LIMIT}`);
  }

  return {
    port,
    databaseUrl,
    allowedOrigins,
    production,
    trustProxy: source.TRUST_PROXY ? source.TRUST_PROXY === '1' : production,
    staticDir,
    anthropicApiKey: source.ANTHROPIC_API_KEY?.trim() || undefined,
    brevoApiKey: source.BREVO_API_KEY?.trim() || undefined,
    mailFrom: source.MAIL_FROM?.trim() || undefined,
    mailFromName: source.MAIL_FROM_NAME?.trim() || 'LeetCode Coach',
    appUrl: source.APP_URL?.trim() || allowedOrigins[0],
    aiDailyLimit,
  };
}
