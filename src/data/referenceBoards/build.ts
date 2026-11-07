import type { BoardDoc, BoardElement, BoardStep } from 'dsa-whiteboard';
import { EXPLANATIONS_EN } from '../explanations';

// 畫參考板書用的小工具：一行寫出一個元件，位置用白板的座標（格子 44、名稱 22、索引 18、指標 34）。
// 字幕直接從參考講解拿（lines），講解改了板書跟著變。

export type Cell = string;
export type CellColor = 'yellow' | 'green' | 'blue' | 'red' | 'purple' | 'gray';
type Colors = (CellColor | null)[];

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
export const heap = (id: string, x: number, y: number, label: string, items: Cell[]): BoardElement => ({ type: 'list', id, x, y, variant: 'heap', label, items, order: 'min' });
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
export const grid = (id: string, x: number, y: number, label: string, rows: Cell[][]): BoardElement => ({ type: 'table', id, x, y, variant: 'grid', label, rows });
export const tree = (id: string, x: number, y: number, label: string, nodes: (Cell | null)[], colors?: Colors): BoardElement => ({
  type: 'tree',
  id,
  x,
  y,
  label,
  nodes,
  ...withColors(colors),
});
export const graph = (
  id: string,
  x: number,
  y: number,
  label: string,
  nodes: Cell[],
  edges: { a: number; b: number }[],
  colors?: Colors,
): BoardElement => ({ type: 'graph', id, x, y, label, nodes, edges, directed: true, ...withColors(colors) });
export const recursion = (id: string, x: number, y: number, label: string, nodes: { text: Cell; parent: number; edge?: string; color?: CellColor }[]): BoardElement => ({
  type: 'recursion',
  id,
  x,
  y,
  label,
  nodes,
});
export const intervals = (id: string, x: number, y: number, label: string, items: [number, number, CellColor?][]): BoardElement => ({
  type: 'intervals',
  id,
  x,
  y,
  label,
  items: items.map(([a, b, color]) => ({ a, b, ...(color ? { color } : {}) })),
});
/** 一維的 DP：一列格子，at 是正在填的那一格，steps 是往回看幾格（例如硬幣的面額） */
export const dp1 = (id: string, x: number, y: number, label: string, cells: Cell[], at: number, steps: number[]): BoardElement => ({
  type: 'dp',
  id,
  x,
  y,
  label,
  cells: [cells],
  deps: 'steps',
  steps,
  at: { r: 0, c: at },
});
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

/** 一步一步的畫面變成一塊白板：最後一步的畫面就是白板上的東西 */
export function board(steps: { caption: string; elements: BoardElement[] }[]): BoardDoc {
  const recorded: BoardStep[] = steps.map((step, i) => ({ id: `s${i + 1}`, caption: step.caption, elements: step.elements }));
  return { elements: steps[steps.length - 1].elements, steps: recorded };
}
