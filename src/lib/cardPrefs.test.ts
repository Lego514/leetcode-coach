import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_REST_SECONDS, loadRestSeconds, loadScope, saveRestSeconds, saveScope } from './cardPrefs';
import { secondsLeft } from './useRestTimer';

function memoryStorage() {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
    removeItem: (key: string) => void data.delete(key),
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('flashcard preferences', () => {
  it('remembers the topic and rest time', () => {
    vi.stubGlobal('localStorage', memoryStorage());
    expect(loadScope()).toBe('all');
    expect(loadRestSeconds()).toBe(DEFAULT_REST_SECONDS);
    saveScope('pattern:heap');
    saveRestSeconds(120);
    expect(loadScope()).toBe('pattern:heap');
    expect(loadRestSeconds()).toBe(120);
  });

  it('ignores values it does not know', () => {
    const storage = memoryStorage();
    storage.setItem('leetcode-coach:cards-scope', 'pattern:nope');
    storage.setItem('leetcode-coach:rest-seconds', '45');
    vi.stubGlobal('localStorage', storage);
    expect(loadScope()).toBe('all');
    expect(loadRestSeconds()).toBe(DEFAULT_REST_SECONDS);
  });

  it('falls back to defaults when storage is blocked', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
    });
    expect(loadScope()).toBe('all');
    expect(() => saveRestSeconds(60)).not.toThrow();
  });
});

describe('secondsLeft', () => {
  it('rounds up and stops at zero', () => {
    expect(secondsLeft(10_000, 0)).toBe(10);
    expect(secondsLeft(10_000, 9_001)).toBe(1);
    expect(secondsLeft(10_000, 10_000)).toBe(0);
    expect(secondsLeft(10_000, 12_000)).toBe(0);
  });
});
