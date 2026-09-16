import { mkdirSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';
import { drizzle as drizzlePglite } from 'drizzle-orm/pglite';
import { drizzle as drizzlePostgres } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

export type Database = PgDatabase<PgQueryResultHKT, typeof schema>;
export type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0];
/** 查詢可以在一般連線或交易中執行 */
export type Executor = Database | Transaction;

export interface DatabaseHandle {
  db: Database;
  kind: 'pglite' | 'postgres';
  close: () => Promise<void>;
}

/**
 * 依連線字串開啟資料庫：
 * - `postgres://…`：正式環境的 PostgreSQL
 * - `pglite:<資料夾>`：本機開發用，資料存在該資料夾
 * - `pglite:memory`：測試用，存在記憶體
 */
export async function openDatabase(url: string): Promise<DatabaseHandle> {
  if (url.startsWith('pglite:')) {
    const target = url.slice('pglite:'.length);
    let client: PGlite;
    if (target === 'memory') {
      client = new PGlite();
    } else {
      mkdirSync(target, { recursive: true });
      client = new PGlite(target);
    }
    await client.waitReady;
    return {
      db: drizzlePglite(client, { schema }) as unknown as Database,
      kind: 'pglite',
      close: () => client.close(),
    };
  }

  if (!/^postgres(ql)?:\/\//.test(url)) throw new Error('DATABASE_URL must start with postgres:// or pglite:');
  const client = postgres(url, { max: 10, onnotice: () => {} });
  return {
    db: drizzlePostgres(client, { schema }) as unknown as Database,
    kind: 'postgres',
    close: () => client.end({ timeout: 5 }),
  };
}
