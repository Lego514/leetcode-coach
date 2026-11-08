import type { BoardDoc } from 'dsa-whiteboard';
import type { ReferenceBoards } from './index';
import { array, board, chain, complexity, dict, heap, lines, linked, note, pointer, pointerAtNone, recursion, variable, walk, type Call, type Colors } from './build';

// 參考板書：鏈結串列。版面橫著排，下面留給播放列；複雜度區塊和便利貼放右邊。

// ---------- 206. Reverse Linked List ----------

function reverseLinkedList(): BoardDoc {
  const [insight, structure, example, cost, edge] = lines(206);
  // 串列往右放一點：左邊要留給 prev = None 的 null
  const list = (links?: ('next' | 'prev' | 'none')[]) => linked('head', 80, 0, 'head', ['1', '2', '3'], links);
  // curr = None 放在左下：畫面依最後一步排版，左邊要留到 prev = None 那個 null 看得到
  const reversed = [list(['prev', 'prev']), pointer('prev', 'prev', 'head', 2), variable('curr', 0, 110, 'curr', 'None')];
  const result = complexity('cx', 540, 0, 'n', 'one pass over the nodes', '1', 'just prev, curr, and next');
  return board([
    { caption: insight, elements: [list()] },
    {
      caption: structure,
      elements: [list(), pointerAtNone('prev', 'prev', 'head'), pointer('curr', 'curr', 'head', 0)],
    },
    {
      caption: 'Save next = 2, point 1 back at prev (None), then move prev and curr forward.',
      elements: [list(['none', 'next']), pointer('prev', 'prev', 'head', 0), pointer('curr', 'curr', 'head', 1), pointer('next', 'next', 'head', 1)],
    },
    {
      caption: 'Save next = 3, point 2 back at 1, then move forward again.',
      elements: [list(['prev', 'next']), pointer('prev', 'prev', 'head', 1), pointer('curr', 'curr', 'head', 2), pointer('next', 'next', 'head', 2)],
    },
    { caption: example, elements: reversed },
    { caption: cost, elements: [...reversed, result] },
    {
      caption: edge,
      elements: [...reversed, result, note('edge', 540, 140, 'Empty list or a single node: return head as is.')],
    },
  ]);
}

// ---------- 21. Merge Two Sorted Lists ----------

function mergeTwoLists(): BoardDoc {
  const l1 = (colors?: Colors) => chain('l1', 0, 0, 'list1', ['1', '2', '4'], { colors });
  const l2 = (colors?: Colors) => chain('l2', 0, 110, 'list2', ['1', '3', '4'], { colors });
  const merged = (items: string[]) => chain('m', 0, 220, 'merged', items, { colors: items.map((_, i) => (i === 0 ? 'gray' : 'green')) });
  return walk(21, {
    open: [l1(), l2()],
    setup: [l1(), l2(), pointer('p1', 'p1', 'l1', 0), pointer('p2', 'p2', 'l2', 0), merged(['D']), pointer('tail', 'tail', 'm', 0)],
    before: [
      {
        caption: '1 vs 1: take list1’s. Then 2 vs 1: take list2’s 1.',
        elements: [l1(['gray']), l2(['gray']), pointer('p1', 'p1', 'l1', 1), pointer('p2', 'p2', 'l2', 1), merged(['D', '1', '1']), pointer('tail', 'tail', 'm', 2)],
      },
    ],
    result: [l1(['gray', 'gray', 'gray']), l2(['gray', 'gray', 'gray']), merged(['D', '1', '1', '2', '3', '4', '4']), pointer('tail', 'tail', 'm', 6)],
    cx: complexity('cx', 580, 0, 'm + n', 'each node is attached once', '1', 'reuses the nodes'),
    edge: note('edge', 580, 130, 'One list runs out: attach the rest of the other in one step.'),
  });
}

// ---------- 141. Linked List Cycle ----------

function hasCycle(): BoardDoc {
  const list = (colors?: Colors) => chain('head', 0, 0, 'head (tail → 2)', ['3', '2', '0', '-4'], { cycle: 1, colors });
  const at = (slow: number, fast: number) => [pointer('slow', 'slow', 'head', slow), pointer('fast', 'fast', 'head', fast)];
  return walk(141, {
    open: [list()],
    setup: [list(), ...at(0, 0)],
    before: [
      { caption: 'slow moves one step, fast two: slow at 2, fast at 0.', elements: [list(), ...at(1, 2)] },
      { caption: 'Next: slow at 0, while fast goes around the loop to 2.', elements: [list(), ...at(2, 1)] },
    ],
    result: [list([null, null, null, 'green']), ...at(3, 3), variable('ans', 320, 0, 'met', 'True: a cycle')],
    cx: complexity('cx', 320, 60, 'n', 'fast laps slow within the loop', '1', 'two pointers'),
    edge: note('edge', 320, 200, 'fast or fast.next is None: no cycle.'),
  });
}

// ---------- 876. Middle of the Linked List ----------

function middleNode(): BoardDoc {
  const list = (colors?: Colors) => chain('head', 0, 0, 'head', ['1', '2', '3', '4', '5'], { colors });
  const at = (slow: number, fast: number) => [pointer('slow', 'slow', 'head', slow), pointer('fast', 'fast', 'head', fast)];
  return walk(876, {
    open: [list()],
    setup: [list(), ...at(0, 0)],
    before: [{ caption: 'One step: slow at 2, fast at 3.', elements: [list(), ...at(1, 2)] }],
    result: [list([null, null, 'green', null, null]), ...at(2, 4), variable('ans', 0, 120, 'middle', '3 (with 1 to 6: 4)')],
    cx: complexity('cx', 440, 0, 'n', 'one pass', '1', 'two pointers'),
    edge: note('edge', 440, 130, 'Even length: this returns the second middle.'),
  });
}

// ---------- 234. Palindrome Linked List ----------

function isPalindromeList(): BoardDoc {
  const list = (links?: ('next' | 'prev' | 'none')[], colors?: Colors) => chain('head', 0, 0, 'head', ['1', '2', '2', '1'], { links, colors });
  return walk(234, {
    open: [list()],
    setup: [list(), pointer('slow', 'slow', 'head', 2), pointer('fast', 'fast', 'head', 3)],
    before: [
      {
        caption: 'Reverse the second half in place: now the last 1 points back to the second 2.',
        elements: [list(['next', 'next', 'prev']), pointer('l', 'left', 'head', 0), pointer('r', 'right', 'head', 3)],
      },
    ],
    result: [list(['next', 'next', 'prev'], ['green', 'green', 'green', 'green']), pointer('l', 'left', 'head', 1), pointer('r', 'right', 'head', 2), variable('ans', 0, 120, 'return', 'True')],
    cx: complexity('cx', 380, 0, 'n', 'find the middle, reverse, compare', '1', 'reversed in place'),
    edge: note('edge', 380, 130, 'Odd length: the middle node has no partner.'),
  });
}

// ---------- 143. Reorder List ----------

function reorderList(): BoardDoc {
  const list = (items: string[], colors?: Colors) => chain('head', 0, 0, 'head', items, { colors });
  const halves = [chain('a', 0, 130, 'first half', ['1', '2', '3'], { colors: ['blue', 'blue', 'blue'] }), chain('b', 270, 130, 'reversed second', ['5', '4'], { colors: ['yellow', 'yellow'] })];
  return walk(143, {
    open: [list(['1', '2', '3', '4', '5'])],
    setup: [list(['1', '2', '3', '4', '5']), pointer('slow', 'slow', 'head', 2), pointer('fast', 'fast', 'head', 4)],
    before: [{ caption: 'Cut after 3, and reverse 4, 5 into 5, 4.', elements: [list(['1', '2', '3', '4', '5'], ['blue', 'blue', 'blue', 'yellow', 'yellow']), ...halves] }],
    result: [list(['1', '5', '2', '4', '3'], ['blue', 'yellow', 'blue', 'yellow', 'blue']), ...halves],
    cx: complexity('cx', 480, 0, 'n', 'three linear passes', '1', 'rewires the nodes'),
    edge: note('edge', 480, 140, 'End the first half with None, or the list loops.'),
  });
}

// ---------- 19. Remove Nth Node From End of List ----------

function removeNthFromEnd(): BoardDoc {
  const list = (colors?: Colors) => chain('head', 0, 0, 'D = dummy', ['D', '1', '2', '3', '4', '5'], { colors });
  const at = (slow: number, fast: number) => [pointer('slow', 'slow', 'head', slow), pointer('fast', 'fast', 'head', fast)];
  return walk(19, {
    open: [list(), variable('n', 0, 120, 'n', '2')],
    setup: [list(), ...at(0, 2), variable('gap', 0, 120, 'gap', 'n = 2')],
    result: [list([null, null, null, 'yellow', 'red', null]), ...at(3, 5), variable('skip', 0, 120, 'slow.next', 'slow.next.next')],
    cx: complexity('cx', 510, 0, 'n', 'one pass', '1', 'two pointers'),
    edge: note('edge', 510, 130, 'Removing the head: the dummy makes it the same case.'),
  });
}

// ---------- 138. Copy List with Random Pointer ----------

function copyRandomList(): BoardDoc {
  const list = chain('head', 0, 0, 'head', ['7', '13', '11', '10', '1']);
  const random = array('rand', 0, 110, 'random (index)', ['null', '0', '4', '2', '0']);
  const copies = (links: ('next' | 'none')[], colors?: Colors) => chain('copy', 0, 230, 'copies', ['7′', '13′', '11′', '10′', '1′'], { links, colors });
  const none: ('next' | 'none')[] = ['none', 'none', 'none', 'none'];
  return walk(138, {
    open: [list, random],
    setup: [list, random, copies(none), variable('map', 260, 110, 'old_to_copy', 'node → its copy')],
    result: [list, random, copies(['next', 'next', 'next', 'next'], ['green', 'green', 'green', 'green', 'green']), variable('map', 260, 110, 'copy(A).random', 'map[A.random]')],
    cx: complexity('cx', 440, 0, 'n', 'two passes', 'n', 'the map (or 1 by interleaving)'),
    edge: note('edge', 440, 220, 'random is None: the copy’s stays None.'),
  });
}

// ---------- 2. Add Two Numbers ----------

function addTwoNumbers(): BoardDoc {
  const l1 = chain('l1', 0, 0, 'l1 (342)', ['2', '4', '3']);
  const l2 = chain('l2', 0, 110, 'l2 (465)', ['5', '6', '4']);
  const sum = (items: string[]) => chain('sum', 0, 220, 'result', items, { colors: items.map(() => 'green') });
  const carry = (value: string) => variable('carry', 300, 0, 'carry', value);
  return walk(2, {
    open: [l1, l2],
    setup: [l1, l2, pointer('p', 'p1', 'l1', 0), pointer('q', 'p2', 'l2', 0), carry('0')],
    before: [{ caption: '2 + 5 = 7. Then 4 + 6 = 10: write 0, carry 1.', elements: [l1, l2, pointer('p', 'p1', 'l1', 1), pointer('q', 'p2', 'l2', 1), carry('1'), sum(['7', '0'])] }],
    result: [l1, l2, carry('0'), sum(['7', '0', '8']), variable('ans', 300, 50, 'reads', '807')],
    cx: complexity('cx', 460, 0, 'max(m, n)', 'one digit per step', 'max(m, n)', 'the result list'),
    edge: note('edge', 460, 130, 'A final carry, like 5 + 5, adds one more node: 1.'),
  });
}

// ---------- 287. Find the Duplicate Number ----------

function findDuplicate(): BoardDoc {
  const nums = (colors?: Colors) => array('nums', 0, 0, 'nums', ['1', '3', '4', '2', '2'], colors);
  const path = (colors?: Colors) => chain('path', 0, 130, 'index → nums[index]', ['0', '1', '3', '2', '4'], { cycle: 3, colors });
  const at = (a: number, b: number, names = ['slow', 'fast']) => [pointer('a', names[0], 'path', a), pointer('b', names[1], 'path', b)];
  return walk(287, {
    open: [nums()],
    setup: [nums(), path(), ...at(0, 0)],
    before: [{ caption: 'Phase 1: slow moves one, fast two. They meet at index 4.', elements: [nums(), path([null, null, null, null, 'yellow']), ...at(4, 4)] }],
    result: [nums([null, null, 'green', null, 'green']), path([null, null, null, 'green', null]), ...at(3, 3, ['p1', 'p2']), variable('ans', 260, 0, 'entrance', 'index 2: duplicate 2')],
    cx: complexity('cx', 380, 60, 'n', 'two Floyd phases', '1', 'two indices, array untouched'),
    edge: note('edge', 380, 200, 'A value repeated many times still has one entrance.'),
  });
}

// ---------- 146. LRU Cache ----------

function lruCache(): BoardDoc {
  const order = (items: string[], colors?: Colors) => chain('order', 0, 0, 'most recent → least (H, T dummies)', items, { colors });
  const map = (rows: [string, string][]) => dict('map', 0, 110, 'key → node', rows);
  return walk(146, {
    open: [order(['H', '2', '1', 'T']), variable('cap', 360, 0, 'capacity', '2')],
    setup: [
      order(['H', '2', '1', 'T']),
      map([
        ['1', 'node 1'],
        ['2', 'node 2'],
      ]),
    ],
    before: [
      {
        caption: 'get(1) moves 1 to the front: H, 1, 2, T.',
        elements: [
          order(['H', '1', '2', 'T'], [null, 'yellow']),
          map([
            ['1', 'node 1'],
            ['2', 'node 2'],
          ]),
        ],
      },
    ],
    result: [
      order(['H', '3', '1', 'T'], [null, 'green']),
      map([
        ['1', 'node 1'],
        ['3', 'node 3'],
      ]),
      variable('out', 160, 110, 'put(3) evicts', '2'),
    ],
    cx: complexity('cx', 420, 0, '1', 'a map lookup plus relinking', 'cap', 'one node per key'),
    edge: note('edge', 420, 130, 'Put an existing key: update and move to front, no eviction.'),
  });
}

// ---------- 24. Swap Nodes in Pairs ----------

function swapPairs(): BoardDoc {
  const list = (items: string[], colors?: Colors) => chain('head', 0, 0, 'D = dummy', items, { colors });
  return walk(24, {
    open: [list(['D', '1', '2', '3', '4'])],
    setup: [list(['D', '1', '2', '3', '4']), pointer('prev', 'prev', 'head', 0), pointer('a', 'a', 'head', 1), pointer('b', 'b', 'head', 2)],
    before: [
      { caption: 'prev → 2, 2 → 1, 1 → 3: the first pair is swapped, and prev moves to 1.', elements: [list(['D', '2', '1', '3', '4'], [null, 'green', 'green']), pointer('prev', 'prev', 'head', 2)] },
    ],
    result: [list(['D', '2', '1', '4', '3'], [null, 'green', 'green', 'green', 'green'])],
    cx: complexity('cx', 440, 0, 'n', 'one pass, two nodes at a time', '1', 'a few pointers'),
    edge: note('edge', 440, 130, 'Odd length: the last node stays where it is.'),
  });
}

// ---------- 328. Odd Even Linked List ----------

function oddEvenList(): BoardDoc {
  const odd = chain('odd', 0, 0, 'odd positions', ['1', '3', '5'], { colors: ['blue', 'blue', 'blue'] });
  const even = chain('even', 0, 130, 'even positions', ['2', '4'], { colors: ['yellow', 'yellow'] });
  return walk(328, {
    open: [chain('head', 0, 0, 'head', ['1', '2', '3', '4', '5'])],
    setup: [chain('head', 0, 0, 'head', ['1', '2', '3', '4', '5']), pointer('o', 'odd', 'head', 0), pointer('e', 'even', 'head', 1), pointer('eh', 'even_head', 'head', 1)],
    before: [{ caption: 'Each tail skips one node: odd.next = 3, even.next = 4, and so on.', elements: [odd, even, pointer('o', 'odd', 'odd', 2), pointer('e', 'even', 'even', 1)] }],
    result: [odd, even, chain('head', 0, 250, 'odd.next = even_head', ['1', '3', '5', '2', '4'], { colors: ['blue', 'blue', 'blue', 'yellow', 'yellow'] })],
    cx: complexity('cx', 440, 0, 'n', 'one pass', '1', 'three pointers'),
    edge: note('edge', 440, 130, 'Stop when even or even.next is None.'),
  });
}

// ---------- 148. Sort List ----------

function sortList(): BoardDoc {
  const list = (items: string[], colors?: Colors) => chain('head', 0, 0, 'head', items, { colors });
  const calls = (done: boolean): Call[] => [
    { text: '4 2 1 3', parent: -1, ...(done ? { ret: '1 2 3 4' } : {}) },
    { text: '4 2', parent: 0, ...(done ? { ret: '2 4' } : {}) },
    { text: '4', parent: 1 },
    { text: '2', parent: 1 },
    { text: '1 3', parent: 0, ...(done ? { ret: '1 3' } : {}) },
    { text: '1', parent: 4 },
    { text: '3', parent: 4 },
  ];
  return walk(148, {
    open: [list(['4', '2', '1', '3'])],
    setup: [list(['4', '2', '1', '3']), pointer('slow', 'slow', 'head', 1), pointer('fast', 'fast', 'head', 3)],
    before: [{ caption: 'Split at the middle until each piece is one node.', elements: [list(['4', '2', '1', '3']), recursion('calls', 0, 110, 'sort', calls(false))] }],
    result: [list(['1', '2', '3', '4'], ['green', 'green', 'green', 'green']), recursion('calls', 0, 110, 'sort', calls(true))],
    cx: complexity('cx', 380, 0, 'n log n', 'log n levels of linear merges', 'log n', 'recursion depth'),
    edge: note('edge', 380, 130, 'Two nodes: the middle must be the first one, or it never splits.'),
  });
}

// ---------- 61. Rotate List ----------

function rotateRight(): BoardDoc {
  const ring = (colors?: Colors) => chain('head', 0, 0, 'head (tail → head)', ['1', '2', '3', '4', '5'], { cycle: 0, colors });
  return walk(61, {
    open: [chain('head', 0, 0, 'head', ['1', '2', '3', '4', '5']), variable('k', 0, 120, 'k', '2')],
    setup: [ring(), pointer('tail', 'tail', 'head', 4), variable('len', 0, 120, 'length', '5')],
    before: [
      {
        caption: 'Break the ring after index 5 - 2 - 1 = 2: 3 is the new tail, 4 the new head.',
        elements: [ring([null, null, 'yellow', 'green']), pointer('nt', 'new_tail', 'head', 2), pointer('nh', 'new_head', 'head', 3)],
      },
    ],
    result: [chain('head', 0, 0, 'head', ['4', '5', '1', '2', '3'], { colors: ['green'] })],
    cx: complexity('cx', 440, 0, 'n', 'one pass for length, one to break', '1', 'a few pointers'),
    edge: note('edge', 440, 130, 'k a multiple of the length: nothing changes.'),
  });
}

// ---------- 23. Merge k Sorted Lists ----------

function mergeKLists(): BoardDoc {
  const lists = (gray: number[]) => [
    chain('a', 0, 0, 'list 0', ['1', '4', '5'], { colors: [0, 1, 2].map((i) => (i < gray[0] ? 'gray' : null)) }),
    chain('b', 0, 100, 'list 1', ['1', '3', '4'], { colors: [0, 1, 2].map((i) => (i < gray[1] ? 'gray' : null)) }),
    chain('c', 0, 200, 'list 2', ['2', '6'], { colors: [0, 1].map((i) => (i < gray[2] ? 'gray' : null)) }),
  ];
  const merged = (value: string) => variable('m', 0, 290, 'merged', value);
  return walk(23, {
    open: lists([0, 0, 0]),
    setup: [...lists([0, 0, 0]), heap('h', 300, 0, 'heads', ['1', '1', '2'])],
    before: [{ caption: 'Pop 1 from list 0 and push its next, 4.', elements: [...lists([1, 0, 0]), heap('h', 300, 0, 'heads', ['1', '2', '4']), merged('1')] }],
    result: [...lists([3, 3, 2]), heap('h', 300, 0, 'heads', []), merged('1, 1, 2, 3, 4, 4, 5, 6')],
    cx: complexity('cx', 520, 0, 'N log k', 'each node passes through the heap', 'k', 'one head per list'),
    edge: note('edge', 520, 130, 'Skip empty lists. Merging in pairs works too.'),
  });
}

// ---------- 25. Reverse Nodes in k-Group ----------

function reverseKGroup(): BoardDoc {
  const list = (items: string[], colors?: Colors) => chain('head', 0, 0, 'D = dummy', items, { colors });
  return walk(25, {
    open: [list(['D', '1', '2', '3', '4', '5']), variable('k', 0, 120, 'k', '2')],
    setup: [list(['D', '1', '2', '3', '4', '5']), pointer('prev', 'prev', 'head', 0), pointer('kth', 'kth', 'head', 2)],
    before: [
      {
        caption: 'Reverse 1, 2 into 2, 1 and link D to 2. The group’s tail, 1, becomes prev.',
        elements: [list(['D', '2', '1', '3', '4', '5'], [null, 'green', 'green']), pointer('prev', 'prev', 'head', 2)],
      },
    ],
    result: [list(['D', '2', '1', '4', '3', '5'], [null, 'green', 'green', 'green', 'green', 'gray'])],
    cx: complexity('cx', 510, 0, 'n', 'each node is reversed once', '1', 'a few pointers'),
    edge: note('edge', 510, 130, 'Fewer than k nodes left: keep them in order.'),
  });
}

export const BOARDS: ReferenceBoards = {
  206: reverseLinkedList,
  21: mergeTwoLists,
  141: hasCycle,
  876: middleNode,
  234: isPalindromeList,
  143: reorderList,
  19: removeNthFromEnd,
  138: copyRandomList,
  2: addTwoNumbers,
  287: findDuplicate,
  146: lruCache,
  24: swapPairs,
  328: oddEvenList,
  148: sortList,
  61: rotateRight,
  23: mergeKLists,
  25: reverseKGroup,
};
