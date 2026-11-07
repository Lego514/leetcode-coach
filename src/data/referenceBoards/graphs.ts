import type { BoardDoc } from 'dsa-whiteboard';
import { array, board, complexity, dp1, graph, grid, intervals, lines, note, queue, variable } from './build';

// 參考板書：網格、圖、區間、動態規劃。

// ---------- 200. Number of Islands ----------

export function numberOfIslands(): BoardDoc {
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
    { caption: structure, elements: [grid('grid', 0, 0, 'grid', start), variable('count', 300, 22, 'count', '0')] },
    {
      caption: '(0, 0) is land: count becomes 1, and DFS sinks (0, 0), (0, 1), and (1, 0), the whole first island.',
      elements: [grid('grid', 0, 0, 'grid', firstSunk), variable('count', 300, 22, 'count', '1')],
    },
    { caption: example, elements: done },
    { caption: cost, elements: [...done, result] },
    { caption: edge, elements: [...done, result, note('edge', 680, 22, 'Diagonal cells don’t connect: only up, down, left, right.')] },
  ]);
}

// ---------- 207. Course Schedule ----------

export function courseSchedule(): BoardDoc {
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
  const done = [courses(['red', 'red']), ...counts, variable('taken', 260, 180, 'processed', '0 < 2 → False')];
  const result = complexity('cx', 520, 0, 'V + E', 'each course and prerequisite is handled once', 'V + E', 'the graph, indegrees, and queue');
  return board([
    { caption: insight, elements: [courses()] },
    { caption: structure, elements: [courses(), ...counts] },
    { caption: example, elements: done },
    { caption: cost, elements: [...done, result] },
    { caption: edge, elements: [...done, result, note('edge', 520, 120, 'Indegree 0 starts in the queue; processed < numCourses means a cycle.', 320)] },
  ]);
}

// ---------- 56. Merge Intervals ----------

export function mergeIntervals(): BoardDoc {
  const [insight, structure, example, cost, edge] = lines(56);
  const input = (colors: ('green' | 'yellow' | undefined)[] = []) =>
    intervals('intervals', 0, 0, 'intervals', [
      [1, 3, colors[0]],
      [2, 6, colors[1]],
      [8, 10, colors[2]],
    ]);
  const done = [
    input(['green', 'green', 'green']),
    intervals('merged', 0, 170, 'merged', [
      [1, 6, 'green'],
      [8, 10, 'green'],
    ]),
  ];
  const result = complexity('cx', 460, 0, 'n log n', 'sorting dominates the single pass', 'n', 'the merged list');
  return board([
    { caption: insight, elements: [input()] },
    { caption: structure, elements: [input(), intervals('merged', 0, 170, 'merged', [])] },
    {
      caption: '[1, 3] starts the merged list. [2, 6] starts at 2, before 3 ends, so I extend the end to 6.',
      elements: [input(['green', 'yellow']), intervals('merged', 0, 170, 'merged', [[1, 6, 'green']])],
    },
    { caption: example, elements: done },
    { caption: cost, elements: [...done, result] },
    { caption: edge, elements: [...done, result, note('edge', 460, 130, 'Touching intervals like [1, 4] and [4, 5] merge into [1, 5].')] },
  ]);
}

// ---------- 322. Coin Change ----------

export function coinChange(): BoardDoc {
  const [insight, structure, example, cost, edge] = lines(322);
  const coins = array('coins', 0, 0, 'coins', ['1', '2', '5']);
  const amount = variable('amount', 180, 22, 'amount', '11');
  const inf = '∞';
  const table = (cells: string[], at: number) => dp1('dp', 0, 110, 'dp', cells, at, [1, 2, 5]);
  const filled = ['0', '1', '1', '2', '2', '1', '2', '2', '3', '3', '2', '3'];
  const done = [coins, amount, table(filled, 11), variable('answer', 360, 22, 'answer', 'dp[11] = 3')];
  const result = complexity('cx', 600, 0, 'a·c', 'a = amount, c = coins: each amount tries every coin', 'a', 'one dp entry per amount');
  return board([
    { caption: insight, elements: [coins, amount] },
    { caption: structure, elements: [coins, amount, table(['0', ...Array<string>(11).fill(inf)], 0)] },
    {
      caption: 'dp[5] = 1 + min(dp[4], dp[3], dp[0]) = 1 + 0 = 1: one 5 coin.',
      elements: [coins, amount, table([...filled.slice(0, 6), ...Array<string>(6).fill(inf)], 5)],
    },
    { caption: example, elements: done },
    { caption: cost, elements: [...done, result] },
    { caption: edge, elements: [...done, result, note('edge', 600, 120, 'An amount that can’t be made stays ∞, so I return -1.')] },
  ]);
}
