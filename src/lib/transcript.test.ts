import { describe, expect, it } from 'vitest';
import { countWords, joinSegments, transcriptStats } from './transcript';

describe('transcript', () => {
  it('joins recognized segments with single spaces', () => {
    expect(joinSegments([' The key insight ', '', 'is a hash map'])).toBe('The key insight is a hash map');
  });

  it('counts words, including contractions and numbers', () => {
    expect(countWords("I'll use a hash map, so it's O(n) time.")).toBe(10);
    expect(countWords('   ')).toBe(0);
  });

  it('computes words per minute once there is enough to measure', () => {
    const text = Array.from({ length: 60 }, () => 'word').join(' ');
    expect(transcriptStats(text, 30).wpm).toBe(120);
    expect(transcriptStats(text, 5).wpm).toBeNull();
    expect(transcriptStats('', 60).wpm).toBeNull();
  });

  it('counts filler words and phrases', () => {
    const stats = transcriptStats('So basically, um, I kind of use two pointers. Basically that is it, you  know.', 60);
    expect(stats.fillers).toEqual([
      { word: 'basically', count: 2 },
      { word: 'kind of', count: 1 },
      { word: 'um', count: 1 },
      { word: 'you know', count: 1 },
    ]);
  });

  it('does not count fillers inside other words', () => {
    expect(transcriptStats('The umbrella is actual data', 60).fillers).toEqual([]);
  });
});
