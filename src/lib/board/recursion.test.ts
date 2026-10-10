import { describe, expect, it } from 'vitest';
import { boardDocSchema } from '../../../shared/protocol';
import { boardToSvg, estimateWidth } from './exportSvg';
import {
  addElement,
  addPointerAt,
  addRecursionChild,
  createElement,
  deleteRecursionNode,
  EMPTY_DOC,
  findElement,
  monoWidth,
  pointerPosition,
  pointsDown,
  prunedNodes,
  recursionLayout,
  recursionPreorder,
  recursionStep,
  repeatColors,
  revealShift,
  setRepeats,
  snapTarget,
  stepRecursionPointer,
  updateRecursionNode,
  type BoardDoc,
  type ElementOf,
  type RecursionNode,
} from './model';
import { applyStructureText, inlineRecursion, parseRecursion, serializeRecursion } from './structures';

const texts = { heading: 'Title', text: 'Text', sticky: 'Idea' };

/** 元件庫的預設內容：fib(4) */
function fibDoc(): BoardDoc {
  return addElement(EMPTY_DOC, createElement('recursionTree', { x: 0, y: 0 }, 'r', texts));
}

function treeDoc(nodes: RecursionNode[]): BoardDoc {
  return addElement(EMPTY_DOC, { type: 'recursion', id: 'r', x: 0, y: 0, label: 'calls', nodes });
}

const tree = (doc: BoardDoc) => findElement(doc, 'r') as ElementOf<'recursion'>;
const labelsOf = (doc: BoardDoc) => tree(doc).nodes.map((n) => n.text);

describe('recursion tree layout', () => {
  it('lays calls out top-down, each parent centered over its children', () => {
    const layout = recursionLayout(tree(fibDoc()));
    // 每個節點 58 寬：f(1) f(0) 在最底層排開，f(4) 在 f(3) 和 f(2) 的正中間
    expect(layout.widths.every((w) => w === 58)).toBe(true);
    expect(layout.centers.get(3)).toEqual({ x: 29, y: 266 });
    expect(layout.centers.get(4)).toEqual({ x: 101, y: 266 });
    expect(layout.centers.get(2)).toEqual({ x: 65, y: 194 });
    expect(layout.centers.get(0)).toEqual({ x: 200, y: 50 });
    expect([layout.w, layout.h]).toEqual([346, 282]);
  });

  it('never lets two calls on the same level overlap, even with long labels', () => {
    const el = tree(
      treeDoc([
        { text: 'dfs(0, [])', parent: -1 },
        { text: 'dfs(1, [1])', parent: 0, ret: '[[1]]' },
        { text: 'x', parent: 1 },
        { text: 'dfs(1, [])', parent: 0 },
        { text: 'a long label here', parent: 3 },
        { text: 'b', parent: 3 },
      ]),
    );
    const { centers, widths } = recursionLayout(el);
    const boxes = el.nodes.map((_, i) => ({ y: centers.get(i)!.y, left: centers.get(i)!.x - widths[i] / 2, right: centers.get(i)!.x + widths[i] / 2 }));
    for (const a of boxes) {
      for (const b of boxes) {
        if (a === b || a.y !== b.y) continue;
        expect(a.right <= b.left || b.right <= a.left).toBe(true);
      }
    }
    // 回傳值讓節點變寬；中文字算一個字高
    expect(widths[1]).toBeGreaterThan(widths[3]);
    expect(monoWidth('遞迴', 14)).toBe(28);
  });

  it('colors repeated calls in order of first appearance, and fades pruned branches', () => {
    let doc = fibDoc();
    expect(repeatColors(tree(doc))).toEqual([null, null, 'yellow', 'blue', 'green', 'blue', 'yellow', 'blue', 'green']);
    doc = setRepeats(doc, 'r', false);
    expect(repeatColors(tree(doc)).every((c) => c === null)).toBe(true);
    doc = updateRecursionNode(doc, 'r', 6, { cut: true });
    expect([...prunedNodes(tree(doc))]).toEqual([6, 7, 8]);
  });
});

describe('walking and editing a recursion tree', () => {
  it('steps in call order, back to the caller, or down to the first call', () => {
    const el = tree(fibDoc());
    expect(recursionPreorder(el)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
    expect(recursionStep(el, 4, 'next')).toBe(5);
    expect(recursionStep(el, 5, 'prev')).toBe(4);
    expect(recursionStep(el, 5, 'up')).toBe(1);
    expect(recursionStep(el, 1, 'down')).toBe(2);
    expect(recursionStep(el, 3, 'down')).toBeNull();
    expect(recursionStep(el, 0, 'prev')).toBeNull();
    expect(recursionStep(el, 8, 'next')).toBeNull();
  });

  it('adds a child call after the whole subtree, keeping call order and the pointers in place', () => {
    let doc = addPointerAt(fibDoc(), 'r', 6, 'p');
    const result = addRecursionChild(doc, 'r', 2)!;
    expect(result.index).toBe(5);
    doc = result.doc;
    expect(labelsOf(doc)).toEqual(['f(4)', 'f(3)', 'f(2)', 'f(1)', 'f(0)', '', 'f(1)', 'f(2)', 'f(1)', 'f(0)']);
    expect(recursionPreorder(tree(doc))).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(tree(doc).nodes[5].parent).toBe(2);
    expect((findElement(doc, 'p') as ElementOf<'pointer'>).attach?.index).toBe(7);
  });

  it('stops at 8 levels and 63 calls', () => {
    const chain = treeDoc(Array.from({ length: 8 }, (_, i) => ({ text: `d${i}`, parent: i - 1 })));
    expect(addRecursionChild(chain, 'r', 7)).toBeNull();
    expect(addRecursionChild(chain, 'r', 6)).not.toBeNull();
    const star = treeDoc(Array.from({ length: 63 }, (_, i) => ({ text: `${i}`, parent: i === 0 ? -1 : 0 })));
    expect(addRecursionChild(star, 'r', 0)).toBeNull();
  });

  it('deletes a branch, shifting later pointers and leaving ones on deleted calls where they were', () => {
    let doc = addPointerAt(fibDoc(), 'r', 7, 'p');
    doc = addPointerAt(doc, 'r', 3, 'q');
    const before = pointerPosition(doc, findElement(doc, 'q') as ElementOf<'pointer'>);
    doc = deleteRecursionNode(doc, 'r', 1);
    expect(labelsOf(doc)).toEqual(['f(4)', 'f(2)', 'f(1)', 'f(0)']);
    expect(tree(doc).nodes.map((n) => n.parent)).toEqual([-1, 0, 1, 1]);
    expect((findElement(doc, 'p') as ElementOf<'pointer'>).attach?.index).toBe(2);
    expect(findElement(doc, 'q')).toMatchObject({ attach: undefined, x: Math.round(before.x), y: Math.round(before.y) });
    // 根節點不刪
    expect(deleteRecursionNode(doc, 'r', 0)).toBe(doc);
  });

  it('writes a return value and an edge label, and removes them when emptied', () => {
    let doc = updateRecursionNode(fibDoc(), 'r', 2, { ret: '1', edge: 'n-1', color: 'red' });
    expect(tree(doc).nodes[2]).toEqual({ text: 'f(2)', parent: 1, ret: '1', edge: 'n-1', color: 'red' });
    doc = updateRecursionNode(doc, 'r', 2, { ret: '', edge: '', color: null });
    expect(tree(doc).nodes[2]).toEqual({ text: 'f(2)', parent: 1 });
  });

  it('puts pointers above calls, snaps them to the nearest call, and moves them in call order', () => {
    let doc = addPointerAt(fibDoc(), 'r', 0, 'p');
    const pointer = () => findElement(doc, 'p') as ElementOf<'pointer'>;
    expect(pointsDown(doc, pointer())).toBe(true);
    expect(pointerPosition(doc, pointer())).toEqual({ x: 180, y: -2 });
    expect(snapTarget(doc, { x: 45, y: 190 })).toEqual({ id: 'r', index: 2 });
    doc = stepRecursionPointer(stepRecursionPointer(doc, 'p', 'next'), 'p', 'next');
    expect(pointer().attach?.index).toBe(2);
    doc = stepRecursionPointer(doc, 'p', 'up');
    expect(pointer().attach?.index).toBe(1);
  });
});

describe('building a recursion tree from text', () => {
  it('reads an indented outline with return values', () => {
    const parsed = parseRecursion('f(3) => 2\n  f(2) => 1\n    f(1) => 1\n    f(0) => 0\n  f(1) => 1');
    expect(parsed).toEqual({
      nodes: [
        { text: 'f(3)', parent: -1, ret: '2' },
        { text: 'f(2)', parent: 0, ret: '1' },
        { text: 'f(1)', parent: 1, ret: '1' },
        { text: 'f(0)', parent: 1, ret: '0' },
        { text: 'f(1)', parent: 0, ret: '1' },
      ],
    });
  });

  it('reads the tree command’s output, ASCII trees, and bullet lists, with edge labels', () => {
    expect(parseRecursion('[]\n├── +1 | [1]\n│   └── +2 | [1,2]\n└── +2 | [2]')).toEqual({
      nodes: [
        { text: '[]', parent: -1 },
        { text: '[1]', parent: 0, edge: '+1' },
        { text: '[1,2]', parent: 1, edge: '+2' },
        { text: '[2]', parent: 0, edge: '+2' },
      ],
    });
    const parents = (text: string) => {
      const parsed = parseRecursion(text);
      return 'nodes' in parsed ? parsed.nodes.map((n) => n.parent) : parsed;
    };
    expect(parents('f(2)\n|-- f(1)\n`-- f(0)')).toEqual([-1, 0, 0]);
    expect(parents('- a\n  - b\n    - c\n  - d')).toEqual([-1, 0, 1, 0]);
    expect(parents('-1\n  -2')).toEqual([-1, 0]);
  });

  it('explains what went wrong', () => {
    expect(parseRecursion('a\nb')).toEqual({ error: 'badFormat' });
    expect(parseRecursion('  \n')).toEqual({ error: 'empty' });
    expect(parseRecursion(Array.from({ length: 9 }, (_, i) => `${' '.repeat(i * 2)}d${i}`).join('\n'))).toEqual({ error: 'tooDeep' });
    expect(parseRecursion(['root', ...Array.from({ length: 63 }, (_, i) => `  c${i}`)].join('\n'))).toEqual({ error: 'tooMany' });
  });

  it('writes the outline back so it reads the same, and describes it on one line', () => {
    const doc = treeDoc([
      { text: 'f(2)', parent: -1, ret: '1' },
      { text: 'f(1)', parent: 0, edge: 'n-1', ret: '1' },
      { text: 'f(0)', parent: 0, edge: 'n-2', cut: true },
    ]);
    expect(serializeRecursion(tree(doc))).toBe('f(2) => 1\n  n-1 | f(1) => 1\n  n-2 | f(0)');
    const parsed = parseRecursion(serializeRecursion(tree(doc)));
    expect('nodes' in parsed && parsed.nodes.map((n) => n.text)).toEqual(['f(2)', 'f(1)', 'f(0)']);
    expect(inlineRecursion(tree(doc))).toBe('f(2) = 1 (n-1: f(1) = 1, n-2: f(0) ✕)');
  });

  it('replaces the calls but keeps the name, even when a call looks like “name = …”', () => {
    let doc = addPointerAt(fibDoc(), 'r', 5, 'p');
    const result = applyStructureText(doc, 'r', 'n = 3\n  n = 2');
    expect('doc' in result).toBe(true);
    if (!('doc' in result)) return;
    doc = result.doc;
    expect(tree(doc).label).toBe('fib');
    expect(labelsOf(doc)).toEqual(['n = 3', 'n = 2']);
    expect((findElement(doc, 'p') as ElementOf<'pointer'>).attach).toBeUndefined();
  });
});

describe('saving and exporting recursion trees', () => {
  it('passes the sync schema only when every call comes after its caller', () => {
    expect(boardDocSchema.safeParse(fibDoc()).success).toBe(true);
    const bad = treeDoc([
      { text: 'a', parent: -1 },
      { text: 'b', parent: 2 },
      { text: 'c', parent: 0 },
    ]);
    expect(boardDocSchema.safeParse(bad).success).toBe(false);
    expect(boardDocSchema.safeParse(treeDoc([{ text: 'a', parent: 0 }])).success).toBe(false);
  });

  it('draws calls as rounded boxes with return values, and pruned branches dashed and faded', () => {
    let doc = updateRecursionNode(fibDoc(), 'r', 2, { ret: '1' });
    doc = updateRecursionNode(doc, 'r', 6, { cut: true });
    const svg = boardToSvg(doc, undefined, { measure: estimateWidth, front: 'front', back: 'back' })!.svg;
    expect(svg.match(/rx="7"/g)).toHaveLength(9);
    expect(svg).toContain('stroke-dasharray="5 4"');
    expect(svg.match(/opacity="0.6"/g)).toHaveLength(3);
    expect(svg).toContain('>1</text>');
  });
});

describe('keeping the selection clear of the selection bar', () => {
  const phone = { x: 0, y: 0, w: 390, h: 700 };
  const bottomBar = { x: 12, y: 520, w: 366, h: 150 };

  it('moves the board up when the bar at the bottom covers the selection', () => {
    expect(revealShift({ x: 100, y: 600, w: 80, h: 40 }, bottomBar, phone)).toBe(-132);
    expect(revealShift({ x: 100, y: 300, w: 80, h: 40 }, bottomBar, phone)).toBe(0);
    // 太高放不下：對齊上緣
    expect(revealShift({ x: 100, y: 100, w: 80, h: 600 }, bottomBar, phone)).toBe(-88);
  });

  it('moves the board down when the bar at the top covers it, and ignores things beside the bar', () => {
    const desktop = { x: 0, y: 0, w: 1280, h: 720 };
    const topBar = { x: 400, y: 12, w: 480, h: 50 };
    expect(revealShift({ x: 500, y: 30, w: 100, h: 40 }, topBar, desktop)).toBe(44);
    expect(revealShift({ x: 100, y: 30, w: 100, h: 40 }, topBar, desktop)).toBe(0);
  });
});
