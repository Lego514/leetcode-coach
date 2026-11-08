import type { BoardDoc } from 'dsa-whiteboard';
import type { ReferenceBoards } from './index';
import { array, complexity, dp1, dp2, grid, note, variable, walk } from './build';

// 參考板書：二維動態規劃。版面橫著排，下面留給播放列；複雜度區塊和便利貼放右邊。

/** 二維 DP 表裡還沒填的格子是空字串：rows 是算好的整張表，只留前 count 格（一列一列填） */
function upTo(rows: string[][], count: number): string[][] {
  const width = rows[0].length;
  return rows.map((row, r) => row.map((cell, c) => (r * width + c < count ? cell : '')));
}
const str = (rows: (number | boolean)[][]) => rows.map((row) => row.map((v) => (typeof v === 'boolean' ? (v ? 'T' : 'F') : String(v))));

// ---------- 62. Unique Paths ----------

function uniquePaths(): BoardDoc {
  const full = str([
    [1, 1, 1, 1, 1, 1, 1],
    [1, 2, 3, 4, 5, 6, 7],
    [1, 3, 6, 10, 15, 21, 28],
  ]);
  const t = (count: number, at: { r: number; c: number }) => dp2('dp', 0, 0, 'paths to (r, c)', upTo(full, count), { at, deps: 'upLeft' });
  return walk(62, {
    open: [variable('mn', 0, 0, 'grid', '3 × 7')],
    setup: [t(8, { r: 1, c: 0 })],
    before: [{ caption: 'Row 1: each cell is the one above (1) plus the one to the left.', elements: [t(14, { r: 1, c: 6 })] }],
    result: [t(21, { r: 2, c: 6 })],
    cx: complexity('cx', 380, 0, 'm·n', 'each cell once', 'n', 'one row is enough'),
    edge: note('edge', 380, 130, 'One row or one column: exactly one path.'),
  });
}

// ---------- 1143. Longest Common Subsequence ----------

function longestCommonSubsequence(): BoardDoc {
  const full = str([
    [0, 0, 0, 0],
    [0, 1, 1, 1],
    [0, 1, 1, 1],
    [0, 1, 2, 2],
    [0, 1, 2, 2],
    [0, 1, 2, 3],
  ]);
  const heads = { rowHead: ['', 'a', 'b', 'c', 'd', 'e'], colHead: ['', 'a', 'c', 'e'] };
  const t = (count: number, at: { r: number; c: number }) => dp2('dp', 0, 0, 'LCS length', upTo(full, count), { at, deps: 'upLeftDiag', ...heads });
  return walk(1143, {
    open: [variable('a', 0, 0, 'text1', '"abcde"'), variable('b', 0, 50, 'text2', '"ace"')],
    setup: [t(5, { r: 1, c: 0 })],
    before: [{ caption: 'c matches c: dp[3][2] = dp[2][1] + 1 = 2.', elements: [t(15, { r: 3, c: 2 })] }],
    result: [t(24, { r: 5, c: 3 }), variable('ans', 0, 330, 'LCS', '"ace", length 3')],
    cx: complexity('cx', 260, 0, 'm·n', 'each cell once', 'min(m,n)', 'a rolling row'),
    edge: note('edge', 260, 130, 'An empty string: LCS is 0.'),
  });
}

// ---------- 309. Best Time to Buy and Sell Stock with Cooldown ----------

function maxProfitCooldown(): BoardDoc {
  const full = str([
    [-1, -1, -1, 1, 1],
    [0, 1, 2, -1, 3],
    [0, 0, 1, 2, 2],
  ]);
  const t = (cols: number) =>
    dp2(
      'dp',
      0,
      0,
      'best profit in each state',
      full.map((row) => row.map((cell, c) => (c < cols ? cell : ''))),
      { at: { r: 1, c: cols - 1 }, rowHead: ['H', 'S', 'R'], colHead: ['1', '2', '3', '0', '2'] },
    );
  return walk(309, {
    open: [array('p', 0, 0, 'prices', ['1', '2', '3', '0', '2'])],
    setup: [t(1)],
    before: [{ caption: 'Day 3 (price 3): sell what I bought at 1, so sold = 2.', elements: [t(3)] }],
    result: [t(5), variable('ans', 0, 200, 'answer', 'max(sold, rest) = 3'), variable('key', 0, 250, 'rows', 'H hold, S sold, R rest')],
    cx: complexity('cx', 340, 0, 'n', 'one pass', '1', 'three variables'),
    edge: note('edge', 340, 130, 'One day: no trade, profit 0.'),
  });
}

// ---------- 518. Coin Change II ----------

function change(): BoardDoc {
  const full = str([
    [1, 1, 1, 1, 1, 1],
    [1, 1, 2, 2, 3, 3],
    [1, 1, 2, 2, 3, 4],
  ]);
  const t = (rows: number) =>
    dp2('dp', 0, 0, 'ways (row = coins up to)', full.slice(0, rows), { at: { r: rows - 1, c: 5 }, rowHead: ['1', '2', '5'].slice(0, rows), colHead: ['0', '1', '2', '3', '4', '5'] });
  return walk(518, {
    open: [array('c', 0, 0, 'coins', ['1', '2', '5']), variable('a', 180, 22, 'amount', '5')],
    setup: [t(1)],
    before: [{ caption: 'Adding coin 2: dp[a] += dp[a - 2], so dp[5] = 1 + 2 = 3.', elements: [t(2)] }],
    result: [t(3), variable('ans', 0, 210, 'answer', '4')],
    cx: complexity('cx', 380, 0, 'a · c', 'c coins over a amounts', 'a', 'one row'),
    edge: note('edge', 380, 130, 'amount 0: one way, use no coins.'),
  });
}

// ---------- 494. Target Sum ----------

function findTargetSumWays(): BoardDoc {
  const rows = [
    [1, 1, 0, 0, 0],
    [1, 2, 1, 0, 0],
    [1, 3, 3, 1, 0],
    [1, 4, 6, 4, 1],
    [1, 5, 10, 10, 5],
  ];
  const dp = (i: number) => dp1('dp', 0, 0, `after ${i} ones`, rows[i - 1].map(String), 4, [1]);
  return walk(494, {
    open: [array('n', 0, 0, 'nums', ['1', '1', '1', '1', '1']), variable('t', 260, 22, 'target', '3')],
    setup: [variable('p', 0, 0, 'P', '(5 + 3) / 2 = 4')],
    before: [{ caption: 'After two ones: one way to make 0, two to make 1, one to make 2.', elements: [dp(2)] }],
    result: [dp(5), variable('ans', 0, 140, 'ways to make 4', '5')],
    cx: complexity('cx', 380, 0, 'n · P', 'each number over each sum', 'P', 'one row'),
    edge: note('edge', 380, 130, 'Odd total + target, or |target| > total: 0.'),
  });
}

// ---------- 97. Interleaving String ----------

function isInterleave(): BoardDoc {
  const full = ['T.....', 'T.....', 'TTTTT.', '.TT.T.', '..TTTT', '...T.T'].map((row) => [...row].map((c) => (c === 'T' ? 'T' : 'F')));
  const heads = { rowHead: ['', 'a', 'a', 'b', 'c', 'c'], colHead: ['', 'd', 'b', 'b', 'c', 'a'] };
  const t = (count: number, at: { r: number; c: number }) => dp2('dp', 0, 0, 'first i of s1 + first j of s2', upTo(full, count), { at, deps: 'upLeft', ...heads });
  return walk(97, {
    open: [variable('s1', 0, 0, 's1', '"aabcc"'), variable('s2', 0, 50, 's2', '"dbbca"'), variable('s3', 0, 100, 's3', '"aadbbcbcac"')],
    setup: [t(7, { r: 1, c: 0 })],
    before: [{ caption: 'Row 2: "aa" from s1, then d, b, b from s2 still matches s3.', elements: [t(17, { r: 2, c: 4 })] }],
    result: [t(36, { r: 5, c: 5 }), variable('ans', 0, 340, 'dp[5][5]', 'True')],
    cx: complexity('cx', 340, 0, 'm·n', 'each cell once', 'n', 'a rolling row'),
    edge: note('edge', 340, 130, 'len(s1) + len(s2) ≠ len(s3): False first.'),
  });
}

// ---------- 72. Edit Distance ----------

function minDistance(): BoardDoc {
  const full = str([
    [0, 1, 2, 3],
    [1, 1, 2, 3],
    [2, 2, 1, 2],
    [3, 2, 2, 2],
    [4, 3, 3, 2],
    [5, 4, 4, 3],
  ]);
  const heads = { rowHead: ['', 'h', 'o', 'r', 's', 'e'], colHead: ['', 'r', 'o', 's'] };
  const t = (count: number, at: { r: number; c: number }) => dp2('dp', 0, 0, 'edits', upTo(full, count), { at, deps: 'upLeftDiag', ...heads });
  return walk(72, {
    open: [variable('a', 0, 0, 'word1', '"horse"'), variable('b', 0, 50, 'word2', '"ros"')],
    setup: [t(8, { r: 1, c: 3 })],
    before: [{ caption: 'o matches o: dp[2][2] = dp[1][1] = 1, no new edit.', elements: [t(11, { r: 2, c: 2 })] }],
    result: [t(24, { r: 5, c: 3 }), variable('ans', 0, 330, 'distance', '3')],
    cx: complexity('cx', 260, 0, 'm·n', 'each cell once', 'min(m,n)', 'a rolling row'),
    edge: note('edge', 260, 130, 'An empty word: the other one’s length.'),
  });
}

// ---------- 221. Maximal Square ----------

function maximalSquare(): BoardDoc {
  const matrix = grid(
    'm',
    0,
    0,
    'matrix',
    ['10100', '10111', '11111', '10010'].map((row) => [...row]),
  );
  const full = str([
    [1, 0, 1, 0, 0],
    [1, 0, 1, 1, 1],
    [1, 1, 1, 2, 2],
    [1, 0, 0, 1, 0],
  ]);
  const t = (count: number, at: { r: number; c: number }) => dp2('dp', 280, 0, 'side of square ending here', upTo(full, count), { at, deps: 'upLeftDiag' });
  return walk(221, {
    open: [matrix],
    setup: [matrix, t(5, { r: 0, c: 4 })],
    before: [{ caption: 'dp[2][3]: its three neighbors are all 1, so the side is 2.', elements: [matrix, t(14, { r: 2, c: 3 })] }],
    result: [matrix, t(20, { r: 2, c: 3 }), variable('ans', 0, 240, 'area', '2 × 2 = 4')],
    cx: complexity('cx', 560, 0, 'm·n', 'each cell once', 'n', 'a rolling row'),
    edge: note('edge', 560, 130, 'Return the area: square the side.'),
  });
}

// ---------- 329. Longest Increasing Path in a Matrix ----------

function longestIncreasingPath(): BoardDoc {
  const matrix = grid('m', 0, 0, 'matrix', [
    ['9', '9', '4'],
    ['6', '6', '8'],
    ['2', '1', '1'],
  ]);
  const memo = (rows: string[][]) => grid('memo', 200, 0, 'longest from here', rows);
  return walk(329, {
    open: [matrix],
    setup: [
      matrix,
      memo([
        ['', '', ''],
        ['', '', ''],
        ['', '', ''],
      ]),
    ],
    before: [
      {
        caption: 'The 9s are peaks: 1. Then 6 → 9 gives 2, and 2 → 6 → 9 gives 3.',
        elements: [
          matrix,
          memo([
            ['1', '1', ''],
            ['2', '2', ''],
            ['3', '', ''],
          ]),
        ],
      },
    ],
    result: [
      matrix,
      memo([
        ['1', '1', '2'],
        ['2', '2', '1'],
        ['3', '4', '2'],
      ]),
      variable('ans', 0, 200, 'longest', '1 → 2 → 6 → 9 = 4'),
    ],
    cx: complexity('cx', 400, 0, 'm·n', 'each cell computed once', 'm·n', 'the memo'),
    edge: note('edge', 400, 130, 'Equal neighbors: can’t move, it must strictly increase.'),
  });
}

// ---------- 115. Distinct Subsequences ----------

function numDistinct(): BoardDoc {
  const full = str([
    [1, 0, 0, 0, 0, 0, 0],
    [1, 1, 0, 0, 0, 0, 0],
    [1, 1, 1, 0, 0, 0, 0],
    [1, 1, 1, 1, 0, 0, 0],
    [1, 1, 1, 2, 1, 0, 0],
    [1, 1, 1, 3, 3, 0, 0],
    [1, 1, 1, 3, 3, 3, 0],
    [1, 1, 1, 3, 3, 3, 3],
  ]);
  const heads = { rowHead: ['', 'r', 'a', 'b', 'b', 'b', 'i', 't'], colHead: ['', 'r', 'a', 'b', 'b', 'i', 't'] };
  const t = (count: number, at: { r: number; c: number }) => dp2('dp', 0, 0, 'ways', upTo(full, count), { at, deps: 'upDiag', ...heads });
  return walk(115, {
    open: [variable('s', 0, 0, 's', '"rabbbit"'), variable('t', 0, 50, 't', '"rabbit"')],
    setup: [t(14, { r: 1, c: 6 })],
    before: [{ caption: 'The third b: use it (dp[4][3] = 2) or skip it (dp[4][4] = 1), so 3.', elements: [t(40, { r: 5, c: 4 })] }],
    result: [t(56, { r: 7, c: 6 })],
    cx: complexity('cx', 380, 0, 'm·n', 'each cell once', 'n', 'one row, j backward'),
    edge: note('edge', 380, 130, 'Empty t: found once in any s.'),
  });
}

// ---------- 312. Burst Balloons ----------

function maxCoins(): BoardDoc {
  const full = str([
    [0, 0, 3, 30, 159, 167],
    [0, 0, 0, 15, 135, 159],
    [0, 0, 0, 0, 40, 48],
    [0, 0, 0, 0, 0, 40],
    [0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0],
  ]);
  const heads = { rowHead: ['1', '3', '1', '5', '8', '1'], colHead: ['1', '3', '1', '5', '8', '1'] };
  const t = (keep: (l: number, r: number) => boolean, at: { r: number; c: number }) =>
    dp2(
      'dp',
      0,
      0,
      'best coins between l and r',
      full.map((row, l) => row.map((cell, r) => (r <= l + 1 || keep(l, r) ? cell : ''))),
      { at, ...heads },
    );
  return walk(312, {
    open: [array('n', 0, 0, 'nums', ['3', '1', '5', '8'])],
    setup: [t(() => false, { r: 0, c: 2 })],
    before: [{ caption: 'Short ranges first: between 5 and the end 1, bursting 8 last gives 5 × 8 × 1 = 40.', elements: [t((l, r) => r - l <= 2, { r: 3, c: 5 })] }],
    result: [t(() => true, { r: 0, c: 5 })],
    cx: complexity('cx', 380, 0, 'n³', 'n² ranges, n choices each', 'n²', 'the table'),
    edge: note('edge', 380, 130, 'Empty input: 0 coins.'),
  });
}

// ---------- 10. Regular Expression Matching ----------

function isMatch(): BoardDoc {
  const full = str([
    [true, false, true],
    [false, true, true],
    [false, false, true],
  ]);
  const heads = { rowHead: ['', 'a', 'a'], colHead: ['', 'a', '*'] };
  const t = (count: number, at: { r: number; c: number }) => dp2('dp', 0, 0, 's[:i] matches p[:j]', upTo(full, count), { at, ...heads });
  return walk(10, {
    open: [variable('s', 0, 0, 's', '"aa"'), variable('p', 0, 50, 'p', '"a*"')],
    setup: [t(3, { r: 0, c: 2 })],
    before: [{ caption: 'Row 1: "a" matches "a", and "a*" covers it too.', elements: [t(6, { r: 1, c: 2 })] }],
    result: [t(9, { r: 2, c: 2 }), variable('ans', 0, 210, 'dp[2][2]', 'True ("ab" vs ".*" too)')],
    cx: complexity('cx', 300, 0, 'm·n', 'each cell once', 'm·n', 'the table'),
    edge: note('edge', 300, 130, '"a*b*" matches "": set up in the first row.'),
  });
}

export const BOARDS: ReferenceBoards = {
  62: uniquePaths,
  1143: longestCommonSubsequence,
  309: maxProfitCooldown,
  518: change,
  494: findTargetSumWays,
  97: isInterleave,
  72: minDistance,
  221: maximalSquare,
  329: longestIncreasingPath,
  115: numDistinct,
  312: maxCoins,
  10: isMatch,
};
