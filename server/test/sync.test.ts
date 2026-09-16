import { randomUUID } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { SYNC_BATCH_SIZE } from '../../shared/constants';
import type { SyncChange } from '../../shared/protocol';
import { latestPerRecord } from '../src/sync/service';
import { note, startTestServer, TestClient, type TestServer } from './helpers';

let server: TestServer;
let client: TestClient;

beforeEach(async () => {
  server = await startTestServer();
  client = new TestClient(server.app);
  await client.register('ray@example.com');
});

afterEach(async () => {
  await server.close();
});

const noteChange = (key: string, idea: string, updatedAt: number): SyncChange => ({
  collection: 'notes',
  key,
  updatedAt,
  deleted: false,
  data: note(idea),
});

describe('POST /api/sync', () => {
  it('stores pushed changes and returns them to another device', async () => {
    const first = await client.sync(0, [noteChange('1', 'hash map', 100)]);
    expect(first.rejected).toEqual([]);
    expect(first.changes).toEqual([noteChange('1', 'hash map', 100)]);
    expect(first.cursor).toBeGreaterThan(0);
    expect(first.hasMore).toBe(false);

    const laptop = new TestClient(server.app);
    await laptop.login('ray@example.com');
    const pulled = await laptop.sync(0, []);
    expect(pulled.changes).toEqual([noteChange('1', 'hash map', 100)]);

    // 游標之後沒有新東西
    const again = await laptop.sync(pulled.cursor, []);
    expect(again.changes).toEqual([]);
    expect(again.cursor).toBe(pulled.cursor);
  });

  it('keeps the newest write and reports stale pushes', async () => {
    await client.sync(0, [noteChange('1', 'newer', 200)]);
    const stale = await client.sync(0, [noteChange('1', 'older', 100)]);
    expect(stale.rejected).toEqual([noteChange('1', 'newer', 200)]);

    const { changes } = await client.sync(0, []);
    expect(changes).toEqual([noteChange('1', 'newer', 200)]);

    // 時間相同時保留伺服器上的版本，並回傳給用戶端
    const same = await client.sync(0, [noteChange('1', 'same time', 200)]);
    expect(same.rejected).toEqual([noteChange('1', 'newer', 200)]);
  });

  it('propagates deletions as tombstones', async () => {
    const id = randomUUID();
    const attempt = {
      collection: 'attempts' as const,
      key: id,
      updatedAt: 100,
      deleted: false,
      data: { problemId: 1, day: '2026-09-16', at: '2026-09-16T10:00:00.000Z', rating: 'solo', mode: 'practice' },
    };
    const { cursor } = await client.sync(0, [attempt]);
    const deleted = await client.sync(cursor, [{ collection: 'attempts', key: id, updatedAt: 150, deleted: true }]);
    expect(deleted.changes).toEqual([{ collection: 'attempts', key: id, updatedAt: 150, deleted: true }]);

    // 刪除後，比較舊的修改不能把資料救回來
    const resurrect = await client.sync(deleted.cursor, [{ ...attempt, updatedAt: 120 }]);
    expect(resurrect.rejected).toEqual([{ collection: 'attempts', key: id, updatedAt: 150, deleted: true }]);
  });

  it('collapses duplicate keys in one batch to the latest change', async () => {
    const res = await client.sync(0, [noteChange('1', 'a', 100), noteChange('1', 'b', 300), noteChange('1', 'c', 200)]);
    expect(res.changes).toEqual([noteChange('1', 'b', 300)]);
    expect(latestPerRecord([noteChange('2', 'x', 5), noteChange('2', 'y', 5)])[0].data).toMatchObject({ idea: 'y' });
  });

  it('pages through large histories', async () => {
    const many: SyncChange[] = Array.from({ length: SYNC_BATCH_SIZE + 5 }, (_, i) => noteChange(String(i + 1), `n${i}`, 100));
    await client.sync(0, many.slice(0, SYNC_BATCH_SIZE));
    await client.sync(0, many.slice(SYNC_BATCH_SIZE));

    const page1 = await client.sync(0, []);
    expect(page1.changes).toHaveLength(SYNC_BATCH_SIZE);
    expect(page1.hasMore).toBe(true);
    const page2 = await client.sync(page1.cursor, []);
    expect(page2.changes).toHaveLength(5);
    expect(page2.hasMore).toBe(false);
  });

  it('keeps each user’s data separate', async () => {
    await client.sync(0, [noteChange('1', 'mine', 100)]);
    const other = new TestClient(server.app);
    await other.register('other@example.com');
    expect((await other.sync(0, [])).changes).toEqual([]);
    await other.sync(0, [noteChange('1', 'theirs', 500)]);
    expect((await client.sync(0, [])).changes).toEqual([noteChange('1', 'mine', 100)]);
  });

  it('validates keys and data per collection', async () => {
    const cases: unknown[] = [
      { collection: 'attempts', key: 'not-a-uuid', updatedAt: 1, deleted: true },
      { collection: 'notes', key: '1', updatedAt: 1, deleted: false, data: { idea: 42 } },
      { collection: 'notes', key: '1', updatedAt: 1, deleted: true, data: note('x') },
      { collection: 'settings', key: 'other', updatedAt: 1, deleted: false, data: { activeList: 'blind75', dailyNew: 1, language: 'go' } },
      { collection: 'progress', key: '1', updatedAt: 1, deleted: true },
      { collection: 'notes', key: '1', updatedAt: -1, deleted: true },
    ];
    for (const change of cases) {
      const res = await client.request('POST', '/api/sync', { cursor: 0, changes: [change] });
      expect(res.status, JSON.stringify(change)).toBe(400);
    }
    const tooMany = await client.request('POST', '/api/sync', {
      cursor: 0,
      changes: Array.from({ length: SYNC_BATCH_SIZE + 1 }, (_, i) => noteChange(String(i + 1), 'x', 1)),
    });
    expect(tooMany.status).toBe(400);
  });

  it('drops unknown fields from stored data', async () => {
    const res = await client.sync(0, [{ collection: 'meta', key: '7', updatedAt: 1, deleted: false, data: { companies: ['Google'], secret: 'x' } }]);
    expect(res.changes[0].data).toEqual({ companies: ['Google'] });
  });
});
