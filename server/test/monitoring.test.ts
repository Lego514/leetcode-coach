import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import * as Sentry from '@sentry/node';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { loadEnv } from '../src/env';
import { initMonitoring, scrubEvent } from '../src/monitoring';

// 假的 Sentry：收下 SDK 送來的 envelope，檢查送了什麼
let ingest: Server;
const received: string[] = [];

beforeAll(async () => {
  ingest = createServer((req, res) => {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => {
      received.push(body);
      res.writeHead(200).end('{}');
    });
  });
  await new Promise<void>((resolve) => ingest.listen(0, '127.0.0.1', resolve));
});

afterAll(async () => {
  await Sentry.close();
  await new Promise((resolve) => ingest.close(resolve));
});

describe('error monitoring', () => {
  it('is off without a DSN, and reads the DSN and release from the environment', () => {
    expect(initMonitoring(undefined, undefined)).toBeUndefined();
    const env = loadEnv({ SENTRY_DSN: ' https://key@o0.ingest.sentry.io/1 ', RENDER_GIT_COMMIT: 'abcdef1234567' }, '/tmp');
    expect(env.sentryDsn).toBe('https://key@o0.ingest.sentry.io/1');
    expect(env.release).toBe('abcdef1');
    expect(loadEnv({}, '/tmp').sentryDsn).toBeUndefined();
  });

  it('sends unexpected errors with the release, and nothing about the person', async () => {
    const { port } = ingest.address() as AddressInfo;
    const report = initMonitoring(`http://public@127.0.0.1:${port}/1`, 'abc1234')!;
    // 組出來的 email：錯誤附近的原始碼也會被送去，不能讓它字面上出現在這裡
    const email = ['someone', 'example.com'].join('@');
    Sentry.setUser({ email });
    report(new Error('database exploded'), 'Unhandled error on POST /api/sync');
    await Sentry.flush(2000);
    const sent = received.join('\n');
    expect(sent).toContain('database exploded');
    expect(sent).toContain('abc1234');
    expect(sent).toContain('Unhandled error on POST /api/sync');
    expect(sent).not.toContain(email);
  });

  it('strips request details before sending', () => {
    const event = scrubEvent({
      type: undefined,
      user: { email: 'me@example.com' },
      request: { url: 'https://app.test/api/auth/reset?token=secret', cookies: { sid: 'x' }, headers: { cookie: 'sid=x' }, data: '{"password":"p"}', query_string: 'token=secret' },
    });
    expect(event.user).toBeUndefined();
    expect(event.request).toEqual({ url: 'https://app.test/api/auth/reset' });
  });
});
