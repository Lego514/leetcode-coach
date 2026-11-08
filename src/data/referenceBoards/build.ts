import type { BoardDoc, BoardElement, BoardStep } from 'dsa-whiteboard';
import { EXPLANATIONS_EN } from '../explanations';

// 畫參考板書用的小工具：一行寫出一個元件，位置用白板的座標（格子 44、名稱 22、索引 18、指標 34）。
// 字幕直接從參考講解拿（lines），講解改了板書跟著變。

export type Cell = string;
export type CellColor = 'yellow' | 'green' | 'blue' | 'red' | 'purple' | 'gray';
export type Colors = (CellColor | null)[];

const withColors = (colors?: Colors) => (colors ? { colors } : {});

export const array = (id: string, x: number, y: number, label: string, items: Cell[], colors?: Colors): BoardElement => ({
  type: 'list',
  id,
  x,
  y,
  variant: 'array',
  label,
  items,
  ...withColors(colors),
});
export const stack = (id: string, x: number, y: number, label: string, items: Cell[]): BoardElement => ({ type: 'list', id, x, y, variant: 'stack', label, items });
export const queue = (id: string, x: number, y: number, label: string, items: Cell[]): BoardElement => ({ type: 'list', id, x, y, variant: 'queue', label, items });
export const heap = (id: string, x: number, y: number, label: string, items: Cell[], order: 'min' | 'max' = 'min'): BoardElement => ({
  type: 'list',
  id,
  x,
  y,
  variant: 'heap',
  label,
  items,
  order,
});
export const linked = (id: string, x: number, y: number, label: string, items: Cell[], links?: ('next' | 'prev' | 'none')[]): BoardElement => ({
  type: 'list',
  id,
  x,
  y,
  variant: 'linked',
  label,
  items,
  ...(links ? { links } : {}),
});
/** 鏈結串列，可以上色（colors）、尾巴接回第幾個節點（cycle） */
export const chain = (id: string, x: number, y: number, label: string, items: Cell[], options: { links?: ('next' | 'prev' | 'none')[]; colors?: Colors; cycle?: number } = {}): BoardElement => ({
  type: 'list',
  id,
  x,
  y,
  variant: 'linked',
  label,
  items,
  ...options,
});
export const variable = (id: string, x: number, y: number, name: string, value: string): BoardElement => ({ type: 'var', id, x, y, name, value });
export const pointer = (id: string, name: string, target: string, index: number): BoardElement => ({ type: 'pointer', id, x: 0, y: 0, name, attach: { id: target, index } });
/** 鏈結串列第一個節點左邊的 null（prev = None） */
export const pointerAtNone = (id: string, name: string, target: string): BoardElement => ({
  type: 'pointer',
  id,
  x: 0,
  y: 0,
  name,
  attach: { id: target, index: 0, none: true },
});
/** 框住同一個陣列上兩個指標之間的格子（滑動視窗、二分搜尋的範圍） */
export const range = (id: string, from: string, to: string): BoardElement => ({ type: 'range', id, from, to, color: 'orange' });
export const dict = (id: string, x: number, y: number, label: string, rows: [Cell, Cell][]): BoardElement => ({ type: 'table', id, x, y, variant: 'dict', label, rows });
/** 一般的表格（沒有索引）：例如第一列是字母、第二列是次數 */
export const table = (id: string, x: number, y: number, label: string, rows: Cell[][]): BoardElement => ({ type: 'table', id, x, y, variant: 'table', label, rows });
export const grid = (id: string, x: number, y: number, label: string, rows: Cell[][]): BoardElement => ({ type: 'table', id, x, y, variant: 'grid', label, rows });
/**
 * LeetCode 的樹（層序，null 的子節點不寫）換成白板的排法（第 i 個節點的子節點在 2i+1、2i+2）。
 * 例如 [5,4,8,11,null,13,4,7,2,null,null,5,1] 的 5、1 是右邊那個 4 的子節點，不是 13 的
 */
export function leetTree(values: (Cell | null)[]): (Cell | null)[] {
  const out: (Cell | null)[] = [];
  if (values.length === 0 || values[0] === null) return [null];
  out[0] = values[0];
  // 還沒接上子節點的節點（白板上的位置），照層序排
  const open: number[] = [0];
  let next = 1;
  while (open.length > 0 && next < values.length) {
    const at = open.shift()!;
    for (const side of [1, 2]) {
      if (next >= values.length) break;
      const value = values[next++];
      if (value === null) continue;
      out[2 * at + side] = value;
      open.push(2 * at + side);
    }
  }
  return Array.from({ length: out.length }, (_, i) => out[i] ?? null);
}
export const tree = (id: string, x: number, y: number, label: string, nodes: (Cell | null)[], colors?: Colors): BoardElement => ({
  type: 'tree',
  id,
  x,
  y,
  label,
  nodes,
  ...withColors(colors),
});
export const graph = (id: string, x: number, y: number, label: string, nodes: Cell[], edges: { a: number; b: number; mark?: boolean; w?: string }[], colors?: Colors): BoardElement => ({
  type: 'graph',
  id,
  x,
  y,
  label,
  nodes,
  edges,
  directed: true,
  ...withColors(colors),
});
/** 無向圖（邊沒有箭頭）；mark 是走過的邊 */
export const ugraph = (id: string, x: number, y: number, label: string, nodes: Cell[], edges: { a: number; b: number; mark?: boolean; w?: string }[], colors?: Colors): BoardElement => ({
  type: 'graph',
  id,
  x,
  y,
  label,
  nodes,
  edges,
  directed: false,
  ...withColors(colors),
});
/** 遞迴樹的一個呼叫：ret 是回傳值，cut 是剪掉（或備忘錄直接回傳）的一枝 */
export interface Call {
  text: Cell;
  parent: number;
  edge?: string;
  ret?: string;
  cut?: boolean;
  color?: CellColor;
}
export const recursion = (id: string, x: number, y: number, label: string, nodes: Call[]): BoardElement => ({
  type: 'recursion',
  id,
  x,
  y,
  label,
  nodes,
});
/** 區間畫在同一條數線上：每個是 [a, b, 顏色, 要移除]；sweep 是掃描線停在哪個值 */
export const intervals = (id: string, x: number, y: number, label: string, items: [number, number, CellColor?, boolean?][], sweep?: number): BoardElement => ({
  type: 'intervals',
  id,
  x,
  y,
  label,
  items: items.map(([a, b, color, removed]) => ({ a, b, ...(color ? { color } : {}), ...(removed ? { removed } : {}) })),
  ...(sweep === undefined ? {} : { sweep }),
});
/** 一維的 DP：一列格子，at 是正在填的那一格，steps 是往回看幾格（例如硬幣的面額） */
export const dp1 = (id: string, x: number, y: number, label: string, cells: Cell[], at: number, steps: number[], colHead?: Cell[]): BoardElement => ({
  type: 'dp',
  id,
  x,
  y,
  label,
  cells: [cells],
  deps: 'steps',
  steps,
  at: { r: 0, c: at },
  ...(colHead ? { colHead } : {}),
});
/** 並查集：parent[i] 是 i 的父節點，根指向自己；path 是最近一次 find 走過的節點 */
export const unionFind = (id: string, x: number, y: number, label: string, parent: number[], path?: number[]): BoardElement => ({
  type: 'unionFind',
  id,
  x,
  y,
  label,
  parent,
  ...(path ? { path } : {}),
});
/** 字典樹：放進去的字，at 是正在找的字或前綴 */
export const trie = (id: string, x: number, y: number, label: string, words: string[], at?: string): BoardElement => ({ type: 'trie', id, x, y, label, words, ...(at ? { at } : {}) });
/** 一排位元，第一格是最高位 */
export const bits = (id: string, x: number, y: number, label: string, items: Cell[], colors?: Colors): BoardElement => ({
  type: 'list',
  id,
  x,
  y,
  variant: 'bits',
  label,
  items,
  ...withColors(colors),
});
export const set = (id: string, x: number, y: number, label: string, items: Cell[]): BoardElement => ({ type: 'list', id, x, y, variant: 'set', label, items });
/** 一維的 DP，從前一格（prev1）、前兩格（prev2）或前面每一格（before）算來；colHead 是標在每一格上面的字 */
export const dpRow = (id: string, x: number, y: number, label: string, cells: Cell[], at: number, deps: 'prev1' | 'prev2' | 'before', colHead?: Cell[]): BoardElement => ({
  type: 'dp',
  id,
  x,
  y,
  label,
  cells: [cells],
  deps,
  at: { r: 0, c: at },
  ...(colHead ? { colHead } : {}),
});
/** 二維的 DP 表：at 是正在填的那一格，deps 是它從哪幾格算來；order up 是從最下面一列往上填 */
export const dp2 = (
  id: string,
  x: number,
  y: number,
  label: string,
  cells: Cell[][],
  options: { at?: { r: number; c: number }; deps?: 'upLeft' | 'upLeftDiag' | 'diag' | 'upDiag' | 'downLeft'; rowHead?: Cell[]; colHead?: Cell[]; order?: 'up' } = {},
): BoardElement => ({ type: 'dp', id, x, y, label, cells, ...options });
export const note = (id: string, x: number, y: number, text: string, w = 240): BoardElement => ({ type: 'text', id, x, y, variant: 'sticky', text, w });
export const complexity = (id: string, x: number, y: number, time: string, timeWhy: string, space: string, spaceWhy: string): BoardElement => ({
  type: 'complexity',
  id,
  x,
  y,
  title: 'Complexity',
  time,
  timeWhy,
  space,
  spaceWhy,
});

/** 這一題參考講解的五句：關鍵想法、用什麼結構、範例、複雜度、邊界情況 */
export function lines(problemId: number): [string, string, string, string, string] {
  return EXPLANATIONS_EN[problemId].split('\n') as [string, string, string, string, string];
}

export interface Scene {
  caption: string;
  elements: BoardElement[];
}

/**
 * 最常見的板書，講解的五句各一步：open 是關鍵想法那一步的畫面、setup 是用什麼結構、
 * before 是「範例」那句之前多走的幾步、result 是範例走完的畫面；
 * 複雜度那一步在 result 上加 cx，最後一步再加邊界情況的便利貼 edge
 */
export function walk(problemId: number, scenes: { open: BoardElement[]; setup: BoardElement[]; before?: Scene[]; result: BoardElement[]; cx: BoardElement; edge: BoardElement }): BoardDoc {
  const [insight, structure, example, cost, edgeCase] = lines(problemId);
  const { open, setup, before = [], result, cx, edge } = scenes;
  return board([
    { caption: insight, elements: open },
    { caption: structure, elements: setup },
    ...before,
    { caption: example, elements: result },
    { caption: cost, elements: [...result, cx] },
    { caption: edgeCase, elements: [...result, cx, edge] },
  ]);
}

/** 一步一步的畫面變成一塊白板：最後一步的畫面就是白板上的東西 */
export function board(steps: { caption: string; elements: BoardElement[] }[]): BoardDoc {
  const recorded: BoardStep[] = steps.map((step, i) => ({ id: `s${i + 1}`, caption: step.caption, elements: step.elements }));
  return { elements: steps[steps.length - 1].elements, steps: recorded };
}
