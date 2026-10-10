import type { Rating } from '../../shared/constants';
import { addDays, diffDays, type Day } from './dates';

export type { Rating };

/**
 * 做完一題之後的自我評分：
 * - solo：自己一次解出
 * - hint：看了提示才解出
 * - solution：看了解答才寫出來
 * - fail：看完解答仍然不太懂
 */

/** 評分選項的顯示順序；文字在 i18n 字典的 ratings */
export const RATINGS: Rating[] = ['solo', 'hint', 'solution', 'fail'];

/**
 * 每一題的記憶狀態，用 FSRS（Anki 新版內建的排程演算法）：
 * - stability 穩定度：隔這麼多天之後，記得的機率剛好掉到 90%
 * - difficulty 難度：1 到 10，忘記會變高
 * 下次複習排在記得的機率掉到目標記憶率（預設 90%）的那天。
 */
export interface ReviewState {
  stability: number;
  difficulty: number;
  /** 連續記得的次數，忘記會歸零 */
  reps: number;
  lapses: number;
  /** 距離下次複習的天數 */
  interval: number;
  /** 上次複習那天，用來算隔了幾天 */
  lastReview: Day;
  due: Day;
}

/** 目標記憶率：到期時大概還記得的機率。調高會更常複習 */
export const DEFAULT_RETENTION = 0.9;
export const RETENTIONS = [0.8, 0.85, 0.9, 0.95] as const;
/** 間隔最長幾天；準備面試的期間，四個月內至少再做一次 */
export const MAX_INTERVAL = 120;

/**
 * FSRS-6 的預設參數，用大量真實的複習紀錄訓練出來的（跟官方的 ts-fsrs 5.4 一樣，測試裡逐一比對）。
 * w0–w3 是第一次的穩定度，w4–w7 算難度，w8–w10 記得時穩定度怎麼長，w11–w14 忘記時，
 * w15、w16 是 Hard、Easy 的加減，w17–w19 同一天再做一次，w20 是遺忘曲線的形狀。
 */
const W = [
  0.212, 1.2931, 2.3065, 8.2956, 6.4133, 0.8334, 3.0194, 0.001, 1.8722, 0.1666, 0.796, 1.4835, 0.0614, 0.2629, 1.6483, 0.6014, 1.8729, 0.5425,
  0.0912, 0.0658, 0.1542,
] as const;
const S_MIN = 0.001;
const S_MAX = 36500;

/** FSRS 的四個等級：Again 忘了、Hard 勉強想起來、Good 記得、Easy 很輕鬆 */
export type Grade = 1 | 2 | 3 | 4;

/** 自評對到 FSRS 的等級：自己解出是 Good，看提示才解出是 Hard，看了解答或看完還不懂都算忘了 */
export const GRADES: Record<Rating, Grade> = { solo: 3, hint: 2, solution: 1, fail: 1 };

/** 跟 ts-fsrs 一樣，每一步都四捨五入到小數 8 位，結果才會一模一樣 */
const round8 = (x: number) => Math.round(x * 1e8) / 1e8;
const clamp = (x: number, min: number, max: number) => Math.min(Math.max(x, min), max);

/** 遺忘曲線 R(t) = (1 + FACTOR · t / S)^DECAY；t = S 時剛好是 90% */
const DECAY = -W[20];
const FACTOR = round8(Math.exp(Math.log(0.9) / DECAY) - 1);

/** 隔了 days 天之後還記得的機率 */
export function recallProbability(stability: number, days: number): number {
  return round8((1 + (FACTOR * days) / stability) ** DECAY);
}

function initDifficulty(g: Grade): number {
  return round8(W[4] - Math.exp((g - 1) * W[5]) + 1);
}

/** 答得越好難度越低；越接近 10 變得越慢，並且慢慢拉回「很輕鬆」的難度 */
function nextDifficulty(d: number, g: Grade): number {
  const delta = -W[6] * (g - 3);
  const next = d + round8((delta * (10 - d)) / 9);
  return clamp(round8(W[7] * initDifficulty(4) + (1 - W[7]) * next), 1, 10);
}

/** 記得時穩定度變大：越難的題長得越慢，越接近忘記才複習（R 越低）長得越多 */
function recallStability(d: number, s: number, r: number, g: Grade): number {
  const hard = g === 2 ? W[15] : 1;
  const easy = g === 4 ? W[16] : 1;
  const growth = Math.exp(W[8]) * (11 - d) * s ** -W[9] * (Math.exp((1 - r) * W[10]) - 1) * hard * easy;
  return round8(clamp(s * (1 + growth), S_MIN, S_MAX));
}

/** 忘記時穩定度變小，但不會比原本的再小太多 */
function forgetStability(d: number, s: number, r: number): number {
  const after = round8(clamp(W[11] * d ** -W[12] * ((s + 1) ** W[13] - 1) * Math.exp((1 - r) * W[14]), S_MIN, S_MAX));
  return clamp(round8(s / Math.exp(W[17] * W[18])), S_MIN, after);
}

/** 同一天又做一次：只小幅調整，記得的話至少不會變小 */
function sameDayStability(s: number, g: Grade): number {
  const factor = s ** -W[19] * Math.exp(W[17] * (g - 3 + W[18]));
  return round8(clamp(s * (g >= 2 ? Math.max(factor, 1) : factor), S_MIN, S_MAX));
}

export interface Memory {
  stability: number;
  difficulty: number;
}

/** 做完一次之後的記憶狀態；prev 是之前的，days 是隔了幾天（跟 ts-fsrs 的 next_state 一樣） */
export function nextMemory(prev: Memory | undefined, days: number, g: Grade): Memory {
  if (!prev) return { difficulty: clamp(initDifficulty(g), 1, 10), stability: Math.max(W[g - 1], 0.1) };
  const { stability: s, difficulty: d } = prev;
  let stability: number;
  if (days === 0) stability = sameDayStability(s, g);
  else if (g === 1) stability = forgetStability(d, s, recallProbability(s, days));
  else stability = recallStability(d, s, recallProbability(s, days), g);
  return { difficulty: nextDifficulty(d, g), stability };
}

/** 記得的機率掉到 retention 要幾天；至少 1 天、最多 MAX_INTERVAL */
export function intervalFor(stability: number, retention = DEFAULT_RETENTION): number {
  const modifier = round8((retention ** (1 / DECAY) - 1) / FACTOR);
  return Math.min(Math.max(1, Math.round(stability * modifier)), MAX_INTERVAL);
}

/**
 * 做完一題後排下次複習：把自評換成 FSRS 的等級，更新穩定度和難度，
 * 排在記得的機率掉到目標記憶率的那天。delayDays 只把到期日往後挪（批次標記時用來分散複習日）。
 */
export function schedule(prev: ReviewState | undefined, rating: Rating, day: Day, delayDays = 0, retention = DEFAULT_RETENTION): ReviewState {
  const g = GRADES[rating];
  // 舊版留下的紀錄沒有穩定度，當成第一次
  const known = prev && prev.stability > 0 ? prev : undefined;
  const days = known ? Math.max(0, diffDays(known.lastReview, day)) : 0;
  const memory = nextMemory(known, days, g);
  const interval = intervalFor(memory.stability, retention);
  return {
    ...memory,
    reps: g === 1 ? 0 : (prev?.reps ?? 0) + 1,
    lapses: (prev?.lapses ?? 0) + (g === 1 ? 1 : 0),
    interval,
    lastReview: day,
    due: addDays(day, interval + delayDays),
  };
}

/** 依時間順序重播做過的紀錄，得到現在的狀態；沒有紀錄是 undefined */
export function replay(
  attempts: readonly { rating: Rating; day: Day; delayDays?: number }[],
  retention = DEFAULT_RETENTION,
): ReviewState | undefined {
  let state: ReviewState | undefined;
  for (const attempt of attempts) state = schedule(state, attempt.rating, attempt.day, attempt.delayDays, retention);
  return state;
}

/** 今天還記得的機率；沒做過或是舊版的紀錄是 undefined */
export function recallOn(state: Partial<Pick<ReviewState, 'stability' | 'lastReview'>> | undefined, today: Day): number | undefined {
  if (!state?.stability || !state.lastReview) return undefined;
  return recallProbability(state.stability, Math.max(0, diffDays(state.lastReview, today)));
}

/** 批次標記時，每天最多排幾題到期 */
export const IMPORT_DUE_PER_DAY = 5;

/**
 * 把 count 題排到 start 當天或之後、到期題數還沒滿 perDay 的日子，越早越好。
 * load 是每天已經有幾題到期；回傳每一題要延後幾天。
 */
export function spreadDelays(
  count: number,
  start: Day,
  load: ReadonlyMap<Day, number> = new Map(),
  perDay = IMPORT_DUE_PER_DAY,
): number[] {
  const used = new Map(load);
  const delays: number[] = [];
  let offset = 0;
  for (let i = 0; i < count; i += 1) {
    while ((used.get(addDays(start, offset)) ?? 0) >= perDay) offset += 1;
    const day = addDays(start, offset);
    used.set(day, (used.get(day) ?? 0) + 1);
    delays.push(offset);
  }
  return delays;
}

export type Stage = 'new' | 'learning' | 'reviewing' | 'mastered';

export const STAGES: Stage[] = ['new', 'learning', 'reviewing', 'mastered'];

export function stageOf(state: Pick<ReviewState, 'interval'> | undefined): Stage {
  if (!state) return 'new';
  if (state.interval < 7) return 'learning';
  if (state.interval < 30) return 'reviewing';
  return 'mastered';
}

/** 0 到 1 的熟練度：間隔 1 天約 0.2，7 天約 0.6，30 天以上為 1 */
export function masteryOf(state: Pick<ReviewState, 'interval'> | undefined): number {
  if (!state) return 0;
  return Math.min(1, Math.log2(state.interval + 1) / Math.log2(31));
}
