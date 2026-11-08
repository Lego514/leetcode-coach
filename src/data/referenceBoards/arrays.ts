import type { BoardDoc } from 'dsa-whiteboard';
import type { ReferenceBoards } from './index';
import { array, board, complexity, dict, grid, lines, note, pointer, range, set, table, variable, walk, type CellColor, type Colors } from './build';

// 參考板書：陣列與雜湊。版面橫著排，下面留給播放列；複雜度區塊和便利貼放右邊。

// ---------- 1. Two Sum ----------

function twoSum(): BoardDoc {
  const [insight, structure, example, cost, edge] = lines(1);
  const target = variable('target', 220, 22, 'target', '9');
  const nums = (colors?: (CellColor | null)[]) => array('nums', 0, 0, 'nums', ['2', '7', '11', '15'], colors);
  const result = complexity('cx', 440, 110, 'n', 'one pass through the array', 'n', 'seen holds up to n numbers');
  const found = [
    nums(['green', 'green', null, null]),
    target,
    pointer('i', 'i', 'nums', 1),
    variable('need', 220, 72, 'need', '9 - 7 = 2'),
    dict('seen', 0, 150, 'seen', [['2', '0']]),
    variable('ans', 220, 122, 'return', '[0, 1]'),
  ];
  return board([
    { caption: insight, elements: [nums(), target] },
    {
      caption: structure,
      elements: [nums(), target, variable('empty', 0, 170, 'seen', '{}')],
    },
    {
      caption: 'i = 0: need is 9 - 2 = 7, which isn’t in seen yet, so I store 2 → 0 and move on.',
      elements: [nums(['yellow', null, null, null]), target, pointer('i', 'i', 'nums', 0), variable('need', 220, 72, 'need', '9 - 2 = 7'), dict('seen', 0, 150, 'seen', [['2', '0']])],
    },
    { caption: example, elements: found },
    { caption: cost, elements: [...found, result] },
    {
      caption: edge,
      elements: [...found, result, note('edge', 460, 22, 'Look up first, then insert: x never pairs with itself.')],
    },
  ]);
}

// ---------- 217. Contains Duplicate ----------

function containsDuplicate(): BoardDoc {
  const nums = (colors?: Colors) => array('nums', 0, 0, 'nums', ['1', '2', '3', '1'], colors);
  const seen = (items: string[]) => set('seen', 0, 150, 'seen', items);
  const found = [nums(['yellow', null, null, 'yellow']), pointer('i', 'i', 'nums', 3), seen(['1', '2', '3']), variable('ans', 220, 22, 'return', 'True')];
  return walk(217, {
    open: [nums()],
    setup: [nums(), seen([])],
    before: [
      {
        caption: 'i = 0 to 2: 1, 2, and 3 are new, so each one goes into seen.',
        elements: [nums(['green', 'green', 'green', null]), pointer('i', 'i', 'nums', 2), seen(['1', '2', '3'])],
      },
    ],
    result: found,
    cx: complexity('cx', 380, 0, 'n', 'each number is checked once', 'n', 'the set holds up to n numbers'),
    edge: note('edge', 380, 130, 'Empty or one number: the loop ends and I return False.'),
  });
}

// ---------- 242. Valid Anagram ----------

function validAnagram(): BoardDoc {
  const s = (colors?: Colors) => array('s', 0, 0, 's', ['a', 'n', 'a', 'g', 'r', 'a', 'm'], colors);
  const t = (colors?: Colors) => array('t', 0, 110, 't', ['n', 'a', 'g', 'a', 'r', 'a', 'm'], colors);
  const count = (values: string[]) => table('count', 0, 220, 'count', [['a', 'g', 'm', 'n', 'r'], values]);
  const green = Array<CellColor>(7).fill('green');
  const done = [s(green), t(green), count(['0', '0', '0', '0', '0']), variable('ans', 340, 130, 'return', 'True')];
  return walk(242, {
    open: [s(), t()],
    setup: [s(), t(), count(['0', '0', '0', '0', '0'])],
    before: [
      {
        caption: 'Adding s: a goes up to 3, and g, m, n, r go up to 1.',
        elements: [s(green), t(), count(['3', '1', '1', '1', '1'])],
      },
    ],
    result: done,
    cx: complexity('cx', 480, 0, 'n', 'each letter is counted once', '1', '26 counters, whatever n is'),
    edge: note('edge', 480, 130, 'Different lengths: return False before counting.'),
  });
}

// ---------- 383. Ransom Note ----------

function ransomNote(): BoardDoc {
  const ransom = (colors?: Colors) => array('note', 0, 0, 'ransomNote', ['a', 'a', 'b'], colors);
  const magazine = (colors?: Colors) => array('mag', 0, 110, 'magazine', ['b', 'a', 'a'], colors);
  const count = (values: string[]) => table('count', 180, 0, 'count', [['a', 'b'], values]);
  const done = [ransom(['green', 'green', 'green']), magazine(['green', 'green', 'green']), count(['0', '0']), variable('ans', 180, 132, 'return', 'True')];
  return walk(383, {
    open: [ransom(), magazine()],
    setup: [ransom(), magazine(['green', 'green', 'green']), count(['2', '1'])],
    result: done,
    cx: complexity('cx', 340, 0, 'm + n', 'one pass over each string', '1', '26 counters'),
    edge: note('edge', 340, 130, 'Note longer than the magazine: return False right away.'),
  });
}

// ---------- 169. Majority Element ----------

function majorityElement(): BoardDoc {
  const nums = (colors?: Colors) => array('nums', 0, 0, 'nums', ['2', '2', '1', '1', '1', '2', '2'], colors);
  const vote = (at: number, candidate: string, count: string) => [pointer('i', 'i', 'nums', at), variable('cand', 340, 0, 'candidate', candidate), variable('count', 340, 50, 'count', count)];
  const done = [nums([null, null, null, null, null, 'green', 'green']), ...vote(6, '2', '1')];
  return walk(169, {
    open: [nums()],
    setup: [nums(), ...vote(0, '2', '1')],
    before: [
      {
        caption: 'i = 1 to 3: the second 2 makes count 2, then two 1s cancel it back to 0.',
        elements: [nums(['green', 'green', 'gray', 'gray']), ...vote(3, '2', '0')],
      },
      {
        caption: 'i = 4, 5: count is 0, so 1 takes over with count 1, and the next 2 cancels it to 0.',
        elements: [nums([null, null, null, null, 'yellow', 'gray']), ...vote(5, '1', '0')],
      },
    ],
    result: done,
    cx: complexity('cx', 480, 0, 'n', 'a single pass', '1', 'one candidate and one counter'),
    edge: note('edge', 480, 130, 'One number is its own answer; a majority always exists.'),
  });
}

// ---------- 409. Longest Palindrome ----------

function longestPalindrome(): BoardDoc {
  const s = (colors?: Colors) => array('s', 0, 0, 's', ['a', 'b', 'c', 'c', 'c', 'c', 'd', 'd'], colors);
  const count = table('count', 0, 120, 'count', [
    ['a', 'b', 'c', 'd'],
    ['1', '1', '4', '2'],
  ]);
  const done = [s(['yellow', null, 'green', 'green', 'green', 'green', 'green', 'green']), count, variable('pairs', 300, 120, 'pairs', '4 + 2 = 6'), variable('len', 300, 170, 'length', '6 + 1 = 7')];
  return walk(409, {
    open: [s()],
    setup: [s(), count],
    result: done,
    cx: complexity('cx', 520, 0, 'n', 'one counting pass', '1', 'at most 52 letters'),
    edge: note('edge', 520, 130, 'All counts even: nothing goes in the middle. Case matters.'),
  });
}

// ---------- 14. Longest Common Prefix ----------

function longestCommonPrefix(): BoardDoc {
  const words = ['flower', 'flow', 'flight'];
  const rows = (upTo: number, bad?: number) =>
    words.map((word, r) =>
      array(
        `w${r}`,
        0,
        r * 100,
        `strs[${r}]`,
        [...word],
        [...word].map((_, c) => (c === bad ? 'red' : c < upTo ? 'green' : null)),
      ),
    );
  return walk(14, {
    open: rows(0),
    setup: [...rows(0).map((el, r) => (r === 0 ? array('w0', 0, 0, 'strs[0] (reference)', [...words[0]], ['blue', 'blue', 'blue', 'blue', 'blue', 'blue']) : el))],
    result: [...rows(2, 2), variable('ans', 300, 22, 'return', '"fl"')],
    cx: complexity('cx', 440, 0, 'total chars', 'stop at the first mismatch', '1', 'just a column index'),
    edge: note('edge', 440, 130, 'An empty string in the list: the answer is "".'),
  });
}

// ---------- 49. Group Anagrams ----------

function groupAnagrams(): BoardDoc {
  const strs = (colors?: Colors) => array('strs', 0, 0, 'strs', ['eat', 'tea', 'tan', 'ate', 'nat', 'bat'], colors);
  const groups = [array('g1', 0, 130, 'aet', ['eat', 'tea', 'ate'], ['yellow', 'yellow', 'yellow']), array('g2', 170, 130, 'ant', ['tan', 'nat']), array('g3', 290, 130, 'abt', ['bat'])];
  return walk(49, {
    open: [strs()],
    setup: [strs(), variable('groups', 0, 150, 'groups', '{}')],
    result: [strs(['yellow', 'yellow', null, 'yellow', null, null]), ...groups],
    cx: complexity('cx', 400, 0, 'n · k', 'a 26-count key per word', 'n · k', 'every word sits in a group'),
    edge: note('edge', 400, 130, 'The empty string gets its own key and group.'),
  });
}

// ---------- 347. Top K Frequent Elements ----------

function topKFrequent(): BoardDoc {
  const nums = array('nums', 0, 0, 'nums', ['1', '1', '1', '2', '2', '3']);
  const count = table('count', 300, 0, 'count', [
    ['1', '2', '3'],
    ['3', '2', '1'],
  ]);
  const bucket = (colors?: Colors) => array('bucket', 0, 130, 'bucket[freq]', ['', '3', '2', '1', '', '', ''], colors);
  return walk(347, {
    open: [nums, variable('k', 300, 22, 'k', '2')],
    setup: [nums, count, bucket()],
    result: [nums, count, bucket([null, null, 'green', 'green', null, null, null]), variable('ans', 340, 150, 'return', '[1, 2]')],
    cx: complexity('cx', 520, 0, 'n', 'counting and buckets are linear', 'n', 'the map and the buckets'),
    edge: note('edge', 520, 130, 'k = number of distinct values: return all of them.'),
  });
}

// ---------- 271. Encode and Decode Strings ----------

function encodeDecode(): BoardDoc {
  const strs = table('strs', 0, 0, 'strs', [['neet', 'co#de']]);
  const chars = [...'4#neet5#co#de'];
  const heads: Colors = chars.map((_, i) => (i === 0 || i === 1 || i === 6 || i === 7 ? 'yellow' : null));
  const encoded = (colors: Colors = heads) => array('enc', 0, 130, 'encoded', chars, colors);
  const take = (from: number, to: number) => [pointer('i', 'i', 'enc', from), pointer('j', 'j', 'enc', to), range('take', 'i', 'j')];
  return walk(271, {
    open: [strs],
    setup: [strs, encoded()],
    before: [
      {
        caption: 'Decoding: read 4 before the #, then take the next four characters, "neet".',
        elements: [strs, encoded(), ...take(2, 5)],
      },
    ],
    result: [strs, encoded(heads.map((c, i) => (i >= 8 ? 'green' : c))), ...take(8, 12)],
    cx: complexity('cx', 140, 0, 'total', 'each character is copied once', 'total', 'the encoded string'),
    edge: note('edge', 520, 0, 'An empty string encodes as "0#" and decodes back to "".'),
  });
}

// ---------- 238. Product of Array Except Self ----------

function productExceptSelf(): BoardDoc {
  const nums = array('nums', 0, 0, 'nums', ['1', '2', '3', '4']);
  const answer = (values: string[], colors?: Colors) => array('answer', 0, 130, 'answer', values, colors);
  return walk(238, {
    open: [nums],
    setup: [nums, answer(['1', '1', '2', '6'])],
    before: [
      {
        caption: 'Right to left with suffix = 1: answer[3] = 6 × 1, then suffix becomes 4, so answer[2] = 2 × 4 = 8.',
        elements: [nums, answer(['1', '1', '8', '6'], [null, null, 'green', 'green']), pointer('i', 'i', 'answer', 2), variable('suf', 220, 150, 'suffix', '4 · 3 = 12')],
      },
    ],
    result: [nums, answer(['24', '12', '8', '6'], ['green', 'green', 'green', 'green']), variable('suf', 220, 150, 'suffix', '24')],
    cx: complexity('cx', 360, 0, 'n', 'two passes', '1', 'one running suffix product'),
    edge: note('edge', 360, 130, 'Zeros just work: I never divide.'),
  });
}

// ---------- 36. Valid Sudoku ----------

function validSudoku(): BoardDoc {
  const rows = grid('board', 0, 0, 'board (rows 0–2)', [
    ['5', '3', '.', '.', '7', '.', '.', '.', '.'],
    ['6', '.', '.', '1', '9', '5', '.', '.', '.'],
    ['.', '9', '8', '.', '.', '.', '.', '6', '.'],
  ]);
  const sets = [set('row0', 0, 200, 'rows[0]', ['5', '3', '7']), set('box0', 180, 200, 'boxes[0]', ['5', '3', '6', '9', '8'])];
  return walk(36, {
    open: [rows],
    setup: [rows, ...sets, variable('box', 460, 22, 'box', '(r // 3) * 3 + c // 3')],
    result: [rows, ...sets, variable('dup', 460, 22, 'another 5 in row 0', '5 in rows[0]: invalid')],
    cx: complexity('cx', 460, 80, '1', 'always 81 cells', '1', '27 small sets'),
    edge: note('edge', 460, 200, 'Skip the dots. Valid doesn’t mean solvable.'),
  });
}

// ---------- 128. Longest Consecutive Sequence ----------

function longestConsecutive(): BoardDoc {
  const nums = (colors?: Colors) => array('nums', 0, 0, 'nums', ['100', '4', '200', '1', '3', '2'], colors);
  const numSet = set('set', 0, 130, 'num_set', ['100', '4', '200', '1', '3', '2']);
  return walk(128, {
    open: [nums()],
    setup: [nums(), numSet],
    before: [
      {
        caption: 'Starts are numbers whose x - 1 is missing: 100, 200, and 1.',
        elements: [nums(['yellow', null, 'yellow', 'yellow', null, null]), numSet],
      },
    ],
    result: [nums([null, 'green', null, 'green', 'green', 'green']), numSet, variable('run', 300, 0, 'run', '1, 2, 3, 4'), variable('best', 300, 50, 'best', '4')],
    cx: complexity('cx', 510, 0, 'n', 'each number visited at most twice', 'n', 'the set'),
    edge: note('edge', 510, 130, 'Duplicates collapse in the set; [] returns 0.'),
  });
}

// ---------- 189. Rotate Array ----------

function rotateArray(): BoardDoc {
  const nums = (items: string[], colors?: Colors) => array('nums', 0, 0, 'nums', items, colors);
  const k = variable('k', 340, 22, 'k', '3');
  return walk(189, {
    open: [nums(['1', '2', '3', '4', '5', '6', '7']), k],
    setup: [nums(['1', '2', '3', '4', '5', '6', '7']), k, pointer('l', 'l', 'nums', 0), pointer('r', 'r', 'nums', 6)],
    before: [
      {
        caption: 'Reverse the whole array: [7, 6, 5, 4, 3, 2, 1].',
        elements: [nums(['7', '6', '5', '4', '3', '2', '1'], ['yellow', 'yellow', 'yellow', null, null, null, null]), k],
      },
      {
        caption: 'Reverse the first k = 3: [5, 6, 7, 4, 3, 2, 1].',
        elements: [nums(['5', '6', '7', '4', '3', '2', '1'], ['green', 'green', 'green', null, null, null, null]), k, pointer('l', 'l', 'nums', 3), pointer('r', 'r', 'nums', 6)],
      },
    ],
    result: [nums(['5', '6', '7', '1', '2', '3', '4'], ['green', 'green', 'green', 'green', 'green', 'green', 'green']), k],
    cx: complexity('cx', 480, 0, 'n', 'each element swapped about twice', '1', 'in place with two pointers'),
    edge: note('edge', 480, 130, 'k larger than n: use k % n first.'),
  });
}

// ---------- 525. Contiguous Array ----------

function contiguousArray(): BoardDoc {
  const nums = (colors?: Colors) => array('nums', 0, 0, 'nums', ['0', '1', '0'], colors);
  const sums = array('sum', 0, 130, 'running sum', ['-1', '0', '-1']);
  const first = (rows: [string, string][]) => dict('first', 180, 0, 'first index', rows);
  return walk(525, {
    open: [nums()],
    setup: [nums(), first([['0', '-1']])],
    result: [
      nums([null, 'green', 'green']),
      sums,
      first([
        ['0', '-1'],
        ['-1', '0'],
      ]),
      pointer('i', 'i', 'sum', 2),
      variable('best', 180, 150, 'best', '2 - 0 = 2'),
    ],
    cx: complexity('cx', 360, 0, 'n', 'one pass', 'n', 'the map of first indices'),
    edge: note('edge', 360, 130, 'Sum 0 at index -1 covers subarrays that start at 0.'),
  });
}

// ---------- 560. Subarray Sum Equals K ----------

function subarraySum(): BoardDoc {
  const nums = (colors?: Colors) => array('nums', 0, 0, 'nums', ['1', '1', '1'], colors);
  const prefix = (colors?: Colors) => array('prefix', 0, 130, 'prefix', ['1', '2', '3'], colors);
  const seen = (rows: [string, string][]) => dict('seen', 180, 0, 'count of prefix', rows);
  return walk(560, {
    open: [nums(), variable('k', 180, 22, 'k', '2')],
    setup: [nums(), seen([['0', '1']])],
    before: [
      {
        caption: 'Prefix 2: 2 - k = 0 was seen once, so the answer is 1.',
        elements: [
          nums(['green', 'green', null]),
          prefix([null, 'yellow', null]),
          pointer('i', 'i', 'prefix', 1),
          seen([
            ['0', '1'],
            ['1', '1'],
            ['2', '1'],
          ]),
          variable('ans', 330, 22, 'answer', '1'),
        ],
      },
    ],
    result: [
      nums([null, 'green', 'green']),
      prefix([null, null, 'yellow']),
      pointer('i', 'i', 'prefix', 2),
      seen([
        ['0', '1'],
        ['1', '1'],
        ['2', '1'],
        ['3', '1'],
      ]),
      variable('ans', 330, 22, 'answer', '2'),
    ],
    cx: complexity('cx', 460, 0, 'n', 'one pass', 'n', 'counts of prefix sums'),
    edge: note('edge', 460, 130, 'Negatives break a sliding window, not this.'),
  });
}

// ---------- 380. Insert Delete GetRandom O(1) ----------

function randomizedSet(): BoardDoc {
  const vals = (items: string[], colors?: Colors) => array('vals', 0, 0, 'values', items, colors);
  const index = (rows: [string, string][]) => dict('index', 200, 0, 'index', rows);
  return walk(380, {
    open: [vals(['1', '2', '3'])],
    setup: [
      vals(['1', '2', '3']),
      index([
        ['1', '0'],
        ['2', '1'],
        ['3', '2'],
      ]),
    ],
    before: [
      {
        caption: 'remove(2): 2 is at index 1, so I copy the last value 3 into index 1 and set index[3] = 1.',
        elements: [
          vals(['1', '3', '3'], [null, 'yellow', 'gray']),
          pointer('i', 'i', 'vals', 1),
          index([
            ['1', '0'],
            ['2', '1'],
            ['3', '1'],
          ]),
        ],
      },
    ],
    result: [
      vals(['1', '3'], ['green', 'green']),
      index([
        ['1', '0'],
        ['3', '1'],
      ]),
    ],
    cx: complexity('cx', 380, 0, '1', 'a lookup plus a swap and pop', 'n', 'the array and the map'),
    edge: note('edge', 380, 130, 'Removing the last value swaps with itself: update, then delete.'),
  });
}

// ---------- 31. Next Permutation ----------

function nextPermutation(): BoardDoc {
  const nums = (items: string[], colors?: Colors) => array('nums', 0, 0, 'nums', items, colors);
  return walk(31, {
    open: [nums(['1', '3', '2'])],
    setup: [nums(['1', '3', '2'], ['yellow', null, null]), pointer('i', 'i', 'nums', 0)],
    before: [
      {
        caption: 'The smallest value right of 1 that is larger than it is 2, at j = 2.',
        elements: [nums(['1', '3', '2'], ['yellow', null, 'yellow']), pointer('i', 'i', 'nums', 0), pointer('j', 'j', 'nums', 2)],
      },
    ],
    result: [nums(['2', '1', '3'], ['green', 'green', 'green']), pointer('i', 'i', 'nums', 0)],
    cx: complexity('cx', 200, 0, 'n', 'a few linear scans', '1', 'in place'),
    edge: note('edge', 200, 130, '[3, 2, 1] has no i: reverse it all to [1, 2, 3].'),
  });
}

// ---------- 362. Design Hit Counter ----------

function hitCounter(): BoardDoc {
  const times = (items: string[], colors?: Colors) => array('times', 0, 0, 'times (slots 0–3)', items, colors);
  const counts = (items: string[]) => array('counts', 0, 130, 'counts', items);
  return walk(362, {
    open: [times(['300', '1', '2', '3']), counts(['1', '1', '1', '1'])],
    setup: [times(['300', '1', '2', '3']), counts(['1', '1', '1', '1']), variable('slot', 220, 22, 'slot', 'timestamp % 300')],
    result: [times(['300', '301', '2', '3'], [null, 'yellow', null, null]), pointer('s', 'slot', 'times', 1), counts(['1', '1', '1', '1']), variable('slot', 220, 22, 'slot', '301 % 300 = 1')],
    cx: complexity('cx', 470, 0, '1', 'at most 300 slots to sum', '1', '300 slots'),
    edge: note('edge', 470, 130, 'Many hits in one second just raise that slot’s count.'),
  });
}

// ---------- 41. First Missing Positive ----------

function firstMissingPositive(): BoardDoc {
  const nums = (items: string[], colors?: Colors) => array('nums', 0, 0, 'nums', items, colors);
  return walk(41, {
    open: [nums(['3', '4', '-1', '1'])],
    setup: [nums(['3', '4', '-1', '1']), variable('rule', 220, 22, 'home of v', 'index v - 1')],
    before: [
      {
        caption: 'i = 0: 3 belongs at index 2, so I swap: [-1, 4, 3, 1]. -1 is out of range and stays.',
        elements: [nums(['-1', '4', '3', '1'], [null, null, 'green', null]), pointer('i', 'i', 'nums', 0)],
      },
      {
        caption: 'i = 1: 4 goes to index 3, and the 1 that comes back goes to index 0: [1, -1, 3, 4].',
        elements: [nums(['1', '-1', '3', '4'], ['green', null, 'green', 'green']), pointer('i', 'i', 'nums', 1)],
      },
    ],
    result: [nums(['1', '-1', '3', '4'], ['green', 'red', 'green', 'green']), pointer('i', 'i', 'nums', 1), variable('ans', 220, 22, 'return', '1 + 1 = 2')],
    cx: complexity('cx', 440, 0, 'n', 'each swap places a value for good', '1', 'the array is the lookup table'),
    edge: note('edge', 440, 130, 'Duplicates: swap only if the target slot differs.'),
  });
}

export const BOARDS: ReferenceBoards = {
  1: twoSum,
  217: containsDuplicate,
  242: validAnagram,
  383: ransomNote,
  169: majorityElement,
  409: longestPalindrome,
  14: longestCommonPrefix,
  49: groupAnagrams,
  347: topKFrequent,
  271: encodeDecode,
  238: productExceptSelf,
  36: validSudoku,
  128: longestConsecutive,
  189: rotateArray,
  525: contiguousArray,
  560: subarraySum,
  380: randomizedSet,
  31: nextPermutation,
  362: hitCounter,
  41: firstMissingPositive,
};
