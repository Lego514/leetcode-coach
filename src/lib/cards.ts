import type { CardResult } from '../../shared/constants';
import { PATTERN_ORDER, type PatternId } from '../data/patterns';
import type { Problem } from '../data/problems';
import { addDays, type Day } from './dates';

// 微複習：健身組間、通勤這種零碎時間用的小卡片。
// 卡片由現有資料產生（做過的題目、參考講法、模板卡的線索、Python 小知識），
// 排程用簡單的 Leitner 盒子，和題目本身的複習排程分開。

export type { CardResult };

export const ROUND_SIZE = 5;

/** 每一盒的間隔天數；答錯回到第 0 盒，當天稍後的回合會再出現 */
export const BOX_INTERVALS = [0, 1, 3, 7, 14, 30] as const;

export type ProblemCardKind = 'pattern' | 'insight' | 'complexity' | 'explain';
export type CardKind = ProblemCardKind | 'signal' | 'tip';

export type CardRef =
  | { id: string; kind: ProblemCardKind; problemId: number }
  | { id: string; kind: 'signal'; patternId: PatternId; index: number }
  | { id: string; kind: 'tip'; tipId: string };

export interface CardState {
  box: number;
  due: Day;
  /** 最後一次作答的 ISO 時間 */
  lastAt: string;
  reviews: number;
}

interface ReviewLike {
  cardId: string;
  day: Day;
  at: string;
  result: CardResult;
}

export function nextBox(box: number, result: CardResult): number {
  switch (result) {
    case 'good':
      return Math.min(box + 1, BOX_INTERVALS.length - 1);
    case 'fuzzy':
      return Math.max(box, 1);
    case 'again':
      return 0;
  }
}

/** 依時間順序重播作答紀錄，得到每張卡目前在哪一盒、哪天到期 */
export function cardStates(reviews: readonly ReviewLike[]): Map<string, CardState> {
  const states = new Map<string, CardState>();
  const sorted = [...reviews].sort((a, b) => a.at.localeCompare(b.at));
  for (const review of sorted) {
    const prev = states.get(review.cardId);
    const box = nextBox(prev?.box ?? 0, review.result);
    states.set(review.cardId, {
      box,
      due: addDays(review.day, BOX_INTERVALS[box]),
      lastAt: review.at,
      reviews: (prev?.reviews ?? 0) + 1,
    });
  }
  return states;
}

// ---------- 從參考講法抽出內容 ----------

const INSIGHT_PREFIX = 'The key insight is that ';

/** 參考講法第一句去掉固定開頭；開頭是一般英文單字時改成大寫（n、i 這種變數名稱不改） */
export function keyInsight(explanation: string): string {
  const line = explanation.split('\n')[0];
  const rest = line.startsWith(INSIGHT_PREFIX) ? line.slice(INSIGHT_PREFIX.length) : line;
  const first = rest.split(' ')[0];
  return /^(?:a|[a-z][a-z'-]+)$/.test(first) ? rest[0].toUpperCase() + rest.slice(1) : rest;
}

export interface Complexity {
  time: string;
  space: string;
}

/** 從 start 開始讀一個括號配對完整的 O(...) */
function readBigO(text: string, start: number): string | null {
  if (!text.startsWith('O(', start)) return null;
  let depth = 0;
  for (let i = start + 1; i < text.length; i += 1) {
    if (text[i] === '(') depth += 1;
    else if (text[i] === ')') {
      depth -= 1;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return null;
}

/**
 * 從參考講法的第四句抽出時間和空間複雜度，只處理
 * 「This takes O(…) time …, and O(…) space」這種清楚的句型；其他寫法回傳 null，不出這張卡。
 */
export function parseComplexity(explanation: string): Complexity | null {
  const line = explanation.split('\n')[3] ?? '';
  const lead = 'This takes ';
  if (!line.startsWith(lead)) return null;
  const time = readBigO(line, lead.length);
  if (!time) return null;
  const afterTime = line.slice(lead.length + time.length);
  if (!/^ time\b/.test(afterTime) || /^ time per\b/.test(afterTime)) return null;
  if (/^ time and space\b/.test(afterTime)) return { time, space: time };

  const at = line.indexOf('O(', lead.length + time.length);
  const space = at === -1 ? null : readBigO(line, at);
  if (!space) return null;
  const afterSpace = line.slice(at + space.length);
  if (!/^ (?:extra space|space|recursion depth|stack)\b/.test(afterSpace)) return null;
  return { time, space };
}

/** 顯示用：把口語的 times 換成乘號 */
export function formatBigO(expr: string): string {
  return expr.replace(/ times /g, ' × ');
}

// ---------- 牌組 ----------

export interface DeckInput {
  /** 做過的題目（含批次標記的舊題）；沒做過的題目會被參考講法劇透，不出卡 */
  problems: readonly Problem[];
  explanations: Readonly<Record<number, string>>;
  /** 每個模式有幾條線索 */
  signalCounts: Readonly<Partial<Record<PatternId, number>>>;
  tipIds: readonly string[];
}

export function buildDeck({ problems, explanations, signalCounts, tipIds }: DeckInput): CardRef[] {
  const deck: CardRef[] = [];
  for (const p of problems) {
    deck.push({ id: `pattern:${p.id}`, kind: 'pattern', problemId: p.id });
    const text = explanations[p.id];
    if (!text) continue;
    deck.push({ id: `insight:${p.id}`, kind: 'insight', problemId: p.id });
    if (parseComplexity(text)) deck.push({ id: `complexity:${p.id}`, kind: 'complexity', problemId: p.id });
    deck.push({ id: `explain:${p.id}`, kind: 'explain', problemId: p.id });
  }
  for (const patternId of PATTERN_ORDER) {
    for (let index = 0; index < (signalCounts[patternId] ?? 0); index += 1) {
      deck.push({ id: `signal:${patternId}:${index}`, kind: 'signal', patternId, index });
    }
  }
  for (const tipId of tipIds) deck.push({ id: `tip:${tipId}`, kind: 'tip', tipId });
  return deck;
}

export type Random = () => number;

export function shuffle<T>(items: readonly T[], random: Random = Math.random): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/** 同一回合不出同一題的兩張卡，也不出同一個模式的兩條線索，免得互相洩題 */
function topicOf(card: CardRef): string {
  switch (card.kind) {
    case 'signal':
      return `signal:${card.patternId}`;
    case 'tip':
      return card.id;
    default:
      return `problem:${card.problemId}`;
  }
}

/** 新卡依種類輪流排，讓每一回合的卡片種類有變化 */
function interleaveByKind(cards: readonly CardRef[], random: Random): CardRef[] {
  const queues = new Map<CardKind, CardRef[]>();
  for (const card of shuffle(cards, random)) {
    queues.set(card.kind, [...(queues.get(card.kind) ?? []), card]);
  }
  const order = shuffle([...queues.keys()], random);
  const result: CardRef[] = [];
  while (result.length < cards.length) {
    for (const kind of order) {
      const next = queues.get(kind)!.shift();
      if (next) result.push(next);
    }
  }
  return result;
}

/**
 * 挑一回合的卡片：先出到期的卡（最早到期、最久沒看的優先），
 * 有新卡時至少留一個位置給新卡；都不夠時拿還沒到期、最快到期的卡補滿。
 */
export function pickRound(
  deck: readonly CardRef[],
  states: ReadonlyMap<string, CardState>,
  today: Day,
  random: Random = Math.random,
  size = ROUND_SIZE,
): CardRef[] {
  const byDue = (a: CardRef, b: CardRef) => {
    const sa = states.get(a.id)!;
    const sb = states.get(b.id)!;
    return sa.due.localeCompare(sb.due) || sa.lastAt.localeCompare(sb.lastAt);
  };
  const seen = deck.filter((c) => states.has(c.id));
  const due = seen.filter((c) => states.get(c.id)!.due <= today).sort(byDue);
  const later = seen.filter((c) => states.get(c.id)!.due > today).sort(byDue);
  const fresh = interleaveByKind(
    deck.filter((c) => !states.has(c.id)),
    random,
  );

  const chosen: CardRef[] = [];
  const topics = new Set<string>();
  const take = (pool: readonly CardRef[], limit: number) => {
    for (const card of pool) {
      if (chosen.length >= limit) return;
      if (chosen.includes(card) || topics.has(topicOf(card))) continue;
      chosen.push(card);
      topics.add(topicOf(card));
    }
  };

  take(due, fresh.length > 0 ? size - 1 : size);
  take(fresh, size);
  take(due, size);
  take(later, size);
  return shuffle(chosen, random);
}

// ---------- 發牌：決定選項 ----------

export interface DealtCard {
  ref: CardRef;
  /**
   * 選項的 key，畫面再依目前語言轉成文字：
   * pattern、signal 是模式 id；insight 是題號；complexity 是「時間|空間」；tip 是選項的索引。
   * explain 是翻面卡，沒有選項。
   */
  options: string[];
  /** 正確答案在 options 裡的位置 */
  answer: number;
}

export interface DealContext {
  /** 題庫裡所有題目；干擾選項也會從沒做過的題目取 */
  problems: ReadonlyMap<number, Problem>;
  explanations: Readonly<Record<number, string>>;
  /** 每個小知識有幾個選項（第 0 個是正解） */
  tipOptionCounts: ReadonlyMap<string, number>;
}

type DealtCardOptions = Pick<DealtCard, 'options' | 'answer'>;

/** 正解加上幾個不重複的干擾選項，打亂順序 */
function withDistractors(correct: string, candidates: readonly string[], random: Random, count = 3): DealtCardOptions {
  const distractors = [...new Set(shuffle(candidates, random))].filter((c) => c !== correct).slice(0, count);
  const options = shuffle([correct, ...distractors], random);
  return { options, answer: options.indexOf(correct) };
}

const COMMON_TIMES = ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)', 'O(n^2)'];
const COMMON_SPACES = ['O(1)', 'O(n)'];

export function complexityKey({ time, space }: Complexity): string {
  return `${time}|${space}`;
}

export function splitComplexityKey(key: string): Complexity {
  const [time, space] = key.split('|');
  return { time, space };
}

/** 干擾選項只換時間或只換空間其中一個，而且取自同一個模式的題目，看起來才合理 */
function complexityOptions(problem: Problem, context: DealContext, random: Random): DealtCardOptions | null {
  const correct = parseComplexity(context.explanations[problem.id] ?? '');
  if (!correct) return null;
  const times = new Set(COMMON_TIMES);
  const spaces = new Set(COMMON_SPACES);
  for (const other of context.problems.values()) {
    if (other.pattern !== problem.pattern || other.id === problem.id) continue;
    const parsed = parseComplexity(context.explanations[other.id] ?? '');
    if (!parsed) continue;
    times.add(parsed.time);
    spaces.add(parsed.space);
  }
  const candidates = [
    ...[...times].filter((t) => t !== correct.time).map((time) => complexityKey({ time, space: correct.space })),
    ...[...spaces].filter((s) => s !== correct.space).map((space) => complexityKey({ time: correct.time, space })),
  ];
  return withDistractors(complexityKey(correct), candidates, random);
}

/** 干擾選項優先用同一個模式其他題目的關鍵觀察，比較需要真的記得 */
function insightOptions(problem: Problem, context: DealContext, random: Random): DealtCardOptions | null {
  if (!context.explanations[problem.id]) return null;
  const others = [...context.problems.values()].filter((p) => p.id !== problem.id && context.explanations[p.id]);
  const samePattern = shuffle(
    others.filter((p) => p.pattern === problem.pattern),
    random,
  );
  const rest = shuffle(
    others.filter((p) => p.pattern !== problem.pattern),
    random,
  );
  const distractors = [...samePattern, ...rest].slice(0, 3).map((p) => String(p.id));
  const options = shuffle([String(problem.id), ...distractors], random);
  return { options, answer: options.indexOf(String(problem.id)) };
}

/**
 * 容易混淆、線索也說得通的模式，不互相當干擾選項。
 * 例如「合併 k 個排序串列」是堆積也是串列題，Kadane 也常被歸在一維 DP。
 */
const CONFUSABLE_PAIRS: [PatternId, PatternId][] = [
  ['dp-1d', 'dp-2d'],
  ['dp-1d', 'greedy'],
  ['dp-2d', 'intervals'],
  ['greedy', 'intervals'],
  ['graphs', 'adv-graphs'],
  ['graphs', 'trees'],
  ['trees', 'tries'],
  ['tries', 'backtracking'],
  ['heap', 'linked-list'],
  ['binary-search', 'two-pointers'],
  ['two-pointers', 'sliding-window'],
  ['arrays', 'bits'],
  ['math', 'bits'],
];

export function confusableWith(pattern: PatternId): Set<PatternId> {
  return new Set(CONFUSABLE_PAIRS.flatMap(([a, b]) => (a === pattern ? [b] : b === pattern ? [a] : [])));
}

function patternOptions(correct: PatternId, random: Random): DealtCardOptions {
  const skip = confusableWith(correct);
  return withDistractors(
    correct,
    PATTERN_ORDER.filter((p) => !skip.has(p)),
    random,
  );
}

/** 決定一張卡的選項；資料不足（例如題目被刪掉）時回傳 null，這張卡就略過 */
export function dealCard(ref: CardRef, context: DealContext, random: Random = Math.random): DealtCard | null {
  switch (ref.kind) {
    case 'signal':
      return { ref, ...patternOptions(ref.patternId, random) };
    case 'tip': {
      const count = context.tipOptionCounts.get(ref.tipId);
      if (!count) return null;
      const options = shuffle(
        Array.from({ length: count }, (_, i) => String(i)),
        random,
      );
      return { ref, options, answer: options.indexOf('0') };
    }
    default: {
      const problem = context.problems.get(ref.problemId);
      if (!problem) return null;
      switch (ref.kind) {
        case 'pattern':
          return { ref, ...patternOptions(problem.pattern, random) };
        case 'insight': {
          const dealt = insightOptions(problem, context, random);
          return dealt && { ref, ...dealt };
        }
        case 'complexity': {
          const dealt = complexityOptions(problem, context, random);
          return dealt && { ref, ...dealt };
        }
        case 'explain':
          return context.explanations[problem.id] ? { ref, options: [], answer: -1 } : null;
      }
    }
  }
}

/** 挑卡並發牌；發不出來的卡跳過 */
export function dealRound(
  deck: readonly CardRef[],
  states: ReadonlyMap<string, CardState>,
  today: Day,
  context: DealContext,
  random: Random = Math.random,
): DealtCard[] {
  return pickRound(deck, states, today, random).flatMap((ref) => dealCard(ref, context, random) ?? []);
}

/** 今天複習了幾張卡（同一張卡答兩次算兩次） */
export function reviewsOn(reviews: readonly { day: Day }[], day: Day): number {
  return reviews.filter((r) => r.day === day).length;
}
