import type { BoardDoc } from 'dsa-whiteboard';
import type { ReferenceBoards } from './index';
import { array, board, complexity, grid, lines, note, pointer, range, variable, walk, type CellColor, type Colors } from './build';

// 參考板書：二分搜尋。版面橫著排，下面留給播放列；複雜度區塊和便利貼放右邊。

// ---------- 704. Binary Search ----------

function binarySearch(): BoardDoc {
  const [insight, structure, example, cost, edge] = lines(704);
  const nums = (colors?: (CellColor | null)[]) => array('nums', 0, 0, 'nums', ['-1', '0', '3', '5', '9', '12'], colors);
  const target = variable('target', 300, 22, 'target', '9');
  const bounds = (l: number, r: number) => [pointer('left', 'left', 'nums', l), pointer('right', 'right', 'nums', r), range('window', 'left', 'right')];
  const found = [nums(['gray', 'gray', 'gray', null, 'green', null]), target, ...bounds(3, 5), pointer('mid', 'mid', 'nums', 4), variable('midv', 300, 72, 'mid', '(3 + 5) // 2 = 4')];
  const result = complexity('cx', 540, 0, 'log n', 'each step halves the range', '1', 'just three indices');
  return board([
    { caption: insight, elements: [nums(), target] },
    { caption: structure, elements: [nums(), target, ...bounds(0, 5)] },
    {
      caption: 'mid = (0 + 5) // 2 = 2: nums[2] is 3, smaller than 9, so the answer can’t be at or left of 2. left = mid + 1.',
      elements: [nums(['gray', 'gray', 'gray', null, null, null]), target, ...bounds(0, 5), pointer('mid', 'mid', 'nums', 2), variable('midv', 300, 72, 'mid', '(0 + 5) // 2 = 2')],
    },
    { caption: example, elements: found },
    { caption: cost, elements: [...found, result] },
    {
      caption: edge,
      elements: [...found, result, note('edge', 540, 140, 'Not there: left passes right and I return -1.')],
    },
  ]);
}

// ---------- 278. First Bad Version ----------

function firstBadVersion(): BoardDoc {
  const versions = (colors?: Colors) => array('v', 0, 0, 'versions', ['1', '2', '3', '4', '5'], colors);
  const bounds = (l: number, r: number) => [pointer('left', 'left', 'v', l), pointer('right', 'right', 'v', r), range('window', 'left', 'right')];
  return walk(278, {
    open: [versions(['green', 'green', 'green', 'red', 'red'])],
    setup: [versions(), ...bounds(0, 4)],
    before: [{ caption: 'mid = 3 is good, so left moves past it to 4.', elements: [versions(['gray', 'gray', 'green', null, null]), ...bounds(3, 4)] }],
    result: [versions(['gray', 'gray', 'gray', 'red', 'gray']), ...bounds(3, 3), variable('ans', 260, 0, 'first bad', '4')],
    cx: complexity('cx', 440, 0, 'log n', 'calls to isBadVersion', '1', 'two bounds'),
    edge: note('edge', 440, 130, 'Version 1 is bad: right can still reach 1.'),
  });
}

// ---------- 74. Search a 2D Matrix ----------

function searchMatrix(): BoardDoc {
  const matrix = grid('m', 0, 0, 'matrix', [
    ['1', '3', '5', '7'],
    ['10', '11', '16', '20'],
    ['23', '30', '34', '60'],
  ]);
  const flat = (colors?: Colors) => array('flat', 0, 200, 'as one sorted list', ['1', '3', '5', '7', '10', '11', '16', '20', '23', '30', '34', '60'], colors);
  const target = variable('target', 240, 0, 'target', '3');
  return walk(74, {
    open: [matrix, target],
    setup: [matrix, target, flat(), pointer('lo', 'lo', 'flat', 0), pointer('hi', 'hi', 'flat', 11)],
    result: [
      matrix,
      target,
      flat([null, null, null, null, null, 'yellow']),
      pointer('mid', 'mid', 'flat', 5),
      variable('row', 240, 50, 'row', '5 // 4 = 1'),
      variable('col', 240, 100, 'col', '5 % 4 = 1'),
    ],
    cx: complexity('cx', 600, 0, 'log(m·n)', 'binary search over m·n cells', '1', 'just indices'),
    edge: note('edge', 600, 130, 'Empty matrix or empty rows: check first.'),
  });
}

// ---------- 875. Koko Eating Bananas ----------

function kokoBananas(): BoardDoc {
  const piles = array('piles', 0, 0, 'piles', ['3', '6', '7', '11']);
  const speeds = (colors?: Colors) => array('k', 0, 140, 'speed', ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11'], colors);
  const bounds = (l: number, r: number) => [pointer('lo', 'lo', 'k', l), pointer('hi', 'hi', 'k', r), range('window', 'lo', 'hi')];
  const h = variable('h', 220, 0, 'h', '8');
  return walk(875, {
    open: [piles, h],
    setup: [piles, h, speeds(), ...bounds(0, 10)],
    before: [
      {
        caption: 'Speed 6: 1 + 1 + 2 + 2 = 6 hours, fast enough, so hi = 6.',
        elements: [piles, h, speeds([null, null, null, null, null, 'green']), ...bounds(0, 5), variable('hours', 220, 50, 'hours', '6')],
      },
      { caption: 'Speed 3: 1 + 2 + 3 + 4 = 10 hours, too slow, so lo = 4.', elements: [piles, h, speeds(['gray', 'gray', 'red']), ...bounds(3, 5), variable('hours', 220, 50, 'hours', '10')] },
    ],
    result: [piles, h, speeds(['gray', 'gray', 'gray', 'green', 'gray', 'gray']), ...bounds(3, 3), variable('hours', 220, 50, 'hours', '1 + 2 + 2 + 3 = 8')],
    cx: complexity('cx', 520, 0, 'n log m', 'n piles per guess', '1', 'a few counters'),
    edge: note('edge', 520, 130, 'h = number of piles: the answer is the largest pile.'),
  });
}

// ---------- 153. Find Minimum in Rotated Sorted Array ----------

function findMinRotated(): BoardDoc {
  const nums = (colors?: Colors) => array('nums', 0, 0, 'nums', ['3', '4', '5', '1', '2'], colors);
  const bounds = (l: number, r: number) => [pointer('left', 'left', 'nums', l), pointer('right', 'right', 'nums', r), range('window', 'left', 'right')];
  return walk(153, {
    open: [nums()],
    setup: [nums(), ...bounds(0, 4)],
    before: [{ caption: 'mid = 2: 5 > 2, so the drop is on the right. left = 3.', elements: [nums(['gray', 'gray', 'yellow', null, null]), ...bounds(0, 4), pointer('mid', 'mid', 'nums', 2)] }],
    result: [nums(['gray', 'gray', 'gray', 'green', 'gray']), ...bounds(3, 3), variable('ans', 260, 0, 'minimum', '1')],
    cx: complexity('cx', 440, 0, 'log n', 'each step halves the range', '1', 'two bounds'),
    edge: note('edge', 440, 130, 'Not rotated: right keeps moving left to index 0.'),
  });
}

// ---------- 33. Search in Rotated Sorted Array ----------

function searchRotated(): BoardDoc {
  const nums = (colors?: Colors) => array('nums', 0, 0, 'nums', ['4', '5', '6', '7', '0', '1', '2'], colors);
  const bounds = (l: number, r: number) => [pointer('left', 'left', 'nums', l), pointer('right', 'right', 'nums', r), range('window', 'left', 'right')];
  const target = variable('target', 340, 0, 'target', '0');
  return walk(33, {
    open: [nums(), target],
    setup: [nums(), target, ...bounds(0, 6), pointer('mid', 'mid', 'nums', 3)],
    result: [nums(['gray', 'gray', 'gray', 'gray', null, null, null]), target, ...bounds(4, 6), variable('why', 340, 50, '4..7 sorted', '0 not in it, go right')],
    cx: complexity('cx', 0, 160, 'log n', 'each step halves the range', '1', 'three indices'),
    edge: note('edge', 380, 160, 'Two elements left: compare with <= on the left.', 220),
  });
}

// ---------- 981. Time Based Key-Value Store ----------

function timeMap(): BoardDoc {
  const times = (colors?: Colors) => array('t', 0, 0, 'foo: times', ['1', '4'], colors);
  const values = (colors?: Colors) => array('v', 0, 130, 'foo: values', ['bar', 'bar4'], colors);
  return walk(981, {
    open: [times(), values()],
    setup: [times(), values(), pointer('lo', 'lo', 't', 0), pointer('hi', 'hi', 't', 1)],
    result: [times(['green', 'gray']), values(['green', null]), pointer('ans', 'ans', 't', 0), variable('get', 140, 0, 'get(foo, 3)', '"bar"')],
    cx: complexity('cx', 380, 0, 'log n', 'per get; set is O(1)', 'n', 'every set call'),
    edge: note('edge', 380, 130, 'Query before every time: return "".'),
  });
}

// ---------- 528. Random Pick with Weight ----------

function randomPickWeight(): BoardDoc {
  const w = array('w', 0, 0, 'w', ['1', '3']);
  const prefix = (colors?: Colors) => array('pre', 0, 130, 'prefix', ['1', '4'], colors);
  const line = array('line', 140, 130, 'r = 1..4 picks', ['0', '1', '1', '1'], ['blue', 'green', 'green', 'green']);
  return walk(528, {
    open: [w],
    setup: [w, prefix()],
    result: [w, prefix([null, 'green']), line, pointer('i', 'i', 'pre', 1), variable('r', 140, 0, 'r = 3', 'first prefix >= 3: index 1')],
    cx: complexity('cx', 480, 0, 'log n', 'per pick; setup is O(n)', 'n', 'the prefix sums'),
    edge: note('edge', 480, 130, 'Pick r from 1 to total and find the first prefix >= r.'),
  });
}

// ---------- 658. Find K Closest Elements ----------

function findClosest(): BoardDoc {
  const arr = (colors?: Colors) => array('arr', 0, 0, 'arr', ['1', '2', '3', '4', '5'], colors);
  const kx = [variable('k', 260, 0, 'k', '4'), variable('x', 260, 50, 'x', '3')];
  return walk(658, {
    open: [arr(), ...kx],
    setup: [arr(), ...kx, pointer('lo', 'lo', 'arr', 0), pointer('hi', 'hi', 'arr', 1)],
    result: [arr(['green', 'green', 'green', 'green', null]), ...kx, pointer('l', 'start', 'arr', 0), variable('cmp', 0, 160, 'tie', '3 - 1 = 5 - 3: keep left')],
    cx: complexity('cx', 420, 0, 'log(n-k) + k', 'search the start, then copy k', '1', 'besides the output'),
    edge: note('edge', 420, 140, 'x outside the array: the window sits at one end.'),
  });
}

// ---------- 4. Median of Two Sorted Arrays ----------

function medianSortedArrays(): BoardDoc {
  const a = (colors?: Colors) => array('a', 0, 0, 'nums1', ['1', '3'], colors);
  const b = (colors?: Colors) => array('b', 0, 130, 'nums2', ['2'], colors);
  return walk(4, {
    open: [a(), b()],
    setup: [a(['blue', 'yellow']), b(['blue']), variable('cut', 140, 0, 'cut', 'after 1 and after 2')],
    result: [a(['blue', 'yellow']), b(['blue']), variable('lm', 140, 0, 'left max', 'max(1, 2) = 2'), variable('rm', 140, 50, 'right min', '3'), variable('med', 140, 100, 'median', '2')],
    cx: complexity('cx', 440, 0, 'log min(m,n)', 'search the shorter array', '1', 'a few cut values'),
    edge: note('edge', 440, 130, 'Cut at an end: the missing side is ±infinity.'),
  });
}

export const BOARDS: ReferenceBoards = {
  704: binarySearch,
  278: firstBadVersion,
  74: searchMatrix,
  875: kokoBananas,
  153: findMinRotated,
  33: searchRotated,
  981: timeMap,
  528: randomPickWeight,
  658: findClosest,
  4: medianSortedArrays,
};
