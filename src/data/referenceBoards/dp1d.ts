import type { BoardDoc } from 'dsa-whiteboard';
import type { ReferenceBoards } from './index';
import { array, board, complexity, dp1, dpRow, intervals, lines, note, pointer, variable, walk, type Colors } from './build';

// 參考板書：一維動態規劃。版面橫著排，下面留給播放列；複雜度區塊和便利貼放右邊。

// ---------- 322. Coin Change ----------

function coinChange(): BoardDoc {
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
    {
      caption: structure,
      elements: [coins, amount, table(['0', ...Array<string>(11).fill(inf)], 0)],
    },
    {
      caption: 'dp[5] = 1 + min(dp[4], dp[3], dp[0]) = 1 + 0 = 1: one 5 coin.',
      elements: [coins, amount, table([...filled.slice(0, 6), ...Array<string>(6).fill(inf)], 5)],
    },
    { caption: example, elements: done },
    { caption: cost, elements: [...done, result] },
    {
      caption: edge,
      elements: [...done, result, note('edge', 600, 140, 'An amount that can’t be made stays ∞, so I return -1.')],
    },
  ]);
}

// ---------- 70. Climbing Stairs ----------

function climbStairs(): BoardDoc {
  const ways = (cells: string[], at: number) => dpRow('dp', 0, 0, 'ways to reach step i', cells, at, 'prev2');
  return walk(70, {
    open: [variable('n', 0, 0, 'n', '4')],
    setup: [ways(['1', '1', '', '', ''], 1)],
    before: [{ caption: 'ways(2) = 1 + 1 = 2, ways(3) = 2 + 1 = 3.', elements: [ways(['1', '1', '2', '3', ''], 3)] }],
    result: [ways(['1', '1', '2', '3', '5'], 4)],
    cx: complexity('cx', 300, 0, 'n', 'one pass', '1', 'two variables'),
    edge: note('edge', 300, 130, 'n = 1: one way.'),
  });
}

// ---------- 746. Min Cost Climbing Stairs ----------

function minCostClimbing(): BoardDoc {
  const dp = (cells: string[], at: number) => dpRow('dp', 0, 0, 'cost to i', cells, at, 'prev2', ['10', '15', '20']);
  return walk(746, {
    open: [array('cost', 0, 0, 'cost', ['10', '15', '20'])],
    setup: [dp(['10', '15', ''], 1)],
    result: [dp(['10', '15', '30'], 2), variable('top', 0, 140, 'top', 'min(15, 30) = 15')],
    cx: complexity('cx', 300, 0, 'n', 'one pass', '1', 'two variables'),
    edge: note('edge', 300, 130, 'The top is past the last step: min of the last two.'),
  });
}

// ---------- 198. House Robber ----------

function rob(): BoardDoc {
  const dp = (cells: string[], at: number) => dpRow('dp', 0, 0, 'best through house i', cells, at, 'prev2', ['2', '7', '9', '3', '1']);
  return walk(198, {
    open: [array('nums', 0, 0, 'nums', ['2', '7', '9', '3', '1'])],
    setup: [dp(['2', '7', '', '', ''], 1)],
    before: [{ caption: 'House 9: rob it (2 + 9 = 11) or skip it (7). 11 wins.', elements: [dp(['2', '7', '11', '', ''], 2)] }],
    result: [dp(['2', '7', '11', '11', '12'], 4), variable('pick', 0, 140, 'robbed', '2 + 9 + 1 = 12')],
    cx: complexity('cx', 300, 0, 'n', 'one pass', '1', 'two variables'),
    edge: note('edge', 300, 130, 'One house: rob it.'),
  });
}

// ---------- 213. House Robber II ----------

function robCircle(): BoardDoc {
  const a = dpRow('a', 0, 0, 'no first', ['3', '3'], 1, 'prev2', ['3', '2']);
  const b = dpRow('b', 0, 170, 'no last', ['2', '3'], 1, 'prev2', ['2', '3']);
  return walk(213, {
    open: [array('nums', 0, 0, 'nums (a circle)', ['2', '3', '2'])],
    setup: [a, b],
    result: [a, b, variable('ans', 160, 22, 'answer', 'max(3, 3) = 3')],
    cx: complexity('cx', 400, 0, 'n', 'two linear passes', '1', 'two variables each'),
    edge: note('edge', 400, 130, 'One house: handle it first, both cases would be empty.'),
  });
}

// ---------- 5. Longest Palindromic Substring ----------

function longestPalindromeSubstring(): BoardDoc {
  const s = (colors?: Colors) => array('s', 0, 0, 's', ['b', 'a', 'b', 'a', 'd'], colors);
  return walk(5, {
    open: [s()],
    setup: [s([null, 'yellow']), pointer('l', 'l', 's', 1), pointer('r', 'r', 's', 1)],
    result: [s(['green', 'green', 'green']), pointer('l', 'l', 's', 0), pointer('r', 'r', 's', 2), variable('best', 260, 0, 'best', '"bab"')],
    cx: complexity('cx', 260, 60, 'n²', '2n - 1 centers, n each', '1', 'just indices'),
    edge: note('edge', 260, 200, '"bb": also expand from the gap between letters.'),
  });
}

// ---------- 647. Palindromic Substrings ----------

function countSubstrings(): BoardDoc {
  const s = (colors?: Colors) => array('s', 0, 0, 's', ['a', 'a', 'a'], colors);
  const count = (value: string) => variable('c', 180, 0, 'count', value);
  return walk(647, {
    open: [s()],
    setup: [s([null, 'yellow']), pointer('l', 'l', 's', 1), pointer('r', 'r', 's', 1), count('0')],
    before: [
      { caption: 'Center at index 1: "a", then "aaa" as the ends keep matching.', elements: [s(['green', 'green', 'green']), pointer('l', 'l', 's', 0), pointer('r', 'r', 's', 2), count('…')] },
    ],
    result: [s(['green', 'green', 'green']), count('3 + 2 + 1 = 6')],
    cx: complexity('cx', 180, 60, 'n²', 'expand around 2n - 1 centers', '1', 'just indices'),
    edge: note('edge', 180, 200, 'Every single letter counts: at least n.'),
  });
}

// ---------- 91. Decode Ways ----------

function numDecodings(): BoardDoc {
  const dp = (cells: string[], at: number) => dpRow('dp', 0, 0, 'ways', cells, at, 'prev2', ['', '2', '2', '6']);
  return walk(91, {
    open: [array('s', 0, 0, 's', ['2', '2', '6'])],
    setup: [dp(['1', '1', '', ''], 1)],
    before: [{ caption: 'i = 2: "2" works alone and "22" works as a pair: 1 + 1 = 2.', elements: [dp(['1', '1', '2', ''], 2)] }],
    result: [dp(['1', '1', '2', '3'], 3), variable('all', 0, 140, 'decodings', '2 2 6, 22 6, 2 26')],
    cx: complexity('cx', 300, 0, 'n', 'one pass', '1', 'two variables'),
    edge: note('edge', 300, 130, 'A 0 only works inside 10 or 20.'),
  });
}

// ---------- 152. Maximum Product Subarray ----------

function maxProduct(): BoardDoc {
  const nums = array('nums', 0, 0, 'nums', ['2', '3', '-2', '4']);
  const runs = (hi: string[], lo: string[]) => [array('hi', 0, 120, 'max', hi), array('lo', 0, 240, 'min', lo)];
  return walk(152, {
    open: [nums],
    setup: [nums, ...runs(['2'], ['2'])],
    before: [{ caption: 'At -2: the max (6) and min (3) both flip, so max = -2 and min = -12.', elements: [nums, ...runs(['2', '6', '-2'], ['2', '3', '-12'])] }],
    result: [nums, ...runs(['2', '6', '-2', '4'], ['2', '3', '-12', '-48']), variable('best', 220, 0, 'best', '2 × 3 = 6')],
    cx: complexity('cx', 400, 0, 'n', 'one pass', '1', 'a running max and min'),
    edge: note('edge', 400, 130, 'A 0 resets both products.'),
  });
}

// ---------- 139. Word Break ----------

function wordBreak(): BoardDoc {
  const head = ['', 'l', 'e', 'e', 't', 'c', 'o', 'd', 'e'];
  const dp = (cells: string[], at: number) => dpRow('dp', 0, 0, 'prefix can split', cells, at, 'before', head);
  const f = (n: number) => Array<string>(n).fill('F');
  return walk(139, {
    open: [variable('s', 0, 0, 's', '"leetcode"'), variable('d', 0, 50, 'wordDict', '{leet, code}')],
    setup: [dp(['T', ...f(8).map(() => '')], 0)],
    before: [{ caption: 'dp[4]: dp[0] is True and "leet" is a word.', elements: [dp(['T', ...f(3), 'T', '', '', '', ''], 4)] }],
    result: [dp(['T', ...f(3), 'T', ...f(3), 'T'], 8), variable('why', 0, 140, 'dp[8]', 'dp[4] and "code"')],
    cx: complexity('cx', 460, 0, 'n²', 'every split point j', 'n', 'the dp array'),
    edge: note('edge', 460, 130, 'dp[0] = True: the empty prefix.'),
  });
}

// ---------- 300. Longest Increasing Subsequence ----------

function lengthOfLIS(): BoardDoc {
  const nums = array('nums', 0, 0, 'nums', ['10', '9', '2', '5', '3', '7', '101', '18']);
  const tails = (items: string[], colors?: Colors) => array('t', 0, 140, 'tails', items, colors);
  return walk(300, {
    open: [nums],
    setup: [nums, pointer('i', 'i', 'nums', 0), tails(['10'])],
    before: [{ caption: '9 and then 2 replace 10; 5 extends; 3 replaces 5.', elements: [nums, pointer('i', 'i', 'nums', 4), tails(['2', '3'], [null, 'yellow'])] }],
    result: [nums, pointer('i', 'i', 'nums', 7), tails(['2', '3', '7', '18'], [null, null, null, 'yellow']), variable('len', 200, 162, 'length', '4')],
    cx: complexity('cx', 400, 0, 'n log n', 'binary search per number', 'n', 'the tails'),
    edge: note('edge', 400, 140, 'Strictly increasing: use lower bound, so duplicates replace.'),
  });
}

// ---------- 416. Partition Equal Subset Sum ----------

function canPartition(): BoardDoc {
  const sums = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11'];
  const dp = (on: number[], at: number, step: number) =>
    dp1(
      'dp',
      0,
      0,
      'reachable sum',
      sums.map((_, i) => (on.includes(i) ? 'T' : '')),
      at,
      [step],
    );
  return walk(416, {
    open: [array('nums', 0, 0, 'nums', ['1', '5', '11', '5']), variable('half', 200, 22, 'target', '22 / 2 = 11')],
    setup: [dp([0, 1], 1, 1)],
    before: [{ caption: 'After 5: sums 0, 1, 5, 6. Going high to low, each 5 is used once.', elements: [dp([0, 1, 5, 6], 6, 5)] }],
    result: [dp([0, 1, 5, 6, 10, 11], 11, 11), variable('ans', 0, 140, 'dp[11]', 'True')],
    cx: complexity('cx', 560, 0, 'n · sum', 'each number over each sum', 'sum', 'one row of booleans'),
    edge: note('edge', 560, 130, 'Odd total: return False right away.'),
  });
}

// ---------- 377. Combination Sum IV ----------

function combinationSum4(): BoardDoc {
  const dp = (cells: string[], at: number) => dp1('dp', 0, 0, 'ordered ways to make t', cells, at, [1, 2, 3]);
  return walk(377, {
    open: [array('nums', 0, 0, 'nums', ['1', '2', '3']), variable('t', 180, 22, 'target', '4')],
    setup: [dp(['1', '', '', '', ''], 0)],
    before: [{ caption: 'dp[3] = dp[2] + dp[1] + dp[0] = 2 + 1 + 1 = 4.', elements: [dp(['1', '1', '2', '4', ''], 3)] }],
    result: [dp(['1', '1', '2', '4', '7'], 4)],
    cx: complexity('cx', 300, 0, 'target · n', 'n choices per total', 'target', 'the dp array'),
    edge: note('edge', 300, 130, 'dp[0] = 1: one way to make 0, pick nothing.'),
  });
}

// ---------- 1235. Maximum Profit in Job Scheduling ----------

function jobScheduling(): BoardDoc {
  const jobs = intervals('jobs', 0, 0, 'jobs by end time', [
    [1, 3, 'blue'],
    [3, 6, 'blue'],
    [1, 6, 'yellow'],
  ]);
  const dp = (cells: string[]) => array('dp', 0, 170, 'best', cells);
  return walk(1235, {
    open: [jobs],
    setup: [jobs, variable('p', 420, 0, 'profit', '50, 70, 100'), dp(['50'])],
    before: [{ caption: 'Job 2 (3–6, 70): job 1 ends at 3, so take 50 + 70 = 120.', elements: [jobs, variable('p', 420, 0, 'profit', '50, 70, 100'), dp(['50', '120'])] }],
    result: [jobs, variable('p', 420, 0, 'job 3 (1–6)', 'max(120, 100) = 120'), dp(['50', '120', '120'])],
    cx: complexity('cx', 420, 60, 'n log n', 'sort plus a binary search per job', 'n', 'the dp array'),
    edge: note('edge', 420, 200, 'Starts exactly when another ends: compatible.'),
  });
}

export const BOARDS: ReferenceBoards = {
  322: coinChange,
  70: climbStairs,
  746: minCostClimbing,
  198: rob,
  213: robCircle,
  5: longestPalindromeSubstring,
  647: countSubstrings,
  91: numDecodings,
  152: maxProduct,
  139: wordBreak,
  300: lengthOfLIS,
  416: canPartition,
  377: combinationSum4,
  1235: jobScheduling,
};
