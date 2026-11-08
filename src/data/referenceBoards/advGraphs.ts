import type { BoardDoc } from 'dsa-whiteboard';
import type { ReferenceBoards } from './index';
import { array, complexity, graph, grid, note, table, ugraph, variable, walk, type Colors } from './build';

// 參考板書：進階圖論。版面橫著排，下面留給播放列；複雜度區塊和便利貼放右邊。

// ---------- 1584. Min Cost to Connect All Points ----------

function minCostConnectPoints(): BoardDoc {
  const pts = table('pts', 0, 0, 'points', [
    ['0', '1', '2', '3', '4'],
    ['0,0', '2,2', '3,10', '5,2', '7,0'],
  ]);
  const dist = (values: string[], colors?: Colors) => array('d', 0, 140, 'cheapest link to the tree', values, colors);
  const mst = (edges: { a: number; b: number; w: string }[], colors?: Colors) => ugraph('g', 360, 0, 'tree', ['0', '1', '2', '3', '4'], edges, colors);
  return walk(1584, {
    open: [pts],
    setup: [pts, dist(['0', '∞', '∞', '∞', '∞'])],
    before: [{ caption: 'Add point 0, then update by Manhattan distance: point 1 is the closest, 4 away.', elements: [pts, dist(['0', '4', '13', '7', '7'], ['gray', 'yellow']), mst([], ['green'])] }],
    result: [
      pts,
      dist(['0', '4', '9', '3', '4'], ['gray', 'gray', 'gray', 'gray', 'gray']),
      mst(
        [
          { a: 0, b: 1, w: '4' },
          { a: 1, b: 3, w: '3' },
          { a: 3, b: 4, w: '4' },
          { a: 1, b: 2, w: '9' },
        ],
        ['green', 'green', 'green', 'green', 'green'],
      ),
      variable('cost', 0, 260, 'total', '4 + 3 + 4 + 9 = 20'),
    ],
    cx: complexity('cx', 600, 0, 'n²', 'n rounds, n distances each', 'n', 'one distance per point'),
    edge: note('edge', 600, 130, 'One point: cost 0.'),
  });
}

// ---------- 743. Network Delay Time ----------

function networkDelayTime(): BoardDoc {
  const g = (colors?: Colors) =>
    graph(
      'g',
      0,
      0,
      'times',
      ['1', '2', '3', '4'],
      [
        { a: 1, b: 0, w: '1' },
        { a: 1, b: 2, w: '1' },
        { a: 2, b: 3, w: '1' },
      ],
      colors,
    );
  const dist = (values: string[]) => table('d', 260, 0, 'dist', [['1', '2', '3', '4'], values]);
  return walk(743, {
    open: [g()],
    setup: [g([null, 'yellow']), dist(['∞', '0', '∞', '∞']), variable('h', 260, 130, 'heap', '(0, 2)')],
    before: [{ caption: 'Pop 2: nodes 1 and 3 are 1 away.', elements: [g(['green', 'yellow', 'green']), dist(['1', '0', '1', '∞']), variable('h', 260, 130, 'heap', '(1, 1), (1, 3)')] }],
    result: [g(['green', 'yellow', 'green', 'green']), dist(['1', '0', '1', '2']), variable('h', 260, 130, 'answer', 'max = 2')],
    cx: complexity('cx', 560, 0, 'E log V', 'heap pushes per edge', 'V + E', 'graph and heap'),
    edge: note('edge', 560, 130, 'Some node stays at ∞: return -1.'),
  });
}

// ---------- 787. Cheapest Flights Within K Stops ----------

function findCheapestPrice(): BoardDoc {
  const g = (colors?: Colors) =>
    graph(
      'g',
      0,
      0,
      'flights',
      ['0', '1', '2', '3'],
      [
        { a: 0, b: 1, w: '100' },
        { a: 1, b: 2, w: '100' },
        { a: 2, b: 0, w: '100' },
        { a: 1, b: 3, w: '600' },
        { a: 2, b: 3, w: '200' },
      ],
      colors,
    );
  const dist = (values: string[]) => table('d', 280, 0, 'cost', [['0', '1', '2', '3'], values]);
  return walk(787, {
    open: [g(), variable('k', 280, 0, 'k', '1 stop')],
    setup: [g(['yellow']), dist(['0', '∞', '∞', '∞'])],
    before: [{ caption: 'Round 1 (one flight): 1 costs 100.', elements: [g(['yellow', 'green']), dist(['0', '100', '∞', '∞']), variable('r', 280, 130, 'round', '1 of k + 1 = 2')] }],
    result: [g(['yellow', 'green', null, 'green']), dist(['0', '100', '200', '700']), variable('r', 280, 130, 'round 2', '0 → 1 → 3 = 700')],
    cx: complexity('cx', 580, 0, 'k·E', 'k + 1 rounds over the edges', 'n', 'two cost arrays'),
    edge: note('edge', 580, 130, 'dst still ∞: return -1.'),
  });
}

// ---------- 332. Reconstruct Itinerary ----------

function findItinerary(): BoardDoc {
  const g = graph(
    'g',
    0,
    0,
    'tickets',
    ['JFK', 'ATL', 'SFO'],
    [
      { a: 0, b: 2 },
      { a: 0, b: 1 },
      { a: 2, b: 1 },
      { a: 1, b: 0 },
      { a: 1, b: 2 },
    ],
  );
  return walk(332, {
    open: [g],
    setup: [g, variable('adj', 260, 0, 'JFK', 'ATL, SFO (sorted)'), variable('adj2', 260, 50, 'ATL', 'JFK, SFO')],
    result: [g, variable('adj', 260, 0, 'from JFK', 'ATL first'), variable('route', 260, 50, 'route', 'JFK ATL JFK SFO ATL SFO')],
    cx: complexity('cx', 260, 110, 'E log E', 'sorting the destinations', 'E', 'graph and route'),
    edge: note('edge', 260, 250, 'Dead end too early: post-order puts it at the end.'),
  });
}

// ---------- 778. Swim in Rising Water ----------

function swimInWater(): BoardDoc {
  const g = grid('g', 0, 0, 'grid', [
    ['0', '2'],
    ['1', '3'],
  ]);
  return walk(778, {
    open: [g],
    setup: [g, variable('h', 150, 0, 'heap', '(0, (0, 0))')],
    before: [{ caption: 'Pop 0, then 1 (the cheaper neighbor), then 2.', elements: [g, variable('h', 150, 0, 'popped', '0, 1, 2'), variable('m', 150, 50, 'max so far', '2')] }],
    result: [g, variable('h', 150, 0, 'popped', '0, 1, 2, 3'), variable('m', 150, 50, 'max so far', '3')],
    cx: complexity('cx', 150, 110, 'n² log n', 'each cell pushed once', 'n²', 'heap and visited'),
    edge: note('edge', 150, 250, '1 × 1 grid: its only value.'),
  });
}

// ---------- 269. Alien Dictionary ----------

function alienOrder(): BoardDoc {
  const words = table('w', 0, 0, 'words', [['wrt', 'wrf', 'er', 'ett', 'rftt']]);
  const g = (edges: { a: number; b: number }[], colors?: Colors) => graph('g', 0, 100, 'letter order', ['w', 'e', 'r', 't', 'f'], edges, colors);
  const all = [
    { a: 3, b: 4 },
    { a: 0, b: 1 },
    { a: 2, b: 3 },
    { a: 1, b: 2 },
  ];
  return walk(269, {
    open: [words],
    setup: [words, g([])],
    before: [{ caption: 'wrt vs wrf gives t → f; wrf vs er gives w → e.', elements: [words, g(all.slice(0, 2))] }],
    result: [words, g(all, ['green', 'green', 'green', 'green', 'green']), variable('ans', 360, 100, 'order', '"wertf"')],
    cx: complexity('cx', 360, 160, 'C', 'compare neighbors once', '1', 'at most 26 letters'),
    edge: note('edge', 360, 300, '"abc" before "ab": invalid, return "".'),
  });
}

export const BOARDS: ReferenceBoards = {
  1584: minCostConnectPoints,
  743: networkDelayTime,
  787: findCheapestPrice,
  332: findItinerary,
  778: swimInWater,
  269: alienOrder,
};
