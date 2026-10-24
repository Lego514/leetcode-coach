import { afterEach, describe, expect, it, vi } from 'vitest';
import { clearOwnAi, maskKey, ownAi, saveOwnAi } from './ownAi';

/** 假的 localStorage；測試環境是 Node，沒有 */
function fakeStorage() {
  const data = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
  });
  return data;
}

afterEach(() => {
  clearOwnAi();
  vi.unstubAllGlobals();
});

describe('own AI key', () => {
  it('keeps the key only in this browser’s storage, trimmed, and removes it', () => {
    const data = fakeStorage();
    saveOwnAi({ provider: 'anthropic', apiKey: '  sk-ant-abcdef1234567890  ', model: 'claude-opus-5-5 ' });
    expect(ownAi()).toEqual({ provider: 'anthropic', apiKey: 'sk-ant-abcdef1234567890', model: 'claude-opus-5-5' });
    expect(JSON.parse(data.get('leetcode-coach:own-ai')!)).toMatchObject({ provider: 'anthropic', model: 'claude-opus-5-5' });
    clearOwnAi();
    expect(ownAi()).toBeNull();
    expect(data.has('leetcode-coach:own-ai')).toBe(false);
  });

  it('still works for this page when storage is blocked', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
      removeItem: () => {
        throw new Error('blocked');
      },
    });
    saveOwnAi({ provider: 'openai', apiKey: 'sk-1234567890abcdef', model: 'gpt-test' });
    expect(ownAi()?.provider).toBe('openai');
  });

  it('shows only the start and the last four characters of a key', () => {
    expect(maskKey('sk-ant-api03-abcdefghijklmnop')).toBe('sk-ant…mnop');
    expect(maskKey('short')).toBe('••••');
  });
});
