import type { BoardDoc } from 'dsa-whiteboard';
import { array, board, complexity, dict, heap, lines, linked, note, pointer, pointerAtNone, queue, recursion, tree, variable } from './build';

// 參考板書：鏈結串列、樹、堆積、回溯。

// ---------- 206. Reverse Linked List ----------

export function reverseLinkedList(): BoardDoc {
  const [insight, structure, example, cost, edge] = lines(206);
  // 串列往右放一點：左邊要留給 prev = None 的 null
  const list = (links?: ('next' | 'prev' | 'none')[]) => linked('head', 80, 0, 'head', ['1', '2', '3'], links);
  // curr = None 放在左下：畫面依最後一步排版，左邊要留到 prev = None 那個 null 看得到
  const reversed = [list(['prev', 'prev']), pointer('prev', 'prev', 'head', 2), variable('curr', 0, 110, 'curr', 'None')];
  const result = complexity('cx', 540, 0, 'n', 'one pass over the nodes', '1', 'just prev, curr, and next');
  return board([
    { caption: insight, elements: [list()] },
    { caption: structure, elements: [list(), pointerAtNone('prev', 'prev', 'head'), pointer('curr', 'curr', 'head', 0)] },
    {
      caption: 'Save next = 2, point 1 back at prev (None), then move prev and curr forward.',
      elements: [list(['none', 'next']), pointer('prev', 'prev', 'head', 0), pointer('curr', 'curr', 'head', 1), pointer('next', 'next', 'head', 1)],
    },
    {
      caption: 'Save next = 3, point 2 back at 1, then move forward again.',
      elements: [list(['prev', 'next']), pointer('prev', 'prev', 'head', 1), pointer('curr', 'curr', 'head', 2), pointer('next', 'next', 'head', 2)],
    },
    { caption: example, elements: reversed },
    { caption: cost, elements: [...reversed, result] },
    { caption: edge, elements: [...reversed, result, note('edge', 540, 120, 'Empty list or a single node: return head as is.')] },
  ]);
}

// ---------- 104. Maximum Depth of Binary Tree ----------

export function maximumDepth(): BoardDoc {
  const [insight, structure, example, cost, edge] = lines(104);
  // 根 1，左邊一片葉子 2，右邊 3 還有一個子節點 4：深度 3
  const nodes = ['1', '2', '3', null, null, '4'];
  const depths = (rows: [string, string][]) => dict('depth', 260, 0, 'depth', rows);
  const done = [
    tree('root', 0, 0, 'root', nodes, ['green', 'green', 'green', null, null, 'green']),
    pointer('node', 'node', 'root', 0),
    depths([
      ['2', '1'],
      ['4', '1'],
      ['3', '2'],
      ['1', '3'],
    ]),
  ];
  const result = complexity('cx', 480, 0, 'n', 'every node is visited once', 'h', 'the recursion goes as deep as the tree');
  return board([
    { caption: insight, elements: [tree('root', 0, 0, 'root', nodes)] },
    { caption: structure, elements: [tree('root', 0, 0, 'root', nodes), pointer('node', 'node', 'root', 0)] },
    {
      caption: 'The leaves return first: depth(2) = 1 and depth(4) = 1, because a missing child counts as 0.',
      elements: [
        tree('root', 0, 0, 'root', nodes, [null, 'green', null, null, null, 'green']),
        pointer('node', 'node', 'root', 5),
            depths([
          ['2', '1'],
          ['4', '1'],
        ]),
      ],
    },
    {
      caption: 'Back at 3: depth(3) = 1 + max(1, 0) = 2.',
      elements: [
        tree('root', 0, 0, 'root', nodes, [null, 'green', 'green', null, null, 'green']),
        pointer('node', 'node', 'root', 2),
            depths([
          ['2', '1'],
          ['4', '1'],
          ['3', '2'],
        ]),
      ],
    },
    { caption: example, elements: done },
    { caption: cost, elements: [...done, result] },
    { caption: edge, elements: [...done, result, note('edge', 480, 120, 'Empty tree: depth 0. BFS counting levels works too.')] },
  ]);
}

// ---------- 102. Binary Tree Level Order Traversal ----------

export function levelOrder(): BoardDoc {
  const [insight, structure, example, cost, edge] = lines(102);
  const nodes = ['3', '9', '20', null, null, '15', '7'];
  const level = (colors: ('green' | 'yellow' | null)[], q: string[], size: string, result: string) => [
    tree('root', 0, 0, 'root', nodes, colors),
    queue('queue', 300, 0, 'queue', q),
    variable('size', 300, 90, 'size', size),
    variable('result', 300, 140, 'result', result),
  ];
  const done = level(['green', 'green', 'green', null, null, 'green', 'green'], [], '2', '[[3], [9, 20], [15, 7]]');
  const result = complexity('cx', 600, 0, 'n', 'every node goes in and out of the queue once', 'w', 'the queue holds one level at a time');
  return board([
    { caption: insight, elements: [tree('root', 0, 0, 'root', nodes)] },
    { caption: structure, elements: level(['yellow', null, null, null, null, null, null], ['3'], '1', '[]') },
    { caption: 'Level 0: size is 1, so I pop 3 and push 9 and 20. result = [[3]].', elements: level(['green', 'yellow', 'yellow', null, null, null, null], ['9', '20'], '1', '[[3]]') },
    {
      caption: 'Level 1: size is 2, so I pop 9 and 20 and push 15 and 7. result = [[3], [9, 20]].',
      elements: level(['green', 'green', 'green', null, null, 'yellow', 'yellow'], ['15', '7'], '2', '[[3], [9, 20]]'),
    },
    { caption: example, elements: done },
    { caption: cost, elements: [...done, result] },
    { caption: edge, elements: [...done, result, note('edge', 680, 120, 'Empty tree: return [].', 200)] },
  ]);
}

// ---------- 215. Kth Largest Element in an Array ----------

export function kthLargest(): BoardDoc {
  const [insight, structure, example, cost, edge] = lines(215);
  const nums = (colors?: ('green' | 'yellow' | null)[]) => array('nums', 0, 0, 'nums', ['3', '2', '1', '5', '6', '4'], colors);
  const k = variable('k', 0, 140, 'k', '2');
  const done = [nums([null, null, null, 'green', 'green', null]), k, pointer('i', 'i', 'nums', 5), heap('heap', 300, 0, 'heap', ['5', '6']), variable('answer', 0, 190, 'answer', 'heap[0] = 5')];
  const result = complexity('cx', 460, 0, 'n log k', 'each push or pop costs log k', 'k', 'the heap never holds more than k');
  return board([
    { caption: insight, elements: [nums(), k] },
    { caption: structure, elements: [nums(), k, pointer('i', 'i', 'nums', 1), heap('heap', 300, 0, 'heap', ['2', '3'])] },
    {
      caption: 'i = 2: 1 goes in and the heap grows past k, so I pop the smallest, which is 1 again. The heap stays [2, 3].',
      elements: [nums(), k, pointer('i', 'i', 'nums', 2), heap('heap', 300, 0, 'heap', ['2', '3'])],
    },
    {
      caption: 'i = 3, 4: 5 pushes out 2, then 6 pushes out 3. The heap is [5, 6].',
      elements: [nums([null, null, null, 'yellow', 'yellow', null]), k, pointer('i', 'i', 'nums', 4), heap('heap', 300, 0, 'heap', ['5', '6'])],
    },
    { caption: example, elements: done },
    { caption: cost, elements: [...done, result] },
    { caption: edge, elements: [...done, result, note('edge', 460, 120, 'Duplicates count separately: it’s the kth largest, not the kth distinct.')] },
  ]);
}

// ---------- 78. Subsets ----------

export function subsets(): BoardDoc {
  const [insight, structure, example, cost, edge] = lines(78);
  const nums = array('nums', 0, 0, 'nums', ['1', '2', '3']);
  // 前序：[] → [1] → [1,2] → [1,2,3] → [1,3] → [2] → [2,3] → [3]
  const all = [
    { text: '[]', parent: -1 },
    { text: '[1]', parent: 0, edge: '+1' },
    { text: '[1,2]', parent: 1, edge: '+2' },
    { text: '[1,2,3]', parent: 2, edge: '+3' },
    { text: '[1,3]', parent: 1, edge: '+3' },
    { text: '[2]', parent: 0, edge: '+2' },
    { text: '[2,3]', parent: 5, edge: '+3' },
    { text: '[3]', parent: 0, edge: '+3' },
  ];
  const calls = (n: number) => recursion('calls', 0, 120, 'backtrack', all.slice(0, n));
  const done = [nums, calls(8), variable('count', 200, 22, 'subsets', '8 = 2^3')];
  const result = complexity('cx', 520, 0, 'n·2^n', '2^n subsets, each up to n long', 'n', 'the recursion is at most n deep');
  return board([
    { caption: insight, elements: [nums] },
    { caption: structure, elements: [nums, calls(1)] },
    { caption: 'From [], add 1, then 2, then 3. Every node on the way down is recorded as a subset.', elements: [nums, calls(4)] },
    { caption: 'Back up to [1] and try the next element, 3: that records [1, 3].', elements: [nums, calls(5)] },
    { caption: example, elements: done },
    { caption: cost, elements: [...done, result] },
    { caption: edge, elements: [...done, result, note('edge', 520, 130, 'Empty input: still one subset, [].', 200)] },
  ]);
}
