import {
  findElement,
  hasTreeNode,
  MAX_CELLS,
  pointerPosition,
  TREE_MAX_NODES,
  updateElement,
  type BoardDoc,
  type ElementOf,
} from './model';

// 用文字建立鏈結串列和二元樹：直接貼題目給的範例，例如 1->2->3 或 [3,9,20,null,null,15,7]。

export type ParseError = 'empty' | 'tooMany' | 'tooDeep';

const NULL_WORDS = /^(null|none|nil|#)$/i;
const MAX_VALUE = 40;

function clean(value: string): string {
  return value.trim().replace(/^["']|["']$/g, '').slice(0, MAX_VALUE);
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

/** 目前內容的文字版，放進「用文字建立」的輸入框 */
export function structureText(el: ElementOf<'list'> | ElementOf<'tree'>): string {
  return el.type === 'tree' ? serializeTree(el) : serializeLinkedList(el.items);
}

/**
 * 用文字換掉鏈結串列或二元樹的內容。底色、連線方向和環都重設；
 * 吸附的指標還指得到節點就留著，指不到的留在原地。
 */
export function applyStructureText(doc: BoardDoc, id: string, text: string): { doc: BoardDoc } | { error: ParseError } {
  const el = findElement(doc, id);
  if (el?.type === 'tree') {
    const parsed = parseTree(text);
    if ('error' in parsed) return parsed;
    const next = updateElement<ElementOf<'tree'>>(doc, id, { nodes: parsed.nodes, colors: undefined });
    const tree = findElement(next, id) as ElementOf<'tree'>;
    return { doc: detachMissing(doc, next, id, (index) => hasTreeNode(tree, index)) };
  }
  if (el?.type === 'list' && el.variant === 'linked') {
    const parsed = parseLinkedList(text);
    if ('error' in parsed) return parsed;
    const next = updateElement<ElementOf<'list'>>(doc, id, { items: parsed.items, colors: undefined, links: undefined, cycle: undefined });
    return { doc: detachMissing(doc, next, id, (index) => index < parsed.items.length) };
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
