import type { BoardDoc } from 'dsa-whiteboard';
import type { ReferenceBoards } from './index';
import { array, bits, complexity, dict, grid, note, pointer, set, table, variable, walk, type Colors } from './build';

// 參考板書：數學與幾何。版面橫著排，下面留給播放列；複雜度區塊和便利貼放右邊。

// ---------- 202. Happy Number ----------

function isHappy(): BoardDoc {
  const seq = (items: string[], colors?: Colors) => array('seq', 0, 0, 'path', items, colors);
  return walk(202, {
    open: [variable('n', 0, 0, 'n', '19')],
    setup: [seq(['19']), set('seen', 0, 130, 'seen', ['19'])],
    before: [{ caption: '1² + 9² = 82, then 8² + 2² = 68.', elements: [seq(['19', '82', '68']), set('seen', 0, 130, 'seen', ['19', '82', '68'])] }],
    result: [seq(['19', '82', '68', '100', '1'], [null, null, null, null, 'green']), set('seen', 0, 130, 'seen', ['19', '82', '68', '100']), variable('ans', 260, 0, 'reached 1', 'happy')],
    cx: complexity('cx', 260, 60, 'log n', 'per step, few steps', '1', 'with fast and slow'),
    edge: note('edge', 260, 200, 'n = 1: happy right away.'),
  });
}

// ---------- 66. Plus One ----------

function plusOne(): BoardDoc {
  const digits = (items: string[], colors?: Colors) => array('d', 0, 0, 'digits', items, colors);
  return walk(66, {
    open: [digits(['1', '2', '9'])],
    setup: [digits(['1', '2', '9']), pointer('i', 'i', 'd', 2)],
    before: [{ caption: 'The last digit is 9: it becomes 0 and the carry moves left.', elements: [digits(['1', '2', '0'], [null, null, 'yellow']), pointer('i', 'i', 'd', 1)] }],
    result: [digits(['1', '3', '0'], [null, 'green', 'yellow']), pointer('i', 'i', 'd', 1)],
    cx: complexity('cx', 200, 0, 'n', 'at most one pass', '1', 'unless all 9s'),
    edge: note('edge', 200, 130, '[9, 9] becomes [1, 0, 0].'),
  });
}

// ---------- 13. Roman to Integer ----------

function romanToInt(): BoardDoc {
  const s = (colors?: Colors) => array('s', 0, 0, 's', ['M', 'C', 'M', 'X', 'C', 'I', 'V'], colors);
  const values = (items: string[], colors?: Colors) => array('v', 0, 110, 'value', items, colors);
  return walk(13, {
    open: [s()],
    setup: [s(), values(['1000', '100', '1000', '10', '100', '1', '5'])],
    before: [{ caption: 'C before M is smaller, so it counts as -100.', elements: [s([null, 'red']), values(['1000', '100', '1000', '10', '100', '1', '5'], [null, 'red'])] }],
    result: [
      s([null, 'red', null, 'red', null, 'red']),
      values(['1000', '100', '1000', '10', '100', '1', '5'], [null, 'red', null, 'red', null, 'red']),
      variable('sum', 0, 220, 'total (red is subtracted)', '1994'),
    ],
    cx: complexity('cx', 360, 0, 'n', 'one pass', '1', 'a fixed map'),
    edge: note('edge', 360, 130, 'The last symbol has no neighbor: always added.'),
  });
}

// ---------- 9. Palindrome Number ----------

function isPalindromeNumber(): BoardDoc {
  const state = (x: string, rev: string) => [variable('x', 0, 0, 'x', x), variable('r', 0, 50, 'reversed half', rev)];
  return walk(9, {
    open: [variable('x', 0, 0, 'x', '1221')],
    setup: state('1221', '0'),
    before: [{ caption: 'Pop 1: x = 122, reversed = 1.', elements: state('122', '1') }],
    result: [...state('12', '12'), variable('ans', 0, 100, '12 == 12', 'True')],
    cx: complexity('cx', 260, 0, 'log n', 'half the digits', '1', 'two numbers, no string'),
    edge: note('edge', 260, 130, 'Negative, or ends in 0 (but not 0): False.'),
  });
}

// ---------- 48. Rotate Image ----------

function rotateImage(): BoardDoc {
  const m = (rows: string[][]) => grid('m', 0, 0, 'matrix', rows);
  return walk(48, {
    open: [
      m([
        ['1', '2', '3'],
        ['4', '5', '6'],
        ['7', '8', '9'],
      ]),
    ],
    setup: [
      m([
        ['1', '2', '3'],
        ['4', '5', '6'],
        ['7', '8', '9'],
      ]),
      variable('plan', 200, 0, 'plan', 'transpose, then reverse rows'),
    ],
    before: [
      {
        caption: 'Transpose: swap across the diagonal, only the upper triangle.',
        elements: [
          m([
            ['1', '4', '7'],
            ['2', '5', '8'],
            ['3', '6', '9'],
          ]),
        ],
      },
    ],
    result: [
      m([
        ['7', '4', '1'],
        ['8', '5', '2'],
        ['9', '6', '3'],
      ]),
    ],
    cx: complexity('cx', 200, 0, 'n²', 'every cell moves twice', '1', 'in place'),
    edge: note('edge', 200, 140, 'Swap only j > i, or pairs swap back.'),
  });
}

// ---------- 54. Spiral Matrix ----------

function spiralOrder(): BoardDoc {
  const m = grid('m', 0, 0, 'matrix', [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
  ]);
  const out = (items: string[]) => array('out', 0, 200, 'order', items);
  return walk(54, {
    open: [m],
    setup: [m, variable('b', 200, 0, 'bounds', 'top 0, bottom 2, left 0, right 2')],
    before: [{ caption: 'Top row, then right column: 1, 2, 3, 6, 9. top and right move in.', elements: [m, out(['1', '2', '3', '6', '9'])] }],
    result: [m, out(['1', '2', '3', '6', '9', '8', '7', '4', '5'])],
    cx: complexity('cx', 440, 0, 'm·n', 'each cell once', '1', 'four bounds'),
    edge: note('edge', 440, 130, 'One row or column left: recheck bounds before the bottom and left.'),
  });
}

// ---------- 73. Set Matrix Zeroes ----------

function setZeroes(): BoardDoc {
  const m = (rows: string[][]) => grid('m', 0, 0, 'matrix', rows);
  return walk(73, {
    open: [
      m([
        ['1', '1', '1'],
        ['1', '0', '1'],
        ['1', '1', '1'],
      ]),
    ],
    setup: [
      m([
        ['1', '1', '1'],
        ['1', '0', '1'],
        ['1', '1', '1'],
      ]),
      variable('f', 200, 0, 'row 0 / col 0', 'no zero of their own'),
    ],
    before: [
      {
        caption: 'The 0 at (1, 1) marks row 0 at column 1 and column 0 at row 1.',
        elements: [
          m([
            ['1', '0', '1'],
            ['0', '0', '1'],
            ['1', '1', '1'],
          ]),
        ],
      },
    ],
    result: [
      m([
        ['1', '0', '1'],
        ['0', '0', '0'],
        ['1', '0', '1'],
      ]),
    ],
    cx: complexity('cx', 200, 0, 'm·n', 'two passes', '1', 'markers in row 0 and col 0'),
    edge: note('edge', 200, 140, 'Clear row 0 and column 0 last.'),
  });
}

// ---------- 50. Pow(x, n) ----------

function myPow(): BoardDoc {
  const n = (colors?: Colors) => bits('n', 0, 0, 'n = 10', ['1', '0', '1', '0'], colors);
  return walk(50, {
    open: [variable('x', 0, 0, 'x, n', '2, 10')],
    setup: [n(), variable('b', 220, 0, 'base', '2'), variable('r', 220, 50, 'result', '1')],
    before: [
      {
        caption: 'Bit 1 is set: result × 4. The base keeps squaring: 2, 4, 16, 256.',
        elements: [n([null, null, 'green', null]), variable('b', 220, 0, 'base', '16'), variable('r', 220, 50, 'result', '4')],
      },
    ],
    result: [n(['green', null, 'green', null]), variable('b', 220, 0, 'base', '256'), variable('r', 220, 50, 'result', '4 × 256 = 1024')],
    cx: complexity('cx', 460, 0, 'log n', 'one step per bit', '1', 'iterative'),
    edge: note('edge', 460, 130, 'n < 0: use 1 / x; careful with the smallest int.'),
  });
}

// ---------- 43. Multiply Strings ----------

function multiplyStrings(): BoardDoc {
  const nums = [array('a', 0, 0, 'num1', ['1', '2', '3']), array('b', 180, 0, 'num2', ['4', '5', '6'])];
  const res = (items: string[], colors?: Colors) => array('r', 0, 120, 'result (m + n = 6)', items, colors);
  return walk(43, {
    open: nums,
    setup: [...nums, res(['0', '0', '0', '0', '0', '0'])],
    before: [
      {
        caption: '3 × 6 = 18 lands at position 2 + 2 + 1 = 5: write 8, carry 1 into position 4.',
        elements: [...nums, pointer('i', 'i', 'a', 2), pointer('j', 'j', 'b', 2), res(['0', '0', '0', '0', '1', '8'], [null, null, null, null, 'yellow', 'green'])],
      },
    ],
    result: [...nums, res(['0', '5', '6', '0', '8', '8'], ['gray', 'green', 'green', 'green', 'green', 'green']), variable('ans', 0, 240, 'strip zeros', '"56088"')],
    cx: complexity('cx', 480, 0, 'm·n', 'every pair of digits', 'm + n', 'the result array'),
    edge: note('edge', 480, 130, 'Either is "0": return "0".'),
  });
}

// ---------- 2013. Detect Squares ----------

function detectSquares(): BoardDoc {
  const pts = (q: string) =>
    table('g', 0, 0, 'corners', [
      ['3,10', q],
      ['3,2', '11,2'],
    ]);
  return walk(2013, {
    open: [variable('p', 0, 0, 'points', '(3, 10), (11, 2), (3, 2)')],
    setup: [
      dict('cnt', 0, 0, 'count', [
        ['3,10', '1'],
        ['11,2', '1'],
        ['3,2', '1'],
      ]),
    ],
    result: [pts('11,10'), variable('d', 200, 0, 'diagonal (3, 2)', 'side 8'), variable('n', 200, 50, '1 × 1', '1 square')],
    cx: complexity('cx', 200, 110, 'points', 'per count; add is O(1)', 'n', 'the counts'),
    edge: note('edge', 200, 250, 'Duplicates multiply; skip side length 0.'),
  });
}

// ---------- 8. String to Integer (atoi) ----------

function myAtoi(): BoardDoc {
  const s = (colors?: Colors) => array('s', 0, 0, 's', ['␣', '␣', '␣', '-', '4', '2', 'a', 'b', 'c'], colors);
  return walk(8, {
    open: [s()],
    setup: [s(['gray', 'gray', 'gray']), pointer('i', 'i', 's', 3)],
    before: [{ caption: 'Skip three spaces, then read the sign: -.', elements: [s(['gray', 'gray', 'gray', 'yellow']), pointer('i', 'i', 's', 4), variable('sign', 0, 150, 'sign', '-1')] }],
    result: [s(['gray', 'gray', 'gray', 'yellow', 'green', 'green', 'red']), pointer('i', 'i', 's', 6), variable('sign', 0, 150, 'stop at a', '-42')],
    cx: complexity('cx', 440, 0, 'n', 'one scan', '1', 'a few numbers'),
    edge: note('edge', 440, 130, 'Check overflow before × 10: clamp to the limit.'),
  });
}

export const BOARDS: ReferenceBoards = {
  202: isHappy,
  66: plusOne,
  13: romanToInt,
  9: isPalindromeNumber,
  48: rotateImage,
  54: spiralOrder,
  73: setZeroes,
  50: myPow,
  43: multiplyStrings,
  2013: detectSquares,
  8: myAtoi,
};
