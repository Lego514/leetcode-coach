import type { BoardDoc } from 'dsa-whiteboard';
import type { ReferenceBoards } from './index';
import { array, board, complexity, heap, lines, note, pointer, table, variable, walk } from './build';

// 參考板書：堆積。版面橫著排，下面留給播放列；複雜度區塊和便利貼放右邊。

// ---------- 215. Kth Largest Element in an Array ----------

function kthLargest(): BoardDoc {
  const [insight, structure, example, cost, edge] = lines(215);
  const nums = (colors?: ('green' | 'yellow' | null)[]) => array('nums', 0, 0, 'nums', ['3', '2', '1', '5', '6', '4'], colors);
  const k = variable('k', 0, 140, 'k', '2');
  const done = [nums([null, null, null, 'green', 'green', null]), k, pointer('i', 'i', 'nums', 5), heap('heap', 300, 0, 'heap', ['5', '6']), variable('answer', 0, 190, 'answer', 'heap[0] = 5')];
  const result = complexity('cx', 460, 0, 'n log k', 'each push or pop costs log k', 'k', 'the heap never holds more than k');
  return board([
    { caption: insight, elements: [nums(), k] },
    {
      caption: structure,
      elements: [nums(), k, pointer('i', 'i', 'nums', 1), heap('heap', 300, 0, 'heap', ['2', '3'])],
    },
    {
      caption: 'i = 2: 1 goes in and the heap grows past k, so I pop the smallest, which is 1 again. The heap stays [2, 3].',
      elements: [nums(), k, pointer('i', 'i', 'nums', 2), heap('heap', 300, 0, 'heap', ['2', '3'])],
    },
    {
      caption: 'i = 3, 4: 5 pushes out 2, then 6 pushes out 3. The heap is [5, 6].',
      elements: [nums([null, null, null, 'yellow', 'yellow', null]), k, pointer('i', 'i', 'nums', 4), heap('heap', 300, 0, 'heap', ['5', '6'])],
    },
    { caption: example, elements: done },
    { caption: cost, elements: [...done, result] },
    {
      caption: edge,
      elements: [...done, result, note('edge', 460, 140, 'Duplicates count separately: it’s the kth largest, not the kth distinct.')],
    },
  ]);
}

// ---------- 703. Kth Largest Element in a Stream ----------

function kthLargestStream(): BoardDoc {
  const h = (items: string[]) => heap('h', 0, 0, 'heap, k = 3', items);
  return walk(703, {
    open: [array('nums', 0, 0, 'nums', ['4', '5', '8', '2'])],
    setup: [h(['4', '5', '8'])],
    before: [{ caption: 'add(3): push 3. Now there are 4 values, so pop the smallest, 3.', elements: [h(['3', '4', '8', '5'])] }],
    result: [h(['4', '5', '8']), variable('ans', 0, 230, 'kth largest', 'top = 4')],
    cx: complexity('cx', 300, 0, 'log k', 'per add', 'k', 'the heap'),
    edge: note('edge', 300, 130, 'Fewer than k numbers: the heap just isn’t full yet.'),
  });
}

// ---------- 1046. Last Stone Weight ----------

function lastStoneWeight(): BoardDoc {
  const h = (items: string[]) => heap('h', 0, 0, 'heap', items, 'max');
  return walk(1046, {
    open: [array('s', 0, 0, 'stones', ['2', '7', '4', '1', '8', '1'])],
    setup: [h(['8', '7', '4', '1', '2', '1'])],
    before: [{ caption: 'Smash 8 and 7: 8 - 7 = 1 goes back in.', elements: [h(['4', '2', '1', '1', '1'])] }],
    result: [h(['1']), variable('ans', 0, 230, 'last stone', '1')],
    cx: complexity('cx', 360, 0, 'n log n', 'n smashes, log n each', 'n', 'the heap'),
    edge: note('edge', 360, 130, 'Equal stones both vanish; empty at the end returns 0.'),
  });
}

// ---------- 973. K Closest Points to Origin ----------

function kClosest(): BoardDoc {
  const pts = table('pts', 0, 0, 'points', [
    ['point', 'dist²'],
    ['(1,3)', '10'],
    ['(-2,2)', '8'],
  ]);
  const h = (items: string[]) => heap('h', 170, 0, 'k = 1', items, 'max');
  return walk(973, {
    open: [pts],
    setup: [pts, h(['10'])],
    result: [pts, h(['8']), variable('ans', 0, 170, 'return', '[[-2, 2]]')],
    cx: complexity('cx', 420, 0, 'n log k', 'a size-k heap', 'k', 'the heap'),
    edge: note('edge', 420, 130, 'Ties: any order of the tied points is fine.'),
  });
}

// ---------- 621. Task Scheduler ----------

function leastInterval(): BoardDoc {
  const counts = table('cnt', 0, 0, 'count', [
    ['A', 'B'],
    ['3', '3'],
  ]);
  const slots = ['A', 'B', 'idle', 'A', 'B', 'idle', 'A', 'B'];
  const schedule = array(
    'plan',
    0,
    130,
    'schedule',
    slots,
    slots.map((s) => (s === 'A' ? 'blue' : s === 'B' ? 'yellow' : 'gray')),
  );
  return walk(621, {
    open: [counts, variable('n', 160, 22, 'n', '2')],
    setup: [counts, variable('f', 160, 22, 'length', '(max - 1) × (n + 1) + ties')],
    result: [counts, schedule, variable('f', 160, 22, 'length', '2 × 3 + 2 = 8')],
    cx: complexity('cx', 400, 0, 'tasks', 'one counting pass', '1', '26 counts'),
    edge: note('edge', 400, 140, 'Enough tasks to fill the gaps: answer = number of tasks.'),
  });
}

// ---------- 355. Design Twitter ----------

function designTwitter(): BoardDoc {
  const tweets = [
    table('tw', 0, 0, 'tweets', [
      ['user', 'tweet', 'time'],
      ['1', '5', '0'],
      ['2', '6', '1'],
    ]),
  ];
  return walk(355, {
    open: [...tweets, variable('f', 230, 0, 'follows', '1 → 2')],
    setup: [...tweets, variable('f', 230, 0, 'follows', '1 → 2'), heap('h', 230, 60, 'by time', ['1', '0'], 'max')],
    result: [...tweets, variable('f', 230, 0, 'follows', '1 → 2'), heap('h', 230, 60, 'by time', ['1', '0'], 'max'), variable('feed', 0, 170, 'getNewsFeed(1)', '[6, 5]')],
    cx: complexity('cx', 460, 0, 'f log f', 'merge f followees', 'tweets', 'all tweets'),
    edge: note('edge', 460, 130, 'Self-follow or unfollowing a stranger: ignore it.'),
  });
}

// ---------- 692. Top K Frequent Words ----------

function topKFrequentWords(): BoardDoc {
  const counts = variable('cnt', 0, 0, 'count', '{i: 2, love: 2, coding: 1, leetcode: 1}');
  return walk(692, {
    open: [variable('w', 0, 0, 'words', 'i, love, leetcode, i, love, coding')],
    setup: [counts, variable('key', 0, 50, 'sort key', '(-count, word)')],
    result: [counts, variable('key', 0, 50, 'heap (k = 2)', '(2, "love"), (2, "i")'), variable('ans', 0, 100, 'return', '["i", "love"]')],
    cx: complexity('cx', 0, 160, 'n log k', 'or n log n with a sort', 'n', 'the counts'),
    edge: note('edge', 380, 160, 'In a min-heap of size k, the later word must count as smaller.'),
  });
}

// ---------- 295. Find Median from Data Stream ----------

function medianFinder(): BoardDoc {
  const halves = (low: string[], high: string[]) => [heap('lo', 0, 0, 'lower', low, 'max'), heap('hi', 200, 0, 'upper', high)];
  return walk(295, {
    open: [array('s', 0, 0, 'stream', ['1', '2', '3'])],
    setup: halves(['1'], []),
    before: [{ caption: 'add(2): the halves are [1] and [2], so the median is 1.5.', elements: [...halves(['1'], ['2']), variable('m', 0, 230, 'median', '(1 + 2) / 2 = 1.5')] }],
    result: [...halves(['2', '1'], ['3']), variable('m', 0, 230, 'median', 'top of lower = 2')],
    cx: complexity('cx', 420, 0, 'log n', 'per add; median is O(1)', 'n', 'both heaps'),
    edge: note('edge', 420, 130, 'Even count: average the two tops.'),
  });
}

// ---------- 632. Smallest Range Covering Elements from K Lists ----------

function smallestRange(): BoardDoc {
  const lists = [array('a', 0, 0, 'list 0', ['4', '10', '15', '24', '26']), array('b', 0, 130, 'list 1', ['0', '9', '12', '20']), array('c', 0, 260, 'list 2', ['5', '18', '22', '30'])];
  const at = (i: number, j: number, k: number) => [pointer('pa', 'i', 'a', i), pointer('pb', 'j', 'b', j), pointer('pc', 'k', 'c', k)];
  const range = (value: string) => variable('r', 260, 0, 'range', value);
  return walk(632, {
    open: lists,
    setup: [...lists, ...at(0, 0, 0), range('[0, 5]'), variable('min', 260, 50, 'heap min', '0 (list 1)')],
    before: [
      { caption: 'The minimum 0 is in list 1, so list 1 moves to 9: the range is [4, 9].', elements: [...lists, ...at(0, 1, 0), range('[4, 9]'), variable('min', 260, 50, 'heap min', '4 (list 0)')] },
    ],
    result: [...lists, ...at(3, 3, 2), range('[20, 24]')],
    cx: complexity('cx', 460, 0, 'N log k', 'each element enters the heap once', 'k', 'one per list'),
    edge: note('edge', 460, 130, 'A list runs out: stop, nothing can cover it now.'),
  });
}

export const BOARDS: ReferenceBoards = {
  215: kthLargest,
  703: kthLargestStream,
  1046: lastStoneWeight,
  973: kClosest,
  621: leastInterval,
  355: designTwitter,
  692: topKFrequentWords,
  295: medianFinder,
  632: smallestRange,
};
