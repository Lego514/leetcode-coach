import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { PublicUser } from '../../shared/protocol';
import { recordAttempt, resetProgress, saveNote, updateSettings } from '../../src/store/actions';
import { CoachDB, db as laptop } from '../../src/store/db';
import { adoptAccount, runSync, wipeLocalData } from '../../src/store/sync';
import { getSyncState, track } from '../../src/store/tracking';
import { startTestServer, TestClient, type TestServer } from './helpers';

// 端對端測試：前端的同步程式透過真正的 API 與資料庫，在兩台「裝置」之間同步。
// laptop 使用前端的預設資料庫（可以直接呼叫 actions），phone 是另一個獨立的 IndexedDB。

let server: TestServer;
let phone: CoachDB;
let laptopClient: TestClient;
let phoneClient: TestClient;

beforeEach(async () => {
  server = await startTestServer();
  await wipeLocalData(laptop);
  phone = new CoachDB(`phone-${crypto.randomUUID()}`);
  laptopClient = new TestClient(server.app);
  phoneClient = new TestClient(server.app);
});

afterEach(async () => {
  phone.close();
  await phone.delete();
  await server.close();
});

async function signIn(client: TestClient, device: CoachDB, mode: 'register' | 'login') {
  const res = mode === 'register' ? await client.register('ray@example.com') : await client.login('ray@example.com');
  expect(res.status).toBeLessThan(300);
  const { user } = (await res.json()) as { user: PublicUser };
  await adoptAccount(device, user);
  return user;
}

const syncLaptop = () => runSync(laptop, laptopClient.fetch);
const syncPhone = () => runSync(phone, phoneClient.fetch);

describe('two devices', () => {
  it('uploads data created before signing in and downloads it on another device', async () => {
    await recordAttempt(15, 'fail', { day: '2026-09-10', at: new Date('2026-09-10T10:00:00Z') });
    await recordAttempt(15, 'solo', { day: '2026-09-11', at: new Date('2026-09-11T10:00:00Z') });
    await saveNote(15, { idea: 'sort + two pointers' });
    await updateSettings({ dailyNew: 5, activeList: 'blind75' });

    await signIn(laptopClient, laptop, 'register');
    const pushed = await syncLaptop();
    expect(pushed.pushed).toBe(4);
    expect(await laptop.outbox.count()).toBe(0);

    await signIn(phoneClient, phone, 'login');
    await syncPhone();
    expect(await phone.attempts.count()).toBe(2);
    expect((await phone.notes.get(15))?.idea).toBe('sort + two pointers');
    expect(await phone.settings.get('app')).toMatchObject({ dailyNew: 5, activeList: 'blind75' });
    // 複習排程在手機上由練習紀錄重算，結果和筆電一致
    expect(await phone.progress.get(15)).toEqual(await laptop.progress.get(15));
    expect((await getSyncState(phone)).cursor).toBeGreaterThan(0);
  });

  it('resolves concurrent edits with the newest change', async () => {
    await signIn(laptopClient, laptop, 'register');
    await signIn(phoneClient, phone, 'login');

    await saveNote(1, { idea: 'laptop version' });
    await phone.transaction('rw', phone.notes, phone.outbox, async () => {
      await phone.notes.put({
        problemId: 1,
        idea: 'phone version (newer)',
        explanation: '',
        time: '',
        space: '',
        pitfalls: '',
        code: '',
        language: 'python',
        updatedAt: new Date().toISOString(),
      });
      await track(phone, 'notes', '1', false, Date.now() + 60_000);
    });

    await syncLaptop();
    await syncPhone();
    await syncLaptop();

    expect((await laptop.notes.get(1))?.idea).toBe('phone version (newer)');
    expect((await phone.notes.get(1))?.idea).toBe('phone version (newer)');
    expect(await laptop.outbox.count()).toBe(0);
    expect(await phone.outbox.count()).toBe(0);
  });

  it('propagates deletions and recomputes schedules', async () => {
    await signIn(laptopClient, laptop, 'register');
    await recordAttempt(20, 'solo');
    await syncLaptop();
    await signIn(phoneClient, phone, 'login');
    await syncPhone();
    expect(await phone.progress.get(20)).toBeDefined();

    await resetProgress(20);
    await syncLaptop();
    await syncPhone();
    expect(await phone.attempts.count()).toBe(0);
    expect(await phone.progress.get(20)).toBeUndefined();
  });

  it('lets the account win when merging a device with old unsynced settings', async () => {
    await updateSettings({ dailyNew: 7 });
    await signIn(laptopClient, laptop, 'register');
    await syncLaptop();

    // 手機在登入前就有自己的設定與練習紀錄（沒有已知的修改時間）
    await phone.settings.put({ key: 'app', activeList: 'grind169', dailyNew: 1, language: 'go' });
    const uid = crypto.randomUUID();
    await phone.attempts.add({ uid, problemId: 42, day: '2026-09-01', at: '2026-09-01T09:00:00.000Z', rating: 'hint', mode: 'practice' });

    const phoneUser = await signIn(phoneClient, phone, 'login');
    expect(phoneUser.email).toBe('ray@example.com');
    await syncPhone();

    // 設定以帳號裡的為準；手機上的練習紀錄合併進帳號
    expect(await phone.settings.get('app')).toMatchObject({ dailyNew: 7, activeList: 'neetcode150' });
    expect(await phone.progress.get(42)).toMatchObject({ lastRating: 'hint' });

    await syncLaptop();
    expect(await laptop.attempts.where('uid').equals(uid).count()).toBe(1);
    expect(await laptop.progress.get(42)).toEqual(await phone.progress.get(42));
  });

  it('keeps a local edit made while the device was behind', async () => {
    await signIn(laptopClient, laptop, 'register');
    await updateSettings({ dailyNew: 2 });
    await syncLaptop();
    await signIn(phoneClient, phone, 'login');

    // 手機還沒下載筆電的設定，就先改了自己的設定
    await phone.transaction('rw', phone.settings, phone.outbox, async () => {
      await phone.settings.put({ key: 'app', activeList: 'blind75', dailyNew: 9, language: 'python' });
      await track(phone, 'settings', 'app');
    });
    await syncPhone();
    await syncLaptop();

    expect(await phone.settings.get('app')).toMatchObject({ dailyNew: 9 });
    expect(await laptop.settings.get('app')).toMatchObject({ dailyNew: 9 });
  });

  it('stops syncing when the session is gone', async () => {
    await signIn(laptopClient, laptop, 'register');
    await laptopClient.request('POST', '/api/auth/logout');
    await expect(syncLaptop()).rejects.toMatchObject({ code: 'unauthorized' });
  });
});
