import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { serve } from '@hono/node-server';
import { createApp } from './app';
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
});

const server = serve({ fetch: app.fetch, port: env.port }, (info) => {
  const storage = database.kind === 'pglite' ? `PGlite（${env.databaseUrl.slice('pglite:'.length)}）` : 'PostgreSQL';
  console.log(`API listening on http://localhost:${info.port}，資料庫：${storage}`);
  if (env.staticDir) console.log(`Serving web app from ${env.staticDir}`);
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
