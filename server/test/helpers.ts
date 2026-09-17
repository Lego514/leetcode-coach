import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { PublicUser, SyncChange, SyncResponse } from '../../shared/protocol';
import { createApp, type App } from '../src/app';
import { openDatabase, type DatabaseHandle } from '../src/db/client';
import { migrate } from '../src/db/migrate';

export const MIGRATIONS_DIR = path.resolve(fileURLToPath(new URL('.', import.meta.url)), '..', 'migrations');
export const ORIGIN = 'http://localhost:5173';

export interface TestServer {
  app: App;
  database: DatabaseHandle;
  clock: { now: Date };
  close: () => Promise<void>;
}

export async function startTestServer(): Promise<TestServer> {
  const database = await openDatabase('pglite:memory');
  await migrate(database.db, MIGRATIONS_DIR);
  const clock = { now: new Date('2026-09-16T12:00:00Z') };
  const app = createApp({
    db: database.db,
    allowedOrigins: [ORIGIN],
    secureCookies: false,
    now: () => clock.now,
    log: () => {},
  });
  return { app, database, clock, close: () => database.close() };
}

/** 模擬瀏覽器：自動帶上 cookie 與同源標頭 */
export class TestClient {
  private cookies = new Map<string, string>();

  constructor(
    private readonly app: App,
    private readonly origin = ORIGIN,
  ) {}

  get sessionCookie(): string | undefined {
    return this.cookies.get('coach_session');
  }

  async request(method: string, url: string, body?: unknown, headers: Record<string, string> = {}): Promise<Response> {
    const init: RequestInit = {
      method,
      headers: {
        ...(body !== undefined || method !== 'GET' ? { 'content-type': 'application/json' } : {}),
        origin: this.origin,
        ...(this.cookies.size ? { cookie: [...this.cookies].map(([k, v]) => `${k}=${v}`).join('; ') } : {}),
        ...headers,
      },
      body: body === undefined ? (method === 'GET' ? undefined : '{}') : JSON.stringify(body),
    };
    const res = await this.app.request(`http://localhost:5173${url}`, init);
    for (const header of res.headers.getSetCookie()) this.store(header);
    return res;
  }

  /** 給前端同步引擎使用的 fetch */
  fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.pathname : input.url;
    const body = init?.body ? JSON.parse(String(init.body)) : undefined;
    return this.request(init?.method ?? 'GET', url, body);
  };

  async register(email: string, password = 'correct horse battery') {
    return this.request('POST', '/api/auth/register', { email, password });
  }

  async login(email: string, password = 'correct horse battery') {
    return this.request('POST', '/api/auth/login', { email, password });
  }

  /** 目前登入的使用者，沒登入時為 null */
  async whoami(): Promise<PublicUser | null> {
    const res = await this.request('GET', '/api/auth/me');
    if (res.status !== 200) throw new Error(`me failed: ${res.status}`);
    return ((await res.json()) as { user: PublicUser | null }).user;
  }

  async sync(cursor: number, changes: SyncChange[]): Promise<SyncResponse> {
    const res = await this.request('POST', '/api/sync', { cursor, changes });
    if (res.status !== 200) throw new Error(`sync failed: ${res.status} ${await res.text()}`);
    return res.json() as Promise<SyncResponse>;
  }

  private store(header: string) {
    const [pair, ...attrs] = header.split(';');
    const eq = pair.indexOf('=');
    const name = pair.slice(0, eq).trim();
    const value = pair.slice(eq + 1).trim();
    const expired = attrs.some((a) => {
      const [k, v] = a.trim().split('=');
      if (k.toLowerCase() === 'max-age') return Number(v) <= 0;
      if (k.toLowerCase() === 'expires') return new Date(v).getTime() <= Date.now();
      return false;
    });
    if (!value || expired) this.cookies.delete(name);
    else this.cookies.set(name, value);
  }
}

export function note(idea: string, updatedAt = '2026-09-16T12:00:00.000Z') {
  return { idea, explanation: '', time: '', space: '', pitfalls: '', code: '', language: 'python', updatedAt };
}
