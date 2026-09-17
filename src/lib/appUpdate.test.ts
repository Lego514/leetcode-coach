import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  applyUpdate,
  canReloadNow,
  isUpdateReady,
  markUpdateReady,
  resetUpdateState,
  setUpdateHandler,
  subscribeUpdate,
} from './appUpdate';

afterEach(() => resetUpdateState());

describe('app updates', () => {
  it('waits for a page without a running timer', () => {
    expect(canReloadNow('/')).toBe(true);
    expect(canReloadNow('/problems/1')).toBe(true);
    expect(canReloadNow('/review')).toBe(true);
    expect(canReloadNow('/practice/15')).toBe(false);
    expect(canReloadNow('/mock')).toBe(false);
  });

  it('tells subscribers once a new version is ready', () => {
    const listener = vi.fn();
    subscribeUpdate(listener);
    expect(isUpdateReady()).toBe(false);

    markUpdateReady();
    expect(isUpdateReady()).toBe(true);
    expect(listener).toHaveBeenCalledTimes(1);

    // 已經是最新狀態就不再通知
    markUpdateReady();
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('applies the update through the service worker', async () => {
    const handler = vi.fn(async () => {});
    setUpdateHandler(handler);
    await applyUpdate();
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('stops notifying after unsubscribing', () => {
    const listener = vi.fn();
    subscribeUpdate(listener)();
    markUpdateReady();
    expect(listener).not.toHaveBeenCalled();
  });
});
