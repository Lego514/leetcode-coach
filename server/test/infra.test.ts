import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { sql } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';
import { openDatabase, postgresOptions } from '../src/db/client';
import { migrate, splitStatements } from '../src/db/migrate';
import { EnvError, loadEnv } from '../src/env';
import { MIGRATIONS_DIR } from './helpers';

describe('migrations', () => {
  it('splits statements and ignores comments', () => {
    expect(splitStatements('-- note\nCREATE TABLE a (x int);\n\nCREATE INDEX i ON a (x);\n')).toEqual([
      'CREATE TABLE a (x int)',
      'CREATE INDEX i ON a (x)',
    ]);
  });

  it('applies each migration once', async () => {
    const database = await openDatabase('pglite:memory');
    try {
      expect(await migrate(database.db, MIGRATIONS_DIR)).toEqual(['0001_init.sql', '0002_ai_usage.sql', '0003_password_resets.sql']);
      expect(await migrate(database.db, MIGRATIONS_DIR)).toEqual([]);
    } finally {
      await database.close();
    }
  });

  it('rolls back a failing migration', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'coach-migrations-'));
    const database = await openDatabase('pglite:memory');
    try {
      await writeFile(path.join(dir, '0001_ok.sql'), 'CREATE TABLE ok_table (x int);\n');
      await writeFile(path.join(dir, '0002_bad.sql'), 'CREATE TABLE half_done (x int);\nSELECT * FROM missing_table;\n');
      await expect(migrate(database.db, dir)).rejects.toThrow();
      const result: unknown = await database.db.execute(
        sql`SELECT table_name FROM information_schema.tables WHERE table_name IN ('ok_table', 'half_done')`,
      );
      // PGlite 回傳 { rows }，postgres.js 直接回傳陣列
      const names = ((result as { rows?: unknown }).rows ?? result) as { table_name: string }[];
      expect(names.map((r) => r.table_name)).toEqual(['ok_table']);
    } finally {
      await database.close();
      await rm(dir, { recursive: true, force: true });
    }
  });
});

describe('loadEnv', () => {
  const root = path.resolve('/app/server');

  it('uses local defaults in development', () => {
    const env = loadEnv({}, root);
    expect(env.port).toBe(8787);
    expect(env.databaseUrl).toBe(`pglite:${path.join(root, '.data', 'pglite')}`);
    expect(env.allowedOrigins).toEqual(['http://localhost:5173']);
    expect(env.production).toBe(false);
    expect(env.trustProxy).toBe(false);
  });

  it('requires a database and origin in production', () => {
    expect(() => loadEnv({ NODE_ENV: 'production' }, root)).toThrow(EnvError);
    expect(() => loadEnv({ NODE_ENV: 'production', DATABASE_URL: 'postgres://x' }, root)).toThrow('APP_ORIGINS');
    const env = loadEnv(
      { NODE_ENV: 'production', DATABASE_URL: 'postgres://x', RENDER_EXTERNAL_URL: 'https://coach.onrender.com/', PORT: '10000' },
      root,
    );
    expect(env).toMatchObject({ port: 10000, allowedOrigins: ['https://coach.onrender.com'], trustProxy: true, production: true });
  });

  it('rejects an invalid port', () => {
    expect(() => loadEnv({ PORT: 'abc' }, root)).toThrow(EnvError);
  });
});

describe('postgresOptions', () => {
  it('lets idle connections close so the database can suspend', () => {
    const options = postgresOptions('postgres://u:p@ep-cool-1.us-east-2.aws.neon.tech/app?sslmode=require');
    expect(options.idle_timeout).toBeGreaterThan(0);
    expect(options.prepare).toBe(true);
  });

  it('turns off prepared statements behind a connection pooler', () => {
    expect(postgresOptions('postgres://u:p@ep-cool-1-pooler.us-east-2.aws.neon.tech/app').prepare).toBe(false);
  });
});
