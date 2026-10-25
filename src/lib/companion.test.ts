import { describe, expect, it } from 'vitest';
import type { PatternId } from '../data/patterns';
import {
  companionFacts,
  companionStage,
  HEAD_ITEMS,
  itemProgress,
  newItems,
  nextCompanionStage,
  unlockedItems,
  wornItem,
  type CompanionFacts,
} from './companion';

const attempt = (problemId: number, day: string, rating: 'solo' | 'hint' = 'solo', mode = 'practice') => ({
  problemId,
  day,
  at: `${day}T10:00:00.000Z`,
  rating,
  mode,
});

const none: CompanionFacts = { practiceDays: 0, solo: 0, longestStreak: 0, conquests: 0, cards: 0, topPattern: 0, explainDrills: 0, problems: 0 };

describe('companion', () => {
  it('grows from a baby to a young and then a grown capybara with practice days', () => {
    expect(companionStage(0)).toBe('baby');
    expect(companionStage(6)).toBe('baby');
    expect(companionStage(7)).toBe('young');
    expect(companionStage(21)).toBe('grown');
    expect(nextCompanionStage(3)).toEqual({ stage: 'young', needed: 4 });
    expect(nextCompanionStage(30)).toBeNull();
  });

  it('counts only real practice, not problems marked as solved before', () => {
    const patternOf = (id: number): PatternId => (id < 10 ? 'arrays' : 'stack');
    const facts = companionFacts({
      attempts: [
        attempt(1, '2026-10-01', 'hint'),
        attempt(1, '2026-10-02', 'solo', 'review'),
        attempt(2, '2026-10-02'),
        attempt(11, '2026-10-03', 'hint'),
        // 標記以前刷過的題：不算練習天數、題數，也不算征服
        attempt(12, '2026-09-01', 'solo', 'import'),
        attempt(13, '2026-09-01', 'solo', 'import'),
      ],
      mocks: [{ kind: 'explain', day: '2026-10-05' }],
      cardReviews: [{ day: '2026-10-04' }, { day: '2026-10-04' }],
      rehearsals: [],
      patternOf,
    });
    expect(facts).toEqual({
      practiceDays: 4,
      solo: 2,
      // 10/1 到 10/5，微複習那天也算
      longestStreak: 5,
      conquests: 1,
      cards: 2,
      topPattern: 2,
      explainDrills: 1,
      problems: 3,
    });
  });

  it('unlocks head items as the numbers reach each goal, and never needs anything stored', () => {
    expect(unlockedItems(none)).toEqual([]);
    const some = { ...none, practiceDays: 3, solo: 1, longestStreak: 3, cards: 40 };
    expect(unlockedItems(some)).toEqual(['yuzu', 'sprout', 'acorn']);
    expect(itemProgress(some, 'beanie')).toEqual({ have: 3, goal: 7, done: false });
    expect(itemProgress(some, 'bird')).toEqual({ have: 40, goal: 100, done: false });
    const all = { practiceDays: 90, solo: 200, longestStreak: 100, conquests: 9, cards: 500, topPattern: 12, explainDrills: 30, problems: 150 };
    expect(unlockedItems(all)).toEqual([...HEAD_ITEMS]);
  });

  it('wears what I picked if I have it, nothing if I took it off, and the first item otherwise', () => {
    expect(wornItem(null, [])).toBeNull();
    expect(wornItem(null, ['yuzu', 'sprout'])).toBe('yuzu');
    expect(wornItem('sprout', ['yuzu', 'sprout'])).toBe('sprout');
    // 選的道具已經不在（例如清掉資料），就戴第一個
    expect(wornItem('crown', ['yuzu'])).toBe('yuzu');
    expect(wornItem('none', ['yuzu'])).toBeNull();
  });

  it('celebrates one or two new items, but not the first time or a whole batch at once', () => {
    expect(newItems(null, ['yuzu', 'sprout'])).toEqual({ items: [], celebrate: false });
    expect(newItems(['yuzu'], ['yuzu', 'sprout'])).toEqual({ items: ['sprout'], celebrate: true });
    expect(newItems([], ['yuzu', 'sprout', 'acorn'])).toEqual({ items: ['yuzu', 'sprout', 'acorn'], celebrate: false });
    expect(newItems(['yuzu'], ['yuzu'])).toEqual({ items: [], celebrate: false });
  });
});
