import type { BoardDoc } from 'dsa-whiteboard';
import type { PatternId } from '../patterns';
import { BUILTIN_PROBLEMS } from '../problems';

// 參考板書：每一題一塊做好的白板，逐步播放時字幕就是參考講解的那一句。
// 講解的五句（關鍵想法 → 用什麼結構 → 範例 → 複雜度 → 邊界情況）各是一步，
// 「範例」那句前面可以多幾步把範例走完。
// 每種題型一個檔案（BOARDS 是那個題型每一題的板書），第一次打開那個題型的參考板書時才載入。

export type ReferenceBoards = Record<number, () => BoardDoc>;

export const REFERENCE_BOARD_LOADERS: Record<PatternId, () => Promise<{ BOARDS: ReferenceBoards }>> = {
  arrays: () => import('./arrays'),
  'two-pointers': () => import('./twoPointers'),
  'sliding-window': () => import('./slidingWindow'),
  stack: () => import('./stack'),
  'binary-search': () => import('./binarySearch'),
  'linked-list': () => import('./linkedList'),
  trees: () => import('./trees'),
  tries: () => import('./tries'),
  heap: () => import('./heap'),
  backtracking: () => import('./backtracking'),
  graphs: () => import('./graphs'),
  'adv-graphs': () => import('./advGraphs'),
  'dp-1d': () => import('./dp1d'),
  'dp-2d': () => import('./dp2d'),
  greedy: () => import('./greedy'),
  intervals: () => import('./intervals'),
  math: () => import('./math'),
  bits: () => import('./bits'),
};

const PATTERN_OF: ReadonlyMap<number, PatternId> = new Map(BUILTIN_PROBLEMS.map((problem) => [problem.id, problem.pattern]));

/** 有參考板書的題目：題庫裡每一題都有（測試檢查），自己新增的題目沒有 */
export const REFERENCE_BOARD_IDS: ReadonlySet<number> = new Set(PATTERN_OF.keys());

export async function loadReferenceBoard(problemId: number): Promise<BoardDoc | undefined> {
  const pattern = PATTERN_OF.get(problemId);
  if (!pattern) return undefined;
  const { BOARDS } = await REFERENCE_BOARD_LOADERS[pattern]();
  return BOARDS[problemId]?.();
}
