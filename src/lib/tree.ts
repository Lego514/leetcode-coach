import { PATTERN_ORDER, type PatternId } from '../data/patterns';
import type { Problem } from '../data/problems';
import type { Day } from './dates';
import { conquests, patternLevels, READY_RECALL, type PatternLevel } from './motivation';
import { recallOn, type Rating, type ReviewState } from './srs';

// 演算法樹：題型是樹枝（照學習路線由下往上長），會的題目是葉子，快忘的葉子變黃，征服的題目結果實，精通的題型開花。
// 這裡只算樹形和每一題的樣子，畫圖在 components/AlgorithmTree.tsx

type StateLike = Pick<ReviewState, 'interval'> & Partial<Pick<ReviewState, 'stability' | 'lastReview'>> & { lastRating: Rating };

interface Point {
  x: number;
  y: number;
}

export interface Branch {
  pattern: PatternId;
  problems: Problem[];
  /** -1 往左長，1 往右 */
  side: -1 | 1;
  start: Point;
  control: Point;
  end: Point;
}

/** 樹的座標範圍（SVG 的 viewBox），樹幹在 x = 210 */
export const TREE_VIEW = { x: 10, y: 84, width: 400, height: 436 };
export const TRUNK_X = 210;
export const GROUND = 488;
const TOP = 112;

/** 固定的亂數，同一份清單每次畫出來的樹形都一樣 */
function seeded(seed: number) {
  let s = seed * 9301 + 49297;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

/** 題型照路線由下往上接在樹幹上，左右交錯；題目多的樹枝長，越上面越短、越往上翹 */
export function treeLayout(problems: readonly Problem[]): Branch[] {
  const patterns = PATTERN_ORDER.filter((id) => problems.some((p) => p.pattern === id));
  const last = Math.max(1, patterns.length - 1);
  return patterns.map((pattern, i) => {
    const list = problems.filter((p) => p.pattern === pattern);
    const random = seeded(i + 7);
    const y = GROUND - 40 - i * ((GROUND - 40 - TOP) / last);
    const side = i % 2 === 0 ? -1 : 1;
    const length = (62 + Math.min(list.length, 16) * 5.6) * (1 - 0.38 * (i / last)) + random() * 8;
    const angle = ((18 + i * 2.1 + random() * 6) * Math.PI) / 180;
    const start = { x: TRUNK_X + side * 3, y };
    const end = { x: TRUNK_X + side * Math.cos(angle) * length, y: y - Math.sin(angle) * length };
    const control = { x: start.x + (end.x - start.x) * 0.55, y: start.y + (end.y - start.y) * 0.25 - 10 };
    return { pattern, problems: list, side, start, control, end };
  });
}

/** 樹枝上 t（0 到 1）的位置和方向（弧度） */
export function pointOn(b: Branch, t: number): Point & { angle: number } {
  const u = 1 - t;
  const dx = 2 * u * (b.control.x - b.start.x) + 2 * t * (b.end.x - b.control.x);
  const dy = 2 * u * (b.control.y - b.start.y) + 2 * t * (b.end.y - b.control.y);
  return {
    x: u * u * b.start.x + 2 * u * t * b.control.x + t * t * b.end.x,
    y: u * u * b.start.y + 2 * u * t * b.control.y + t * t * b.end.y,
    angle: Math.atan2(dy, dx),
  };
}

/**
 * 一題在樹上的樣子：
 * bud 還沒做（虛線上的小點）、sprout 小芽（上次靠提示，重寫出來才長葉）、
 * leaf 葉子（上次自己解出），依現在還記得的機率分 fresh、good、ok（都算會了）、fading（快忘了）、faded（大概忘了）
 */
export type LeafShade = 'fresh' | 'good' | 'ok' | 'fading' | 'faded';
export type TreeNode = { kind: 'bud' } | { kind: 'sprout' } | { kind: 'leaf'; shade: LeafShade; recall: number; fruit: boolean };

export function shadeOf(recall: number): LeafShade {
  if (recall >= 0.9) return 'fresh';
  if (recall >= 0.8) return 'good';
  if (recall >= READY_RECALL) return 'ok';
  // FSRS 的遺忘曲線尾巴很長：只做過一次、一年沒碰大約還有 46%，所以 55% 以下就算枯葉
  if (recall >= 0.55) return 'fading';
  return 'faded';
}

export interface TreeState {
  nodes: Map<number, TreeNode>;
  levels: Map<PatternId, PatternLevel>;
  /** 現在會的題數 */
  ready: number;
  /** 快忘了、該複習的葉子 */
  fading: number[];
  fruits: number;
  blooms: number;
}

export function treeState(
  problems: readonly Problem[],
  progress: ReadonlyMap<number, StateLike>,
  attempts: Parameters<typeof conquests>[0],
  today: Day,
): TreeState {
  const conquered = new Set(conquests(attempts).map((c) => c.problemId));
  const nodes = new Map<number, TreeNode>();
  let ready = 0;
  let fruits = 0;
  const fading: number[] = [];
  for (const p of problems) {
    const state = progress.get(p.id);
    if (!state) nodes.set(p.id, { kind: 'bud' });
    else if (state.lastRating !== 'solo') nodes.set(p.id, { kind: 'sprout' });
    else {
      const recall = recallOn(state, today) ?? 1;
      const shade = shadeOf(recall);
      const fruit = conquered.has(p.id);
      nodes.set(p.id, { kind: 'leaf', shade, recall, fruit });
      if (recall >= READY_RECALL) ready += 1;
      else fading.push(p.id);
      if (fruit) fruits += 1;
    }
  }
  const levels = new Map(patternLevels(problems, progress, today).map((p) => [p.pattern, p.level]));
  return { nodes, levels, ready, fading, fruits, blooms: [...levels.values()].filter((l) => l === 3).length };
}

/** 從 before 到 after 剛長出來的題目：空位變小芽或葉子、小芽變葉子 */
export function grownBetween(before: ReadonlyMap<number, TreeNode>, after: ReadonlyMap<number, TreeNode>): Set<number> {
  const grown = new Set<number>();
  for (const [id, node] of after) {
    const was = before.get(id)?.kind;
    if ((was === 'bud' && node.kind !== 'bud') || (was === 'sprout' && node.kind === 'leaf')) grown.add(id);
  }
  return grown;
}
