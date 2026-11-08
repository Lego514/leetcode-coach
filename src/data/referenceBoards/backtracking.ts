import type { BoardDoc } from 'dsa-whiteboard';
import type { ReferenceBoards } from './index';
import { array, board, complexity, dict, grid, lines, note, recursion, variable, walk, type Call, type CellColor } from './build';

// 參考板書：回溯。版面橫著排，下面留給播放列；複雜度區塊和便利貼放右邊。

// ---------- 78. Subsets ----------

function subsets(): BoardDoc {
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
  const calls = (n: number) => recursion('calls', 0, 120, 'calls', all.slice(0, n));
  const done = [nums, calls(8), variable('count', 200, 22, 'subsets', '8 = 2^3')];
  const result = complexity('cx', 520, 0, 'n·2^n', '2^n subsets, each up to n long', 'n', 'the recursion is at most n deep');
  return board([
    { caption: insight, elements: [nums] },
    { caption: structure, elements: [nums, calls(1)] },
    {
      caption: 'From [], add 1, then 2, then 3. Every node on the way down is recorded as a subset.',
      elements: [nums, calls(4)],
    },
    {
      caption: 'Back up to [1] and try the next element, 3: that records [1, 3].',
      elements: [nums, calls(5)],
    },
    { caption: example, elements: done },
    { caption: cost, elements: [...done, result] },
    {
      caption: edge,
      elements: [...done, result, note('edge', 520, 140, 'Empty input: still one subset, [].', 200)],
    },
  ]);
}

// ---------- 39. Combination Sum ----------

function combinationSum(): BoardDoc {
  const all: Call[] = [
    { text: '7', parent: -1 },
    { text: '5', parent: 0, edge: '2' },
    { text: '3', parent: 1, edge: '2' },
    { text: '1', parent: 2, edge: '2', cut: true },
    { text: '0', parent: 2, edge: '3', color: 'green' },
    { text: '2', parent: 1, edge: '3', cut: true },
    { text: '4', parent: 0, edge: '3' },
    { text: '1', parent: 6, edge: '3', cut: true },
    { text: '1', parent: 0, edge: '6', cut: true },
    { text: '0', parent: 0, edge: '7', color: 'green' },
  ];
  const calls = (count: number) => recursion('calls', 0, 0, 'calls', all.slice(0, count));
  const nums = array('c', 0, 0, 'candidates', ['2', '3', '6', '7']);
  return walk(39, {
    open: [nums, variable('t', 220, 22, 'target', '7')],
    setup: [calls(2), variable('rule', 420, 0, 'after picking c[i]', 'recurse from i again')],
    before: [{ caption: 'Keep picking 2: 7 → 5 → 3. Then 2 more leaves 1 (dead end), but 3 hits 0.', elements: [calls(5)] }],
    result: [calls(10), variable('found', 420, 0, 'found', '[2, 2, 3], [7]')],
    cx: complexity('cx', 420, 60, '2^(t/min)', 'branches until the target runs out', 't/min', 'recursion depth'),
    edge: note('edge', 420, 200, 'Only move forward: [3, 2, 2] is never built.'),
  });
}

// ---------- 40. Combination Sum II ----------

function combinationSum2(): BoardDoc {
  const all: Call[] = [
    { text: '8', parent: -1 },
    { text: '7', parent: 0, edge: '1' },
    { text: '6', parent: 1, edge: '1' },
    { text: '0', parent: 2, edge: '6', color: 'green' },
    { text: '5', parent: 1, edge: '2' },
    { text: '0', parent: 4, edge: '5', color: 'green' },
    { text: '0', parent: 1, edge: '7', color: 'green' },
    { text: '7', parent: 0, edge: '1 again', cut: true },
    { text: '6', parent: 0, edge: '2' },
    { text: '0', parent: 8, edge: '6', color: 'green' },
  ];
  const sorted = array('c', 0, 0, 'sorted', ['1', '1', '2', '5', '6', '7', '10']);
  const calls = (count: number) => recursion('calls', 0, 0, 'calls', all.slice(0, count));
  return walk(40, {
    open: [array('c', 0, 0, 'candidates', ['10', '1', '2', '7', '6', '1', '5']), variable('t', 340, 22, 'target', '8')],
    setup: [sorted, variable('rule', 340, 22, 'same level', 'skip a value equal to the last one')],
    before: [{ caption: 'Starting with 1: [1, 1, 6], [1, 2, 5], and [1, 7].', elements: [calls(7)] }],
    result: [calls(10), variable('found', 470, 0, 'found', '[1,1,6] [1,2,5] [1,7] [2,6]')],
    cx: complexity('cx', 470, 60, '2ⁿ', 'in the worst case', 'n', 'recursion depth'),
    edge: note('edge', 470, 200, 'Sorted: once a value is too big, stop the loop.'),
  });
}

// ---------- 46. Permutations ----------

function permutations(): BoardDoc {
  const all: Call[] = [{ text: '[]', parent: -1 }];
  for (const a of ['1', '2', '3']) {
    const pa = all.push({ text: a, parent: 0, edge: a }) - 1;
    for (const b of ['1', '2', '3'].filter((x) => x !== a)) {
      const pb = all.push({ text: a + b, parent: pa, edge: b }) - 1;
      const c = ['1', '2', '3'].find((x) => x !== a && x !== b)!;
      all.push({ text: a + b + c, parent: pb, edge: c, color: 'green' });
    }
  }
  const calls = (count: number) => recursion('calls', 0, 0, 'calls', all.slice(0, count));
  return walk(46, {
    open: [array('n', 0, 0, 'nums', ['1', '2', '3'])],
    setup: [calls(2), variable('used', 420, 0, 'used', '{1}')],
    before: [{ caption: 'Under 1: 2 then 3 gives [1, 2, 3]; undo and try 3 then 2.', elements: [calls(6), variable('used', 420, 0, 'used', '{1, 3, 2}')] }],
    result: [calls(all.length), variable('n', 420, 0, 'permutations', '6')],
    cx: complexity('cx', 420, 60, 'n · n!', 'n! leaves, n to copy each', 'n', 'besides the output'),
    edge: note('edge', 420, 200, 'One element: exactly one permutation.'),
  });
}

// ---------- 90. Subsets II ----------

function subsetsWithDup(): BoardDoc {
  const all: Call[] = [
    { text: '[]', parent: -1, color: 'green' },
    { text: '1', parent: 0, edge: '1', color: 'green' },
    { text: '12', parent: 1, edge: '2', color: 'green' },
    { text: '122', parent: 2, edge: '2', color: 'green' },
    { text: '12', parent: 1, edge: '2 again', cut: true },
    { text: '2', parent: 0, edge: '2', color: 'green' },
    { text: '22', parent: 5, edge: '2', color: 'green' },
    { text: '2', parent: 0, edge: '2 again', cut: true },
  ];
  const calls = (count: number) => recursion('calls', 0, 0, 'subset', all.slice(0, count));
  return walk(90, {
    open: [array('n', 0, 0, 'sorted nums', ['1', '2', '2'])],
    setup: [calls(4), variable('rule', 380, 0, 'same level', 'skip nums[i] == nums[i-1]')],
    before: [{ caption: 'Under [1], the second 2 at the same level would repeat [1, 2]: skip it.', elements: [calls(5)] }],
    result: [calls(8), variable('n', 380, 0, 'subsets', '6, no repeats')],
    cx: complexity('cx', 380, 60, 'n · 2ⁿ', 'up to 2ⁿ subsets to copy', 'n', 'recursion depth'),
    edge: note('edge', 380, 200, '[2, 2, 2] gives n + 1 = 4 subsets.'),
  });
}

// ---------- 79. Word Search ----------

function wordSearch(): BoardDoc {
  const letters = [
    ['A', 'B', 'C', 'E'],
    ['S', 'F', 'C', 'S'],
    ['A', 'D', 'E', 'E'],
  ];
  const rows = (path: [number, number][], color: CellColor = 'green') =>
    letters.map((row, r) =>
      array(
        `r${r}`,
        0,
        r * 90,
        `row ${r}`,
        row,
        row.map((_, c) => (path.some(([pr, pc]) => pr === r && pc === c) ? color : null)),
      ),
    );
  const word = variable('w', 220, 22, 'word', '"ABCCED"');
  return walk(79, {
    open: [...rows([]), word],
    setup: [...rows([[0, 0]], 'yellow'), word, variable('mark', 220, 72, 'visited', 'mark, then restore')],
    before: [
      {
        caption: 'A, B, C along the top, then down to the C below it.',
        elements: [
          ...rows(
            [
              [0, 0],
              [0, 1],
              [0, 2],
              [1, 2],
            ],
            'yellow',
          ),
          word,
        ],
      },
    ],
    result: [
      ...rows([
        [0, 0],
        [0, 1],
        [0, 2],
        [1, 2],
        [2, 2],
        [2, 1],
      ]),
      word,
      variable('ans', 220, 72, 'return', 'True'),
    ],
    cx: complexity('cx', 440, 0, 'm·n·3^L', 'three new directions per step', 'L', 'recursion depth'),
    edge: note('edge', 440, 130, 'A letter doesn’t match: stop that path right away.'),
  });
}

// ---------- 131. Palindrome Partitioning ----------

function palindromePartition(): BoardDoc {
  const all: Call[] = [
    { text: 'aab', parent: -1 },
    { text: 'ab', parent: 0, edge: 'a' },
    { text: 'b', parent: 1, edge: 'a' },
    { text: '""', parent: 2, edge: 'b', color: 'green' },
    { text: '""', parent: 1, edge: 'ab', cut: true },
    { text: 'b', parent: 0, edge: 'aa' },
    { text: '""', parent: 5, edge: 'b', color: 'green' },
    { text: '""', parent: 0, edge: 'aab', cut: true },
  ];
  const calls = (count: number) => recursion('calls', 0, 0, 'left', all.slice(0, count));
  return walk(131, {
    open: [array('s', 0, 0, 's', ['a', 'a', 'b'])],
    setup: [calls(2), variable('rule', 380, 0, 'cut here if', 'the piece is a palindrome')],
    before: [{ caption: 'Cut "a", then "a", then "b": that’s ["a", "a", "b"]. "ab" isn’t a palindrome.', elements: [calls(5)] }],
    result: [calls(8), variable('ans', 380, 0, 'found', '[a, a, b], [aa, b]')],
    cx: complexity('cx', 380, 60, 'n · 2ⁿ', 'up to 2ⁿ ways to cut', 'n', 'recursion depth'),
    edge: note('edge', 380, 200, '"aaaa": every cut works, the worst case.'),
  });
}

// ---------- 17. Letter Combinations of a Phone Number ----------

function letterCombinations(): BoardDoc {
  const all: Call[] = [{ text: '""', parent: -1 }];
  for (const a of ['a', 'b', 'c']) {
    const pa = all.push({ text: a, parent: 0, edge: a }) - 1;
    for (const b of ['d', 'e', 'f']) all.push({ text: a + b, parent: pa, edge: b, color: 'green' });
  }
  const calls = (count: number) => recursion('calls', 0, 0, 'calls', all.slice(0, count));
  const keys = dict('keys', 520, 0, 'digit → letters', [
    ['2', 'abc'],
    ['3', 'def'],
  ]);
  return walk(17, {
    open: [variable('d', 0, 0, 'digits', '"23"'), keys],
    setup: [calls(2), keys],
    before: [{ caption: 'After a: d, e, f give "ad", "ae", "af".', elements: [calls(5), keys] }],
    result: [calls(all.length), keys, variable('n', 520, 150, 'combinations', '3 × 3 = 9')],
    cx: complexity('cx', 0, 280, '4ⁿ · n', '7 and 9 have four letters', 'n', 'recursion depth'),
    edge: note('edge', 380, 280, 'Empty input: return [], not [""].'),
  });
}

// ---------- 51. N-Queens ----------

function solveNQueens(): BoardDoc {
  const chess = (rows: string[][]) => grid('b', 0, 0, 'board', rows);
  const empty = ['.', '.', '.', '.'];
  const sets = (cols: string, diag: string, anti: string) => [variable('c', 240, 0, 'cols', cols), variable('d', 240, 50, 'r - c', diag), variable('a', 240, 100, 'r + c', anti)];
  return walk(51, {
    open: [chess([empty, empty, empty, empty])],
    setup: [chess([['Q', '.', '.', '.'], empty, empty, empty]), ...sets('{0}', '{0}', '{0}')],
    before: [
      {
        caption: 'Q at (0, 0) and (1, 2) leaves row 2 with no safe column, so I back up.',
        elements: [chess([['Q', '.', '.', '.'], ['.', '.', 'Q', '.'], ['×', '×', '×', '×'], empty]), ...sets('{0, 2}', '{0, -1}', '{0, 3}')],
      },
    ],
    result: [
      chess([
        ['.', 'Q', '.', '.'],
        ['.', '.', '.', 'Q'],
        ['Q', '.', '.', '.'],
        ['.', '.', 'Q', '.'],
      ]),
      ...sets('{1, 3, 0, 2}', '{-1, -2, 2, 1}', '{1, 4, 2, 5}'),
    ],
    cx: complexity('cx', 460, 0, 'n!', 'fewer choices each row', 'n', 'three sets'),
    edge: note('edge', 460, 130, 'n = 2 or 3: no solutions.'),
  });
}

// ---------- 37. Sudoku Solver ----------

function solveSudoku(): BoardDoc {
  const rows = (cell: string) =>
    grid('b', 0, 0, 'board (rows 0–2)', [
      ['5', '3', cell, '.', '7', '.', '.', '.', '.'],
      ['6', '.', '.', '1', '9', '5', '.', '.', '.'],
      ['.', '9', '8', '.', '.', '.', '.', '6', '.'],
    ]);
  return walk(37, {
    open: [rows('.')],
    setup: [rows('.'), variable('sets', 0, 200, 'rows, cols, boxes', 'sets: O(1) checks')],
    before: [{ caption: 'Cell (0, 2): row 0, column 2, and box 0 rule out all but 1, 2, and 4.', elements: [rows('?'), variable('opts', 0, 200, 'options for (0, 2)', '1, 2, 4')] }],
    result: [rows('4'), variable('opts', 0, 200, '(0, 2)', '1 and 2 hit dead ends later: 4')],
    cx: complexity('cx', 460, 0, '9^81', 'exponential, fast in practice', '81', 'the board and sets'),
    edge: note('edge', 460, 130, 'Optional: fill the cell with the fewest options first.'),
  });
}

export const BOARDS: ReferenceBoards = {
  78: subsets,
  39: combinationSum,
  40: combinationSum2,
  46: permutations,
  90: subsetsWithDup,
  79: wordSearch,
  131: palindromePartition,
  17: letterCombinations,
  51: solveNQueens,
  37: solveSudoku,
};
