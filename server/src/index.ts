import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { serve } from '@hono/node-server';
import { createClaudeFeedback } from './ai/feedback';
import { createApp } from './app';
import { createBrevoMailer } from './mail/brevo';
import { openDatabase } from './db/client';
import { migrate } from './db/migrate';
import { loadEnv } from './env';

// src/index.ts 與建置後的 dist/index.js 都在 server/ 底下一層
const serverRoot = path.resolve(fileURLToPath(new URL('.', import.meta.url)), '..');

const env = loadEnv(process.env, serverRoot);
const database = await openDatabase(env.databaseUrl);
await migrate(database.db, path.join(serverRoot, 'migrations'), (m) => console.log(m));

const app = createApp({
  db: database.db,
  allowedOrigins: env.allowedOrigins,
  secureCookies: env.production,
  trustProxy: env.trustProxy,
  staticDir: env.staticDir,
  mail:
    env.brevoApiKey && env.mailFrom && env.appUrl
      ? {
          send: createBrevoMailer({ apiKey: env.brevoApiKey, fromEmail: env.mailFrom, fromName: env.mailFromName }),
          appUrl: env.appUrl,
        }
      : undefined,
  ai: env.anthropicApiKey
    ? {
        generate: createClaudeFeedback(env.anthropicApiKey, (message, error) => console.error(message, error)),
        dailyLimit: env.aiDailyLimit,
        allowedEmails: env.aiAllowedEmails,
      }
    : undefined,
});

const server = serve({ fetch: app.fetch, port: env.port }, (info) => {
  const storage = database.kind === 'pglite' ? `PGlite（${env.databaseUrl.slice('pglite:'.length)}）` : 'PostgreSQL';
  console.log(`API listening on http://localhost:${info.port}，資料庫：${storage}`);
  if (env.staticDir) console.log(`Serving web app from ${env.staticDir}`);
  if (!env.anthropicApiKey) console.log('AI feedback off (ANTHROPIC_API_KEY not set)');
  else if (env.aiAllowedEmails === '*') console.log(`AI feedback on for every account, ${env.aiDailyLimit} per user per day`);
  else if (env.aiAllowedEmails.length === 0) console.log('AI feedback on, but AI_ALLOWED_EMAILS is empty, so no account can use it');
  else console.log(`AI feedback on for ${env.aiAllowedEmails.length} account(s), ${env.aiDailyLimit} per user per day`);
  console.log(
    env.brevoApiKey && env.mailFrom
      ? `Password reset email on, from ${env.mailFrom}`
      : 'Password reset email off (BREVO_API_KEY / MAIL_FROM not set)',
  );
});

server.on('error', async (err: NodeJS.ErrnoException) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${env.port} is already in use. Stop the other process or set PORT to a different number.`);
  } else {
    console.error('Server error', err);
  }
  await database.close();
  process.exit(1);
});

let closing = false;
async function shutdown(signal: string) {
  if (closing) return;
  closing = true;
  console.log(`Received ${signal}, shutting down`);
  server.close();
  await database.close();
  process.exit(0);
}

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
