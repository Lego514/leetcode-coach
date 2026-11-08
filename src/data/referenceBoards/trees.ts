import type { BoardDoc } from 'dsa-whiteboard';
import type { ReferenceBoards } from './index';
import { array, board, complexity, dict, leetTree, lines, note, pointer, queue, stack, tree, variable, walk, type CellColor, type Colors } from './build';

// 參考板書：樹。版面橫著排，下面留給播放列；複雜度區塊和便利貼放右邊。

// ---------- 104. Maximum Depth of Binary Tree ----------

function maximumDepth(): BoardDoc {
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
    {
      caption: structure,
      elements: [tree('root', 0, 0, 'root', nodes), pointer('node', 'node', 'root', 0)],
    },
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
    {
      caption: edge,
      elements: [...done, result, note('edge', 480, 140, 'Empty tree: depth 0. BFS counting levels works too.')],
    },
  ]);
}

// ---------- 102. Binary Tree Level Order Traversal ----------

function levelOrder(): BoardDoc {
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
    {
      caption: structure,
      elements: level(['yellow', null, null, null, null, null, null], ['3'], '1', '[]'),
    },
    {
      caption: 'Level 0: size is 1, so I pop 3 and push 9 and 20. result = [[3]].',
      elements: level(['green', 'yellow', 'yellow', null, null, null, null], ['9', '20'], '1', '[[3]]'),
    },
    {
      caption: 'Level 1: size is 2, so I pop 9 and 20 and push 15 and 7. result = [[3], [9, 20]].',
      elements: level(['green', 'green', 'green', null, null, 'yellow', 'yellow'], ['15', '7'], '2', '[[3], [9, 20]]'),
    },
    { caption: example, elements: done },
    { caption: cost, elements: [...done, result] },
    {
      caption: edge,
      elements: [...done, result, note('edge', 680, 140, 'Empty tree: return [].', 200)],
    },
  ]);
}

// ---------- 226. Invert Binary Tree ----------

function invertTree(): BoardDoc {
  const t = (nodes: string[], colors?: Colors) => tree('root', 0, 0, 'root', nodes, colors);
  return walk(226, {
    open: [t(['4', '2', '7', '1', '3', '6', '9'])],
    setup: [t(['4', '2', '7', '1', '3', '6', '9']), pointer('node', 'node', 'root', 0)],
    before: [{ caption: 'At 4: swap 2 and 7. Their own children are swapped next.', elements: [t(['4', '7', '2', '6', '9', '1', '3'], ['green']), pointer('node', 'node', 'root', 1)] }],
    result: [t(['4', '7', '2', '9', '6', '3', '1'], Array<CellColor>(7).fill('green'))],
    cx: complexity('cx', 390, 0, 'n', 'every node is swapped once', 'h', 'recursion depth'),
    edge: note('edge', 390, 130, 'Empty tree: return None.'),
  });
}

// ---------- 543. Diameter of Binary Tree ----------

function diameterOfTree(): BoardDoc {
  const t = (colors?: Colors) => tree('root', 0, 0, 'root', ['1', '2', '3', '4', '5'], colors);
  return walk(543, {
    open: [t()],
    setup: [t(), pointer('node', 'node', 'root', 3), variable('h', 290, 0, 'height(4)', '1')],
    before: [
      {
        caption: 'At 2: left height 1 + right height 1 = a 2-edge path through 2.',
        elements: [t([null, 'yellow', null, 'yellow', 'yellow']), pointer('node', 'node', 'root', 1), variable('h', 290, 0, 'height(2)', '2'), variable('best', 290, 50, 'best', '2')],
      },
    ],
    result: [t(['green', 'green', 'green', 'green', null]), pointer('node', 'node', 'root', 0), variable('h', 290, 0, 'at 1', '2 + 1'), variable('best', 290, 50, 'best', '3 edges')],
    cx: complexity('cx', 480, 0, 'n', 'each node visited once', 'h', 'recursion depth'),
    edge: note('edge', 480, 130, 'The longest path may skip the root: check every node.'),
  });
}

// ---------- 110. Balanced Binary Tree ----------

function isBalanced(): BoardDoc {
  const nodes = ['1', '2', '2', '3', '3', null, null, '4', '4'];
  const t = (colors?: Colors) => tree('root', 0, 0, 'root', nodes, colors);
  return walk(110, {
    open: [t()],
    setup: [t(), pointer('node', 'node', 'root', 7), variable('ret', 390, 0, 'returns', 'height, or -1')],
    before: [
      {
        caption: 'Heights come back up: 4 gives 1, 3 gives 2, and the left 2 gives 3.',
        elements: [t([null, 'green', null, 'green', 'green', null, null, 'green', 'green']), pointer('node', 'node', 'root', 1), variable('ret', 390, 0, 'height(left 2)', '3')],
      },
    ],
    result: [t(['red', 'green', 'green', 'green', 'green', null, null, 'green', 'green']), pointer('node', 'node', 'root', 0), variable('ret', 390, 0, 'at 1', '3 vs 1: return -1')],
    cx: complexity('cx', 390, 60, 'n', 'one bottom-up pass', 'h', 'recursion depth'),
    edge: note('edge', 390, 200, 'Empty tree: balanced. Recomputing heights would be O(n²).'),
  });
}

// ---------- 100. Same Tree ----------

function isSameTree(): BoardDoc {
  const pair = (colors?: Colors) => [tree('p', 0, 0, 'p', ['1', '2', '3'], colors), tree('q', 190, 0, 'q', ['1', '2', '3'], colors)];
  const bad = [tree('p2', 0, 190, 'p', ['1', '2'], [null, 'red']), tree('q2', 190, 190, 'q', ['1', null, '2'], [null, null, 'red'])];
  return walk(100, {
    open: pair(),
    setup: [...pair(['green']), pointer('a', 'a', 'p', 1), pointer('b', 'b', 'q', 1)],
    result: [...pair(['green', 'green', 'green']), ...bad],
    cx: complexity('cx', 380, 0, 'n', 'each pair of nodes once', 'h', 'recursion depth'),
    edge: note('edge', 380, 130, 'Both None: match. Only one None: mismatch.'),
  });
}

// ---------- 101. Symmetric Tree ----------

function isSymmetric(): BoardDoc {
  const t = (colors?: Colors) => tree('root', 0, 0, 'root', ['1', '2', '2', '3', '4', '4', '3'], colors);
  return walk(101, {
    open: [t()],
    setup: [t([null, 'yellow', 'yellow']), pointer('a', 'a', 'root', 1), pointer('b', 'b', 'root', 2)],
    before: [
      { caption: 'Outer pair: 3 with 3. Inner pair: 4 with 4.', elements: [t([null, 'green', 'green', 'yellow', null, null, 'yellow']), pointer('a', 'a', 'root', 3), pointer('b', 'b', 'root', 6)] },
    ],
    result: [t(Array<CellColor>(7).fill('green')), variable('ans', 390, 0, 'return', 'True')],
    cx: complexity('cx', 390, 60, 'n', 'each node compared once', 'h', 'recursion depth'),
    edge: note('edge', 390, 200, 'Empty tree: symmetric.'),
  });
}

// ---------- 572. Subtree of Another Tree ----------

function isSubtree(): BoardDoc {
  const t = (colors?: Colors) => tree('root', 0, 0, 'root', ['3', '4', '5', '1', '2'], colors);
  const sub = (colors?: Colors) => tree('sub', 290, 0, 'subRoot', ['4', '1', '2'], colors);
  return walk(572, {
    open: [t(), sub()],
    setup: [t(['red']), sub(), pointer('node', 'node', 'root', 0), variable('try', 290, 170, 'same(3, 4)', 'False')],
    result: [t([null, 'green', null, 'green', 'green']), sub(['green', 'green', 'green']), pointer('node', 'node', 'root', 1), variable('try', 290, 170, 'same(4, 4)', 'True')],
    cx: complexity('cx', 500, 0, 'm · n', 'a same-tree check per node', 'h', 'recursion depth'),
    edge: note('edge', 500, 130, 'Extra nodes under the match: not a subtree.'),
  });
}

// ---------- 108. Convert Sorted Array to BST ----------

function sortedArrayToBST(): BoardDoc {
  const nums = (colors?: Colors) => array('nums', 0, 0, 'nums', ['-10', '-3', '0', '5', '9'], colors);
  const t = (nodes: (string | null)[]) => tree('root', 0, 140, 'root', nodes);
  return walk(108, {
    open: [nums()],
    setup: [nums(), pointer('lo', 'lo', 'nums', 0), pointer('hi', 'hi', 'nums', 4)],
    before: [{ caption: 'mid = 2: 0 is the root. [-10, -3] builds the left side, [5, 9] the right.', elements: [nums([null, null, 'green']), pointer('mid', 'mid', 'nums', 2), t(['0'])] }],
    result: [nums(['green', 'green', 'green', 'green', 'green']), t(['0', '-3', '9', '-10', null, '5'])],
    cx: complexity('cx', 300, 0, 'n', 'each value becomes one node', 'log n', 'recursion depth'),
    edge: note('edge', 300, 150, 'Even length: either middle gives a valid answer.'),
  });
}

// ---------- 235. Lowest Common Ancestor of a BST ----------

function lcaBST(): BoardDoc {
  const nodes = ['6', '2', '8', '0', '4', '7', '9', null, null, '3', '5'];
  const t = (colors?: Colors) => tree('root', 0, 0, 'root', nodes, colors);
  const pq = [variable('p', 490, 0, 'p', '2'), variable('q', 600, 0, 'q', '8')];
  return walk(235, {
    open: [t(), ...pq],
    setup: [t([null, 'yellow', 'yellow']), ...pq, pointer('node', 'node', 'root', 0)],
    result: [t(['green', 'yellow', 'yellow']), ...pq, pointer('node', 'node', 'root', 0), variable('ans', 490, 50, '2 < 6 < 8', 'split here: 6')],
    cx: complexity('cx', 490, 100, 'h', 'one step down per level', '1', 'iterative'),
    edge: note('edge', 490, 240, 'p is above q: stop at p, it equals p.'),
  });
}

// ---------- 236. Lowest Common Ancestor of a Binary Tree ----------

function lcaBinaryTree(): BoardDoc {
  const nodes = ['3', '5', '1', '6', '2', '0', '8', null, null, '7', '4'];
  const t = (colors?: Colors) => tree('root', 0, 0, 'root', nodes, colors);
  const pq = [variable('p', 490, 0, 'p', '5'), variable('q', 600, 0, 'q', '1')];
  return walk(236, {
    open: [t(), ...pq],
    setup: [t(), ...pq, pointer('node', 'node', 'root', 0)],
    before: [{ caption: 'The left side returns 5 as soon as it finds it; the right side returns 1.', elements: [t([null, 'yellow', 'yellow']), ...pq, pointer('node', 'node', 'root', 0)] }],
    result: [t(['green', 'yellow', 'yellow']), ...pq, variable('ans', 490, 50, 'both sides found', 'answer: 3')],
    cx: complexity('cx', 490, 100, 'n', 'each node visited once', 'h', 'recursion depth'),
    edge: note('edge', 490, 240, 'p above q: returning p first still works.'),
  });
}

// ---------- 103. Zigzag Level Order ----------

function zigzagLevelOrder(): BoardDoc {
  const t = (colors?: Colors) => tree('root', 0, 0, 'root', ['3', '9', '20', null, null, '15', '7'], colors);
  const ans = (value: string) => variable('ans', 0, 250, 'result', value);
  return walk(103, {
    open: [t()],
    setup: [t(['green']), queue('q', 290, 0, 'queue', ['9', '20']), ans('[[3]]')],
    before: [{ caption: 'Level 1 is read right to left: [20, 9].', elements: [t(['green', 'yellow', 'yellow']), queue('q', 290, 0, 'queue', ['15', '7']), ans('[[3], [20, 9]]')] }],
    result: [t(['green', 'yellow', 'yellow', null, null, 'green', 'green']), queue('q', 290, 0, 'queue', []), ans('[[3], [20, 9], [15, 7]]')],
    cx: complexity('cx', 440, 0, 'n', 'each node visited once', 'w', 'the widest level'),
    edge: note('edge', 440, 130, 'Empty tree: return [].'),
  });
}

// ---------- 199. Binary Tree Right Side View ----------

function rightSideView(): BoardDoc {
  const t = (colors?: Colors) => tree('root', 0, 0, 'root', ['1', '2', '3', null, '5', null, '4'], colors);
  const ans = (value: string) => variable('ans', 290, 0, 'view', value);
  return walk(199, {
    open: [t()],
    setup: [t(['green']), ans('[1]')],
    before: [{ caption: 'Level 1 is [2, 3]: the last one is 3.', elements: [t(['green', null, 'green']), ans('[1, 3]')] }],
    result: [t(['green', null, 'green', null, null, null, 'green']), ans('[1, 3, 4]')],
    cx: complexity('cx', 290, 60, 'n', 'each node visited once', 'w', 'or h with DFS'),
    edge: note('edge', 290, 200, 'A deeper left branch shows on the levels below.'),
  });
}

// ---------- 1448. Count Good Nodes in Binary Tree ----------

function goodNodes(): BoardDoc {
  const t = (colors?: Colors) => tree('root', 0, 0, 'root', ['3', '1', '4', '3', null, '1', '5'], colors);
  return walk(1448, {
    open: [t()],
    setup: [t(['green']), pointer('node', 'node', 'root', 0), variable('max', 340, 0, 'max so far', '3')],
    before: [
      {
        caption: 'Down the left: 1 < 3 isn’t good, but the 3 below it ties the max, so it is.',
        elements: [t(['green', 'gray', null, 'green']), pointer('node', 'node', 'root', 3), variable('max', 340, 0, 'max so far', '3')],
      },
    ],
    result: [t(['green', 'gray', 'green', 'green', null, 'gray', 'green']), variable('count', 340, 0, 'good', '4')],
    cx: complexity('cx', 340, 60, 'n', 'each node visited once', 'h', 'recursion depth'),
    edge: note('edge', 340, 200, 'The root is always good.'),
  });
}

// ---------- 98. Validate Binary Search Tree ----------

function isValidBST(): BoardDoc {
  const t = (colors?: Colors) => tree('root', 0, 0, 'root', ['5', '1', '4', null, null, '3', '6'], colors);
  return walk(98, {
    open: [t()],
    setup: [t(), pointer('node', 'node', 'root', 0), variable('b', 290, 0, 'bounds', '(-inf, inf)')],
    before: [{ caption: 'Going right from 5, every node must be greater than 5.', elements: [t(['green', 'green']), pointer('node', 'node', 'root', 2), variable('b', 290, 0, 'bounds', '(5, inf)')] }],
    result: [t(['green', 'green', 'red', null, null, 'red']), pointer('node', 'node', 'root', 5), variable('b', 290, 0, 'bounds for 3', '(5, 4): invalid')],
    cx: complexity('cx', 290, 60, 'n', 'each node checked once', 'h', 'recursion depth'),
    edge: note('edge', 290, 200, 'Use None or infinity for bounds, not int limits.'),
  });
}

// ---------- 230. Kth Smallest Element in a BST ----------

function kthSmallest(): BoardDoc {
  const t = (colors?: Colors) => tree('root', 0, 0, 'root', ['3', '1', '4', null, '2'], colors);
  return walk(230, {
    open: [t(), variable('k', 330, 0, 'k', '1')],
    setup: [t(), stack('st', 250, 0, 'stack', ['3', '1']), pointer('node', 'node', 'root', 1)],
    result: [t([null, 'green']), stack('st', 250, 0, 'stack', ['3']), variable('ans', 330, 0, '1st pop', '1')],
    cx: complexity('cx', 480, 0, 'h + k', 'walk down, then k pops', 'h', 'the stack'),
    edge: note('edge', 480, 130, 'Many inserts: keep subtree sizes for O(h) lookups.'),
  });
}

// ---------- 285. Inorder Successor in BST ----------

function inorderSuccessor(): BoardDoc {
  const t = (colors?: Colors) => tree('root', 0, 0, 'root', ['2', '1', '3'], colors);
  return walk(285, {
    open: [t(), variable('p', 190, 0, 'p', '1')],
    setup: [t(), pointer('node', 'node', 'root', 0), variable('succ', 190, 0, 'successor', 'None')],
    before: [{ caption: '2 > 1: record 2 and go left.', elements: [t(['yellow']), pointer('node', 'node', 'root', 1), variable('succ', 190, 0, 'successor', '2')] }],
    result: [t(['green', 'gray']), variable('succ', 190, 0, 'successor', '2')],
    cx: complexity('cx', 380, 0, 'h', 'one step per level', '1', 'one saved node'),
    edge: note('edge', 380, 130, 'p is the largest: return None.'),
  });
}

// ---------- 105. Construct Tree from Preorder and Inorder ----------

function buildTree(): BoardDoc {
  const pre = (colors?: Colors) => array('pre', 0, 0, 'preorder', ['3', '9', '20', '15', '7'], colors);
  const ino = (colors?: Colors) => array('ino', 0, 120, 'inorder', ['9', '3', '15', '20', '7'], colors);
  const t = (nodes: (string | null)[], colors?: Colors) => tree('root', 270, 0, 'root', nodes, colors);
  return walk(105, {
    open: [pre(), ino()],
    setup: [pre(['yellow']), ino([null, 'yellow']), variable('idx', 270, 0, 'index_of', 'value → inorder index')],
    before: [{ caption: '3 is the root: [9] is left of it in inorder, [15, 20, 7] right of it.', elements: [pre(['yellow']), ino(['blue', 'yellow', 'green', 'green', 'green']), t(['3'])] }],
    result: [pre(Array<CellColor>(5).fill('green')), ino(Array<CellColor>(5).fill('green')), t(['3', '9', '20', null, null, '15', '7'], ['yellow', 'blue', 'green', null, null, 'green', 'green'])],
    cx: complexity('cx', 560, 0, 'n', 'each value placed once', 'n', 'the index map'),
    edge: note('edge', 560, 130, 'Relies on unique values (guaranteed).'),
  });
}

// ---------- 113. Path Sum II ----------

function pathSumII(): BoardDoc {
  const nodes = leetTree(['5', '4', '8', '11', null, '13', '4', '7', '2', null, null, '5', '1']);
  const t = (colors?: Colors) => tree('root', 0, 0, 'root', nodes, colors);
  const onPath = (idx: number[], color: CellColor): Colors => nodes.map((_, i) => (idx.includes(i) ? color : null));
  return walk(113, {
    open: [t(), variable('target', 540, 0, 'target', '22')],
    setup: [t(onPath([0], 'yellow')), pointer('node', 'node', 'root', 0), variable('path', 540, 0, 'path', '[5]')],
    before: [
      {
        caption: '5 → 4 → 11 → 7 sums to 27 at a leaf: no. Pop 7 and try 2.',
        elements: [t(onPath([0, 1, 3, 7], 'red')), pointer('node', 'node', 'root', 7), variable('path', 540, 0, 'path', '[5, 4, 11, 7]')],
      },
    ],
    result: [t(onPath([0, 1, 3, 8], 'green')), pointer('node', 'node', 'root', 8), variable('path', 540, 0, 'found', '[5, 4, 11, 2], [5, 8, 4, 5]')],
    cx: complexity('cx', 540, 60, 'n²', 'copying a path costs up to n', 'h', 'besides the output'),
    edge: note('edge', 540, 200, 'Only count paths that end at a leaf.'),
  });
}

// ---------- 437. Path Sum III ----------

function pathSumIII(): BoardDoc {
  const nodes = ['10', '5', '-3', '3', '2', null, '11', '3', '-2', null, '1'];
  const t = (colors?: Colors) => tree('root', 0, 0, 'root', nodes, colors);
  const seen = (rows: [string, string][]) => dict('seen', 490, 0, 'prefix count', rows);
  return walk(437, {
    open: [t(), variable('target', 490, 0, 'target', '8')],
    setup: [t(['yellow']), pointer('node', 'node', 'root', 0), seen([['0', '1']])],
    result: [
      t(['yellow', 'green', null, 'green']),
      pointer('node', 'node', 'root', 3),
      seen([
        ['0', '1'],
        ['10', '1'],
        ['15', '1'],
      ]),
      variable('hit', 0, 330, 'at 3', 'prefix 18, 18 - 8 = 10 seen once'),
    ],
    cx: complexity('cx', 650, 0, 'n', 'one DFS', 'h', 'prefix sums on the path'),
    edge: note('edge', 650, 130, 'Seed prefix 0 → 1 for paths from the root.'),
  });
}

// ---------- 662. Maximum Width of Binary Tree ----------

function widthOfBinaryTree(): BoardDoc {
  const t = (colors?: Colors) => tree('root', 0, 0, 'root', ['1', '3', '2', '5', '3', null, '9'], colors);
  return walk(662, {
    open: [t()],
    setup: [t(['yellow']), variable('rule', 340, 0, 'children of i', '2i and 2i + 1')],
    before: [{ caption: 'Level 1: indices 2 and 3, width 2.', elements: [t([null, 'yellow', 'yellow']), variable('rule', 340, 0, 'level 1', '3 - 2 + 1 = 2')] }],
    result: [t([null, null, null, 'green', 'green', null, 'green']), variable('rule', 340, 0, 'level 2', '7 - 4 + 1 = 4')],
    cx: complexity('cx', 340, 60, 'n', 'BFS over every node', 'w', 'the widest level'),
    edge: note('edge', 340, 200, 'Deep sparse trees: subtract the level’s first index.'),
  });
}

// ---------- 863. All Nodes Distance K ----------

function distanceK(): BoardDoc {
  const nodes = ['3', '5', '1', '6', '2', '0', '8', null, null, '7', '4'];
  const t = (colors?: Colors) => tree('root', 0, 0, 'root', nodes, colors);
  return walk(863, {
    open: [t(), variable('k', 490, 0, 'target, k', '5, 2')],
    setup: [t([null, 'blue']), variable('par', 490, 0, 'parent', 'each node → its parent')],
    before: [{ caption: 'Distance 1 from 5: its children 6 and 2, and its parent 3.', elements: [t(['yellow', 'blue', null, 'yellow', 'yellow'])] }],
    result: [t(['gray', 'blue', 'green', 'gray', 'gray', null, null, null, null, 'green', 'green']), variable('ans', 490, 0, 'distance 2', '[7, 4, 1]')],
    cx: complexity('cx', 490, 60, 'n', 'parents, then one BFS', 'n', 'parent map and visited'),
    edge: note('edge', 490, 200, 'k = 0: just the target.'),
  });
}

// ---------- 124. Binary Tree Maximum Path Sum ----------

function maxPathSum(): BoardDoc {
  const t = (colors?: Colors) => tree('root', 0, 0, 'root', ['-10', '9', '20', null, null, '15', '7'], colors);
  return walk(124, {
    open: [t()],
    setup: [t(), pointer('node', 'node', 'root', 5), variable('ret', 290, 0, 'returns', 'node + best branch')],
    before: [
      {
        caption: 'At 20: 15 + 20 + 7 = 42 bends through 20; it returns 20 + 15 = 35 upward.',
        elements: [t([null, null, 'green', null, null, 'green', 'green']), pointer('node', 'node', 'root', 2), variable('best', 290, 0, 'best', '42')],
      },
    ],
    result: [t(['gray', null, 'green', null, null, 'green', 'green']), variable('best', 290, 0, 'best', '42'), variable('root', 290, 50, 'through -10', '9 - 10 + 35 = 34')],
    cx: complexity('cx', 290, 110, 'n', 'each node visited once', 'h', 'recursion depth'),
    edge: note('edge', 290, 250, 'Negative branches count as 0: leave them out.'),
  });
}

// ---------- 297. Serialize and Deserialize Binary Tree ----------

function serializeTree(): BoardDoc {
  const t = (colors?: Colors) => tree('root', 0, 0, 'root', ['1', '2', '3', null, null, '4', '5'], colors);
  const all = ['1', '2', '#', '#', '3', '4', '#', '#', '5', '#', '#'];
  const tokens = (count: number) =>
    array(
      'tok',
      0,
      250,
      'out',
      all.slice(0, count),
      all.slice(0, count).map((s) => (s === '#' ? 'gray' : 'green')),
    );
  return walk(297, {
    open: [t()],
    setup: [t(), pointer('node', 'node', 'root', 0), tokens(1)],
    before: [{ caption: 'Preorder: 1, then 2 and its two empty children, written as #.', elements: [t(['green', 'green']), pointer('node', 'node', 'root', 1), tokens(4)] }],
    result: [t(Array<CellColor>(7).fill('green')), tokens(11)],
    cx: complexity('cx', 290, 0, 'n', 'each node written and read once', 'n', 'the string'),
    edge: note('edge', 290, 130, 'Commas separate tokens, so -12 reads back fine.'),
  });
}

export const BOARDS: ReferenceBoards = {
  104: maximumDepth,
  102: levelOrder,
  226: invertTree,
  543: diameterOfTree,
  110: isBalanced,
  100: isSameTree,
  101: isSymmetric,
  572: isSubtree,
  108: sortedArrayToBST,
  235: lcaBST,
  236: lcaBinaryTree,
  103: zigzagLevelOrder,
  199: rightSideView,
  1448: goodNodes,
  98: isValidBST,
  230: kthSmallest,
  285: inorderSuccessor,
  105: buildTree,
  113: pathSumII,
  437: pathSumIII,
  662: widthOfBinaryTree,
  863: distanceK,
  124: maxPathSum,
  297: serializeTree,
};
