import {
  findElement,
  GRAPH_MAX_EDGES,
  GRAPH_MAX_NODES,
  hasTreeNode,
  HEAP_MAX,
  MAX_CELLS,
  pointerPosition,
  REC_MAX_DEPTH,
  REC_MAX_NODES,
  recursionChildren,
  TREE_MAX_NODES,
  updateElement,
  type BoardDoc,
  type ElementOf,
  type GraphEdge,
  type RecursionNode,
} from './model';

// 用文字建立：直接貼題目給的範例，例如 nums = [2,7,11,15]、1->2->3、[3,9,20,null,null,15,7]、
// n = 5, edges = [[0,1]]、{'a': 1}，不用一格一格輸入。

export type ParseError = 'empty' | 'tooMany' | 'tooDeep' | 'badFormat';

const NULL_WORDS = /^(null|none|nil|#)$/i;
const MAX_VALUE = 40;

function clean(value: string): string {
  return value.trim().replace(/^["']|["']$/g, '').slice(0, MAX_VALUE);
}

/** 表格最多 26 列、26 欄 */
const MAX_ROWS = 26;

/**
 * LeetCode 的範例常寫成 nums = [2,7,11,15], target = 9：
 * 取出名稱（拿來當元件的名稱）和第一個值，後面其他參數略過。
 */
export function splitName(text: string): { name?: string; body: string } {
  const match = /^\s*([A-Za-z_]\w*)\s*=\s*([\s\S]*)$/.exec(text);
  if (!match) return { body: text.trim() };
  let body = match[2].trim();
  const more = /,\s*[A-Za-z_]\w*\s*=/.exec(body);
  if (more) body = body.slice(0, more.index).trim();
  return { name: match[1].slice(0, 40), body };
}

/** JSON 或 Python 的寫法（單引號、None、True）都讀；讀不出來是 undefined */
function readValue(text: string): unknown {
  const json = text
    .replace(/'/g, '"')
    .replace(/\bNone\b/g, 'null')
    .replace(/\bTrue\b/g, 'true')
    .replace(/\bFalse\b/g, 'false');
  try {
    return JSON.parse(json);
  } catch {
    return undefined;
  }
}

/** 格子裡放的文字：null 寫成 null，物件和陣列寫成 JSON */
function cellText(value: unknown): string {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'object') return JSON.stringify(value).slice(0, MAX_VALUE);
  return String(value).slice(0, MAX_VALUE);
}

/** 數字照寫，其他加引號，寫回文字時才讀得回來 */
function literal(value: string): string {
  return /^-?\d+(\.\d+)?$/.test(value) ? value : JSON.stringify(value);
}

/**
 * 陣列、堆疊、佇列、集合：[1,2,3]、1,2,3、1 2 3 都可以；
 * "abcabcbb" 這種字串拆成一個一個字元（字串題的滑動視窗很常用）。堆疊的最後一個是頂端。
 */
export function parseList(text: string): { items: string[]; name?: string } | { error: ParseError } {
  const { name, body } = splitName(text);
  let items: string[];
  const quoted = /^"([\s\S]*)"$|^'([\s\S]*)'$/.exec(body);
  if (quoted) {
    items = [...(quoted[1] ?? quoted[2])];
  } else if (body.startsWith('[')) {
    const value = readValue(body);
    if (Array.isArray(value)) {
      if (value.some((v) => Array.isArray(v))) return { error: 'badFormat' };
      items = value.map(cellText);
    } else {
      items = body.replace(/^\[|\]$/g, '').split(',').map(clean).filter(Boolean);
    }
  } else {
    items = body.split(/,|\s+/).map(clean).filter(Boolean);
  }
  if (items.length === 0) return { error: 'empty' };
  if (items.length > MAX_CELLS) return { error: 'tooMany' };
  return { items, ...(name ? { name } : {}) };
}

export function serializeList(list: ElementOf<'list'>): string {
  const body = `[${list.items.map(literal).join(',')}]`;
  return list.label ? `${list.label} = ${body}` : body;
}

/** 二維陣列和表格：[[1,0],[0,1]]；只有一列時也可以寫 [1,0,1] */
export function parseGrid(text: string): { rows: string[][]; name?: string } | { error: ParseError } {
  const { name, body } = splitName(text);
  const value = readValue(body);
  if (!Array.isArray(value)) return { error: body ? 'badFormat' : 'empty' };
  const rows = (value.every((v) => Array.isArray(v)) ? (value as unknown[][]) : [value]).map((row) => row.map(cellText));
  if (rows.length === 0 || rows.every((row) => row.length === 0)) return { error: 'empty' };
  if (rows.length > MAX_ROWS || rows.some((row) => row.length > MAX_ROWS)) return { error: 'tooMany' };
  return { rows, ...(name ? { name } : {}) };
}

export function serializeGrid(table: ElementOf<'table'>): string {
  const body = `[${table.rows.map((row) => `[${row.map(literal).join(',')}]`).join(',')}]`;
  return table.label ? `${table.label} = ${body}` : body;
}

/** 字典：{'a': 1, 'b': 2} 或 JSON；也可以寫成 [[key, value], ...] */
export function parseDict(text: string): { rows: string[][]; name?: string } | { error: ParseError } {
  const { name, body } = splitName(text);
  const start = body.indexOf('{');
  const end = body.lastIndexOf('}');
  let rows: string[][];
  if (start >= 0 && end > start) {
    const value = readValue(body.slice(start, end + 1));
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      rows = Object.entries(value).map(([k, v]) => [k.slice(0, MAX_VALUE), cellText(v)]);
    } else {
      // 沒加引號的 {a: 1, b: 2}
      rows = body
        .slice(start + 1, end)
        .split(',')
        .map((pair) => pair.split(':'))
        .filter((pair) => pair.length >= 2 && clean(pair[0]))
        .map(([k, ...v]) => [clean(k), clean(v.join(':'))]);
    }
  } else {
    const grid = parseGrid(body);
    if ('error' in grid) return grid;
    rows = grid.rows.map((row) => [row[0] ?? '', row[1] ?? '']);
  }
  if (rows.length === 0) return { error: 'empty' };
  if (rows.length > MAX_ROWS) return { error: 'tooMany' };
  return { rows, ...(name ? { name } : {}) };
}

export function serializeDict(table: ElementOf<'table'>): string {
  const body = `{${table.rows.map((row) => `${JSON.stringify(row[0] ?? '')}: ${literal(row[1] ?? '')}`).join(', ')}}`;
  return table.label ? `${table.label} = ${body}` : body;
}

/** 1->2->3、1 → 2 → 3、[1,2,3]、1 2 3 都可以；結尾的 null 略過 */
export function parseLinkedList(text: string): { items: string[] } | { error: ParseError } {
  const body = text.trim().replace(/^\[|\]$/g, '');
  const items = body
    .split(/->|→|,|\s+/)
    .map(clean)
    .filter(Boolean);
  while (items.length > 0 && NULL_WORDS.test(items[items.length - 1])) items.pop();
  if (items.length === 0) return { error: 'empty' };
  if (items.length > MAX_CELLS) return { error: 'tooMany' };
  return { items };
}

export function serializeLinkedList(items: readonly string[]): string {
  return items.join('->');
}

/**
 * LeetCode 的層序格式：[3,9,20,null,null,15,7]。
 * 依序幫每個還在的節點填左、右子節點，null 表示那個位置沒有節點；超過 6 層就不收。
 */
export function parseTree(text: string): { nodes: (string | null)[] } | { error: ParseError } {
  const body = text.trim().replace(/^\[|\]$/g, '').trim();
  if (!body) return { error: 'empty' };
  const values = body.split(',').map((token) => {
    const value = clean(token);
    return value === '' || NULL_WORDS.test(value) ? null : value;
  });
  if (values[0] === null) return { error: 'empty' };
  const nodes: (string | null)[] = [values[0]];
  const queue = [0];
  let next = 1;
  while (queue.length > 0 && next < values.length) {
    const parent = queue.shift()!;
    for (const side of [1, 2]) {
      if (next >= values.length) break;
      const value = values[next];
      next += 1;
      if (value === null) continue;
      const child = 2 * parent + side;
      if (child >= TREE_MAX_NODES) return { error: 'tooDeep' };
      while (nodes.length <= child) nodes.push(null);
      nodes[child] = value;
      queue.push(child);
    }
  }
  return { nodes };
}

/** 寫回 LeetCode 的層序格式，結尾的 null 省略 */
export function serializeTree(tree: ElementOf<'tree'>): string {
  const out: string[] = [];
  const queue = [0];
  while (queue.length > 0) {
    const index = queue.shift()!;
    if (hasTreeNode(tree, index)) {
      out.push(tree.nodes[index] ?? '');
      queue.push(2 * index + 1, 2 * index + 2);
    } else {
      out.push('null');
    }
  }
  while (out.length > 0 && out[out.length - 1] === 'null') out.pop();
  return `[${out.join(',')}]`;
}

// ---------- 圖 ----------

export interface ParsedGraph {
  nodes: string[];
  edges: GraphEdge[];
  /** 鄰接串列不對稱時看得出是有向圖；邊的清單看不出來，沿用原本的設定 */
  directed?: boolean;
}

/** 讀出文字裡的第一個陣列；單引號也收，例如 Python 的寫法 */
function readArray(text: string): unknown[] | null {
  const start = text.indexOf('[');
  const end = text.lastIndexOf(']');
  if (start < 0 || end <= start) return null;
  try {
    const value: unknown = JSON.parse(text.slice(start, end + 1).replace(/'/g, '"'));
    return Array.isArray(value) ? value : null;
  } catch {
    return null;
  }
}

const isInt = (v: unknown) => (typeof v === 'number' && Number.isInteger(v)) || (typeof v === 'string' && /^-?\d+$/.test(v.trim()));

/**
 * 圖的常見寫法：
 * - 邊的清單：n = 5, edges = [[0,1],[0,2]]；第三個數字是權重：[[0,1,4]]
 * - 鄰接串列：[[1,2],[0,3],[0],[1]]，第 i 項是 i 的鄰居；值從 1 開始時（Clone Graph）節點名稱也從 1 開始
 * - 節點不是數字也可以：[["a","b"],["b","c"]]
 * 寫了 edges 就當邊的清單；寫了 adj 或 graph 就當鄰接串列；都沒寫時，每一項都是兩、三個值就當邊的清單。
 */
export function parseGraph(text: string): ParsedGraph | { error: ParseError } {
  const rows = readArray(text);
  const n = /\bn\s*=\s*(\d+)/.exec(text);
  if (!rows) return n && Number(n[1]) > 0 ? fromEdges(Number(n[1]), []) : { error: text.trim() ? 'badFormat' : 'empty' };
  if (!rows.every(Array.isArray)) return { error: 'badFormat' };
  const lists = rows as unknown[][];
  const saysAdjacency = /\b(adj\w*|graph)\s*=/i.test(text) && !/\bedges\s*=/i.test(text);
  const looksLikeEdges = lists.length > 0 && lists.every((r) => r.length === 2 || r.length === 3);
  if (saysAdjacency || !looksLikeEdges) return fromAdjacency(lists);
  return fromEdges(n ? Number(n[1]) : 0, lists);
}

function fromEdges(n: number, rows: unknown[][]): ParsedGraph | { error: ParseError } {
  const ends = rows.flatMap((r) => [r[0], r[1]]);
  const numeric = ends.every(isInt);
  let nodes: string[];
  const index = new Map<string, number>();
  if (numeric) {
    const count = Math.max(n, ...ends.map((v) => Number(v) + 1));
    if (ends.some((v) => Number(v) < 0)) return { error: 'badFormat' };
    nodes = Array.from({ length: count }, (_, i) => String(i));
    nodes.forEach((v, i) => index.set(v, i));
  } else {
    nodes = [];
    for (const v of ends) {
      const key = String(v).trim().slice(0, 40);
      if (!index.has(key)) {
        index.set(key, nodes.length);
        nodes.push(key);
      }
    }
  }
  if (nodes.length === 0) return { error: 'empty' };
  if (nodes.length > GRAPH_MAX_NODES || rows.length > GRAPH_MAX_EDGES) return { error: 'tooMany' };
  const edges = rows.map((r) => {
    const edge: GraphEdge = { a: index.get(String(numeric ? Number(r[0]) : String(r[0]).trim().slice(0, 40)))!, b: index.get(String(numeric ? Number(r[1]) : String(r[1]).trim().slice(0, 40)))! };
    if (r.length === 3 && r[2] !== null && r[2] !== undefined) edge.w = String(r[2]).slice(0, 12);
    return edge;
  });
  return { nodes, edges };
}

function fromAdjacency(rows: unknown[][]): ParsedGraph | { error: ParseError } {
  if (rows.length === 0) return { error: 'empty' };
  if (rows.length > GRAPH_MAX_NODES) return { error: 'tooMany' };
  const values = rows.flat();
  if (!values.every(isInt)) return { error: 'badFormat' };
  const nums = values.map(Number);
  // Clone Graph 的鄰接串列從 1 開始編號：沒有 0、又出現了 n（從 0 開始的話 n 會超出範圍）才當成從 1 開始
  const oneBased = !nums.includes(0) && nums.includes(rows.length);
  const offset = oneBased ? 1 : 0;
  if (nums.some((v) => v - offset < 0 || v - offset >= rows.length)) return { error: 'badFormat' };
  const nodes = rows.map((_, i) => String(i + offset));
  const pairs = rows.flatMap((r, a) => r.map((v) => ({ a, b: Number(v) - offset })));
  const has = new Set(pairs.map((p) => `${p.a}-${p.b}`));
  const directed = pairs.some((p) => !has.has(`${p.b}-${p.a}`));
  // 無向圖的每條邊在兩邊各出現一次，只留一條
  const edges = directed ? pairs : pairs.filter((p) => p.a <= p.b);
  if (edges.length > GRAPH_MAX_EDGES) return { error: 'tooMany' };
  return { nodes, edges, directed };
}

/** 寫回邊的清單；節點剛好是 0 到 n-1 時寫成 n = 5, edges = [...] */
export function serializeGraph(graph: ElementOf<'graph'>): string {
  const plain = graph.nodes.every((v, i) => v === String(i));
  const name = (i: number) => (plain ? String(i) : JSON.stringify(graph.nodes[i] ?? ''));
  const edges = graph.edges.map((e) => `[${name(e.a)},${name(e.b)}${e.w ? `,${/^-?\d+(\.\d+)?$/.test(e.w) ? e.w : JSON.stringify(e.w)}` : ''}]`).join(',');
  return plain ? `n = ${graph.nodes.length}, edges = [${edges}]` : `edges = [${edges}]`;
}

/** 行首的縮排：空白、tab、tree 指令畫的 │ ├── └──（也認 ASCII 的 |-- `--），和清單的 - * • */
const OUTLINE_INDENT = /^(?:[ \t]|[│├└┌┬─]|\|(?=[ -])|`(?=-)|-(?=[- ])|[*•](?= ))*/;

/**
 * 遞迴樹：一行一個呼叫，縮排在呼叫它的那一行底下；tree 指令的輸出和縮排的清單也讀得懂。
 * 「|」前面是邊上的字（例如這一步選了哪個數字），「=>」後面是回傳值：+1 | [1]、f(2) => 1
 */
export function parseRecursion(text: string): { nodes: RecursionNode[] } | { error: ParseError } {
  const nodes: RecursionNode[] = [];
  const open: { indent: number; index: number }[] = [];
  for (const line of text.split(/\r?\n/)) {
    const prefix = OUTLINE_INDENT.exec(line)![0];
    let body = line.slice(prefix.length).trim();
    if (!body) continue;
    const indent = [...prefix].reduce((n, ch) => n + (ch === '\t' ? 4 : 1), 0);
    let edge = '';
    let ret = '';
    const bar = body.indexOf('|');
    if (bar > 0) {
      edge = body.slice(0, bar).trim();
      body = body.slice(bar + 1).trim();
    }
    const arrow = body.lastIndexOf('=>');
    if (arrow >= 0) {
      ret = body.slice(arrow + 2).trim();
      body = body.slice(0, arrow).trim();
    }
    while (open.length > 0 && open[open.length - 1].indent >= indent) open.pop();
    // 只能有一個根節點
    if (open.length === 0 && nodes.length > 0) return { error: 'badFormat' };
    if (open.length >= REC_MAX_DEPTH) return { error: 'tooDeep' };
    if (nodes.length >= REC_MAX_NODES) return { error: 'tooMany' };
    nodes.push({
      text: body.slice(0, MAX_VALUE),
      parent: open.length > 0 ? open[open.length - 1].index : -1,
      ...(edge ? { edge: edge.slice(0, 12) } : {}),
      ...(ret ? { ret: ret.slice(0, 12) } : {}),
    });
    open.push({ indent, index: nodes.length - 1 });
  }
  return nodes.length === 0 ? { error: 'empty' } : { nodes };
}

/** 寫回一行一個呼叫、每層縮排兩格 */
export function serializeRecursion(el: ElementOf<'recursion'>): string {
  const children = recursionChildren(el);
  const lines: string[] = [];
  const visit = (i: number, depth: number) => {
    const node = el.nodes[i];
    lines.push(`${'  '.repeat(depth)}${node.edge ? `${node.edge} | ` : ''}${node.text}${node.ret ? ` => ${node.ret}` : ''}`);
    children[i].forEach((k) => visit(k, depth + 1));
  };
  visit(0, 0);
  return lines.join('\n');
}

/** 一行寫完的遞迴樹，給螢幕閱讀器和測試用：f(2) = 1 (f(1), f(0))；剪掉的標 ✕ */
export function inlineRecursion(el: ElementOf<'recursion'>): string {
  const children = recursionChildren(el);
  const visit = (i: number): string => {
    const node = el.nodes[i];
    const own = `${node.edge ? `${node.edge}: ` : ''}${node.text}${node.ret ? ` = ${node.ret}` : ''}${node.cut ? ' ✕' : ''}`;
    return children[i].length > 0 ? `${own} (${children[i].map(visit).join(', ')})` : own;
  };
  return visit(0);
}

export type TextElement = ElementOf<'list'> | ElementOf<'tree'> | ElementOf<'graph'> | ElementOf<'table'> | ElementOf<'recursion'>;

/** 可以用文字建立的元件 */
export function acceptsText(el: { type: string } | undefined): el is TextElement {
  return el?.type === 'list' || el?.type === 'tree' || el?.type === 'graph' || el?.type === 'table' || el?.type === 'recursion';
}

/** 目前內容的文字版，放進「用文字建立」的輸入框 */
export function structureText(el: TextElement): string {
  switch (el.type) {
    case 'graph':
      return serializeGraph(el);
    case 'recursion':
      return serializeRecursion(el);
    case 'tree':
      return serializeTree(el);
    case 'table':
      return el.variant === 'dict' ? serializeDict(el) : serializeGrid(el);
    case 'list':
      return el.variant === 'linked' ? serializeLinkedList(el.items) : serializeList(el);
  }
}

/**
 * 用文字換掉元件的內容；文字開頭有「名稱 =」時順便改名稱。底色、連線方向和環都重設；
 * 吸附的指標還指得到格子或節點就留著，指不到的留在原地。
 */
export function applyStructureText(doc: BoardDoc, id: string, text: string): { doc: BoardDoc } | { error: ParseError } {
  const el = findElement(doc, id);
  // 遞迴樹一行一個呼叫，不讀「名稱 =」（f(n) = ... 這種字是節點的內容）
  if (el?.type === 'recursion') {
    const parsed = parseRecursion(text);
    if ('error' in parsed) return parsed;
    const next = updateElement<ElementOf<'recursion'>>(doc, id, { nodes: parsed.nodes });
    return { doc: detachMissing(doc, next, id, (index) => index < parsed.nodes.length) };
  }
  const { name, body } = splitName(text);
  const label = name ? { label: name } : {};
  if (el?.type === 'tree') {
    const parsed = parseTree(body);
    if ('error' in parsed) return parsed;
    const next = updateElement<ElementOf<'tree'>>(doc, id, { nodes: parsed.nodes, colors: undefined, ...label });
    const tree = findElement(next, id) as ElementOf<'tree'>;
    return { doc: detachMissing(doc, next, id, (index) => hasTreeNode(tree, index)) };
  }
  if (el?.type === 'graph') {
    const parsed = parseGraph(text);
    if ('error' in parsed) return parsed;
    const next = updateElement<ElementOf<'graph'>>(doc, id, {
      nodes: parsed.nodes,
      edges: parsed.edges,
      colors: undefined,
      directed: parsed.directed ?? el.directed,
    });
    return { doc: detachMissing(doc, next, id, (index) => index < parsed.nodes.length) };
  }
  if (el?.type === 'list' && el.variant === 'linked') {
    const parsed = parseLinkedList(body);
    if ('error' in parsed) return parsed;
    const next = updateElement<ElementOf<'list'>>(doc, id, { items: parsed.items, colors: undefined, links: undefined, cycle: undefined, ...label });
    return { doc: detachMissing(doc, next, id, (index) => index < parsed.items.length) };
  }
  if (el?.type === 'list') {
    const parsed = parseList(text);
    if ('error' in parsed) return parsed;
    if (el.variant === 'heap' && parsed.items.length > HEAP_MAX) return { error: 'tooMany' };
    const next = updateElement<ElementOf<'list'>>(doc, id, { items: parsed.items, colors: undefined, ...label });
    return { doc: detachMissing(doc, next, id, (index) => index < parsed.items.length) };
  }
  if (el?.type === 'table') {
    const parsed = el.variant === 'dict' ? parseDict(text) : parseGrid(text);
    if ('error' in parsed) return parsed;
    return { doc: updateElement<ElementOf<'table'>>(doc, id, { rows: parsed.rows, ...label }) };
  }
  return { doc };
}

/** 指標原本指的位置不見了，就從原本畫面上的位置脫離 */
function detachMissing(before: BoardDoc, after: BoardDoc, id: string, exists: (index: number) => boolean): BoardDoc {
  return {
    ...after,
    elements: after.elements.map((p) => {
      if (p.type !== 'pointer' || p.attach?.id !== id || exists(p.attach.index)) return p;
      const at = pointerPosition(before, p);
      return { ...p, x: Math.round(at.x), y: Math.round(at.y), attach: undefined };
    }),
  };
}
