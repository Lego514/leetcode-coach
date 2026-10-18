import type { PatternId } from '../data/patterns';
import type { Problem } from '../data/problems';
import type { Day } from './dates';

// 每天的新題怎麼挑。三種排法，在設定裡選：
// - mixed（預設）：大部分照路線圖做目前在學的模式；另外穿插一題別的模式，練「看到題目想到該用哪個方法」；
//   最近常卡住的模式，再補一題比較簡單的鞏固。
// - roadmap：完全照路線圖順序（模式 → 難度），一個模式做完才換下一個。
// - focus：只做選定的一個模式，做完了再回到路線圖。
// 三種都可以限制每天最多幾題 Medium、幾題 Hard：超過的跳過，換成清單裡下一題比較簡單的。
// 面試時不會有人告訴你這題是哪個模式；一直做同一個模式，等於先知道答案的方向。

export const NEW_PROBLEM_MODES = ['mixed', 'roadmap', 'focus'] as const;
export type NewProblemMode = (typeof NEW_PROBLEM_MODES)[number];

/** 為什麼推這題：照路線圖、穿插的別的模式、常卡住要鞏固、專練的模式 */
export type NewPickReason = 'next' | 'mix' | 'reinforce' | 'focus';

export interface NewPick {
  problem: Problem;
  reason: NewPickReason;
}

/** 最近看幾天的紀錄，判斷哪些模式常卡住 */
export const STRUGGLE_DAYS = 30;
/** 這段期間在同一個模式卡住幾次以上，算常卡住 */
export const STRUGGLE_MIN = 2;

interface AttemptLike {
  problemId: number;
  day: Day;
  rating: string;
  stuck?: readonly string[];
}

/**
 * 最近常卡住的模式，卡住次數多的排前面（一樣多時，最近卡住的排前面）。
 * 看了解答、還是卡住，或勾了卡在哪，都算卡住一次。
 */
export function strugglingPatterns(
  attempts: readonly AttemptLike[],
  problemOf: (id: number) => Problem | undefined,
  since: Day,
  before: Day,
  min = STRUGGLE_MIN,
): PatternId[] {
  const stats = new Map<PatternId, { count: number; last: Day }>();
  for (const a of attempts) {
    if (a.day < since || a.day >= before) continue;
    const struggled = a.rating === 'solution' || a.rating === 'fail' || (a.stuck?.length ?? 0) > 0;
    if (!struggled) continue;
    const pattern = problemOf(a.problemId)?.pattern;
    if (!pattern) continue;
    const prev = stats.get(pattern);
    stats.set(pattern, { count: (prev?.count ?? 0) + 1, last: prev && prev.last > a.day ? prev.last : a.day });
  }
  return [...stats]
    .filter(([, s]) => s.count >= min)
    .sort(([, a], [, b]) => b.count - a.count || b.last.localeCompare(a.last))
    .map(([pattern]) => pattern);
}

const DIFFICULTY_RANK = { Easy: 0, Medium: 1, Hard: 2 } as const;

export interface PickInput {
  /** 題單裡的題目，照路線圖順序（模式 → 難度） */
  list: readonly Problem[];
  /** 今天以前就做過的題目：用今天開始時的狀態挑，一天裡清單才不會一直變 */
  started: (id: number) => boolean;
  count: number;
  mode: NewProblemMode;
  focus?: PatternId;
  /** 最近常卡住的模式，最嚴重的在前 */
  struggling?: readonly PatternId[];
  /** 每個模式最後一次練習的日子：穿插時挑最久沒碰的模式 */
  lastPracticed?: ReadonlyMap<PatternId, Day>;
  /** 每天最多幾題 Medium、幾題 Hard；沒寫是不限 */
  maxMedium?: number;
  maxHard?: number;
}

/** 某個難度今天最多幾題；Easy 不限 */
function capOf(input: PickInput, difficulty: Problem['difficulty']): number {
  if (difficulty === 'Medium') return input.maxMedium ?? Infinity;
  if (difficulty === 'Hard') return input.maxHard ?? Infinity;
  return Infinity;
}

export function pickNewProblems(input: PickInput): NewPick[] {
  const { list, started, count, mode } = input;
  if (count <= 0) return [];
  const fresh = list.filter((p) => !started(p.id));
  const taken = new Set<number>();
  const perDifficulty = new Map<Problem['difficulty'], number>();
  const take = (problem: Problem | undefined, reason: NewPickReason, picks: NewPick[]) => {
    if (!problem || taken.has(problem.id)) return false;
    const used = perDifficulty.get(problem.difficulty) ?? 0;
    if (used >= capOf(input, problem.difficulty)) return false;
    perDifficulty.set(problem.difficulty, used + 1);
    taken.add(problem.id);
    picks.push({ problem, reason });
    return true;
  };
  const fill = (picks: NewPick[], reason: NewPickReason, pool: readonly Problem[] = fresh) => {
    for (const p of pool) {
      if (picks.length >= count) break;
      take(p, reason, picks);
    }
  };

  if (mode === 'roadmap') {
    const picks: NewPick[] = [];
    fill(picks, 'next');
    return picks;
  }

  if (mode === 'focus' && input.focus) {
    const picks: NewPick[] = [];
    fill(
      picks,
      'focus',
      fresh.filter((p) => p.pattern === input.focus),
    );
    // 這個模式做完了：剩下的照路線圖
    fill(picks, 'next');
    return picks;
  }

  // mixed
  const frontier = fresh[0]?.pattern;
  const extras: NewPick[] = [];

  // 常卡住的模式補一題：這個模式裡最簡單、還沒做過的
  if (count >= 2) {
    for (const pattern of input.struggling ?? []) {
      const easiest = fresh
        .filter((p) => p.pattern === pattern)
        .sort((a, b) => DIFFICULTY_RANK[a.difficulty] - DIFFICULTY_RANK[b.difficulty]);
      if (easiest.some((p) => take(p, 'reinforce', extras))) break;
    }
  }

  // 穿插一題別的模式：先挑學過、還有題目、最久沒碰的模式；都沒有的話，先看下一個模式的第一題
  if (count - extras.length >= 2) {
    const reinforced = extras[0]?.problem.pattern;
    const learned = new Set(list.filter((p) => started(p.id)).map((p) => p.pattern));
    const candidates = [...new Set(fresh.map((p) => p.pattern))].filter((p) => p !== frontier && p !== reinforced);
    const last = input.lastPracticed ?? new Map<PatternId, Day>();
    const learnedFirst = candidates
      .filter((p) => learned.has(p))
      .sort((a, b) => (last.get(a) ?? '').localeCompare(last.get(b) ?? ''));
    // 那個模式的下一題超過難度上限時，換下一個模式
    for (const pattern of [...learnedFirst, ...candidates.filter((p) => !learned.has(p))]) {
      if (fresh.some((p) => p.pattern === pattern && take(p, 'mix', extras))) break;
    }
  }

  const picks: NewPick[] = [];
  for (const p of fresh) {
    if (picks.length >= count - extras.length) break;
    take(p, 'next', picks);
  }
  return [...picks, ...extras];
}
