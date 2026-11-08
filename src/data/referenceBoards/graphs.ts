import type { BoardDoc } from 'dsa-whiteboard';
import type { ReferenceBoards } from './index';
import { array, board, chain, complexity, dict, graph, grid, lines, note, queue, table, ugraph, unionFind, variable, walk, type Colors } from './build';

// 參考板書：圖。版面橫著排，下面留給播放列；複雜度區塊和便利貼放右邊。

// ---------- 200. Number of Islands ----------

function numberOfIslands(): BoardDoc {
  const [insight, structure, example, cost, edge] = lines(200);
  // 兩塊島：左上三格、右下三格。沉下去的陸地改成 0，跟程式做的一樣
  const start = [
    ['1', '1', '0', '0'],
    ['1', '0', '0', '1'],
    ['0', '0', '1', '1'],
  ];
  const firstSunk = [
    ['0', '0', '0', '0'],
    ['0', '0', '0', '1'],
    ['0', '0', '1', '1'],
  ];
  const allSunk = [
    ['0', '0', '0', '0'],
    ['0', '0', '0', '0'],
    ['0', '0', '0', '0'],
  ];
  const done = [grid('grid', 0, 0, 'grid', allSunk), variable('count', 300, 22, 'count', '2')];
  const result = complexity('cx', 300, 80, 'm·n', 'every cell is scanned and sunk at most once', 'm·n', 'DFS can go as deep as the whole grid');
  return board([
    { caption: insight, elements: [grid('grid', 0, 0, 'grid', start)] },
    {
      caption: structure,
      elements: [grid('grid', 0, 0, 'grid', start), variable('count', 300, 22, 'count', '0')],
    },
    {
      caption: '(0, 0) is land: count becomes 1, and DFS sinks (0, 0), (0, 1), and (1, 0), the whole first island.',
      elements: [grid('grid', 0, 0, 'grid', firstSunk), variable('count', 300, 22, 'count', '1')],
    },
    { caption: example, elements: done },
    { caption: cost, elements: [...done, result] },
    {
      caption: edge,
      elements: [...done, result, note('edge', 680, 22, 'Diagonal cells don’t connect: only up, down, left, right.')],
    },
  ]);
}

// ---------- 207. Course Schedule ----------

function courseSchedule(): BoardDoc {
  const [insight, structure, example, cost, edge] = lines(207);
  // prerequisites = [[1, 0], [0, 1]]：0 → 1 而且 1 → 0，是一個環
  const courses = (colors?: ('red' | null)[]) =>
    graph(
      'courses',
      0,
      0,
      'courses',
      ['0', '1'],
      [
        { a: 0, b: 1 },
        { a: 1, b: 0 },
      ],
      colors,
    );
  const counts = [array('indegree', 260, 0, 'indegree', ['1', '1']), queue('queue', 260, 100, 'queue', [])];
  const done = [courses(['red', 'red']), ...counts, variable('taken', 260, 200, 'processed', '0 < 2 → False')];
  const result = complexity('cx', 520, 0, 'V + E', 'each course and prerequisite is handled once', 'V + E', 'the graph, indegrees, and queue');
  return board([
    { caption: insight, elements: [courses()] },
    { caption: structure, elements: [courses(), ...counts] },
    { caption: example, elements: done },
    { caption: cost, elements: [...done, result] },
    {
      caption: edge,
      elements: [...done, result, note('edge', 520, 140, 'Indegree 0 starts in the queue; processed < numCourses means a cycle.', 320)],
    },
  ]);
}

// ---------- 733. Flood Fill ----------

function floodFill(): BoardDoc {
  const image = (rows: string[][]) => grid('img', 0, 0, 'image', rows);
  return walk(733, {
    open: [
      image([
        ['1', '1', '1'],
        ['1', '1', '0'],
        ['1', '0', '1'],
      ]),
    ],
    setup: [
      image([
        ['1', '1', '1'],
        ['1', '1', '0'],
        ['1', '0', '1'],
      ]),
      variable('s', 200, 0, 'start', '(1, 1), color 2'),
    ],
    before: [
      {
        caption: '(1, 1) becomes 2, and its 1-neighbors above and to the left are next.',
        elements: [
          image([
            ['1', '2', '1'],
            ['2', '2', '0'],
            ['1', '0', '1'],
          ]),
          variable('s', 200, 0, 'start', '(1, 1), color 2'),
        ],
      },
    ],
    result: [
      image([
        ['2', '2', '2'],
        ['2', '2', '0'],
        ['2', '0', '1'],
      ]),
      variable('s', 200, 0, 'corner (2, 2)', 'not connected: stays 1'),
    ],
    cx: complexity('cx', 200, 60, 'm·n', 'each cell painted once', 'm·n', 'DFS depth in the worst case'),
    edge: note('edge', 200, 200, 'New color = old color: return right away.'),
  });
}

// ---------- 695. Max Area of Island ----------

function maxAreaOfIsland(): BoardDoc {
  const g = (rows: string[][]) => grid('g', 0, 0, 'grid', rows);
  const start = [
    ['0', '0', '1', '0', '0'],
    ['0', '1', '1', '1', '0'],
    ['0', '0', '1', '1', '0'],
    ['1', '0', '0', '0', '0'],
  ];
  const sunk = [
    ['0', '0', '0', '0', '0'],
    ['0', '0', '0', '0', '0'],
    ['0', '0', '0', '0', '0'],
    ['1', '0', '0', '0', '0'],
  ];
  const best = (value: string) => variable('best', 290, 0, 'best', value);
  return walk(695, {
    open: [g(start)],
    setup: [g(start), best('0')],
    before: [{ caption: 'DFS from (0, 2) sinks that island and returns 1 + its neighbors’ sizes = 6.', elements: [g(sunk), best('6')] }],
    result: [g(sunk.map((row) => row.map(() => '0'))), best('6'), variable('last', 290, 50, 'island at (3, 0)', '1')],
    cx: complexity('cx', 290, 110, 'm·n', 'each cell sunk once', 'm·n', 'DFS depth'),
    edge: note('edge', 290, 250, 'No land: return 0.'),
  });
}

// ---------- 133. Clone Graph ----------

function cloneGraph(): BoardDoc {
  const square = [
    { a: 0, b: 1 },
    { a: 1, b: 2 },
    { a: 2, b: 3 },
    { a: 3, b: 0 },
  ];
  const original = ugraph('g', 0, 0, 'original', ['1', '2', '3', '4'], square);
  const copy = (nodes: string[], edges: { a: number; b: number }[]) =>
    ugraph(
      'c',
      240,
      0,
      'copy',
      nodes,
      edges,
      nodes.map(() => 'green'),
    );
  return walk(133, {
    open: [original],
    setup: [original, variable('map', 0, 240, 'copies', '{}')],
    before: [
      {
        caption: 'Copy 1, then visit 2: copy it and link 1′ to 2′. 2’s neighbor 3 is next.',
        elements: [original, copy(['1′', '2′'], [{ a: 0, b: 1 }]), variable('map', 0, 240, 'copies', '{1: 1′, 2: 2′}')],
      },
    ],
    result: [original, copy(['1′', '2′', '3′', '4′'], square), variable('map', 0, 240, 'copies', '{1: 1′, 2: 2′, 3: 3′, 4: 4′}')],
    cx: complexity('cx', 480, 0, 'V + E', 'each node and edge once', 'V', 'the map'),
    edge: note('edge', 480, 130, 'Empty graph: the input node is None.'),
  });
}

// ---------- 286. Walls and Gates ----------

function wallsAndGates(): BoardDoc {
  const rooms = (rows: string[][]) => grid('r', 0, 0, 'rooms (# = wall)', rows);
  return walk(286, {
    open: [
      rooms([
        ['∞', '#', '0', '∞'],
        ['∞', '∞', '∞', '#'],
        ['∞', '#', '∞', '#'],
        ['0', '#', '∞', '∞'],
      ]),
    ],
    setup: [
      rooms([
        ['∞', '#', '0', '∞'],
        ['∞', '∞', '∞', '#'],
        ['∞', '#', '∞', '#'],
        ['0', '#', '∞', '∞'],
      ]),
      variable('q', 240, 0, 'queue', 'both gates: (0, 2), (3, 0)'),
    ],
    before: [
      {
        caption: 'One BFS step from both gates fills every room at distance 1.',
        elements: [
          rooms([
            ['∞', '#', '0', '1'],
            ['∞', '∞', '1', '#'],
            ['1', '#', '∞', '#'],
            ['0', '#', '∞', '∞'],
          ]),
        ],
      },
    ],
    result: [
      rooms([
        ['3', '#', '0', '1'],
        ['2', '2', '1', '#'],
        ['1', '#', '2', '#'],
        ['0', '#', '3', '4'],
      ]),
    ],
    cx: complexity('cx', 240, 0, 'm·n', 'each room filled once', 'm·n', 'the queue'),
    edge: note('edge', 240, 140, 'Walls, and rooms no gate reaches, stay as they are.'),
  });
}

// ---------- 994. Rotting Oranges ----------

function orangesRotting(): BoardDoc {
  const g = (rows: string[][]) => grid('g', 0, 0, 'grid (2 = rotten)', rows);
  const state = (minute: string, fresh: string) => [variable('min', 200, 0, 'minute', minute), variable('fresh', 200, 50, 'fresh', fresh)];
  return walk(994, {
    open: [
      g([
        ['2', '1', '1'],
        ['1', '1', '0'],
        ['0', '1', '1'],
      ]),
    ],
    setup: [
      g([
        ['2', '1', '1'],
        ['1', '1', '0'],
        ['0', '1', '1'],
      ]),
      ...state('0', '6'),
    ],
    before: [
      {
        caption: 'Minute 1: the two oranges next to the rotten one rot.',
        elements: [
          g([
            ['2', '2', '1'],
            ['2', '1', '0'],
            ['0', '1', '1'],
          ]),
          ...state('1', '4'),
        ],
      },
      {
        caption: 'Minute 2: the rot spreads one more step.',
        elements: [
          g([
            ['2', '2', '2'],
            ['2', '2', '0'],
            ['0', '1', '1'],
          ]),
          ...state('2', '2'),
        ],
      },
    ],
    result: [
      g([
        ['2', '2', '2'],
        ['2', '2', '0'],
        ['0', '2', '2'],
      ]),
      ...state('4', '0'),
    ],
    cx: complexity('cx', 200, 110, 'm·n', 'each orange rots once', 'm·n', 'the queue'),
    edge: note('edge', 200, 250, 'Fresh ones left that rot can’t reach: -1. None fresh: 0.'),
  });
}

// ---------- 542. 01 Matrix ----------

function updateMatrix(): BoardDoc {
  const g = (rows: string[][]) => grid('g', 0, 0, 'dist', rows);
  return walk(542, {
    open: [
      grid('g', 0, 0, 'mat', [
        ['0', '0', '0'],
        ['0', '1', '0'],
        ['1', '1', '1'],
      ]),
    ],
    setup: [
      g([
        ['0', '0', '0'],
        ['0', '∞', '0'],
        ['∞', '∞', '∞'],
      ]),
      variable('q', 200, 0, 'queue', 'every 0'),
    ],
    before: [
      {
        caption: 'Step 1: each ∞ next to a 0 becomes 1.',
        elements: [
          g([
            ['0', '0', '0'],
            ['0', '1', '0'],
            ['1', '∞', '1'],
          ]),
        ],
      },
    ],
    result: [
      g([
        ['0', '0', '0'],
        ['0', '1', '0'],
        ['1', '2', '1'],
      ]),
    ],
    cx: complexity('cx', 200, 0, 'm·n', 'each cell set once', 'm·n', 'the queue'),
    edge: note('edge', 200, 140, 'There is always a 0, so every cell gets a distance.'),
  });
}

// ---------- 417. Pacific Atlantic Water Flow ----------

function pacificAtlantic(): BoardDoc {
  const heights = grid('h', 0, 0, 'heights', [
    ['1', '2', '2', '3', '5'],
    ['3', '2', '3', '4', '4'],
    ['2', '4', '5', '3', '1'],
    ['6', '7', '1', '4', '5'],
    ['5', '1', '1', '2', '4'],
  ]);
  const reach = (label: string, rows: string[]) =>
    grid(
      'r',
      280,
      0,
      label,
      rows.map((row) => [...row]),
    );
  return walk(417, {
    open: [heights],
    setup: [heights, variable('dir', 280, 0, 'search', 'uphill from each border')],
    before: [{ caption: 'Uphill from the top and left edges marks what reaches the Pacific (P).', elements: [heights, reach('P = Pacific', ['PPPPP', 'PPPPP', 'PPP..', 'PP...', 'P....'])] }],
    result: [heights, reach('B = both oceans', ['PPPPB', 'PPPBB', 'PPBAA', 'BBAAA', 'BAAAA'])],
    cx: complexity('cx', 560, 0, 'm·n', 'each search visits a cell once', 'm·n', 'two visited sets'),
    edge: note('edge', 560, 130, 'The top-right and bottom-left corners touch both oceans.'),
  });
}

// ---------- 130. Surrounded Regions ----------

function surroundedRegions(): BoardDoc {
  const b = (rows: string[]) =>
    grid(
      'b',
      0,
      0,
      'board',
      rows.map((row) => [...row]),
    );
  return walk(130, {
    open: [b(['XXXX', 'XOOX', 'XXOX', 'XOXX'])],
    setup: [b(['XXXX', 'XOOX', 'XXOX', 'XSXX']), variable('s', 240, 0, 'S', 'border O: safe')],
    result: [b(['XXXX', 'XXXX', 'XXXX', 'XOXX']), variable('s', 240, 0, 'flip', 'O → X, then S → O')],
    cx: complexity('cx', 240, 60, 'm·n', 'each cell visited once', 'm·n', 'DFS depth'),
    edge: note('edge', 240, 200, 'Fewer than 3 rows or columns: nothing is surrounded.'),
  });
}

// ---------- 210. Course Schedule II ----------

function findOrder(): BoardDoc {
  const edges = [
    { a: 0, b: 1 },
    { a: 0, b: 2 },
    { a: 1, b: 3 },
    { a: 2, b: 3 },
  ];
  const g = (colors?: Colors) => graph('g', 0, 0, 'courses', ['0', '1', '2', '3'], edges, colors);
  const state = (indeg: string[], q: string[], order: string[]) => [array('in', 260, 0, 'indegree', indeg), queue('q', 260, 110, 'queue', q), array('order', 260, 220, 'order', order)];
  return walk(210, {
    open: [g()],
    setup: [g(), ...state(['0', '1', '1', '2'], ['0'], [])],
    before: [{ caption: 'Take 0: courses 1 and 2 drop to indegree 0 and join the queue.', elements: [g(['green']), ...state(['0', '0', '0', '2'], ['1', '2'], ['0'])] }],
    result: [g(['green', 'green', 'green', 'green']), ...state(['0', '0', '0', '0'], [], ['0', '1', '2', '3'])],
    cx: complexity('cx', 480, 0, 'V + E', 'each course and edge once', 'V + E', 'graph and indegrees'),
    edge: note('edge', 480, 130, 'A cycle leaves courses out: return [].'),
  });
}

// ---------- 310. Minimum Height Trees ----------

function minHeightTrees(): BoardDoc {
  const path = (colors?: Colors) => chain('p', 0, 0, 'edges (a path)', ['0', '1', '2', '3'], { colors });
  return walk(310, {
    open: [path()],
    setup: [path(), array('deg', 0, 110, 'degree', ['1', '2', '2', '1'])],
    result: [path(['gray', 'green', 'green', 'gray']), array('deg', 0, 110, 'degree', ['0', '1', '1', '0']), variable('ans', 220, 132, 'centers', '[1, 2]')],
    cx: complexity('cx', 400, 0, 'n', 'each leaf removed once', 'n', 'degrees and the queue'),
    edge: note('edge', 400, 130, 'n = 1: the only node is the answer.'),
  });
}

// ---------- 261. Graph Valid Tree ----------

function validTree(): BoardDoc {
  const star = ugraph(
    'g',
    0,
    0,
    'edges',
    ['0', '1', '2', '3', '4'],
    [
      { a: 0, b: 1 },
      { a: 0, b: 2 },
      { a: 0, b: 3 },
      { a: 0, b: 4 },
    ],
  );
  return walk(261, {
    open: [star],
    setup: [star, variable('cnt', 0, 240, 'edges', '4 = n - 1')],
    before: [{ caption: 'Union 0-1 and 0-2: different roots, so no cycle yet.', elements: [star, unionFind('uf', 260, 0, 'parent', [0, 0, 0, 3, 4])] }],
    result: [star, unionFind('uf', 260, 0, 'parent', [0, 0, 0, 0, 0]), variable('ans', 0, 240, 'return', 'True')],
    cx: complexity('cx', 540, 0, 'n·α(n)', 'near-constant unions', 'n', 'the parent array'),
    edge: note('edge', 540, 130, 'Edge count ≠ n - 1: return False first.'),
  });
}

// ---------- 323. Number of Connected Components ----------

function countComponents(): BoardDoc {
  const g = ugraph(
    'g',
    0,
    0,
    'edges',
    ['0', '1', '2', '3', '4'],
    [
      { a: 0, b: 1 },
      { a: 1, b: 2 },
      { a: 3, b: 4 },
    ],
  );
  return walk(323, {
    open: [g],
    setup: [g, unionFind('uf', 260, 0, 'parent', [0, 1, 2, 3, 4]), variable('c', 0, 240, 'components', '5')],
    before: [{ caption: 'Union 0-1 and 1-2: two successful unions, so 5 - 2 = 3.', elements: [g, unionFind('uf', 260, 0, 'parent', [0, 0, 0, 3, 4]), variable('c', 0, 240, 'components', '3')] }],
    result: [g, unionFind('uf', 260, 0, 'parent', [0, 0, 0, 3, 3]), variable('c', 0, 240, 'components', '2')],
    cx: complexity('cx', 540, 0, 'E·α(n)', 'one union per edge', 'n', 'the parent array'),
    edge: note('edge', 540, 130, 'Isolated nodes each count as a component.'),
  });
}

// ---------- 684. Redundant Connection ----------

function redundantConnection(): BoardDoc {
  const g = (marked: boolean) =>
    ugraph(
      'g',
      0,
      0,
      'edges',
      ['1', '2', '3'],
      [
        { a: 0, b: 1 },
        { a: 0, b: 2 },
        { a: 1, b: 2, mark: marked },
      ],
    );
  return walk(684, {
    open: [g(false)],
    setup: [g(false), unionFind('uf', 240, 0, 'parent (0 unused)', [0, 1, 2, 3])],
    before: [{ caption: '[1, 2] and [1, 3] join different sets: 2 and 3 now share root 1.', elements: [g(false), unionFind('uf', 240, 0, 'parent (0 unused)', [0, 1, 1, 1])] }],
    result: [g(true), unionFind('uf', 240, 0, 'parent (0 unused)', [0, 1, 1, 1]), variable('ans', 0, 240, 'find(2) == find(3)', 'return [2, 3]')],
    cx: complexity('cx', 500, 0, 'n·α(n)', 'one union per edge', 'n', 'the parent array'),
    edge: note('edge', 500, 130, 'Edges are processed in order, so this is the last such edge.'),
  });
}

// ---------- 721. Accounts Merge ----------

function accountsMerge(): BoardDoc {
  const emails = table('e', 0, 0, 'emails', [
    ['0', '1', '2', '3'],
    ['a@x', 'b@x', 'c@x', 'm@x'],
  ]);
  return walk(721, {
    open: [variable('acc', 0, 0, 'accounts', 'John: a, b · John: b, c · Mary: m')],
    setup: [emails, unionFind('uf', 300, 0, 'parent', [0, 1, 2, 3])],
    before: [{ caption: 'Account 1 unites a and b; account 2 unites b and c, so all three share root a.', elements: [emails, unionFind('uf', 300, 0, 'parent', [0, 0, 0, 3])] }],
    result: [emails, unionFind('uf', 300, 0, 'parent', [0, 0, 0, 3]), variable('john', 0, 150, 'John', 'a@x, b@x, c@x'), variable('mary', 0, 200, 'Mary', 'm@x')],
    cx: complexity('cx', 600, 0, 'N log N', 'sorting each group', 'N', 'the parent map'),
    edge: note('edge', 600, 130, 'Same name, no shared email: two people.'),
  });
}

// ---------- 1730. Shortest Path to Get Food ----------

function getFood(): BoardDoc {
  const g = (rows: string[]) =>
    grid(
      'g',
      0,
      0,
      'grid (* you, # food)',
      rows.map((row) => [...row]),
    );
  return walk(1730, {
    open: [g(['XXXXXX', 'X*OOOX', 'XOO#OX', 'XXXXXX'])],
    setup: [g(['XXXXXX', 'X*OOOX', 'XOO#OX', 'XXXXXX']), variable('q', 320, 0, 'queue', '(1, 1)')],
    before: [{ caption: 'Step 1 reaches (1, 2) and (2, 1); step 2 reaches (1, 3) and (2, 2).', elements: [g(['XXXXXX', 'X*12OX', 'X12#OX', 'XXXXXX'])] }],
    result: [g(['XXXXXX', 'X*12OX', 'X123OX', 'XXXXXX']), variable('q', 320, 0, 'food at step', '3')],
    cx: complexity('cx', 320, 60, 'm·n', 'each cell queued once', 'm·n', 'the queue'),
    edge: note('edge', 320, 200, 'Food walled off: return -1.'),
  });
}

// ---------- 1197. Minimum Knight Moves ----------

function minKnightMoves(): BoardDoc {
  const g = (rows: string[]) =>
    grid(
      'g',
      0,
      0,
      'rows = y, columns = x',
      rows.map((row) => [...row]),
    );
  return walk(1197, {
    open: [g(['K...', '..T.', '....', '....'])],
    setup: [g(['K...', '..T.', '....', '....']), variable('fold', 240, 0, 'target', '(|x|, |y|)')],
    result: [g(['K...', '..1.', '.1..', '....']), variable('fold', 240, 0, 'moves to (2, 1)', '1')],
    cx: complexity('cx', 240, 60, 'max(x,y)²', 'BFS over the square', 'max(x,y)²', 'the visited set'),
    edge: note('edge', 240, 200, '(1, 1) needs a detour: allow coordinates down to -2.'),
  });
}

// ---------- 127. Word Ladder ----------

function ladderLength(): BoardDoc {
  const words = ['hit', 'hot', 'dot', 'dog', 'cog', 'log', 'lot'];
  // 照轉換的路線排一圈：hit → hot → dot → dog → cog，另一邊是 lot、log，線比較少交叉
  const edges = [
    { a: 0, b: 1 },
    { a: 1, b: 2 },
    { a: 1, b: 6 },
    { a: 2, b: 6 },
    { a: 2, b: 3 },
    { a: 6, b: 5 },
    { a: 3, b: 5 },
    { a: 3, b: 4 },
    { a: 4, b: 5 },
  ];
  const g = (colors?: Colors) => ugraph('g', 0, 0, 'one letter apart', words, edges, colors);
  return walk(127, {
    open: [g()],
    setup: [g(['yellow']), variable('q', 320, 0, 'queue', 'hit (1 word)')],
    before: [{ caption: 'Level 2 is hot; level 3 is dot and lot.', elements: [g(['green', 'green', 'yellow', null, null, null, 'yellow']), variable('q', 320, 0, 'queue', 'dot, lot (3 words)')] }],
    result: [g(['green', 'green', 'green', 'green', 'green']), variable('q', 320, 0, 'hit → cog', '5 words')],
    cx: complexity('cx', 320, 60, 'n·L·26', 'try each letter at each spot', 'n', 'queue and word set'),
    edge: note('edge', 320, 200, 'endWord not in the list: return 0.'),
  });
}

// ---------- 815. Bus Routes ----------

function numBusesToDestination(): BoardDoc {
  const buses = (a?: Colors, b?: Colors) => [array('b0', 0, 0, 'bus 0', ['1', '2', '7'], a), array('b1', 0, 110, 'bus 1', ['3', '6', '7'], b)];
  const stops = dict('s', 180, 0, 'stop → buses', [['7', '0, 1']]);
  return walk(815, {
    open: [...buses(), variable('st', 180, 22, 'from 1 to', '6')],
    setup: [...buses(), stops],
    before: [{ caption: 'Board bus 0 at stop 1: one bus reaches 2 and 7.', elements: [...buses(['green', 'green', 'green']), stops, variable('n', 0, 220, 'buses', '1')] }],
    result: [...buses(['green', 'green', 'yellow'], ['green', 'green', 'yellow']), stops, variable('n', 0, 220, 'change at 7', '2 buses')],
    cx: complexity('cx', 360, 0, 'stops', 'each bus boarded once', 'stops', 'stop → buses map'),
    edge: note('edge', 360, 130, 'source = target: 0 buses.'),
  });
}

export const BOARDS: ReferenceBoards = {
  200: numberOfIslands,
  207: courseSchedule,
  733: floodFill,
  695: maxAreaOfIsland,
  133: cloneGraph,
  286: wallsAndGates,
  994: orangesRotting,
  542: updateMatrix,
  417: pacificAtlantic,
  130: surroundedRegions,
  210: findOrder,
  310: minHeightTrees,
  261: validTree,
  323: countComponents,
  684: redundantConnection,
  721: accountsMerge,
  1730: getFood,
  1197: minKnightMoves,
  127: ladderLength,
  815: numBusesToDestination,
};
