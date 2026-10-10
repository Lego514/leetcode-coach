import {
  CELL,
  freeSpot,
  INDEX_H,
  isPlaced,
  LABEL_H,
  POINTER_H,
  POINTER_W,
  rectOf,
  sizeOf,
  WIDE_CELL,
  type BoardDoc,
  type BoardElement,
  type ElementOf,
  type Placed,
  type Point,
  type Rect,
  type Sizes,
} from './model';

// 模板：點一下就擺好一整套常見的追蹤場景，指標名字也取好。
// 內容是常見的小例子，可以再用「用文字建立」或雙擊換成題目的範例。

export type TemplateKind = 'twoPointers' | 'slidingWindow' | 'reverseList' | 'treeDfs' | 'gridBfs' | 'backtracking';

export const TEMPLATES: TemplateKind[] = ['twoPointers', 'slidingWindow', 'reverseList', 'treeDfs', 'gridBfs', 'backtracking'];

/** 兩個元件之間留的空間 */
const GAP = 40;

function pointer(id: string, name: string, attach?: { id: string; index: number }, at: Point = { x: 0, y: 0 }): ElementOf<'pointer'> {
  return { type: 'pointer', id, x: at.x, y: at.y, name, ...(attach ? { attach } : {}) };
}

/** 模板裡的元件，位置相對於模板的左上角 */
export function templateElements(kind: TemplateKind, nextId: () => string): BoardElement[] {
  switch (kind) {
    case 'twoPointers': {
      const nums = nextId();
      return [
        { type: 'list', id: nums, x: 0, y: 0, variant: 'array', label: 'nums', items: ['1', '2', '3', '4', '5', '6'] },
        pointer(nextId(), 'l', { id: nums, index: 0 }),
        pointer(nextId(), 'r', { id: nums, index: 5 }),
      ];
    }
    case 'slidingWindow': {
      const s = nextId();
      const l = nextId();
      const r = nextId();
      // 計數字典放在指標下面
      const below = LABEL_H + CELL + INDEX_H + POINTER_H + GAP / 2;
      return [
        { type: 'list', id: s, x: 0, y: 0, variant: 'array', label: 's', items: ['a', 'b', 'c', 'a', 'b', 'b'] },
        pointer(l, 'l', { id: s, index: 0 }),
        pointer(r, 'r', { id: s, index: 2 }),
        // 範圍框跟著 l、r 移動
        { type: 'range', id: nextId(), from: l, to: r, color: 'orange' },
        { type: 'table', id: nextId(), x: 0, y: below, variant: 'dict', label: 'count', rows: [['a', '1'], ['b', '1'], ['c', '1']] },
        { type: 'var', id: nextId(), x: 2 * WIDE_CELL + GAP, y: below + LABEL_H, name: 'best', value: '3' },
      ];
    }
    case 'reverseList': {
      const head = nextId();
      return [
        { type: 'list', id: head, x: 0, y: 0, variant: 'linked', label: 'head', items: ['1', '2', '3', '4', '5'] },
        // prev 一開始是 None，還沒指著節點，放在第一個節點的左下方
        pointer(nextId(), 'prev', undefined, { x: -POINTER_W - 12, y: LABEL_H + CELL + 4 }),
        pointer(nextId(), 'curr', { id: head, index: 0 }),
        pointer(nextId(), 'next', { id: head, index: 1 }),
      ];
    }
    case 'treeDfs': {
      const root = nextId();
      const tree: ElementOf<'tree'> = { type: 'tree', id: root, x: 0, y: 0, label: 'root', nodes: ['3', '9', '20', null, null, '15', '7'] };
      return [
        tree,
        pointer(nextId(), 'node', { id: root, index: 0 }),
        { type: 'list', id: nextId(), x: sizeOf(tree).w + GAP, y: 0, variant: 'stack', label: 'stack', items: ['3'] },
      ];
    }
    case 'gridBfs': {
      const grid: ElementOf<'table'> = {
        type: 'table',
        id: nextId(),
        x: 0,
        y: 0,
        variant: 'grid',
        label: 'grid',
        rows: [
          ['1', '1', '0', '0'],
          ['1', '0', '0', '1'],
          ['0', '0', '1', '1'],
        ],
      };
      const right = sizeOf(grid).w + GAP;
      const queue: ElementOf<'list'> = { type: 'list', id: nextId(), x: right, y: 0, variant: 'queue', label: 'queue', items: ['0,0'] };
      return [
        grid,
        queue,
        { type: 'list', id: nextId(), x: right, y: sizeOf(queue).h + GAP / 2, variant: 'set', label: 'visited', items: ['0,0'] },
      ];
    }
    case 'backtracking': {
      // 子集合：每一層選下一個數字，邊上寫選了什麼；cur 指著目前這一層，path 跟著改
      const nums: ElementOf<'list'> = { type: 'list', id: nextId(), x: 0, y: 0, variant: 'array', label: 'nums', items: ['1', '2', '3'] };
      const tree: ElementOf<'recursion'> = {
        type: 'recursion',
        id: nextId(),
        x: 0,
        y: LABEL_H + CELL + INDEX_H + GAP,
        label: 'subsets',
        nodes: [
          { text: '[]', parent: -1 },
          { text: '[1]', parent: 0, edge: '+1' },
          { text: '[1,2]', parent: 1, edge: '+2' },
          { text: '[1,2,3]', parent: 2, edge: '+3' },
          { text: '[1,3]', parent: 1, edge: '+3' },
          { text: '[2]', parent: 0, edge: '+2' },
          { text: '[2,3]', parent: 5, edge: '+3' },
          { text: '[3]', parent: 0, edge: '+3' },
        ],
      };
      return [
        nums,
        { type: 'var', id: nextId(), x: sizeOf(nums).w + GAP, y: LABEL_H, name: 'path', value: '[]' },
        tree,
        pointer(nextId(), 'cur', { id: tree.id, index: 0 }),
      ];
    }
  }
}

function idMaker(doc: BoardDoc): () => string {
  const taken = new Set(doc.elements.map((el) => el.id));
  return () => {
    for (;;) {
      const id = Math.random().toString(36).slice(2, 10);
      if (id && !taken.has(id)) {
        taken.add(id);
        return id;
      }
    }
  };
}

/** 一組元件佔的範圍；吸附的指標也算進去，範圍框跟著指標不用算 */
function groupBounds(els: BoardElement[]): Rect {
  const own: BoardDoc = { elements: els };
  const rects = els.filter(isPlaced).map((el: Placed) => rectOf(own, el));
  const x = Math.min(...rects.map((r) => r.x));
  const y = Math.min(...rects.map((r) => r.y));
  return { x, y, w: Math.max(...rects.map((r) => r.x + r.w)) - x, h: Math.max(...rects.map((r) => r.y + r.h)) - y };
}

/** 把模板整組放在 center 附近的空位，回傳新文件和新元件的 id（方便整組選取） */
export function insertTemplate(doc: BoardDoc, kind: TemplateKind, center: Point, sizes?: Sizes): { doc: BoardDoc; ids: string[] } {
  const els = templateElements(kind, idMaker(doc));
  const bounds = groupBounds(els);
  const spot = freeSpot(doc, bounds.w, bounds.h, center, sizes);
  const dx = spot.x - bounds.x;
  const dy = spot.y - bounds.y;
  // 吸附的指標和範圍框跟著元件走，不用另外移
  const placed = els.map((el) => (!isPlaced(el) || (el.type === 'pointer' && el.attach) ? el : { ...el, x: el.x + dx, y: el.y + dy }));
  return { doc: { ...doc, elements: [...doc.elements, ...placed] }, ids: placed.map((el) => el.id) };
}
