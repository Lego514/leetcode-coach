import { describe, expect, it } from 'vitest';
import { boardDocSchema } from '../../../shared/protocol';
import { boardToSvg, estimateWidth } from './exportSvg';
import {
  addElement,
  addPointerAt,
  addTreeChild,
  CELL,
  createElement,
  CYCLE_H,
  deleteCell,
  deleteTreeNode,
  dropPointer,
  EMPTY_DOC,
  findElement,
  insertCell,
  LABEL_H,
  LINK_GAP,
  linksOf,
  POINTER_H,
  POINTER_W,
  pointerPosition,
  pointsDown,
  setCycle,
  setNodeColor,
  settleElement,
  sizeOf,
  snapTarget,
  stepTreePointer,
  subtreeOf,
  toggleLink,
  TREE_D,
  TREE_GAP,
  TREE_LEVEL,
  TREE_TOP,
  treeLayout,
  treeStep,
  type BoardDoc,
  type ElementOf,
} from './model';
import { applyStructureText, parseLinkedList, parseTree, serializeTree, structureText } from './structures';

const texts = { heading: 'Title', text: 'Text', sticky: 'Idea' };

function linkedDoc(items = ['1', '2', '3', '4']): BoardDoc {
  return addElement(EMPTY_DOC, { ...createElement('linkedList', { x: 0, y: 0 }, 'll', texts), items } as ElementOf<'list'>);
}

function treeDoc(nodes: (string | null)[] = ['3', '9', '20', null, null, '15', '7']): BoardDoc {
  return addElement(EMPTY_DOC, { ...createElement('binaryTree', { x: 0, y: 0 }, 'tr', texts), nodes } as ElementOf<'tree'>);
}

const list = (doc: BoardDoc) => findElement(doc, 'll') as ElementOf<'list'>;
const tree = (doc: BoardDoc) => findElement(doc, 'tr') as ElementOf<'tree'>;

describe('linked lists', () => {
  it('lays nodes out with room for arrows and a trailing null, or a cycle underneath', () => {
    const doc = linkedDoc();
    expect(sizeOf(list(doc))).toEqual({ w: 4 * CELL + 3 * LINK_GAP + LINK_GAP + 36, h: LABEL_H + CELL });
    const cyclic = setCycle(doc, 'll', 1);
    expect(sizeOf(list(cyclic))).toEqual({ w: 4 * CELL + 3 * LINK_GAP, h: LABEL_H + CELL + CYCLE_H });
  });

  it('cycles a link between forward, reversed, and cut', () => {
    let doc = linkedDoc();
    doc = toggleLink(doc, 'll', 1);
    expect(linksOf(list(doc))).toEqual(['next', 'prev', 'next']);
    doc = toggleLink(doc, 'll', 1);
    expect(linksOf(list(doc))).toEqual(['next', 'none', 'next']);
    doc = toggleLink(doc, 'll', 1);
    // 全部往後時不存
    expect(list(doc).links).toBeUndefined();
  });

  it('keeps links and the cycle lined up when nodes are inserted or deleted', () => {
    let doc = toggleLink(linkedDoc(), 'll', 2); // 3 ← 4
    doc = setCycle(doc, 'll', 2);
    doc = insertCell(doc, 'll', 1);
    expect(list(doc).items).toEqual(['1', '', '2', '3', '4']);
    expect(linksOf(list(doc))).toEqual(['next', 'next', 'next', 'prev']);
    expect(list(doc).cycle).toBe(3);

    doc = deleteCell(doc, 'll', 4);
    expect(list(doc).items).toEqual(['1', '', '2', '3']);
    expect(list(doc).links).toBeUndefined();
    expect(list(doc).cycle).toBe(3);
  });

  it('snaps pointers below a node and keeps them on it', () => {
    let doc = linkedDoc();
    const node = { x: 2 * (CELL + LINK_GAP), y: LABEL_H };
    doc = addElement(doc, { type: 'pointer', id: 'cur', name: 'curr', x: node.x + CELL / 2 - POINTER_W / 2, y: node.y + CELL + 10 });
    doc = dropPointer(doc, 'cur');
    const pointer = findElement(doc, 'cur') as ElementOf<'pointer'>;
    expect(pointer.attach).toEqual({ id: 'll', index: 2 });
    expect(pointerPosition(doc, pointer)).toEqual({ x: node.x + CELL / 2 - POINTER_W / 2, y: node.y + CELL + 4 });
    expect(pointsDown(doc, pointer)).toBe(false);
  });
});

describe('binary trees', () => {
  it('lays nodes out in order, one level per row', () => {
    const { centers, w, h } = treeLayout(tree(treeDoc()));
    // 中序：9, 3, 15, 20, 7
    expect([...centers.keys()]).toEqual([1, 0, 5, 2, 6]);
    expect(centers.get(1)).toEqual({ x: TREE_GAP / 2, y: TREE_TOP + TREE_D / 2 + TREE_LEVEL });
    expect(centers.get(0)).toEqual({ x: TREE_GAP * 1.5, y: TREE_TOP + TREE_D / 2 });
    expect(centers.get(6)).toEqual({ x: TREE_GAP * 4.5, y: TREE_TOP + TREE_D / 2 + 2 * TREE_LEVEL });
    expect(w).toBe(5 * TREE_GAP);
    expect(h).toBe(TREE_TOP + 2 * TREE_LEVEL + TREE_D);
  });

  it('adds children up to six levels and deletes whole subtrees', () => {
    let doc = treeDoc();
    const added = addTreeChild(doc, 'tr', 1, 'right')!;
    expect(added.index).toBe(4);
    doc = added.doc;
    expect(tree(doc).nodes[4]).toBe('');
    // 已經有的位置不重複加
    expect(addTreeChild(doc, 'tr', 2, 'left')).toBeNull();
    // 第 6 層的節點不能再加子節點
    const deep = treeDoc(Array.from({ length: 63 }, (_, i) => String(i)));
    expect(addTreeChild(deep, 'tr', 40, 'left')).toBeNull();

    doc = setNodeColor(doc, 'tr', 5, 'green');
    doc = deleteTreeNode(doc, 'tr', 2);
    expect(tree(doc).nodes).toEqual(['3', '9', null, null, '']);
    expect(tree(doc).colors).toBeUndefined();
    // 根節點不能刪
    expect(deleteTreeNode(doc, 'tr', 0)).toBe(doc);
    expect(subtreeOf(tree(treeDoc()), 2)).toEqual([2, 5, 6]);
  });

  it('puts pointers above nodes, moves them along edges, and drops them when the node goes', () => {
    let doc = addPointerAt(treeDoc(), 'tr', 2, 'cur');
    const pointer = () => findElement(doc, 'cur') as ElementOf<'pointer'>;
    const c = treeLayout(tree(doc)).centers.get(2)!;
    expect(pointsDown(doc, pointer())).toBe(true);
    expect(pointerPosition(doc, pointer())).toEqual({ x: c.x - POINTER_W / 2, y: c.y - TREE_D / 2 - POINTER_H - 2 });

    doc = stepTreePointer(doc, 'cur', 'left');
    expect(pointer().attach?.index).toBe(5);
    doc = stepTreePointer(doc, 'cur', 'left'); // 15 沒有左子節點
    expect(pointer().attach?.index).toBe(5);
    doc = stepTreePointer(doc, 'cur', 'up');
    expect(pointer().attach?.index).toBe(2);
    expect(treeStep(tree(doc), 1, 'down')).toBeNull();
    expect(treeStep(tree(doc), 2, 'down')).toBe(5);

    const before = pointerPosition(doc, pointer());
    doc = deleteTreeNode(doc, 'tr', 2);
    expect(pointer().attach).toBeUndefined();
    expect({ x: pointer().x, y: pointer().y }).toEqual(before);
  });

  it('snaps a dragged pointer onto the nearest node', () => {
    const doc = treeDoc();
    const c = treeLayout(tree(doc)).centers.get(1)!;
    expect(snapTarget(doc, { x: c.x - POINTER_W / 2, y: c.y + TREE_D / 2 })).toEqual({ id: 'tr', index: 1 });
  });
});

describe('building from text', () => {
  it('reads linked lists in the usual formats', () => {
    expect(parseLinkedList('1->2->3->null')).toEqual({ items: ['1', '2', '3'] });
    expect(parseLinkedList('[1, 2, 3]')).toEqual({ items: ['1', '2', '3'] });
    expect(parseLinkedList('1 → 2 → 3')).toEqual({ items: ['1', '2', '3'] });
    expect(parseLinkedList(' [] ')).toEqual({ error: 'empty' });
    expect(parseLinkedList(Array.from({ length: 65 }, (_, i) => i).join(','))).toEqual({ error: 'tooMany' });
  });

  it('reads LeetCode level-order trees and writes them back', () => {
    const parsed = parseTree('[3,9,20,null,null,15,7]');
    expect(parsed).toEqual({ nodes: ['3', '9', '20', null, null, '15', '7'] });
    expect(serializeTree(tree(treeDoc()))).toBe('[3,9,20,null,null,15,7]');
    // 偏一邊的樹：null 的子節點不佔位置
    const skewed = parseTree('[1,null,2,null,3]');
    expect(skewed).toEqual({ nodes: ['1', null, '2', null, null, null, '3'] });
    expect(serializeTree({ ...tree(treeDoc()), ...(skewed as { nodes: (string | null)[] }) })).toBe('[1,null,2,null,3]');
    expect(parseTree('[null]')).toEqual({ error: 'empty' });
    expect(parseTree('[1,null,2,null,3,null,4,null,5,null,6,null,7]')).toEqual({ error: 'tooDeep' });
  });

  it('replaces the content, keeping pointers that still have a node', () => {
    let doc = addPointerAt(addPointerAt(treeDoc(), 'tr', 1, 'a'), 'tr', 6, 'b');
    const result = applyStructureText(doc, 'tr', '[1,2]');
    expect('doc' in result).toBe(true);
    doc = (result as { doc: BoardDoc }).doc;
    expect(tree(doc).nodes).toEqual(['1', '2']);
    expect((findElement(doc, 'a') as ElementOf<'pointer'>).attach).toEqual({ id: 'tr', index: 1 });
    expect((findElement(doc, 'b') as ElementOf<'pointer'>).attach).toBeUndefined();
    expect(applyStructureText(doc, 'tr', 'null')).toEqual({ error: 'empty' });

    const linked = applyStructureText(setCycle(linkedDoc(), 'll', 0), 'll', '5->6');
    expect(list((linked as { doc: BoardDoc }).doc)).toMatchObject({ items: ['5', '6'], cycle: undefined, links: undefined });
    expect(structureText(list(linkedDoc()))).toBe('1->2->3->4');
  });
});

describe('making room after growing', () => {
  it('moves a grown tree off whatever it now covers, and leaves it alone otherwise', () => {
    // 樹的左上角放在串列的正上方，長大後蓋到串列
    let doc = addElement(linkedDoc(), { ...tree(treeDoc()), x: 0, y: -60 });
    doc = addPointerAt(doc, 'tr', 0, 'p');
    const moved = settleElement(doc, 'tr');
    const t = tree(moved);
    expect(t.x !== 0 || t.y !== -60).toBe(true);
    const r = sizeOf(t);
    const l = list(moved);
    const ls = sizeOf(l);
    const overlap = t.x < l.x + ls.w && l.x < t.x + r.w && t.y < l.y + ls.h && l.y < t.y + r.h;
    expect(overlap).toBe(false);

    const alone = treeDoc();
    expect(settleElement(alone, 'tr')).toBe(alone);
  });
});

describe('saving and exporting', () => {
  it('passes the sync schema', () => {
    const doc = addElement(toggleLink(setCycle(linkedDoc(), 'll', 1), 'll', 0), tree(treeDoc()));
    expect(boardDocSchema.safeParse(doc).success).toBe(true);
    const tooDeep = { elements: [{ ...tree(treeDoc()), nodes: Array.from({ length: 64 }, () => '1') }] };
    expect(boardDocSchema.safeParse(tooDeep).success).toBe(false);
  });

  it('draws linked lists and trees in the exported image', () => {
    let doc = addElement(toggleLink(linkedDoc(), 'll', 0), { ...tree(treeDoc()), x: 0, y: 200 });
    doc = addPointerAt(doc, 'tr', 0, 'p');
    const out = boardToSvg(doc, undefined, { measure: estimateWidth, front: 'front', back: 'back' })!;
    expect(out.svg.match(/<circle /g)).toHaveLength(5);
    expect(out.svg).toContain('>null</text>');
    expect(out.svg).toContain('>20</text>');
  });
});
