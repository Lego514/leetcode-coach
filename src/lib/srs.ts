import type { Rating, StuckReason } from '../../shared/constants';
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

/** 記得時穩定度變大：越難的題長得越慢，越接近忘記才複習（R 越低）長得越多；weight 是寫題時間的權重 */
function recallStability(d: number, s: number, r: number, g: Grade, weight = 1): number {
  const hard = g === 2 ? W[15] : 1;
  const easy = g === 4 ? W[16] : 1;
  const growth = Math.exp(W[8]) * (11 - d) * s ** -W[9] * (Math.exp((1 - r) * W[10]) - 1) * hard * easy * weight;
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

/**
 * 做完一次之後的記憶狀態；prev 是之前的，days 是隔了幾天（weight 是 1 時跟 ts-fsrs 的 next_state 一樣）。
 * weight 是寫題時間的權重（timeWeight），只用在記得的時候：第一次做乘在起始穩定度上，之後乘在穩定度長多少上
 */
export function nextMemory(prev: Memory | undefined, days: number, g: Grade, weight = 1): Memory {
  const w = g >= 2 ? weight : 1;
  if (!prev) return { difficulty: clamp(initDifficulty(g), 1, 10), stability: Math.max(round8(W[g - 1] * w), 0.1) };
  const { stability: s, difficulty: d } = prev;
  let stability: number;
  if (days === 0) stability = sameDayStability(s, g);
  else if (g === 1) stability = forgetStability(d, s, recallProbability(s, days));
  else stability = recallStability(d, s, recallProbability(s, days), g, w);
  return { difficulty: nextDifficulty(d, g), stability };
}

/** 記得的機率掉到 retention 要幾天；至少 1 天、最多 MAX_INTERVAL */
export function intervalFor(stability: number, retention = DEFAULT_RETENTION): number {
  const modifier = round8((retention ** (1 / DECAY) - 1) / FACTOR);
  return Math.min(Math.max(1, Math.round(stability * modifier)), MAX_INTERVAL);
}

/**
 * 寫題時間的權重：pace 是花的時間 ÷ 這題的目標時間。在目標以內是 1；超過就線性往下，
 * 兩倍以上是 SLOW_WEIGHT（0.6，跟 FSRS 給 Hard 的打折差不多）。沒有時間（例如標記以前刷過）是 1。
 * 寫得快不加分：FSRS 的預設參數沒有這個訊號，只扣不加比較保守
 */
export const SLOW_WEIGHT = 0.6;
export function timeWeight(pace: number | undefined): number {
  if (pace === undefined || !(pace > 1)) return 1;
  return round8(1 - (1 - SLOW_WEIGHT) * Math.min(pace - 1, 1));
}

/**
 * 提示看到第幾層（1 方向、2 關鍵觀察、3 邊界情況、4 模板）：選「看了提示」時乘在 FSRS 的 Hard 上。
 * 跟「自己解出」比，記憶度長多少大約是 0.8、0.6、0.5、0.4：只看了題型幾乎還記得，看到模板等於忘了大半
 */
export const HINT_LAYER_WEIGHT: Record<number, number> = { 1: 1.3, 2: 1, 3: 0.85, 4: 0.7 };

/**
 * 卡在哪：沒看出模式、想不到優化、寫不出來是「記憶」沒了，扣多一點，也算寫得不順；
 * 漏了邊界情況、有 bug 比較像執行的問題，只小扣；時間不夠已經算在寫題時間裡，不再扣
 */
export const MEMORY_STUCK: readonly StuckReason[] = ['pattern', 'optimize', 'implement'];
export const MEMORY_STUCK_WEIGHT = 0.75;
export const EXECUTION_STUCK: readonly StuckReason[] = ['edge', 'bug'];
export const EXECUTION_STUCK_WEIGHT = 0.9;

/** 這一次除了自評之外的證據：花的時間、提示看到第幾層、卡在哪 */
export interface Evidence {
  /** 花的時間 ÷ 這題的目標時間 */
  pace?: number;
  /** 提示看到第幾層；0 或沒有是沒看 */
  hintLayers?: number;
  stuck?: readonly StuckReason[];
  /** 這次練習前後 EXPLAIN_WINDOW_DAYS 天內，這題有一次講得清楚的講解 */
  explained?: boolean;
}

/** 一個權重和它從哪來：寫太久（pace 是幾倍的目標時間）、提示看到第幾層、卡在記憶或執行 */
export type WeightFactor =
  | { kind: 'time'; pace: number; weight: number }
  | { kind: 'hint'; layers: number; weight: number }
  | { kind: 'memoryStuck'; weight: number }
  | { kind: 'executionStuck'; weight: number };

/** 這次有哪些權重（是 1 的不列）；排程和「為什麼排這天」的說明都從這裡來 */
export function evidenceFactors(rating: Rating, { pace, hintLayers, stuck }: Evidence = {}): WeightFactor[] {
  const factors: WeightFactor[] = [];
  const time = timeWeight(pace);
  if (time !== 1) factors.push({ kind: 'time', pace: pace!, weight: time });
  if (rating === 'hint' && hintLayers) {
    const layers = Math.min(hintLayers, 4);
    if (HINT_LAYER_WEIGHT[layers] !== 1) factors.push({ kind: 'hint', layers, weight: HINT_LAYER_WEIGHT[layers] });
  }
  if (stuck?.some((r) => MEMORY_STUCK.includes(r))) factors.push({ kind: 'memoryStuck', weight: MEMORY_STUCK_WEIGHT });
  else if (stuck?.some((r) => EXECUTION_STUCK.includes(r))) factors.push({ kind: 'executionStuck', weight: EXECUTION_STUCK_WEIGHT });
  return factors;
}

/** 記得時，記憶度（穩定度）長多少的權重：時間、提示的深度、卡在哪的種類乘起來（最低約 0.6 × 0.7 × 0.75） */
export function evidenceWeight(rating: Rating, evidence: Evidence = {}): number {
  return round8(evidenceFactors(rating, evidence).reduce((w, f) => w * f.weight, 1));
}

/** 寫得不順：看了提示、花了兩倍以上的時間，或卡在記憶類的地方 */
export function isShaky(rating: Rating, { pace, stuck }: Evidence = {}): boolean {
  return rating === 'hint' || (pace ?? 0) >= 2 || (stuck?.some((r) => MEMORY_STUCK.includes(r)) ?? false);
}

/**
 * 最熟的情況：很快解出（目標時間的一半以內、沒看提示、沒卡住），而且講得清楚，才算 FSRS 的 Easy（很輕鬆）。
 * 寫得快可能只是把程式碼背起來，講得出來才代表真的懂；面試也是兩個都考
 */
export const EASY_PACE = 0.5;
/** 講解和練習隔幾天內算同一次：先講再寫、寫完隔幾天才講都算 */
export const EXPLAIN_WINDOW_DAYS = 3;
export function isFast(rating: Rating, { pace, hintLayers, stuck }: Evidence = {}): boolean {
  return rating === 'solo' && pace !== undefined && pace <= EASY_PACE && !hintLayers && !stuck?.length;
}
export function isEasy(rating: Rating, evidence: Evidence = {}): boolean {
  return isFast(rating, evidence) && !!evidence.explained;
}

/** 這一題的講解紀錄：哪天講的、講得清不清楚 */
export interface ExplanationMark {
  day: Day;
  clear: boolean;
}

/** 這次練習前後 EXPLAIN_WINDOW_DAYS 天內有沒有講得清楚的講解 */
export function explainedAround(explanations: readonly ExplanationMark[] | undefined, day: Day): boolean {
  return !!explanations?.some((e) => e.clear && Math.abs(diffDays(e.day, day)) <= EXPLAIN_WINDOW_DAYS);
}

/**
 * 寫得不順（看了提示、花了兩倍以上的時間，或卡在記憶類的地方）：下次最多隔這幾天就先確認一次，穩定度照 FSRS 算。
 * FSRS 的預設參數是從背卡片的資料訓練的，「勉強想起來」在寫程式題通常代表忘了一部分，
 * 隔太久再見很容易又卡住；確認那次寫得順，就從已經長好的穩定度接著排
 */
export const CONFIRM_DAYS = 7;

/**
 * 做完一題後排下次複習：把自評換成 FSRS 的等級，依這次的證據（時間、提示、卡在哪）調整穩定度和難度，
 * 排在記得的機率掉到目標記憶率的那天。delayDays 只把到期日往後挪（批次標記時用來分散複習日）。
 */
export function schedule(
  prev: ReviewState | undefined,
  rating: Rating,
  day: Day,
  delayDays = 0,
  retention = DEFAULT_RETENTION,
  evidence: Evidence = {},
): ReviewState {
  const g: Grade = isEasy(rating, evidence) ? 4 : GRADES[rating];
  // 舊版留下的紀錄沒有穩定度，當成第一次
  const known = prev && prev.stability > 0 ? prev : undefined;
  const days = known ? Math.max(0, diffDays(known.lastReview, day)) : 0;
  const memory = nextMemory(known, days, g, evidenceWeight(rating, evidence));
  let interval = intervalFor(memory.stability, retention);
  if (g >= 2 && isShaky(rating, evidence)) interval = Math.min(interval, CONFIRM_DAYS);
  return {
    ...memory,
    reps: g === 1 ? 0 : (prev?.reps ?? 0) + 1,
    lapses: (prev?.lapses ?? 0) + (g === 1 ? 1 : 0),
    interval,
    lastReview: day,
    due: addDays(day, interval + delayDays),
  };
}

/** 為什麼排這天：schedule 每一步的數字，畫面照順序說明 */
export interface ScheduleExplanation {
  rating: Rating;
  /** 很快解出又講得清楚，算 FSRS 的 Easy */
  easy: boolean;
  /** 很快解出，但前後幾天沒有講得清楚的講解（講一次就能算 Easy） */
  fastNotExplained: boolean;
  /** 第一次做（或舊版沒有穩定度的紀錄） */
  first: boolean;
  /** 隔了幾天；第一次是 0 */
  gapDays: number;
  /** 這次寫的時候，照上次的記憶度還記得的機率；第一次沒有 */
  recall?: number;
  stabilityBefore?: number;
  stabilityAfter: number;
  /** 有乘上的權重：只有記得、而且不是同一天再做一次的時候 */
  factors: WeightFactor[];
  retention: number;
  /** 照目標記憶率算出來的天數（已經套上最長 MAX_INTERVAL） */
  fsrsDays: number;
  /** 照目標記憶率會超過 MAX_INTERVAL，被限在最長 */
  maxed: boolean;
  /** 寫得不順，一週內先確認（只有 fsrsDays 比 CONFIRM_DAYS 長才會縮短） */
  confirm: boolean;
  /** 批次標記時分散到期日，往後挪的天數 */
  delayDays: number;
  /** 最後的間隔，跟 schedule(...).interval 一樣 */
  days: number;
}

/** 照 schedule 的步驟算一遍，留下每一步的數字 */
export function explainSchedule(
  prev: ReviewState | undefined,
  rating: Rating,
  day: Day,
  delayDays = 0,
  retention = DEFAULT_RETENTION,
  evidence: Evidence = {},
): ScheduleExplanation {
  const g: Grade = isEasy(rating, evidence) ? 4 : GRADES[rating];
  const known = prev && prev.stability > 0 ? prev : undefined;
  const gapDays = known ? Math.max(0, diffDays(known.lastReview, day)) : 0;
  const state = schedule(prev, rating, day, delayDays, retention, evidence);
  const weighted = g >= 2 && !(known && gapDays === 0);
  const modifier = round8((retention ** (1 / DECAY) - 1) / FACTOR);
  const fsrsDays = intervalFor(state.stability, retention);
  return {
    rating,
    easy: g === 4,
    fastNotExplained: isFast(rating, evidence) && !evidence.explained,
    first: !known,
    gapDays,
    recall: known ? recallProbability(known.stability, gapDays) : undefined,
    stabilityBefore: known?.stability,
    stabilityAfter: state.stability,
    factors: weighted ? evidenceFactors(rating, evidence) : [],
    retention,
    fsrsDays,
    maxed: Math.round(state.stability * modifier) > MAX_INTERVAL,
    confirm: state.interval < fsrsDays,
    delayDays,
    days: state.interval,
  };
}

/** 花的時間 ÷ 目標時間；不知道其中一個就是 undefined（不打折） */
export function paceOf(minutes: number | undefined, targetMinutes: number | undefined): number | undefined {
  return minutes && targetMinutes ? minutes / targetMinutes : undefined;
}

/**
 * 依時間順序重播做過的紀錄，得到現在的狀態；沒有紀錄是 undefined。
 * targetMinutes 是這題的目標時間，explanations 是這題的講解紀錄（判斷 Easy 用）
 */
export function replay(
  attempts: readonly { rating: Rating; day: Day; delayDays?: number; minutes?: number; hints?: number; stuck?: readonly StuckReason[] }[],
  retention = DEFAULT_RETENTION,
  targetMinutes?: number,
  explanations?: readonly ExplanationMark[],
): ReviewState | undefined {
  let state: ReviewState | undefined;
  for (const a of attempts) {
    const evidence = {
      pace: paceOf(a.minutes, targetMinutes),
      hintLayers: a.hints,
      stuck: a.stuck,
      explained: explainedAround(explanations, a.day),
    };
    state = schedule(state, a.rating, a.day, a.delayDays, retention, evidence);
  }
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

/**
 * 熟練度的階段，熟練度方格的四格也照這個：
 * 學習中（不到 7 天）→ 複習中（7–29 天）→ 記得住（30 天以上）→ 已熟練（30 天以上，而且最近一次講解講得清楚）。
 * 沒講清楚就不算最熟：面試要寫得出來也講得出來
 */
export type Stage = 'new' | 'learning' | 'reviewing' | 'remembered' | 'mastered';

export const STAGES: Stage[] = ['new', 'learning', 'reviewing', 'remembered', 'mastered'];
export const REVIEWING_DAYS = 7;
export const REMEMBERED_DAYS = 30;

/** explained：這題最近一次講解講得清楚（ProgressRecord 重算時一起算好） */
export type StageInput = Pick<ReviewState, 'interval'> & { explained?: boolean };

export function stageOf(state: StageInput | undefined): Stage {
  if (!state) return 'new';
  if (state.interval < REVIEWING_DAYS) return 'learning';
  if (state.interval < REMEMBERED_DAYS) return 'reviewing';
  return state.explained ? 'mastered' : 'remembered';
}

/** 沒講清楚的題目，熟練度最多到這裡（記得住，但還不是最熟） */
export const UNEXPLAINED_MASTERY = 0.85;

/** 0 到 1 的熟練度：間隔 1 天約 0.2，7 天約 0.6，30 天以上為 1；沒講清楚最多 UNEXPLAINED_MASTERY */
export function masteryOf(state: StageInput | undefined): number {
  if (!state) return 0;
  const memory = Math.min(1, Math.log2(state.interval + 1) / Math.log2(31));
  return state.explained ? memory : Math.min(memory, UNEXPLAINED_MASTERY);
}
