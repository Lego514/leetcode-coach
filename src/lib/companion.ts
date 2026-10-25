import type { PatternId } from '../data/patterns';
import type { Day } from './dates';
import { conquests } from './motivation';
import type { Rating } from './srs';
import { longestStreak } from './stats';

// 陪刷題的卡皮巴拉：每天有好好練習，牠就長大；達成目標會收集到頭上的道具。
// 跟演算法樹一樣全部從紀錄算出來，不另外存（只存現在戴哪一個，見 store/companion.ts）。
// 「有效練習」只算真的做了題目的日子：練習、複習、模擬面試、講解練習；
// 標記以前刷過的題（import）不算，所以沒辦法一次標一堆題目就收集完。
// 收集的條件都是只會增加的數字（最長連續天數、征服的題數、做過的題數），拿到了就不會不見。

export const COMPANION_STAGES = ['baby', 'young', 'grown'] as const;
export type CompanionStage = (typeof COMPANION_STAGES)[number];

/** 有效練習幾天就到這個階段 */
export const COMPANION_STAGE_START: Record<CompanionStage, number> = { baby: 0, young: 7, grown: 21 };

export function companionStage(days: number): CompanionStage {
  return [...COMPANION_STAGES].reverse().find((stage) => days >= COMPANION_STAGE_START[stage]) ?? 'baby';
}

/** 下一個階段和還要練幾天；已經長大就是 null */
export function nextCompanionStage(days: number): { stage: CompanionStage; needed: number } | null {
  const next = COMPANION_STAGES[COMPANION_STAGES.indexOf(companionStage(days)) + 1];
  return next ? { stage: next, needed: COMPANION_STAGE_START[next] - days } : null;
}

/** 頭上的收藏，照拿到的難易排 */
export const HEAD_ITEMS = ['yuzu', 'sprout', 'acorn', 'beanie', 'fruit', 'bird', 'flower', 'headphones', 'gradcap', 'crown'] as const;
export type HeadItem = (typeof HEAD_ITEMS)[number];

export function isHeadItem(value: unknown): value is HeadItem {
  return (HEAD_ITEMS as readonly unknown[]).includes(value);
}

interface AttemptLike {
  problemId: number;
  day: Day;
  at: string;
  rating: Rating;
  mode: string;
}

export interface CompanionInput {
  attempts: readonly AttemptLike[];
  mocks: readonly { kind: 'full' | 'explain'; day: Day }[];
  cardReviews: readonly { day: Day }[];
  rehearsals: readonly { day: Day }[];
  /** 題目的題型，算「一個題型做了幾題」 */
  patternOf: (problemId: number) => PatternId | undefined;
}

export interface CompanionFacts {
  /** 有效練習的天數 */
  practiceDays: number;
  /** 自己解出（沒看提示）的次數 */
  solo: number;
  /** 最長連續天數；跟今天頁的連續天數一樣，做微複習、行為面試練習的日子也算 */
  longestStreak: number;
  conquests: number;
  cards: number;
  /** 做最多的那個題型做了幾題 */
  topPattern: number;
  explainDrills: number;
  /** 做過幾題（不同的題目） */
  problems: number;
}

export function companionFacts(input: CompanionInput): CompanionFacts {
  const real = input.attempts.filter((a) => a.mode !== 'import');
  const practiced = [...real.map((a) => a.day), ...input.mocks.map((m) => m.day)];
  const problems = new Set(real.map((a) => a.problemId));
  const perPattern = new Map<PatternId, number>();
  for (const id of problems) {
    const pattern = input.patternOf(id);
    if (pattern) perPattern.set(pattern, (perPattern.get(pattern) ?? 0) + 1);
  }
  return {
    practiceDays: new Set(practiced).size,
    solo: real.filter((a) => a.rating === 'solo').length,
    longestStreak: longestStreak([...practiced, ...input.cardReviews.map((c) => c.day), ...input.rehearsals.map((r) => r.day)]),
    conquests: conquests(real).length,
    cards: input.cardReviews.length,
    topPattern: Math.max(0, ...perPattern.values()),
    explainDrills: input.mocks.filter((m) => m.kind === 'explain').length,
    problems: problems.size,
  };
}

/** 每個道具要哪一個數字到多少 */
export const ITEM_GOALS: Record<HeadItem, { fact: keyof CompanionFacts; goal: number }> = {
  yuzu: { fact: 'practiceDays', goal: 1 },
  sprout: { fact: 'solo', goal: 1 },
  acorn: { fact: 'longestStreak', goal: 3 },
  beanie: { fact: 'longestStreak', goal: 7 },
  fruit: { fact: 'conquests', goal: 1 },
  bird: { fact: 'cards', goal: 100 },
  flower: { fact: 'topPattern', goal: 5 },
  headphones: { fact: 'explainDrills', goal: 10 },
  gradcap: { fact: 'problems', goal: 60 },
  crown: { fact: 'problems', goal: 150 },
};

/** 一個道具的進度：現在有多少（最多到目標）、目標、拿到了沒 */
export function itemProgress(facts: CompanionFacts, item: HeadItem): { have: number; goal: number; done: boolean } {
  const { fact, goal } = ITEM_GOALS[item];
  const have = facts[fact];
  return { have: Math.min(have, goal), goal, done: have >= goal };
}

export function unlockedItems(facts: CompanionFacts): HeadItem[] {
  return HEAD_ITEMS.filter((item) => itemProgress(facts, item).done);
}

/**
 * 現在戴著哪一個：自己選過、而且拿到了，就戴那個；選了「不戴」就沒有；
 * 還沒選過就戴第一個拿到的
 */
export function wornItem(choice: HeadItem | 'none' | null, unlocked: readonly HeadItem[]): HeadItem | null {
  if (choice === 'none') return null;
  if (choice && unlocked.includes(choice)) return choice;
  return unlocked[0] ?? null;
}

/**
 * 剛收集到的道具：跟上次看過的比。第一次（還沒記過）不算新的，免得一打開就跳一堆；
 * 一次多出三個以上（例如載入示範資料、同步帶進很多紀錄）也不慶祝，只記下來
 */
export function newItems(seen: readonly string[] | null, unlocked: readonly HeadItem[]): { items: HeadItem[]; celebrate: boolean } {
  if (seen === null) return { items: [], celebrate: false };
  const items = unlocked.filter((item) => !seen.includes(item));
  return { items, celebrate: items.length > 0 && items.length <= 2 };
}
