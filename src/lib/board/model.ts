import type { BoardColor, CellColor } from '../../../shared/constants';
import type { BoardDoc, BoardElement } from '../../../shared/protocol';

// 白板的資料模型與純函式：建立元件、排版尺寸、指標吸附、移動、刪除、箭頭端點、橡皮擦、復原紀錄。
// 畫面只負責把這裡算好的結果畫出來，所以這些邏輯都能單獨測試。
// 座標都是「白板座標」：縮放 100% 時等於 CSS 像素。

export type { BoardColor, BoardDoc, BoardElement, CellColor };
export type ElementOf<T extends BoardElement['type']> = Extract<BoardElement, { type: T }>;
/** 有位置、可以拖曳的元件（箭頭、範圍框和筆跡以外的） */
export type Placed = Exclude<BoardElement, { type: 'arrow' } | { type: 'stroke' } | { type: 'range' }>;

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
/** 鏈結串列兩個節點之間留給連線箭頭的空間 */
export const LINK_GAP = 28;
/** 鏈結串列尾端的「→ null」 */
export const NULL_W = 36;
/** 鏈結串列有環時，節點下方畫回頭箭頭的空間 */
export const CYCLE_H = 24;
/** 二元樹的節點 */
export const TREE_D = 40;
/** 二元樹依中序排開，相鄰兩個節點的水平距離 */
export const TREE_GAP = 50;
/** 二元樹一層的高度；指標放在節點上方，兩層之間要放得下 */
export const TREE_LEVEL = 76;
/** 根節點上方留一點空間給名稱 */
export const TREE_TOP = LABEL_H + 12;
/** 最多 6 層：第 0 到 62 個位置 */
export const TREE_MAX_NODES = 63;
/** 圖的節點和樹的一樣大 */
export const GRAPH_D = TREE_D;
export const GRAPH_MAX_NODES = 20;
export const GRAPH_MAX_EDGES = 60;
/** 指標放開時離格子多近才吸附 */
export const SNAP_DISTANCE = 48;

export const EMPTY_DOC: BoardDoc = { elements: [] };

export function isPlaced(el: BoardElement): el is Placed {
  return el.type !== 'arrow' && el.type !== 'stroke' && el.type !== 'range';
}

/** 陣列和佇列有索引，格子下面標 0、1、2… */
export function isIndexed(el: BoardElement): el is ElementOf<'list'> {
  return el.type === 'list' && (el.variant === 'array' || el.variant === 'queue');
}

export function isLinked(el: BoardElement): el is ElementOf<'list'> {
  return el.type === 'list' && el.variant === 'linked';
}

/** 指標可以吸附的元件：陣列、佇列、鏈結串列的格子，和二元樹、圖的節點 */
export function holdsPointers(el: BoardElement | undefined): el is ElementOf<'list'> | ElementOf<'tree'> | ElementOf<'graph'> {
  return !!el && (isIndexed(el) || isLinked(el) || el.type === 'tree' || el.type === 'graph');
}

/** 二元樹和圖：每個節點的中心（相對於元件左上角） */
export function nodeCenters(el: ElementOf<'tree'> | ElementOf<'graph'>): Map<number, Point> {
  if (el.type === 'tree') return treeLayout(el).centers;
  return new Map(graphLayout(el).centers.map((c, i) => [i, c]));
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
      if (el.variant === 'linked') {
        // 有環時尾巴的回頭箭頭畫在下面；沒有環時尾巴接一個 null
        const tail = el.cycle === undefined ? LINK_GAP + NULL_W : 0;
        return { w: n * CELL + (n - 1) * LINK_GAP + tail, h: LABEL_H + CELL + (el.cycle === undefined ? 0 : CYCLE_H) };
      }
      return { w: n * CELL, h: LABEL_H + CELL + (isIndexed(el) ? INDEX_H : 0) };
    }
    case 'tree': {
      const { w, h } = treeLayout(el);
      return { w, h };
    }
    case 'graph': {
      const { w, h } = graphLayout(el);
      return { w, h };
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

/** 陣列或鏈結串列第 index 格的位置 */
export function cellRect(list: ElementOf<'list'>, index: number): Rect {
  const step = list.variant === 'linked' ? CELL + LINK_GAP : CELL;
  return { x: list.x + index * step, y: list.y + LABEL_H, w: CELL, h: CELL };
}

/** 格子下方從哪裡開始放指標：陣列空出索引那一列，有環的鏈結串列空出回頭箭頭 */
function belowCells(list: ElementOf<'list'>): number {
  if (list.variant === 'linked') return (list.cycle === undefined ? 0 : CYCLE_H) + 4;
  return INDEX_H + 2;
}

/** 指標吸附在二元樹或圖上時放在節點上方、箭頭朝下，免得蓋住連線 */
export function pointsDown(doc: BoardDoc, pointer: ElementOf<'pointer'>): boolean {
  const target = pointer.attach && findElement(doc, pointer.attach.id);
  if (target?.type === 'tree') return hasTreeNode(target, pointer.attach!.index);
  return target?.type === 'graph' && pointer.attach!.index < target.nodes.length;
}

/** 指標吸附的那一格；陣列被刪短時落在最後一格 */
function slotOf(target: ElementOf<'list'> | ElementOf<'tree'> | ElementOf<'graph'>, index: number): number {
  return target.type === 'list' ? Math.min(index, Math.max(0, target.items.length - 1)) : index;
}

/** 吸附的指標放在格子下面（二元樹是節點上面）；同一格有好幾個指標時往外疊 */
export function pointerPosition(doc: BoardDoc, pointer: ElementOf<'pointer'>): Point {
  const target = pointer.attach && findElement(doc, pointer.attach.id);
  if (!pointer.attach || !holdsPointers(target)) return { x: pointer.x, y: pointer.y };
  const slot = slotOf(target, pointer.attach.index);
  const sameCell = doc.elements.filter(
    (el): el is ElementOf<'pointer'> => el.type === 'pointer' && el.attach?.id === target.id && slotOf(target, el.attach.index) === slot,
  );
  const stack = Math.max(0, sameCell.findIndex((el) => el.id === pointer.id));
  if (target.type !== 'list') {
    const center = nodeCenters(target).get(slot);
    if (!center) return { x: pointer.x, y: pointer.y };
    return { x: target.x + center.x - POINTER_W / 2, y: target.y + center.y - TREE_D / 2 - POINTER_H - 2 - stack * POINTER_H };
  }
  const cell = cellRect(target, slot);
  return { x: cell.x + CELL / 2 - POINTER_W / 2, y: cell.y + CELL + belowCells(target) + stack * POINTER_H };
}

/** 指標放在 at 時，最近的格子或樹節點；太遠就不吸附 */
export function snapTarget(doc: BoardDoc, at: Point): { id: string; index: number } | undefined {
  // 還沒吸附的指標箭頭朝上，尖端在最上面
  const tip = { x: at.x + POINTER_W / 2, y: at.y };
  let best: { id: string; index: number; distance: number } | undefined;
  const consider = (id: string, index: number, x: number, y: number) => {
    const distance = Math.hypot(x - tip.x, y - tip.y);
    if (distance <= SNAP_DISTANCE && (!best || distance < best.distance)) best = { id, index, distance };
  };
  for (const el of doc.elements) {
    if (el.type === 'tree' || el.type === 'graph') {
      for (const [index, c] of nodeCenters(el)) consider(el.id, index, el.x + c.x, el.y + c.y);
    } else if (isIndexed(el) || isLinked(el)) {
      for (let index = 0; index < el.items.length; index += 1) {
        const cell = cellRect(el, index);
        consider(el.id, index, cell.x + CELL / 2, cell.y + CELL + belowCells(el) - 2);
      }
    }
  }
  return best && { id: best.id, index: best.index };
}

/** 用方向鍵把吸附在陣列或串列上的指標往左右移一格 */
export function shiftPointer(doc: BoardDoc, id: string, delta: number): BoardDoc {
  return mapElement(doc, id, (el) => {
    if (el.type !== 'pointer' || !el.attach) return el;
    const target = findElement(doc, el.attach.id);
    // 圖的節點排成一圈：往前往後繞著走
    if (target?.type === 'graph') {
      const n = target.nodes.length;
      return { ...el, attach: { ...el.attach, index: (((el.attach.index + delta) % n) + n) % n } };
    }
    if (!target || !(isIndexed(target) || isLinked(target))) return el;
    const index = Math.min(Math.max(0, el.attach.index + delta), target.items.length - 1);
    return { ...el, attach: { ...el.attach, index } };
  });
}

export type TreeDirection = 'left' | 'right' | 'up' | 'down';

/** 二元樹上往左子節點、右子節點、父節點走一步，down 是往下（先左後右）；走不過去就是 null */
export function treeStep(tree: ElementOf<'tree'>, index: number, dir: TreeDirection): number | null {
  if (dir === 'down') return treeStep(tree, index, 'left') ?? treeStep(tree, index, 'right');
  const next = dir === 'up' ? treeParent(index) : 2 * index + (dir === 'left' ? 1 : 2);
  return hasTreeNode(tree, next) ? next : null;
}

/** 用方向鍵把吸附在二元樹上的指標移到子節點或父節點 */
export function stepTreePointer(doc: BoardDoc, id: string, dir: TreeDirection): BoardDoc {
  return mapElement(doc, id, (el) => {
    if (el.type !== 'pointer' || !el.attach) return el;
    const target = findElement(doc, el.attach.id);
    if (target?.type !== 'tree') return el;
    const index = treeStep(target, el.attach.index, dir);
    return index === null ? el : { ...el, attach: { ...el.attach, index } };
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
  | 'binaryTree'
  | 'linkedList'
  | 'graph'
  | 'treeNode'
  | 'listNode'
  | 'graphNode'
  | 'table';

export type PaletteGroup = 'linear' | 'nodes' | 'lookup' | 'notes';

/**
 * 元件庫依刷題時用到的頻率排，每組剛好一列四個（節點三個）。
 * 標題併進文字（選取後可以切換），單一的樹節點和串列節點換成整棵樹、整條串列；舊白板上的照樣顯示。
 */
export const PALETTE: { group: PaletteGroup; kinds: PaletteKind[] }[] = [
  { group: 'linear', kinds: ['array', 'pointer', 'stack', 'queue'] },
  { group: 'nodes', kinds: ['binaryTree', 'linkedList', 'graph'] },
  { group: 'lookup', kinds: ['dict', 'set', 'grid', 'table'] },
  { group: 'notes', kinds: ['text', 'code', 'sticky', 'var'] },
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
    case 'linkedList':
      return { type: 'list', ...placed, variant: 'linked', label: 'head', items: ['1', '2', '3'] };
    case 'graph':
      return {
        type: 'graph',
        ...placed,
        label: 'graph',
        nodes: ['0', '1', '2', '3'],
        edges: [
          { a: 0, b: 1 },
          { a: 0, b: 2 },
          { a: 1, b: 3 },
        ],
      };
    case 'binaryTree':
      return { type: 'tree', ...placed, label: 'root', nodes: ['1', '2', '3'] };
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
  return { ...el, ...freeSpot(doc, w, h, center, sizes) };
}

/** w × h 的東西放在 center 附近、不會蓋到別人的左上角；一圈一圈往外找，找不到就放正中間 */
export function freeSpot(doc: BoardDoc, w: number, h: number, center: Point, sizes?: Sizes): Point {
  const taken = doc.elements.filter(isPlaced).map((other) => rectOf(doc, other, sizes));
  const step = 32;
  for (let ring = 0; ring <= 12; ring += 1) {
    for (let dy = -ring; dy <= ring; dy += 1) {
      for (let dx = -ring; dx <= ring; dx += 1) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== ring) continue;
        const spot = { x: Math.round(center.x - w / 2 + dx * step), y: Math.round(center.y - h / 2 + dy * step), w, h };
        if (!taken.some((r) => overlaps(spot, r, 12))) return { x: spot.x, y: spot.y };
      }
    }
  }
  return { x: Math.round(center.x - w / 2), y: Math.round(center.y - h / 2) };
}

/**
 * 元件變大後（例如用文字建立一整棵樹）蓋到別的東西時，挪到附近最近的空位；
 * 沒蓋到就不動。吸附在它上面的指標跟著走，不算在擋路的東西裡。
 */
export function settleElement(doc: BoardDoc, id: string, sizes?: Sizes): BoardDoc {
  const el = findElement(doc, id);
  if (!el || !isPlaced(el)) return doc;
  const others = {
    ...doc,
    elements: doc.elements.filter((other) => other.id !== id && !(other.type === 'pointer' && other.attach?.id === id)),
  };
  const { w, h } = sizeOf(el);
  const moved = placeAtCenter(others, el, { x: el.x + w / 2, y: el.y + h / 2 }, sizes);
  return moved.x === el.x && moved.y === el.y ? doc : updateElement(doc, id, { x: moved.x, y: moved.y });
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
  return { ...doc, elements: doc.elements.map((el) => (el.id === id ? fn(el) : el)) };
}

export function addElement(doc: BoardDoc, el: BoardElement): BoardDoc {
  return { ...doc, elements: [...doc.elements, el] };
}

export function updateElement<T extends BoardElement>(doc: BoardDoc, id: string, patch: Partial<T>): BoardDoc {
  return mapElement(doc, id, (el) => ({ ...el, ...patch }) as BoardElement);
}

/**
 * 移動選取的東西。單獨拖動的指標會脫離陣列，從畫面上的位置開始移動；
 * 指標和它的陣列一起移動時維持吸附。筆跡整條平移，箭頭連在元件上的那端跟著元件走。
 */
export function moveElements(doc: BoardDoc, ids: ReadonlySet<string>, dx: number, dy: number): BoardDoc {
  const shift = (end: ArrowEnd): ArrowEnd => ('id' in end ? end : { x: Math.round(end.x + dx), y: Math.round(end.y + dy) });
  return {
    ...doc,
    elements: doc.elements.map((el) => {
      if (!ids.has(el.id)) return el;
      switch (el.type) {
        case 'stroke':
          return { ...el, points: el.points.map((v, i) => Math.round(v + (i % 2 === 0 ? dx : dy))) };
        case 'arrow':
          return { ...el, from: shift(el.from), to: shift(el.to) };
        case 'range':
          return el;
        case 'pointer': {
          if (el.attach && ids.has(el.attach.id)) return el;
          const at = pointerPosition(doc, el);
          return { ...el, x: Math.round(at.x + dx), y: Math.round(at.y + dy), attach: undefined };
        }
        default:
          return { ...el, x: Math.round(el.x + dx), y: Math.round(el.y + dy) };
      }
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

/** 刪除元件，連在上面的箭頭、範圍框一起刪；吸附在被刪陣列上的指標留在原地 */
export function removeElements(doc: BoardDoc, ids: ReadonlySet<string>): BoardDoc {
  const touches = (end: ElementOf<'arrow'>['from']) => 'id' in end && ids.has(end.id);
  return {
    ...doc,
    elements: doc.elements
      .filter(
        (el) =>
          !ids.has(el.id) &&
          !(el.type === 'arrow' && (touches(el.from) || touches(el.to))) &&
          !(el.type === 'range' && (ids.has(el.from) || ids.has(el.to))),
      )
      .map((el) => {
        if (el.type !== 'pointer' || !el.attach || !ids.has(el.attach.id)) return el;
        const at = pointerPosition(doc, el);
        return { ...el, x: Math.round(at.x), y: Math.round(at.y), attach: undefined };
      }),
  };
}

const COPY_OFFSET = 24;

/**
 * 複製選取的東西，往右下錯開；回傳新文件和新東西的 id。
 * 陣列和它的指標一起複製時，新指標吸附在新陣列上；
 * 箭頭只有兩端連著的元件都有複製（或那端沒連元件）才複製，並接到新元件上。
 */
export function duplicateElements(doc: BoardDoc, ids: ReadonlySet<string>): { doc: BoardDoc; ids: string[] } {
  let next = doc;
  const created: string[] = [];
  const copies = new Map<string, string>();
  for (const el of doc.elements) {
    if (!ids.has(el.id) || !isPlaced(el)) continue;
    const id = newId(next);
    copies.set(el.id, id);
    let copy: Placed;
    if (el.type === 'pointer' && el.attach && ids.has(el.attach.id)) {
      copy = { ...el, id };
    } else if (el.type === 'pointer') {
      const at = pointerPosition(doc, el);
      copy = { ...el, id, x: at.x + COPY_OFFSET, y: at.y + COPY_OFFSET, attach: undefined };
    } else {
      copy = { ...el, id, x: el.x + COPY_OFFSET, y: el.y + COPY_OFFSET };
    }
    next = addElement(next, copy);
    created.push(id);
  }
  next = {
    ...next,
    elements: next.elements.map((el) =>
      el.type === 'pointer' && el.attach && created.includes(el.id) && copies.has(el.attach.id)
        ? { ...el, attach: { ...el.attach, id: copies.get(el.attach.id)! } }
        : el,
    ),
  };
  const copyEnd = (end: ArrowEnd): ArrowEnd | null => {
    if (!('id' in end)) return { x: end.x + COPY_OFFSET, y: end.y + COPY_OFFSET };
    const id = copies.get(end.id);
    return id ? { id } : null;
  };
  for (const el of doc.elements) {
    if (!ids.has(el.id)) continue;
    if (el.type === 'stroke') {
      const id = newId(next);
      next = addElement(next, { ...el, id, points: el.points.map((v) => v + COPY_OFFSET) });
      created.push(id);
    } else if (el.type === 'arrow') {
      const from = copyEnd(el.from);
      const to = copyEnd(el.to);
      if (!from || !to) continue;
      const id = newId(next);
      next = addElement(next, { ...el, id, from, to });
      created.push(id);
    } else if (el.type === 'range') {
      const from = copies.get(el.from);
      const to = copies.get(el.to);
      if (!from || !to) continue;
      const id = newId(next);
      next = addElement(next, { ...el, id, from, to });
      created.push(id);
    }
  }
  return { doc: next, ids: created };
}

// ---------- 範圍框 ----------

/** 範圍框框住的格子外面留一點空間 */
const RANGE_PAD = 5;

/** 兩個指標吸附在同一個陣列或串列上時，它們之間的格子；不是的話是 null */
function rangeCells(doc: BoardDoc, fromId: string, toId: string): { list: ElementOf<'list'>; lo: number; hi: number } | null {
  const a = findElement(doc, fromId);
  const b = findElement(doc, toId);
  if (a?.type !== 'pointer' || b?.type !== 'pointer' || !a.attach || !b.attach || a.attach.id !== b.attach.id) return null;
  const list = findElement(doc, a.attach.id);
  if (!list || !(isIndexed(list) || isLinked(list))) return null;
  const last = list.items.length - 1;
  const i = Math.min(a.attach.index, last);
  const j = Math.min(b.attach.index, last);
  return { list, lo: Math.min(i, j), hi: Math.max(i, j) };
}

/** 範圍框畫在哪裡；指標脫離陣列或不在同一個陣列上時不畫 */
export function rangeRect(doc: BoardDoc, range: ElementOf<'range'>): Rect | null {
  const cells = rangeCells(doc, range.from, range.to);
  if (!cells) return null;
  const a = cellRect(cells.list, cells.lo);
  const b = cellRect(cells.list, cells.hi);
  return { x: a.x - RANGE_PAD, y: a.y - RANGE_PAD, w: b.x + CELL - a.x + RANGE_PAD * 2, h: CELL + RANGE_PAD * 2 };
}

/** 選取的剛好是同一個陣列上的兩個指標時，回傳這兩個指標，可以幫它們加範圍框 */
export function rangePair(doc: BoardDoc, ids: ReadonlySet<string>): [string, string] | null {
  if (ids.size !== 2) return null;
  const [a, b] = [...ids];
  const already = doc.elements.some((el) => el.type === 'range' && ((el.from === a && el.to === b) || (el.from === b && el.to === a)));
  return !already && rangeCells(doc, a, b) ? [a, b] : null;
}

function distanceToRectEdge(rect: Rect, p: Point): number {
  return distanceToShapeEdge({ type: 'shape', id: 'r', variant: 'rect', color: 'ink', ...rect }, p);
}

export const MAX_CELLS = 64;

/** 吸附在這個陣列上的指標，依新的位置移動 */
function mapPointers(doc: BoardDoc, listId: string, fn: (index: number) => number): BoardDoc {
  return {
    ...doc,
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

export type Link = 'next' | 'prev' | 'none';

/** 鏈結串列每一段連線的方向；沒存的都是往後 */
export function linksOf(list: ElementOf<'list'>): Link[] {
  return Array.from({ length: Math.max(0, list.items.length - 1) }, (_, g) => list.links?.[g] ?? 'next');
}

/** 全部都往後時不存 */
function normalizeLinks(links: Link[]): Link[] | undefined {
  return links.some((link) => link !== 'next') ? links : undefined;
}

/** 在 index 插入一個空格；原本在這格之後的指標跟著值往後一格 */
export function insertCell(doc: BoardDoc, id: string, index: number): BoardDoc {
  const el = findElement(doc, id);
  if (!el || el.type !== 'list' || el.items.length >= MAX_CELLS) return doc;
  const at = Math.min(Math.max(0, index), el.items.length);
  const items = [...el.items.slice(0, at), '', ...el.items.slice(at)];
  const colors = el.colors && normalizeColors([...el.colors.slice(0, at), null, ...el.colors.slice(at)], items.length);
  const patch: Partial<ElementOf<'list'>> = { items, colors };
  if (el.variant === 'linked') {
    // 新節點和後面那個之間是一段新的往後連線；環接到的節點在後面時跟著往後
    const links = linksOf(el);
    patch.links = normalizeLinks([...links.slice(0, at), 'next' as Link, ...links.slice(at)].slice(0, items.length - 1));
    if (el.cycle !== undefined && el.cycle >= at) patch.cycle = el.cycle + 1;
  }
  const next = updateElement<ElementOf<'list'>>(doc, id, patch);
  return mapPointers(next, id, (i) => (i >= at ? i + 1 : i));
}

/** 刪掉第 index 格，至少留一格；後面的指標往前一格，指著被刪那格的留在原位 */
export function deleteCell(doc: BoardDoc, id: string, index: number): BoardDoc {
  const el = findElement(doc, id);
  if (!el || el.type !== 'list' || el.items.length <= 1 || index < 0 || index >= el.items.length) return doc;
  const items = el.items.filter((_, i) => i !== index);
  const colors = el.colors && normalizeColors(el.colors.filter((_, i) => i !== index), items.length);
  const patch: Partial<ElementOf<'list'>> = { items, colors };
  if (el.variant === 'linked') {
    // 拿掉這個節點往後的那段連線（最後一個節點就拿掉往前的那段）
    const gone = Math.min(index, el.items.length - 2);
    patch.links = normalizeLinks(linksOf(el).filter((_, g) => g !== gone));
    if (el.cycle !== undefined) patch.cycle = Math.min(el.cycle > index ? el.cycle - 1 : el.cycle, items.length - 1);
  }
  const next = updateElement<ElementOf<'list'>>(doc, id, patch);
  return mapPointers(next, id, (i) => Math.min(i > index ? i - 1 : i, items.length - 1));
}

/** 點兩個節點之間的連線：往後 → 反過來 → 斷開 → 往後 */
export function toggleLink(doc: BoardDoc, id: string, gap: number): BoardDoc {
  const el = findElement(doc, id);
  if (!el || !isLinked(el) || gap < 0 || gap >= el.items.length - 1) return doc;
  const order: Link[] = ['next', 'prev', 'none'];
  const links = linksOf(el);
  links[gap] = order[(order.indexOf(links[gap]) + 1) % order.length];
  return updateElement<ElementOf<'list'>>(doc, id, { links: normalizeLinks(links) });
}

/** 尾巴接回第 index 個節點，變成有環的串列；undefined 是拿掉環 */
export function setCycle(doc: BoardDoc, id: string, index: number | undefined): BoardDoc {
  const el = findElement(doc, id);
  if (!el || !isLinked(el)) return doc;
  const cycle = index === undefined ? undefined : Math.min(Math.max(0, index), el.items.length - 1);
  return updateElement<ElementOf<'list'>>(doc, id, { cycle });
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

// ---------- 二元樹 ----------

export function treeParent(index: number): number {
  return index <= 0 ? -1 : Math.floor((index - 1) / 2);
}

export function treeDepth(index: number): number {
  return Math.floor(Math.log2(index + 1));
}

export function hasTreeNode(tree: ElementOf<'tree'>, index: number): boolean {
  return index >= 0 && index < tree.nodes.length && tree.nodes[index] !== null && tree.nodes[index] !== undefined;
}

export interface TreeLayout {
  /** 每個節點的中心，相對於元件左上角 */
  centers: Map<number, Point>;
  w: number;
  h: number;
}

/**
 * 依中序排開：每個節點的 x 是它在中序走訪的順序，y 是它在第幾層。
 * 左子樹一定在左邊、右子樹在右邊，不會重疊，偏一邊的樹也不會留一大片空白；
 * 二元搜尋樹的值由左到右剛好是排好序的。
 */
export function treeLayout(tree: ElementOf<'tree'>): TreeLayout {
  const centers = new Map<number, Point>();
  let rank = 0;
  let deepest = 0;
  const visit = (index: number) => {
    if (!hasTreeNode(tree, index)) return;
    visit(2 * index + 1);
    const depth = treeDepth(index);
    deepest = Math.max(deepest, depth);
    centers.set(index, { x: rank * TREE_GAP + TREE_GAP / 2, y: TREE_TOP + depth * TREE_LEVEL + TREE_D / 2 });
    rank += 1;
    visit(2 * index + 2);
  };
  visit(0);
  return { centers, w: Math.max(1, rank) * TREE_GAP, h: TREE_TOP + deepest * TREE_LEVEL + TREE_D };
}

/** 去掉尾端空的位置 */
function trimTree(nodes: (string | null)[]): (string | null)[] {
  let end = nodes.length;
  while (end > 1 && nodes[end - 1] === null) end -= 1;
  return nodes.slice(0, end);
}

function treeColors(colors: (CellColor | null)[] | undefined, nodes: (string | null)[]): (CellColor | null)[] | undefined {
  return normalizeColors(colors?.map((c, i) => (nodes[i] === null ? null : c)), nodes.length);
}

/** 在 parent 加左或右子節點（空的，等著輸入）；已經有了、超過 6 層就不加。回傳新節點的位置 */
export function addTreeChild(doc: BoardDoc, id: string, parent: number, side: 'left' | 'right'): { doc: BoardDoc; index: number } | null {
  const el = findElement(doc, id);
  if (el?.type !== 'tree' || !hasTreeNode(el, parent)) return null;
  const index = 2 * parent + (side === 'left' ? 1 : 2);
  if (index >= TREE_MAX_NODES || hasTreeNode(el, index)) return null;
  const nodes = Array.from({ length: Math.max(el.nodes.length, index + 1) }, (_, i) => (i === index ? '' : (el.nodes[i] ?? null)));
  return { doc: updateElement<ElementOf<'tree'>>(doc, id, { nodes, colors: treeColors(el.colors, nodes) }), index };
}

/** 這個節點和它底下的所有節點 */
export function subtreeOf(tree: ElementOf<'tree'>, index: number): number[] {
  const out: number[] = [];
  const queue = [index];
  while (queue.length > 0) {
    const i = queue.shift()!;
    if (!hasTreeNode(tree, i)) continue;
    out.push(i);
    queue.push(2 * i + 1, 2 * i + 2);
  }
  return out;
}

/** 刪掉這個節點連同它的子樹；根節點不能刪（要刪整棵樹就刪元件）。指著被刪節點的指標留在原地 */
export function deleteTreeNode(doc: BoardDoc, id: string, index: number): BoardDoc {
  const el = findElement(doc, id);
  if (el?.type !== 'tree' || index <= 0 || !hasTreeNode(el, index)) return doc;
  const gone = new Set(subtreeOf(el, index));
  const nodes = trimTree(el.nodes.map((v, i) => (gone.has(i) ? null : v)));
  const next = updateElement<ElementOf<'tree'>>(doc, id, { nodes, colors: treeColors(el.colors, nodes) });
  return {
    ...next,
    elements: next.elements.map((p) => {
      if (p.type !== 'pointer' || p.attach?.id !== id || !gone.has(p.attach.index)) return p;
      const at = pointerPosition(doc, p);
      return { ...p, x: Math.round(at.x), y: Math.round(at.y), attach: undefined };
    }),
  };
}

/** 幫樹的一個節點上底色；color 是 null 時拿掉 */
export function setNodeColor(doc: BoardDoc, id: string, index: number, color: CellColor | null): BoardDoc {
  const el = findElement(doc, id);
  if (el?.type !== 'tree' || !hasTreeNode(el, index)) return doc;
  const colors = el.nodes.map((_, i) => (i === index ? color : (el.colors?.[i] ?? null)));
  return updateElement<ElementOf<'tree'>>(doc, id, { colors: treeColors(colors, el.nodes) });
}

// ---------- 圖 ----------

export type GraphEdge = ElementOf<'graph'>['edges'][number];

export interface GraphLayout {
  /** 第 i 個節點的中心，相對於元件左上角 */
  centers: Point[];
  w: number;
  h: number;
}

/**
 * 節點平均排在一個圓上，從正上方開始順時針；節點越多圓越大。
 * 相鄰兩個節點之間留得下箭頭和權重，邊才不會擠成一團。
 */
export function graphLayout(graph: ElementOf<'graph'>): GraphLayout {
  const n = graph.nodes.length;
  const radius = n <= 1 ? 0 : Math.max(72, (n * (GRAPH_D + 64)) / (2 * Math.PI));
  const size = 2 * radius + GRAPH_D;
  const centers = graph.nodes.map((_, i) => {
    const angle = (2 * Math.PI * i) / n;
    return { x: Math.round(size / 2 + radius * Math.sin(angle)), y: Math.round(TREE_TOP + size / 2 - radius * Math.cos(angle)) };
  });
  return { centers, w: size, h: TREE_TOP + size };
}

export interface EdgeShape {
  /** SVG 路徑，相對於元件左上角 */
  path: string;
  /** 權重標在哪裡 */
  label: Point;
}

/**
 * 一條邊怎麼畫：兩端停在節點邊緣；有向圖兩個方向都有邊時各自往旁邊彎，
 * 才不會疊成一條；指向自己的邊畫成節點上方的小圈。
 */
export function edgeShape(graph: ElementOf<'graph'>, centers: Point[], edge: GraphEdge): EdgeShape | null {
  const a = centers[edge.a];
  const b = centers[edge.b];
  if (!a || !b) return null;
  const r = GRAPH_D / 2;
  if (edge.a === edge.b) {
    const top = a.y - r;
    return { path: `M${a.x - 8} ${top + 2}C${a.x - 28} ${top - 36} ${a.x + 28} ${top - 36} ${a.x + 8} ${top + 2}`, label: { x: a.x, y: top - 34 } };
  }
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const d = Math.hypot(dx, dy) || 1;
  const ux = dx / d;
  const uy = dy / d;
  const curved = !!graph.directed && graph.edges.some((e) => e.a === edge.b && e.b === edge.a);
  if (!curved) {
    const s = { x: a.x + ux * r, y: a.y + uy * r };
    const e = { x: b.x - ux * r, y: b.y - uy * r };
    return { path: `M${s.x} ${s.y}L${e.x} ${e.y}`, label: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } };
  }
  // 往方向的左手邊彎；反方向的那條自然彎到另一邊
  const bend = 32;
  const c = { x: (a.x + b.x) / 2 + uy * bend, y: (a.y + b.y) / 2 - ux * bend };
  const toward = (from: Point, to: Point) => {
    const len = Math.hypot(to.x - from.x, to.y - from.y) || 1;
    return { x: from.x + ((to.x - from.x) / len) * r, y: from.y + ((to.y - from.y) / len) * r };
  };
  const s = toward(a, c);
  const e = toward(b, c);
  return { path: `M${s.x} ${s.y}Q${c.x} ${c.y} ${e.x} ${e.y}`, label: { x: (s.x + 2 * c.x + e.x) / 4, y: (s.y + 2 * c.y + e.y) / 4 } };
}

function graphColors(colors: (CellColor | null)[] | undefined, length: number): (CellColor | null)[] | undefined {
  return normalizeColors(colors, length);
}

/** 加一個節點，名稱接著現有的數字（不是數字就用下一個字母）；回傳新節點的位置 */
export function addGraphNode(doc: BoardDoc, id: string): { doc: BoardDoc; index: number } | null {
  const el = findElement(doc, id);
  if (el?.type !== 'graph' || el.nodes.length >= GRAPH_MAX_NODES) return null;
  const numeric = el.nodes.every((v) => /^\d+$/.test(v));
  const label = numeric
    ? String(Math.max(-1, ...el.nodes.map(Number)) + 1)
    : String.fromCharCode(Math.max(96, ...el.nodes.map((v) => (v.length === 1 ? v.charCodeAt(0) : 96))) + 1);
  const nodes = [...el.nodes, label];
  return { doc: updateElement<ElementOf<'graph'>>(doc, id, { nodes, colors: graphColors(el.colors, nodes.length) }), index: nodes.length - 1 };
}

/** 刪掉一個節點和連著它的邊；後面的節點往前遞補，指著它們的指標跟著，指著被刪節點的留在原地 */
export function deleteGraphNode(doc: BoardDoc, id: string, index: number): BoardDoc {
  const el = findElement(doc, id);
  if (el?.type !== 'graph' || el.nodes.length <= 1 || index < 0 || index >= el.nodes.length) return doc;
  const shift = (i: number) => (i > index ? i - 1 : i);
  const nodes = el.nodes.filter((_, i) => i !== index);
  const edges = el.edges.filter((e) => e.a !== index && e.b !== index).map((e) => ({ ...e, a: shift(e.a), b: shift(e.b) }));
  const colors = el.colors && graphColors(el.colors.filter((_, i) => i !== index), nodes.length);
  const next = updateElement<ElementOf<'graph'>>(doc, id, { nodes, edges, colors });
  return {
    ...next,
    elements: next.elements.map((p) => {
      if (p.type !== 'pointer' || p.attach?.id !== id) return p;
      if (p.attach.index !== index) return { ...p, attach: { ...p.attach, index: shift(p.attach.index) } };
      const at = pointerPosition(doc, p);
      return { ...p, x: Math.round(at.x), y: Math.round(at.y), attach: undefined };
    }),
  };
}

/** 從 a 連一條邊到 b；同樣的邊已經有了就不加（無向圖不分方向） */
export function addGraphEdge(doc: BoardDoc, id: string, a: number, b: number): BoardDoc {
  const el = findElement(doc, id);
  if (el?.type !== 'graph' || el.edges.length >= GRAPH_MAX_EDGES) return doc;
  if (a < 0 || b < 0 || a >= el.nodes.length || b >= el.nodes.length) return doc;
  const same = (e: GraphEdge) => (e.a === a && e.b === b) || (!el.directed && e.a === b && e.b === a);
  if (el.edges.some(same)) return doc;
  return updateElement<ElementOf<'graph'>>(doc, id, { edges: [...el.edges, { a, b }] });
}

export function removeGraphEdge(doc: BoardDoc, id: string, edge: number): BoardDoc {
  const el = findElement(doc, id);
  if (el?.type !== 'graph' || edge < 0 || edge >= el.edges.length) return doc;
  return updateElement<ElementOf<'graph'>>(doc, id, { edges: el.edges.filter((_, i) => i !== edge) });
}

/** 改一條邊：權重（空字串就拿掉）、標記成走過 */
export function updateGraphEdge(doc: BoardDoc, id: string, edge: number, patch: { w?: string; mark?: boolean }): BoardDoc {
  const el = findElement(doc, id);
  if (el?.type !== 'graph' || edge < 0 || edge >= el.edges.length) return doc;
  const edges = el.edges.map((e, i) => {
    if (i !== edge) return e;
    const next = { ...e, ...patch };
    if (!next.w) delete next.w;
    if (!next.mark) delete next.mark;
    return next;
  });
  return updateElement<ElementOf<'graph'>>(doc, id, { edges });
}

export function setGraphColor(doc: BoardDoc, id: string, index: number, color: CellColor | null): BoardDoc {
  const el = findElement(doc, id);
  if (el?.type !== 'graph' || index < 0 || index >= el.nodes.length) return doc;
  const colors = el.nodes.map((_, i) => (i === index ? color : (el.colors?.[i] ?? null)));
  return updateElement<ElementOf<'graph'>>(doc, id, { colors: graphColors(colors, el.nodes.length) });
}

/** 有向、無向互換；改成無向時，兩個方向都有的邊只留一條 */
export function setDirected(doc: BoardDoc, id: string, directed: boolean): BoardDoc {
  const el = findElement(doc, id);
  if (el?.type !== 'graph') return doc;
  if (directed) return updateElement<ElementOf<'graph'>>(doc, id, { directed: true });
  const seen = new Set<string>();
  const edges = el.edges.filter((e) => {
    const key = e.a < e.b ? `${e.a}-${e.b}` : `${e.b}-${e.a}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return updateElement<ElementOf<'graph'>>(doc, id, { directed: undefined, edges });
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
    } else if (el.type === 'range') {
      const rect = rangeRect(doc, el);
      if (rect && distanceToRectEdge(rect, at) <= radius) hits.push(el.id);
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

/** 幫選取的框、箭頭、直線和筆跡換顏色；其他元件沒有顏色，不受影響 */
export function recolorElements(doc: BoardDoc, ids: ReadonlySet<string>, color: BoardColor): BoardDoc {
  return {
    ...doc,
    elements: doc.elements.map((el) => (hasColor(el) && ids.has(el.id) ? ({ ...el, color } as BoardElement) : el)),
  };
}

/** 有沒有可以換顏色的東西：框、範圍框、箭頭、直線、筆跡 */
export function hasColor(el: BoardElement | undefined): boolean {
  return el?.type === 'shape' || el?.type === 'range' || el?.type === 'arrow' || el?.type === 'stroke';
}

/** 箭頭和直線互換 */
export function setArrowHead(doc: BoardDoc, id: string, head: 'end' | 'none'): BoardDoc {
  return updateElement<ElementOf<'arrow'>>(doc, id, { head: head === 'end' ? undefined : head });
}

/** 點到的箭頭、直線或範圍框的框線（上面的優先），讓它們也能選取 */
export function hitConnector(doc: BoardDoc, at: Point, radius: number, sizes?: Sizes): string | undefined {
  for (let i = doc.elements.length - 1; i >= 0; i -= 1) {
    const el = doc.elements[i];
    if (el.type === 'range') {
      const rect = rangeRect(doc, el);
      if (rect && distanceToRectEdge(rect, at) <= radius) return el.id;
      continue;
    }
    if (el.type !== 'arrow') continue;
    const ends = arrowPoints(doc, el, sizes);
    if (ends && distanceToSegment(at, ends[0], ends[1]) <= radius) return el.id;
  }
  return undefined;
}

/** 一個東西佔的範圍；箭頭連的元件不見了就是 null */
export function elementBounds(doc: BoardDoc, el: BoardElement, sizes?: Sizes): Rect | null {
  if (isPlaced(el)) return rectOf(doc, el, sizes);
  if (el.type === 'range') return rangeRect(doc, el);
  let xs: number[];
  let ys: number[];
  if (el.type === 'stroke') {
    xs = el.points.filter((_, i) => i % 2 === 0);
    ys = el.points.filter((_, i) => i % 2 === 1);
  } else {
    const ends = arrowPoints(doc, el, sizes);
    if (!ends) return null;
    xs = ends.map((p) => p.x);
    ys = ends.map((p) => p.y);
  }
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
}

/** 兩個角拉出的框 */
export function rectFromCorners(a: Point, b: Point): Rect {
  return { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), w: Math.abs(a.x - b.x), h: Math.abs(a.y - b.y) };
}

/** 框選：完全落在框裡的東西 */
export function elementsInRect(doc: BoardDoc, rect: Rect, sizes?: Sizes): string[] {
  return doc.elements
    .filter((el) => {
      const b = elementBounds(doc, el, sizes);
      return b !== null && b.x >= rect.x && b.y >= rect.y && b.x + b.w <= rect.x + rect.w && b.y + b.h <= rect.y + rect.h;
    })
    .map((el) => el.id);
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
    } else if (el.type === 'range') {
      const r = rangeRect(doc, el);
      if (r) {
        include(r.x, r.y);
        include(r.x + r.w, r.y + r.h);
      }
    } else {
      const ends = arrowPoints(doc, el, sizes);
      if (ends) for (const p of ends) include(p.x, p.y);
    }
  }
  return minX === Infinity ? null : { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

// ---------- 逐步播放 ----------

export type BoardStep = NonNullable<BoardDoc['steps']>[number];
export const MAX_STEPS = 50;

export function newStepId(doc: BoardDoc): string {
  const taken = new Set((doc.steps ?? []).map((step) => step.id));
  for (;;) {
    const id = Math.random().toString(36).slice(2, 10);
    if (id && !taken.has(id)) return id;
  }
}

/** 把目前的畫面記成最後一步；已經 50 步就不再記 */
export function captureStep(doc: BoardDoc, id: string, caption = ''): BoardDoc {
  const steps = doc.steps ?? [];
  if (steps.length >= MAX_STEPS) return doc;
  return { ...doc, steps: [...steps, { id, caption, elements: doc.elements }] };
}

export function deleteStep(doc: BoardDoc, index: number): BoardDoc {
  const steps = (doc.steps ?? []).filter((_, i) => i !== index);
  return steps.length > 0 ? { ...doc, steps } : { elements: doc.elements };
}

export function setStepCaption(doc: BoardDoc, index: number, caption: string): BoardDoc {
  return { ...doc, steps: (doc.steps ?? []).map((step, i) => (i === index ? { ...step, caption } : step)) };
}

/** 從某一步繼續編輯：畫面換成那一步，步驟本身不動 */
export function restoreStep(doc: BoardDoc, index: number): BoardDoc {
  const step = doc.steps?.[index];
  return step ? { ...doc, elements: step.elements } : doc;
}

/** 播放某一步時要畫的內容 */
export function stepDoc(doc: BoardDoc, index: number): BoardDoc {
  return { elements: doc.steps?.[index]?.elements ?? [] };
}

/** 清空畫面；記下來的步驟保留 */
export function clearElements(doc: BoardDoc): BoardDoc {
  return { ...doc, elements: [] };
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
