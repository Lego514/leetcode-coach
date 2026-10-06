import type { BoardColor, CellColor } from '../../../shared/constants';
import type { BoardDoc, BoardElement } from '../../../shared/protocol';

// 白板的資料模型與純函式：建立元件、排版尺寸、指標吸附、移動、刪除、箭頭端點、橡皮擦、復原紀錄。
// 畫面只負責把這裡算好的結果畫出來，所以這些邏輯都能單獨測試。
// 座標都是「白板座標」：縮放 100% 時等於 CSS 像素。

export type { BoardColor, BoardDoc, BoardElement, CellColor };
export type ElementOf<T extends BoardElement['type']> = Extract<BoardElement, { type: T }>;
/** 有位置、可以拖曳的元件（箭頭和筆跡以外的） */
export type Placed = Exclude<BoardElement, { type: 'arrow' } | { type: 'stroke' }>;

export interface Point {
  x: number;
  y: number;
}

export interface Rect extends Point {
  w: number;
  h: number;
}

// ---------- 排版尺寸 ----------

/** 陣列、堆疊、二維陣列的一格 */
export const CELL = 44;
/** 字典和表格的一格比較寬，放得下 key */
export const WIDE_CELL = 64;
/** 元件上方的名稱 */
export const LABEL_H = 22;
/** 陣列下方的索引、二維陣列的欄號 */
export const INDEX_H = 18;
/** 二維陣列左邊的列號 */
export const ROW_INDEX_W = 22;
export const POINTER_W = 40;
export const POINTER_H = 34;
export const NODE_D = 48;
export const LIST_NODE_W = 76;
export const LIST_NODE_H = 44;
/** 指標放開時離格子多近才吸附 */
export const SNAP_DISTANCE = 48;

export const EMPTY_DOC: BoardDoc = { elements: [] };

export function isPlaced(el: BoardElement): el is Placed {
  return el.type !== 'arrow' && el.type !== 'stroke';
}

/** 陣列和佇列有索引，指標可以吸附 */
export function isIndexed(el: BoardElement): el is ElementOf<'list'> {
  return el.type === 'list' && (el.variant === 'array' || el.variant === 'queue');
}

function tableCellWidth(el: ElementOf<'table'>): number {
  return el.variant === 'grid' ? CELL : WIDE_CELL;
}

function columns(el: ElementOf<'table'>): number {
  return Math.max(1, ...el.rows.map((r) => r.length));
}

/**
 * 結構化元件的大小由內容決定，畫面照這個尺寸畫；
 * 文字和變數的高度會隨內容變，畫面量到的大小傳進 measured。
 */
export function sizeOf(el: Placed, measured?: { w: number; h: number }): { w: number; h: number } {
  switch (el.type) {
    case 'list': {
      const n = Math.max(1, el.items.length);
      if (el.variant === 'stack') return { w: CELL, h: LABEL_H + n * CELL };
      return { w: n * CELL, h: LABEL_H + CELL + (isIndexed(el) ? INDEX_H : 0) };
    }
    case 'table': {
      const cols = columns(el);
      const cellW = tableCellWidth(el);
      if (el.variant === 'grid') return { w: ROW_INDEX_W + cols * cellW, h: LABEL_H + INDEX_H + el.rows.length * CELL };
      return { w: cols * cellW, h: LABEL_H + el.rows.length * CELL };
    }
    case 'node':
      return el.variant === 'list' ? { w: LIST_NODE_W, h: LIST_NODE_H } : { w: NODE_D, h: NODE_D };
    case 'pointer':
      return { w: POINTER_W, h: POINTER_H };
    case 'text':
      return measured ?? { w: el.w, h: el.variant === 'heading' ? 36 : 44 };
    case 'var':
      return measured ?? { w: 110, h: 36 };
    case 'shape':
      return { w: el.w, h: el.h };
  }
}

export type Sizes = ReadonlyMap<string, { w: number; h: number }>;

/** 元件在白板上的範圍；指標吸附時位置由陣列決定 */
export function rectOf(doc: BoardDoc, el: Placed, sizes?: Sizes): Rect {
  const { x, y } = el.type === 'pointer' ? pointerPosition(doc, el) : el;
  return { x, y, ...sizeOf(el, sizes?.get(el.id)) };
}

export function findElement(doc: BoardDoc, id: string): BoardElement | undefined {
  return doc.elements.find((el) => el.id === id);
}

// ---------- 指標 ----------

/** 陣列第 index 格的位置 */
export function cellRect(list: ElementOf<'list'>, index: number): Rect {
  return { x: list.x + index * CELL, y: list.y + LABEL_H, w: CELL, h: CELL };
}

/** 吸附的指標放在索引下面；同一格有好幾個指標時往下疊 */
export function pointerPosition(doc: BoardDoc, pointer: ElementOf<'pointer'>): Point {
  const target = pointer.attach && findElement(doc, pointer.attach.id);
  if (!pointer.attach || !target || !isIndexed(target)) return { x: pointer.x, y: pointer.y };
  const { index } = pointer.attach;
  const sameCell = doc.elements.filter(
    (el): el is ElementOf<'pointer'> =>
      el.type === 'pointer' && el.attach?.id === target.id && Math.min(el.attach.index, target.items.length - 1) === Math.min(index, target.items.length - 1),
  );
  const stack = Math.max(0, sameCell.findIndex((el) => el.id === pointer.id));
  const cell = cellRect(target, Math.min(index, Math.max(0, target.items.length - 1)));
  return { x: cell.x + CELL / 2 - POINTER_W / 2, y: cell.y + CELL + INDEX_H + 2 + stack * POINTER_H };
}

/** 指標放在 at 時，最近的陣列格子；太遠就不吸附 */
export function snapTarget(doc: BoardDoc, at: Point): { id: string; index: number } | undefined {
  const tip = { x: at.x + POINTER_W / 2, y: at.y };
  let best: { id: string; index: number; distance: number } | undefined;
  for (const el of doc.elements) {
    if (!isIndexed(el)) continue;
    for (let index = 0; index < el.items.length; index += 1) {
      const cell = cellRect(el, index);
      const distance = Math.hypot(cell.x + CELL / 2 - tip.x, cell.y + CELL + INDEX_H - tip.y);
      if (distance <= SNAP_DISTANCE && (!best || distance < best.distance)) best = { id: el.id, index, distance };
    }
  }
  return best && { id: best.id, index: best.index };
}

/** 用方向鍵把吸附的指標往左右移一格 */
export function shiftPointer(doc: BoardDoc, id: string, delta: number): BoardDoc {
  return mapElement(doc, id, (el) => {
    if (el.type !== 'pointer' || !el.attach) return el;
    const target = findElement(doc, el.attach.id);
    if (!target || !isIndexed(target)) return el;
    const index = Math.min(Math.max(0, el.attach.index + delta), target.items.length - 1);
    return { ...el, attach: { ...el.attach, index } };
  });
}

// ---------- 建立元件 ----------

export type PaletteKind =
  | 'heading'
  | 'text'
  | 'code'
  | 'sticky'
  | 'array'
  | 'pointer'
  | 'stack'
  | 'queue'
  | 'dict'
  | 'set'
  | 'grid'
  | 'var'
  | 'treeNode'
  | 'listNode'
  | 'graphNode'
  | 'table';

export type PaletteGroup = 'text' | 'linear' | 'lookup' | 'nodes' | 'table';

export const PALETTE: { group: PaletteGroup; kinds: PaletteKind[] }[] = [
  { group: 'text', kinds: ['heading', 'text', 'code', 'sticky'] },
  { group: 'linear', kinds: ['array', 'pointer', 'stack', 'queue'] },
  { group: 'lookup', kinds: ['dict', 'set', 'grid', 'var'] },
  { group: 'nodes', kinds: ['treeNode', 'listNode', 'graphNode'] },
  { group: 'table', kinds: ['table'] },
];

/** 文字類元件的預設內容依介面語言 */
export type DefaultTexts = Record<'heading' | 'text' | 'sticky', string>;

export function newId(doc: BoardDoc): string {
  const taken = new Set(doc.elements.map((el) => el.id));
  for (;;) {
    const id = Math.random().toString(36).slice(2, 10);
    if (id && !taken.has(id)) return id;
  }
}

/** 新元件，左上角放在 at；名稱和內容先放常見的例子，雙擊就能改 */
export function createElement(kind: PaletteKind, at: Point, id: string, texts: DefaultTexts): Placed {
  const placed = { id, x: Math.round(at.x), y: Math.round(at.y) };
  switch (kind) {
    case 'heading':
    case 'text':
    case 'sticky':
      return { type: 'text', ...placed, variant: kind, text: texts[kind], w: kind === 'heading' ? 240 : 200 };
    case 'code':
      return { type: 'text', ...placed, variant: 'code', text: 'for i in range(n):\n    pass', w: 260 };
    case 'array':
      return { type: 'list', ...placed, variant: 'array', label: 'nums', items: ['1', '2', '3', '4'] };
    case 'stack':
      return { type: 'list', ...placed, variant: 'stack', label: 'stack', items: ['1', '2'] };
    case 'queue':
      return { type: 'list', ...placed, variant: 'queue', label: 'queue', items: ['1', '2'] };
    case 'set':
      return { type: 'list', ...placed, variant: 'set', label: 'seen', items: ['a', 'b'] };
    case 'pointer':
      return { type: 'pointer', ...placed, name: 'i' };
    case 'dict':
      return { type: 'table', ...placed, variant: 'dict', label: 'count', rows: [['a', '1'], ['b', '2']] };
    case 'grid':
      return { type: 'table', ...placed, variant: 'grid', label: 'grid', rows: [['0', '0', '0'], ['0', '0', '0'], ['0', '0', '0']] };
    case 'table':
      return { type: 'table', ...placed, variant: 'table', label: '', rows: [['i', 'j', 'ans'], ['', '', '']] };
    case 'var':
      return { type: 'var', ...placed, name: 'ans', value: '0' };
    case 'treeNode':
      return { type: 'node', ...placed, variant: 'tree', value: '1' };
    case 'listNode':
      return { type: 'node', ...placed, variant: 'list', value: '1' };
    case 'graphNode':
      return { type: 'node', ...placed, variant: 'graph', value: 'A' };
  }
}

function overlaps(a: Rect, b: Rect, margin: number): boolean {
  return a.x < b.x + b.w + margin && b.x < a.x + a.w + margin && a.y < b.y + b.h + margin && b.y < a.y + a.h + margin;
}

/**
 * 放在 center 附近：中間有東西時，一圈一圈往外找第一個空位，免得蓋住原本的元件。
 * 找不到就放在正中間。
 */
export function placeAtCenter(doc: BoardDoc, el: Placed, center: Point, sizes?: Sizes): Placed {
  const { w, h } = sizeOf(el);
  const taken = doc.elements.filter(isPlaced).map((other) => rectOf(doc, other, sizes));
  const step = 32;
  for (let ring = 0; ring <= 12; ring += 1) {
    for (let dy = -ring; dy <= ring; dy += 1) {
      for (let dx = -ring; dx <= ring; dx += 1) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== ring) continue;
        const spot = { x: Math.round(center.x - w / 2 + dx * step), y: Math.round(center.y - h / 2 + dy * step), w, h };
        if (!taken.some((r) => overlaps(spot, r, 12))) return { ...el, x: spot.x, y: spot.y };
      }
    }
  }
  return { ...el, x: Math.round(center.x - w / 2), y: Math.round(center.y - h / 2) };
}

/** 常用的指標名稱，新指標用第一個還沒用過的 */
const POINTER_NAMES = ['i', 'j', 'k', 'l', 'r', 'lo', 'hi', 'mid', 'slow', 'fast'];

export const POINTER_TONES = ['blue', 'orange', 'green', 'purple'] as const;
export type PointerTone = (typeof POINTER_TONES)[number];

/** 指標的顏色由名字決定：i 藍、j 橘、k 綠、l 紫，其他名字依字元算出固定的顏色 */
export function pointerTone(name: string): PointerTone {
  const known = POINTER_NAMES.indexOf(name);
  const index = known >= 0 ? known : [...name].reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  return POINTER_TONES[index % POINTER_TONES.length];
}

export function nextPointerName(doc: BoardDoc): string {
  const used = new Set(doc.elements.flatMap((el) => (el.type === 'pointer' ? [el.name] : [])));
  return POINTER_NAMES.find((name) => !used.has(name)) ?? `p${used.size + 1}`;
}

// ---------- 修改 ----------

function mapElement(doc: BoardDoc, id: string, fn: (el: BoardElement) => BoardElement): BoardDoc {
  return { elements: doc.elements.map((el) => (el.id === id ? fn(el) : el)) };
}

export function addElement(doc: BoardDoc, el: BoardElement): BoardDoc {
  return { elements: [...doc.elements, el] };
}

export function updateElement<T extends BoardElement>(doc: BoardDoc, id: string, patch: Partial<T>): BoardDoc {
  return mapElement(doc, id, (el) => ({ ...el, ...patch }) as BoardElement);
}

/**
 * 移動選取的元件。被拖動的指標會脫離陣列，從畫面上的位置開始移動；
 * 陣列移動時，吸附在上面的指標自然跟著走。
 */
export function moveElements(doc: BoardDoc, ids: ReadonlySet<string>, dx: number, dy: number): BoardDoc {
  return {
    elements: doc.elements.map((el) => {
      if (!ids.has(el.id) || !isPlaced(el)) return el;
      if (el.type === 'pointer') {
        const at = pointerPosition(doc, el);
        return { ...el, x: Math.round(at.x + dx), y: Math.round(at.y + dy), attach: undefined };
      }
      return { ...el, x: Math.round(el.x + dx), y: Math.round(el.y + dy) };
    }),
  };
}

/** 拖完指標放開時，靠近陣列格子就吸附上去 */
export function dropPointer(doc: BoardDoc, id: string): BoardDoc {
  const el = findElement(doc, id);
  if (!el || el.type !== 'pointer' || el.attach) return doc;
  const target = snapTarget(doc, el);
  return target ? updateElement<ElementOf<'pointer'>>(doc, id, { attach: target }) : doc;
}

/** 刪除元件，連在上面的箭頭一起刪；吸附在被刪陣列上的指標留在原地 */
export function removeElements(doc: BoardDoc, ids: ReadonlySet<string>): BoardDoc {
  const touches = (end: ElementOf<'arrow'>['from']) => 'id' in end && ids.has(end.id);
  return {
    elements: doc.elements
      .filter((el) => !ids.has(el.id) && !(el.type === 'arrow' && (touches(el.from) || touches(el.to))))
      .map((el) => {
        if (el.type !== 'pointer' || !el.attach || !ids.has(el.attach.id)) return el;
        const at = pointerPosition(doc, el);
        return { ...el, x: Math.round(at.x), y: Math.round(at.y), attach: undefined };
      }),
  };
}

/** 複製選取的元件，往右下錯開；回傳新文件和新元件的 id */
export function duplicateElements(doc: BoardDoc, ids: ReadonlySet<string>): { doc: BoardDoc; ids: string[] } {
  let next = doc;
  const created: string[] = [];
  for (const el of doc.elements) {
    if (!ids.has(el.id) || !isPlaced(el)) continue;
    const at = el.type === 'pointer' ? pointerPosition(doc, el) : el;
    const id = newId(next);
    next = addElement(next, { ...el, id, x: at.x + 24, y: at.y + 24, ...(el.type === 'pointer' ? { attach: undefined } : {}) } as Placed);
    created.push(id);
  }
  return { doc: next, ids: created };
}

export const MAX_CELLS = 64;

/** 吸附在這個陣列上的指標，依新的位置移動 */
function mapPointers(doc: BoardDoc, listId: string, fn: (index: number) => number): BoardDoc {
  return {
    elements: doc.elements.map((p) =>
      p.type === 'pointer' && p.attach?.id === listId ? { ...p, attach: { ...p.attach, index: fn(p.attach.index) } } : p,
    ),
  };
}

/** 底色跟格子對齊；沒有任何一格上色時就不存 */
function normalizeColors(colors: (CellColor | null)[] | undefined, length: number): (CellColor | null)[] | undefined {
  if (!colors) return undefined;
  const aligned = Array.from({ length }, (_, i) => colors[i] ?? null);
  return aligned.some(Boolean) ? aligned : undefined;
}

/** 在 index 插入一個空格；原本在這格之後的指標跟著值往後一格 */
export function insertCell(doc: BoardDoc, id: string, index: number): BoardDoc {
  const el = findElement(doc, id);
  if (!el || el.type !== 'list' || el.items.length >= MAX_CELLS) return doc;
  const at = Math.min(Math.max(0, index), el.items.length);
  const items = [...el.items.slice(0, at), '', ...el.items.slice(at)];
  const colors = el.colors && normalizeColors([...el.colors.slice(0, at), null, ...el.colors.slice(at)], items.length);
  const next = updateElement<ElementOf<'list'>>(doc, id, { items, colors });
  return mapPointers(next, id, (i) => (i >= at ? i + 1 : i));
}

/** 刪掉第 index 格，至少留一格；後面的指標往前一格，指著被刪那格的留在原位 */
export function deleteCell(doc: BoardDoc, id: string, index: number): BoardDoc {
  const el = findElement(doc, id);
  if (!el || el.type !== 'list' || el.items.length <= 1 || index < 0 || index >= el.items.length) return doc;
  const items = el.items.filter((_, i) => i !== index);
  const colors = el.colors && normalizeColors(el.colors.filter((_, i) => i !== index), items.length);
  const next = updateElement<ElementOf<'list'>>(doc, id, { items, colors });
  return mapPointers(next, id, (i) => Math.min(i > index ? i - 1 : i, items.length - 1));
}

/** 幫一格上底色；color 是 null 時拿掉 */
export function setCellColor(doc: BoardDoc, id: string, index: number, color: CellColor | null): BoardDoc {
  const el = findElement(doc, id);
  if (!el || el.type !== 'list' || index < 0 || index >= el.items.length) return doc;
  const colors = Array.from({ length: el.items.length }, (_, i) => (i === index ? color : (el.colors?.[i] ?? null)));
  return updateElement<ElementOf<'list'>>(doc, id, { colors: normalizeColors(colors, el.items.length) });
}

/** 陣列、堆疊、佇列、集合在最後加一格或減一格 */
export function resizeList(doc: BoardDoc, id: string, delta: 1 | -1): BoardDoc {
  const el = findElement(doc, id);
  if (!el || el.type !== 'list') return doc;
  return delta > 0 ? insertCell(doc, id, el.items.length) : deleteCell(doc, id, el.items.length - 1);
}

/** 在陣列的某一格加一個指標，名字用下一個還沒用過的 */
export function addPointerAt(doc: BoardDoc, listId: string, index: number, id: string): BoardDoc {
  return addElement(doc, { type: 'pointer', id, x: 0, y: 0, name: nextPointerName(doc), attach: { id: listId, index } });
}

/** 表格加減一列或一欄，至少留一列一欄 */
export function resizeTable(doc: BoardDoc, id: string, axis: 'row' | 'col', delta: 1 | -1): BoardDoc {
  const el = findElement(doc, id);
  if (!el || el.type !== 'table') return doc;
  const cols = columns(el);
  let rows = el.rows.map((r) => [...r, ...Array<string>(cols - r.length).fill('')]);
  if (axis === 'row') {
    rows = delta > 0 ? [...rows, Array<string>(cols).fill('')].slice(0, 26) : rows.slice(0, Math.max(1, rows.length - 1));
  } else {
    rows = rows.map((r) => (delta > 0 ? [...r, ''].slice(0, 26) : r.slice(0, Math.max(1, r.length - 1))));
  }
  return updateElement<ElementOf<'table'>>(doc, id, { rows });
}

// ---------- 箭頭與筆跡 ----------

export type ArrowEnd = ElementOf<'arrow'>['from'];

/** 從中心往目標的方向，找出碰到元件邊緣的點；樹和圖的節點是圓形 */
function edgePoint(rect: Rect, round: boolean, toward: Point): Point {
  const cx = rect.x + rect.w / 2;
  const cy = rect.y + rect.h / 2;
  const dx = toward.x - cx;
  const dy = toward.y - cy;
  if (dx === 0 && dy === 0) return { x: cx, y: cy };
  if (round) {
    const t = 1 / Math.hypot(dx / (rect.w / 2), dy / (rect.h / 2));
    return { x: cx + dx * t, y: cy + dy * t };
  }
  const scale = Math.min(dx === 0 ? Infinity : rect.w / 2 / Math.abs(dx), dy === 0 ? Infinity : rect.h / 2 / Math.abs(dy));
  return { x: cx + dx * scale, y: cy + dy * scale };
}

/** 箭頭兩端的座標；連在元件上的那一端停在元件邊緣。元件不見了就回傳 null */
export function arrowPoints(doc: BoardDoc, arrow: ElementOf<'arrow'>, sizes?: Sizes): [Point, Point] | null {
  const resolve = (end: ArrowEnd) => {
    if (!('id' in end)) return { point: end, rect: null as Rect | null, round: false };
    const el = findElement(doc, end.id);
    if (!el || !isPlaced(el)) return null;
    const rect = rectOf(doc, el, sizes);
    const round = (el.type === 'node' && el.variant !== 'list') || (el.type === 'shape' && el.variant === 'ellipse');
    return { point: { x: rect.x + rect.w / 2, y: rect.y + rect.h / 2 }, rect, round };
  };
  const from = resolve(arrow.from);
  const to = resolve(arrow.to);
  if (!from || !to) return null;
  const start = from.rect ? edgePoint(from.rect, from.round, to.point) : from.point;
  const end = to.rect ? edgePoint(to.rect, to.round, from.point) : to.point;
  return [start, end];
}

/** 筆跡加一個點；離上一個點太近就略過，存成整數讓資料小一點 */
export function appendPoint(points: number[], p: Point, minGap = 2): number[] {
  const x = Math.round(p.x);
  const y = Math.round(p.y);
  const n = points.length;
  if (n >= 2 && Math.hypot(points[n - 2] - x, points[n - 1] - y) < minGap) return points;
  return [...points, x, y];
}

function distanceToSegment(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSq = dx * dx + dy * dy;
  const t = lengthSq === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lengthSq));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

/** 橡皮擦碰到的筆跡和箭頭 */
export function hitInk(doc: BoardDoc, at: Point, radius: number, sizes?: Sizes): string[] {
  const hits: string[] = [];
  for (const el of doc.elements) {
    if (el.type === 'stroke') {
      const pts = el.points;
      for (let i = 0; i + 1 < pts.length; i += 2) {
        const a = { x: pts[i], y: pts[i + 1] };
        const b = i + 3 < pts.length ? { x: pts[i + 2], y: pts[i + 3] } : a;
        if (distanceToSegment(at, a, b) <= radius) {
          hits.push(el.id);
          break;
        }
      }
    } else if (el.type === 'arrow') {
      const ends = arrowPoints(doc, el, sizes);
      if (ends && distanceToSegment(at, ends[0], ends[1]) <= radius) hits.push(el.id);
    } else if (el.type === 'shape' && distanceToShapeEdge(el, at) <= radius) {
      hits.push(el.id);
    }
  }
  return hits;
}

/** 點到框線的距離；框裡面是空的，只算框線 */
export function distanceToShapeEdge(shape: ElementOf<'shape'>, p: Point): number {
  const a = shape.w / 2;
  const b = shape.h / 2;
  const dx = p.x - (shape.x + a);
  const dy = p.y - (shape.y + b);
  if (shape.variant === 'ellipse') {
    // 換算成單位圓上的距離，再乘回短軸，橢圓不太扁時夠準
    return Math.abs(Math.hypot(dx / a, dy / b) - 1) * Math.min(a, b);
  }
  const outX = Math.abs(dx) - a;
  const outY = Math.abs(dy) - b;
  if (outX > 0 || outY > 0) return Math.hypot(Math.max(outX, 0), Math.max(outY, 0));
  return Math.min(-outX, -outY);
}

export type ShapeVariant = ElementOf<'shape'>['variant'];

/** 從 from 拖到 to 畫出來的框；square 時畫成正方形或正圓 */
export function shapeFromDrag(id: string, variant: ShapeVariant, from: Point, to: Point, color: BoardColor, square = false): ElementOf<'shape'> {
  let w = Math.abs(to.x - from.x);
  let h = Math.abs(to.y - from.y);
  if (square) w = h = Math.max(w, h);
  const x = to.x < from.x ? from.x - w : from.x;
  const y = to.y < from.y ? from.y - h : from.y;
  return { type: 'shape', id, variant, x: Math.round(x), y: Math.round(y), w: Math.round(Math.max(8, w)), h: Math.round(Math.max(8, h)), color };
}

/** 拖右下角調整框的大小 */
export function resizeShape(doc: BoardDoc, id: string, w: number, h: number): BoardDoc {
  return updateElement<ElementOf<'shape'>>(doc, id, { w: Math.round(Math.max(8, w)), h: Math.round(Math.max(8, h)) });
}

/** 幫選取的框換顏色；其他元件沒有顏色，不受影響 */
export function recolorShapes(doc: BoardDoc, ids: ReadonlySet<string>, color: BoardColor): BoardDoc {
  return { elements: doc.elements.map((el) => (el.type === 'shape' && ids.has(el.id) ? { ...el, color } : el)) };
}

/** 所有內容的範圍，「全部顯示」用；白板是空的時回傳 null */
export function contentBounds(doc: BoardDoc, sizes?: Sizes): Rect | null {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  const include = (x: number, y: number) => {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  };
  for (const el of doc.elements) {
    if (isPlaced(el)) {
      const r = rectOf(doc, el, sizes);
      include(r.x, r.y);
      include(r.x + r.w, r.y + r.h);
    } else if (el.type === 'stroke') {
      for (let i = 0; i + 1 < el.points.length; i += 2) include(el.points[i], el.points[i + 1]);
    } else {
      const ends = arrowPoints(doc, el, sizes);
      if (ends) for (const p of ends) include(p.x, p.y);
    }
  }
  return minX === Infinity ? null : { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

// ---------- 復原紀錄 ----------

export interface History {
  past: BoardDoc[];
  present: BoardDoc;
  future: BoardDoc[];
}

const HISTORY_LIMIT = 100;

export function initHistory(doc: BoardDoc): History {
  return { past: [], present: doc, future: [] };
}

/** 一次完整的修改：可以復原 */
export function commit(history: History, doc: BoardDoc): History {
  if (doc === history.present) return history;
  return { past: [...history.past, history.present].slice(-HISTORY_LIMIT), present: doc, future: [] };
}

/** 拖曳中的即時更新：不進復原紀錄，拖曳開始時先 checkpoint 一次 */
export function replace(history: History, doc: BoardDoc): History {
  return { ...history, present: doc };
}

export function checkpoint(history: History): History {
  return { past: [...history.past, history.present].slice(-HISTORY_LIMIT), present: history.present, future: [] };
}

export function undo(history: History): History {
  const prev = history.past[history.past.length - 1];
  if (!prev) return history;
  return { past: history.past.slice(0, -1), present: prev, future: [history.present, ...history.future] };
}

export function redo(history: History): History {
  const next = history.future[0];
  if (!next) return history;
  return { past: [...history.past, history.present], present: next, future: history.future.slice(1) };
}

/** 拖曳開始時 checkpoint，結果卻沒有改變（只是點一下）時，把多出來的紀錄拿掉 */
export function dropEmptyCheckpoint(history: History): History {
  const last = history.past[history.past.length - 1];
  return last === history.present ? { ...history, past: history.past.slice(0, -1) } : history;
}

export function colorVar(color: BoardColor): string {
  return color === 'ink' ? 'var(--ink)' : `var(--board-${color})`;
}
