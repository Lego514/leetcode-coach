import { afterEach, describe, expect, it } from 'vitest';
import type { ReportItem, ReportRequest, ReportsResponse } from '../../shared/protocol';
import { startTestServer, TestClient, type TestServer } from './helpers';

const ADMIN = 'admin@example.com';

const bug: ReportRequest = {
  kind: 'bug',
  message: 'The timer keeps running after I leave the page.',
  context: { page: '/practice/1', version: 'abc1234', language: 'en' },
};

const cardReport: ReportRequest = {
  kind: 'wrong',
  message: 'Both options look correct to me.',
  context: { page: '/cards', card: { id: 'complexity:1', question: 'Time and space?', answer: 'O(n) / O(n)', picked: 'O(n) / O(1)' } },
};

let server: TestServer | undefined;

afterEach(async () => {
  await server?.close();
  server = undefined;
});

async function setup() {
  server = await startTestServer({ adminEmails: [ADMIN] });
  return server;
}

async function list(client: TestClient): Promise<ReportsResponse> {
  const res = await client.request('GET', '/api/reports');
  expect(res.status).toBe(200);
  return res.json() as Promise<ReportsResponse>;
}

describe('reports API', () => {
  it('accepts reports without signing in and keeps the contact for the admin', async () => {
    const { app } = await setup();
    const guest = new TestClient(app);
    const res = await guest.request('POST', '/api/reports', { ...bug, contact: 'guest@example.com' });
    expect(res.status).toBe(201);
    expect((await res.json()).id).toMatch(/^[0-9a-f-]{36}$/);

    // 沒登入看不到任何回報
    expect((await guest.request('GET', '/api/reports')).status).toBe(401);

    const admin = new TestClient(app);
    await admin.register(ADMIN);
    const inbox = await list(admin);
    expect(inbox.admin).toBe(true);
    expect(inbox.reports).toEqual([
      expect.objectContaining({ kind: 'bug', message: bug.message, context: bug.context, from: 'guest@example.com', resolvedAt: null }),
    ]);
  });

  it('links reports to the signed-in account and shows people only their own', async () => {
    const { app } = await setup();
    const alice = new TestClient(app);
    await alice.register('alice@example.com');
    const bob = new TestClient(app);
    await bob.register('bob@example.com');

    // 登入時忽略自己填的聯絡方式，管理者看到的是帳號 email
    expect((await alice.request('POST', '/api/reports', { ...cardReport, contact: 'other@example.com' })).status).toBe(201);
    expect((await bob.request('POST', '/api/reports', bug)).status).toBe(201);

    const mine = await list(alice);
    expect(mine.admin).toBe(false);
    expect(mine.reports).toHaveLength(1);
    expect(mine.reports[0]).toMatchObject({ kind: 'wrong', context: cardReport.context });
    expect(mine.reports[0]).not.toHaveProperty('from');

    const admin = new TestClient(app);
    await admin.register(ADMIN);
    const inbox = await list(admin);
    expect(inbox.reports.map((r) => r.from).sort()).toEqual(['alice@example.com', 'bob@example.com']);
  });

  it('lets only the admin mark reports resolved, and the reporter sees it', async () => {
    const { app, clock } = await setup();
    const alice = new TestClient(app);
    await alice.register('alice@example.com');
    const { id } = (await (await alice.request('POST', '/api/reports', bug)).json()) as { id: string };

    const denied = await alice.request('POST', `/api/reports/${id}/resolve`, { resolved: true });
    expect(denied.status).toBe(403);
    expect((await denied.json()).error.code).toBe('forbidden');

    const admin = new TestClient(app);
    await admin.register(ADMIN);
    clock.now = new Date('2026-09-17T08:00:00Z');
    const res = await admin.request('POST', `/api/reports/${id}/resolve`, { resolved: true });
    expect(res.status).toBe(200);
    expect(((await res.json()) as { report: ReportItem }).report.resolvedAt).toBe('2026-09-17T08:00:00.000Z');
    expect((await list(alice)).reports[0].resolvedAt).toBe('2026-09-17T08:00:00.000Z');

    // 可以重新打開
    await admin.request('POST', `/api/reports/${id}/resolve`, { resolved: false });
    expect((await list(alice)).reports[0].resolvedAt).toBeNull();

    expect((await admin.request('POST', '/api/reports/not-a-uuid/resolve', { resolved: true })).status).toBe(404);
    expect((await admin.request('POST', '/api/reports/00000000-0000-4000-8000-000000000000/resolve', { resolved: true })).status).toBe(404);
  });

  it('rejects empty, oversized, or unexpected fields', async () => {
    const { app } = await setup();
    const guest = new TestClient(app);
    const post = (body: unknown) => guest.request('POST', '/api/reports', body);
    expect((await post({ ...bug, message: '   ' })).status).toBe(400);
    expect((await post({ ...bug, message: 'x'.repeat(2001) })).status).toBe(400);
    expect((await post({ ...bug, kind: 'praise' })).status).toBe(400);
    expect((await post({ ...bug, context: { ...bug.context, cookies: 'secret' } })).status).toBe(400);
  });

  it('limits how many reports one address can send in an hour', async () => {
    server = await startTestServer({ trustProxy: true });
    const guest = new TestClient(server.app);
    const send = (ip: string) => guest.request('POST', '/api/reports', bug, { 'x-forwarded-for': ip });
    for (let i = 0; i < 10; i += 1) expect((await send('203.0.113.1')).status).toBe(201);
    const limited = await send('203.0.113.1');
    expect(limited.status).toBe(429);
    expect(limited.headers.get('retry-after')).toBeTruthy();
    expect((await send('203.0.113.2')).status).toBe(201);
  });

  it('deletes a person’s reports along with their account', async () => {
    const { app } = await setup();
    const alice = new TestClient(app);
    await alice.register('alice@example.com');
    await alice.request('POST', '/api/reports', bug);
    expect((await alice.request('POST', '/api/auth/delete-account', { password: 'correct horse battery' })).status).toBe(204);

    const admin = new TestClient(app);
    await admin.register(ADMIN);
    expect((await list(admin)).reports).toEqual([]);
  });
});
