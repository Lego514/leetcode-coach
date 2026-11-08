import type { BoardDoc } from 'dsa-whiteboard';
import type { ReferenceBoards } from './index';
import { array, board, complexity, lines, note, pointer, range, variable, walk, type CellColor, type Colors } from './build';

// 參考板書：雙指標。版面橫著排，下面留給播放列；複雜度區塊和便利貼放右邊。

// ---------- 11. Container With Most Water ----------

function containerWithMostWater(): BoardDoc {
  const [insight, structure, example, cost, edge] = lines(11);
  const items = ['1', '8', '6', '2', '5', '4', '8', '3', '7'];
  const height = (colors?: (CellColor | null)[]) => array('height', 0, 0, 'height', items, colors);
  const at = (l: number, r: number) => [pointer('l', 'l', 'height', l), pointer('r', 'r', 'height', r), range('window', 'l', 'r')];
  const best = [height([null, 'green', null, null, null, null, null, null, 'green']), ...at(1, 8), variable('area', 440, 22, 'area', 'min(8, 7) * 7 = 49'), variable('best', 440, 72, 'best', '49')];
  const result = complexity('cx', 440, 130, 'n', 'each step moves one pointer inward', '1', 'just two pointers and best');
  return board([
    { caption: insight, elements: [height()] },
    { caption: structure, elements: [height(), ...at(0, 8)] },
    {
      caption: 'l = 0, r = 8: area is min(1, 7) × 8 = 8. The 1 is the shorter line, so l moves right.',
      elements: [height(['yellow', null, null, null, null, null, null, null, null]), ...at(0, 8), variable('area', 440, 22, 'area', 'min(1, 7) * 8 = 8'), variable('best', 440, 72, 'best', '8')],
    },
    { caption: example, elements: best },
    { caption: cost, elements: [...best, result] },
    {
      caption: edge,
      elements: [...best, result, note('edge', 0, 150, 'Equal heights: moving either pointer is fine.')],
    },
  ]);
}

// ---------- 125. Valid Palindrome ----------

function validPalindrome(): BoardDoc {
  const chars = ['A', '␣', 'm', 'a', 'n', ',', '␣', 'a', '␣', 'p', 'l', 'a', 'n'];
  const skipped: Colors = chars.map((c) => (c === '␣' || c === ',' ? 'gray' : null));
  const s = (colors?: Colors) => array('s', 0, 0, 's', chars, colors);
  const ends = [pointer('l', 'l', 's', 0), pointer('r', 'r', 's', 12)];
  return walk(125, {
    open: [s()],
    setup: [s(), ...ends],
    before: [{ caption: 'Spaces and commas don’t count: l and r skip right over them.', elements: [s(skipped), ...ends] }],
    result: [s(skipped.map((c, i) => (i === 0 || i === 12 ? 'red' : c))), ...ends, variable('cmp', 0, 150, 'compare', "'a' vs 'n'"), variable('ans', 0, 200, 'return', 'False')],
    cx: complexity('cx', 260, 150, 'n', 'each pointer only moves inward', '1', 'no cleaned copy'),
    edge: note('edge', 640, 150, 'No letters at all, like ", .": a palindrome.'),
  });
}

// ---------- 283. Move Zeroes ----------

function moveZeroes(): BoardDoc {
  const nums = (items: string[], colors?: Colors) => array('nums', 0, 0, 'nums', items, colors);
  const at = (w: number, r: number) => [pointer('w', 'w', 'nums', w), pointer('r', 'r', 'nums', r)];
  return walk(283, {
    open: [nums(['0', '1', '0', '3', '12'])],
    setup: [nums(['0', '1', '0', '3', '12']), ...at(0, 0)],
    before: [
      { caption: 'r = 1: 1 isn’t zero, so I swap it into w = 0 and move w: [1, 0, 0, 3, 12].', elements: [nums(['1', '0', '0', '3', '12'], ['green', null, null, null, null]), ...at(1, 1)] },
      { caption: 'r = 3: 3 swaps into w = 1: [1, 3, 0, 0, 12].', elements: [nums(['1', '3', '0', '0', '12'], ['green', 'green', null, null, null]), ...at(2, 3)] },
    ],
    result: [nums(['1', '3', '12', '0', '0'], ['green', 'green', 'green', 'gray', 'gray']), ...at(3, 4)],
    cx: complexity('cx', 280, 0, 'n', 'one pass', '1', 'swaps in place'),
    edge: note('edge', 280, 130, 'No zeros: every swap is with itself.'),
  });
}

// ---------- 977. Squares of a Sorted Array ----------

function sortedSquares(): BoardDoc {
  const nums = array('nums', 0, 0, 'nums', ['-4', '-1', '0', '3', '10']);
  const out = (items: string[], colors?: Colors) => array('res', 0, 170, 'result', items, colors);
  const ends = (l: number, r: number) => [pointer('l', 'l', 'nums', l), pointer('r', 'r', 'nums', r)];
  return walk(977, {
    open: [nums],
    setup: [nums, ...ends(0, 4), out(['', '', '', '', ''])],
    before: [
      { caption: '10² = 100 beats (-4)² = 16, so 100 fills the last slot and r moves left.', elements: [nums, ...ends(0, 3), out(['', '', '', '', '100'], [null, null, null, null, 'green'])] },
      { caption: '16 beats 9, so 16 goes next and l moves right.', elements: [nums, ...ends(1, 3), out(['', '', '', '16', '100'], [null, null, null, 'green', 'green'])] },
    ],
    result: [nums, ...ends(2, 2), out(['0', '1', '9', '16', '100'], ['green', 'green', 'green', 'green', 'green'])],
    cx: complexity('cx', 280, 0, 'n', 'one pass from both ends', 'n', 'the output array'),
    edge: note('edge', 280, 130, 'All negative or all positive: one pointer does all the moving.'),
  });
}

// ---------- 167. Two Sum II ----------

function twoSumSorted(): BoardDoc {
  const nums = (colors?: Colors) => array('nums', 0, 0, 'numbers', ['2', '7', '11', '15'], colors);
  const ends = (l: number, r: number) => [pointer('l', 'l', 'nums', l), pointer('r', 'r', 'nums', r), range('window', 'l', 'r')];
  const target = variable('target', 220, 0, 'target', '9');
  return walk(167, {
    open: [nums(), target],
    setup: [nums(), target, ...ends(0, 3)],
    before: [{ caption: '2 + 15 = 17 and 2 + 11 = 13 are too big, so r keeps moving left.', elements: [nums([null, null, 'gray', 'gray']), target, ...ends(0, 1)] }],
    result: [nums(['green', 'green', 'gray', 'gray']), target, ...ends(0, 1), variable('sum', 220, 50, 'sum', '2 + 7 = 9'), variable('ans', 220, 100, 'return', '[1, 2]')],
    cx: complexity('cx', 420, 0, 'n', 'each step rules out one number', '1', 'two pointers'),
    edge: note('edge', 420, 130, 'The answer is 1-indexed: add one to both indices.'),
  });
}

// ---------- 15. 3Sum ----------

function threeSum(): BoardDoc {
  const sorted = ['-4', '-1', '-1', '0', '1', '2'];
  const nums = (colors?: Colors) => array('nums', 0, 0, 'sorted nums', sorted, colors);
  const at = (l: number, r: number) => [pointer('i', 'i', 'nums', 1), pointer('l', 'l', 'nums', l), pointer('r', 'r', 'nums', r)];
  return walk(15, {
    open: [array('nums', 0, 0, 'nums', ['-1', '0', '1', '2', '-1', '-4'])],
    setup: [nums([null, 'yellow', null, null, null, null]), ...at(2, 5)],
    before: [
      {
        caption: 'i = 1 (-1), l = 2, r = 5: -1 + -1 + 2 = 0, a triplet. Both pointers move in.',
        elements: [nums([null, 'yellow', 'green', null, null, 'green']), ...at(2, 5), variable('found', 0, 150, 'found', '[-1, -1, 2]')],
      },
    ],
    result: [nums([null, 'yellow', null, 'green', 'green', null]), ...at(3, 4), variable('found', 0, 150, 'found', '[-1, -1, 2], [-1, 0, 1]')],
    cx: complexity('cx', 380, 0, 'n²', 'a linear scan per fixed index', '1', 'extra, besides sorting'),
    edge: note('edge', 380, 130, 'Skip repeated values for i, l, and r: no duplicate triplets.'),
  });
}

// ---------- 16. 3Sum Closest ----------

function threeSumClosest(): BoardDoc {
  const nums = (colors?: Colors) => array('nums', 0, 0, 'sorted nums', ['-4', '-1', '1', '2'], colors);
  const at = (i: number, l: number, r: number) => [pointer('i', 'i', 'nums', i), pointer('l', 'l', 'nums', l), pointer('r', 'r', 'nums', r)];
  const target = variable('target', 220, 0, 'target', '1');
  return walk(16, {
    open: [array('nums', 0, 0, 'nums', ['-1', '2', '1', '-4']), target],
    setup: [nums(), target, ...at(0, 1, 3)],
    before: [
      {
        caption: 'i = 0: -4 + -1 + 2 = -3 is too small, so l moves up: -4 + 1 + 2 = -1, still 2 away.',
        elements: [nums(['yellow', null, 'green', 'green']), target, ...at(0, 2, 3), variable('sum', 220, 50, 'sum', '-4 + 1 + 2 = -1'), variable('best', 220, 100, 'best', '-1')],
      },
    ],
    result: [nums([null, 'yellow', 'green', 'green']), target, ...at(1, 2, 3), variable('sum', 220, 50, 'sum', '-1 + 1 + 2 = 2'), variable('best', 220, 100, 'best', '2')],
    cx: complexity('cx', 470, 0, 'n²', 'two pointers per fixed index', '1', 'extra, besides sorting'),
    edge: note('edge', 470, 130, 'Sum equals the target: return it right away.'),
  });
}

// ---------- 75. Sort Colors ----------

function sortColors(): BoardDoc {
  const nums = (items: string[], colors?: Colors) => array('nums', 0, 0, 'nums', items, colors);
  const at = (low: number, mid: number, high: number) => [pointer('low', 'low', 'nums', low), pointer('mid', 'mid', 'nums', mid), pointer('high', 'high', 'nums', high)];
  return walk(75, {
    open: [nums(['2', '0', '2', '1', '1', '0'])],
    setup: [nums(['2', '0', '2', '1', '1', '0']), ...at(0, 0, 5)],
    before: [
      {
        caption: 'mid sees 2: swap it with high and pull high in. The 0 that came back is checked next.',
        elements: [nums(['0', '0', '2', '1', '1', '2'], [null, null, null, null, null, 'green']), ...at(0, 0, 4)],
      },
      { caption: 'mid sees 0 twice: swap with low and move both forward.', elements: [nums(['0', '0', '2', '1', '1', '2'], ['green', 'green', null, null, null, 'green']), ...at(2, 2, 4)] },
      { caption: 'mid sees 2 again: swap with high = 4, so 1 comes back to mid.', elements: [nums(['0', '0', '1', '1', '2', '2'], ['green', 'green', null, null, 'green', 'green']), ...at(2, 2, 3)] },
    ],
    result: [nums(['0', '0', '1', '1', '2', '2'], ['green', 'green', 'green', 'green', 'green', 'green']), ...at(2, 4, 3)],
    cx: complexity('cx', 300, 0, 'n', 'one pass', '1', 'three pointers'),
    edge: note('edge', 300, 130, 'After swapping with high, don’t move mid yet.'),
  });
}

// ---------- 42. Trapping Rain Water ----------

function trappingRainWater(): BoardDoc {
  const items = ['0', '1', '0', '2', '1', '0', '1', '3', '2', '1', '2', '1'];
  const height = (colors?: Colors) => array('height', 0, 0, 'height', items, colors);
  const water = (values: string[], colors?: Colors) => array('water', 0, 180, 'water', values, colors);
  const state = (l: number, r: number, lmax: string, rmax: string) => [
    pointer('l', 'l', 'height', l),
    pointer('r', 'r', 'height', r),
    variable('lmax', 560, 0, 'left_max', lmax),
    variable('rmax', 560, 50, 'right_max', rmax),
  ];
  const none = Array<string>(12).fill('0');
  const full = ['0', '0', '1', '0', '1', '2', '1', '0', '0', '1', '0', '0'];
  return walk(42, {
    open: [height()],
    setup: [height(), ...state(0, 11, '0', '0'), water(none)],
    before: [
      {
        caption: 'l = 2: the bar is 0 under left_max 1, and the right side is at least as tall, so it holds 1.',
        elements: [height(), ...state(2, 10, '1', '1'), water(['0', '0', '1', '0', '0', '0', '0', '0', '0', '0', '0', '0'], [null, null, 'blue'])],
      },
    ],
    result: [
      height(),
      ...state(7, 7, '2', '2'),
      water(
        full,
        full.map((w) => (w === '0' ? null : 'blue')),
      ),
      variable('total', 760, 0, 'total', '6'),
    ],
    cx: complexity('cx', 560, 110, 'n', 'l and r meet once', '1', 'two maximums'),
    edge: note('edge', 560, 250, 'Fewer than three bars hold no water.'),
  });
}

export const BOARDS: ReferenceBoards = {
  11: containerWithMostWater,
  125: validPalindrome,
  283: moveZeroes,
  977: sortedSquares,
  167: twoSumSorted,
  15: threeSum,
  16: threeSumClosest,
  75: sortColors,
  42: trappingRainWater,
};
