import { randomUUID } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { localTime, reminderMessage, streakBefore, type PushMessage, type PushTarget } from '../src/push/routes';
import { startTestServer, TestClient, type TestServer } from './helpers';

const SECRET = 'cron-secret';
const ENDPOINT = 'https://push.example.test/sub/1';

function attempt(day: string) {
  return {
    collection: 'attempts' as const,
    key: randomUUID(),
    updatedAt: 100,
    deleted: false,
    data: { problemId: 1, day, at: `${day}T10:00:00.000Z`, rating: 'solo', mode: 'practice' },
  };
}

describe('daily reminders', () => {
  let server: TestServer;
  let client: TestClient;
  let sent: { target: PushTarget; message: PushMessage }[];
  let gone: Set<string>;

  beforeEach(async () => {
    sent = [];
    gone = new Set();
    server = await startTestServer({
      push: {
        publicKey: 'test-public-key',
        cronSecret: SECRET,
        send: async (target, message) => {
          if (gone.has(target.endpoint)) return 'gone';
          sent.push({ target, message });
          return 'sent';
        },
      },
    });
    client = new TestClient(server.app);
    await client.register('a@example.com');
  });

  afterEach(() => server.close());

  // 時鐘是 2026-09-16 12:00 UTC：台北 20:00、紐約 08:00
  const subscribe = (hour: number, timeZone = 'Asia/Taipei', endpoint = ENDPOINT, locale = 'zh-TW') =>
    client.request('POST', '/api/push/subscribe', { endpoint, keys: { p256dh: 'p', auth: 'a' }, hour, timeZone, locale });
  const sendDue = (secret = SECRET) =>
    client.request('POST', '/api/push/send-due', {}, { authorization: `Bearer ${secret}`, origin: '' });

  it('gives the public key, and needs a login to subscribe', async () => {
    expect(await (await client.request('GET', '/api/push/config')).json()).toEqual({ publicKey: 'test-public-key' });
    const anonymous = new TestClient(server.app);
    const res = await anonymous.request('POST', '/api/push/subscribe', { endpoint: ENDPOINT, keys: { p256dh: 'p', auth: 'a' }, hour: 9, timeZone: 'UTC', locale: 'en' });
    expect(res.status).toBe(401);
    expect((await subscribe(9, 'Mars/Olympus')).status).toBe(400);
    expect((await client.request('POST', '/api/push/subscribe', { endpoint: 'http://insecure.test/x', keys: { p256dh: 'p', auth: 'a' }, hour: 9, timeZone: 'UTC', locale: 'en' })).status).toBe(400);
  });

  it('only runs with the cron secret', async () => {
    expect((await sendDue('wrong')).status).toBe(401);
    expect((await client.request('POST', '/api/push/send-due', {}, { origin: '' })).status).toBe(401);
    expect((await sendDue()).status).toBe(200);
  });

  it('reminds once a day after the chosen hour, in the person’s time zone', async () => {
    // 紐約現在 8 點：9 點的提醒還沒到
    expect((await subscribe(9, 'America/New_York')).status).toBe(204);
    expect(await (await sendDue()).json()).toEqual({ sent: 0, skipped: 0, removed: 0 });
    // 一個小時後到了，寄一次；同一天不再寄
    server.clock.now = new Date('2026-09-16T13:05:00Z');
    expect(await (await sendDue()).json()).toEqual({ sent: 1, skipped: 0, removed: 0 });
    expect(sent[0].message).toEqual({ title: '刷題教練', body: '今天還沒練習，打開看看今天的題目吧。', url: './#/' });
    expect(await (await sendDue()).json()).toEqual({ sent: 0, skipped: 0, removed: 0 });
    // 隔天又寄
    server.clock.now = new Date('2026-09-17T14:00:00Z');
    expect((await (await sendDue()).json()).sent).toBe(1);
  });

  it('starts tomorrow when today’s time has already passed', async () => {
    // 台北已經 20 點，選 9 點：今天不寄
    await subscribe(9);
    expect((await (await sendDue()).json()).sent).toBe(0);
    server.clock.now = new Date('2026-09-17T01:30:00Z');
    expect((await (await sendDue()).json()).sent).toBe(1);
  });

  it('skips people who already practiced today, and mentions a streak', async () => {
    await subscribe(21, 'Asia/Taipei', ENDPOINT, 'en');
    await client.sync(0, [attempt('2026-09-14'), attempt('2026-09-15'), attempt('2026-09-16')]);
    server.clock.now = new Date('2026-09-16T13:30:00Z');
    expect(await (await sendDue()).json()).toEqual({ sent: 0, skipped: 1, removed: 0 });
    // 隔天沒練：提醒裡寫連續 3 天
    server.clock.now = new Date('2026-09-17T13:30:00Z');
    expect((await (await sendDue()).json()).sent).toBe(1);
    expect(sent[0].message.body).toBe('You’re on a 3-day streak. One problem today keeps it going.');
  });

  it('drops subscriptions the push service says are gone, and unsubscribes', async () => {
    await subscribe(21, 'Asia/Taipei', 'https://push.example.test/sub/gone');
    await subscribe(21, 'Asia/Taipei', ENDPOINT);
    gone.add('https://push.example.test/sub/gone');
    server.clock.now = new Date('2026-09-16T13:30:00Z');
    expect(await (await sendDue()).json()).toEqual({ sent: 1, skipped: 0, removed: 1 });
    // 關掉提醒之後就不寄了
    expect((await client.request('POST', '/api/push/unsubscribe', { endpoint: ENDPOINT })).status).toBe(204);
    server.clock.now = new Date('2026-09-17T13:30:00Z');
    expect((await (await sendDue()).json()).sent).toBe(0);
  });

  it('is off without push keys', async () => {
    const off = await startTestServer();
    const offClient = new TestClient(off.app);
    expect(await (await offClient.request('GET', '/api/push/config')).json()).toEqual({ publicKey: null });
    expect((await offClient.request('POST', '/api/push/send-due', {}, { authorization: `Bearer ${SECRET}` })).status).toBe(404);
    await off.close();
  });
});

describe('reminder helpers', () => {
  it('reads the local day and hour', () => {
    expect(localTime(new Date('2026-09-16T23:30:00Z'), 'Asia/Taipei')).toEqual({ day: '2026-09-17', hour: 7 });
    expect(localTime(new Date('2026-09-16T03:00:00Z'), 'America/Los_Angeles')).toEqual({ day: '2026-09-15', hour: 20 });
  });

  it('counts the streak up to yesterday', () => {
    expect(streakBefore(new Set(['2026-09-13', '2026-09-14', '2026-09-15']), '2026-09-16')).toBe(3);
    // 每練習一天存一次保護：9/14 沒練用掉 9/13 存的，不會斷（跟網頁的連續天數一樣）
    expect(streakBefore(new Set(['2026-09-13', '2026-09-15']), '2026-09-16')).toBe(2);
    // 最多存兩次：連漏三天就斷了
    expect(streakBefore(new Set(['2026-09-08', '2026-09-09', '2026-09-13', '2026-09-15']), '2026-09-16')).toBe(2);
    expect(reminderMessage('en', 1).body).toBe('You haven’t practiced today. Open today’s plan?');
  });
});
