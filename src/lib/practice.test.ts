import { describe, expect, it } from 'vitest';
import { BUILTIN_PROBLEMS } from '../data/problems';
import { hintFor } from '../data/hints';
import {
  clearPracticeSession,
  firstOpenStep,
  loadPracticeSession,
  savePracticeSession,
  suggestRating,
  type PracticeSnapshot,
} from './practice';

class MemoryStorage implements Storage {
  private data = new Map<string, string>();
  get length() {
    return this.data.size;
  }
  clear() {
    this.data.clear();
  }
  getItem(key: string) {
    return this.data.get(key) ?? null;
  }
  key(index: number) {
    return [...this.data.keys()][index] ?? null;
  }
  removeItem(key: string) {
    this.data.delete(key);
  }
  setItem(key: string, value: string) {
    this.data.set(key, value);
  }
}

describe('hints', () => {
  it('has a key hint for every built-in problem', () => {
    expect(BUILTIN_PROBLEMS.filter((p) => !hintFor(p.id)?.trim()).map((p) => p.id)).toEqual([]);
  });
});

describe('suggestRating', () => {
  it('reflects hints and solutions', () => {
    expect(suggestRating(0, false)).toBe('solo');
    expect(suggestRating(2, false)).toBe('hint');
    expect(suggestRating(0, true)).toBe('solution');
    expect(suggestRating(3, true)).toBe('solution');
  });
});

describe('practice session storage', () => {
  const snapshot: PracticeSnapshot = {
    problemId: 15,
    bankedMs: 60_000,
    runningSince: 1_700_000_000_000,
    hints: 1,
    sawSolution: false,
    finished: false,
  };

  it('restores only the matching problem', () => {
    const storage = new MemoryStorage();
    savePracticeSession(snapshot, storage);
    expect(loadPracticeSession(15, storage)).toEqual(snapshot);
    expect(loadPracticeSession(1, storage)).toBeNull();
    clearPracticeSession(storage);
    expect(loadPracticeSession(15, storage)).toBeNull();
  });

  it('ignores corrupted data and missing storage', () => {
    const storage = new MemoryStorage();
    storage.setItem('leetcode-coach:practice', '{not json');
    expect(loadPracticeSession(15, storage)).toBeNull();
    storage.setItem('leetcode-coach:practice', JSON.stringify({ problemId: 15 }));
    expect(loadPracticeSession(15, storage)).toBeNull();
    expect(loadPracticeSession(15, null)).toBeNull();
    expect(() => savePracticeSession(snapshot, null)).not.toThrow();
  });
});

describe('firstOpenStep', () => {
  it('starts the solving steps at the first one without notes', () => {
    expect(firstOpenStep(undefined)).toBe(0);
    expect(firstOpenStep({ clarify: 'Two indices that sum to target' })).toBe(1);
    // 只寫了一部分的步驟（舉例只寫了邊界情況）也算寫過；空白不算
    expect(firstOpenStep({ clarify: 'x', edge: 'empty input', brute: '   ' })).toBe(2);
    const all = { clarify: 'x', example: 'x', brute: 'x', slow: 'x', code: 'x', test: 'x', complexity: 'x' };
    expect(firstOpenStep(all)).toBe(0);
  });
});
