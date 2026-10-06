// 微複習用的 Python 小知識：刷題時常用、也常寫錯的語法和標準函式庫。
// 選項是程式碼或輸出，不分語言；第 0 個是正解，出題時會打亂。
// 有程式碼又沒寫題目的，題目就是「這段程式會印出什麼？」。

export interface Bilingual {
  zh: string;
  en: string;
}

export interface PythonTip {
  id: string;
  question?: Bilingual;
  code?: string;
  options: string[];
  why: Bilingual;
}

const WHICH_ERROR: Bilingual = { zh: '執行後會丟出哪一種錯誤？', en: 'Which error does this raise?' };

export const PYTHON_TIPS: PythonTip[] = [
  // ---------- heapq ----------
  {
    id: 'heap-min',
    code: `import heapq
h = [5, 1, 4]
heapq.heapify(h)
print(heapq.heappop(h))`,
    options: ['1', '5', '4', '[1, 4, 5]'],
    why: {
      zh: 'heapq 是最小堆積，heappop 取出最小的元素。',
      en: 'heapq is a min-heap, so heappop removes the smallest item.',
    },
  },
  {
    id: 'heap-max',
    question: {
      zh: 'heapq 只有最小堆積。要當最大堆積用，push 時該怎麼寫？',
      en: 'heapq only has a min-heap. How do you push to use it as a max-heap?',
    },
    options: ['heapq.heappush(h, -x)', 'heapq.heappush(h, x, reverse=True)', 'heapq.heapify(h, key=max)', 'h.sort(reverse=True)'],
    why: {
      zh: '存負數：最小的負數就是原本最大的數，取出來時再加一個負號還原。',
      en: 'Store negatives: the smallest negative is the largest original value. Negate again when you pop.',
    },
  },
  {
    id: 'heap-tuple',
    code: `import heapq
h = []
heapq.heappush(h, (2, 'b'))
heapq.heappush(h, (1, 'z'))
heapq.heappush(h, (1, 'a'))
print(heapq.heappop(h))`,
    options: ["(1, 'a')", "(1, 'z')", "(2, 'b')", 'TypeError'],
    why: {
      zh: 'tuple 逐個元素比較，第一個相同就比第二個。第二個元素不能比較時（例如 ListNode），中間加一個計數器當平手的依據。',
      en: 'Tuples compare item by item, so ties fall to the second item. If that item can’t be compared (like a ListNode), add a counter in between as a tiebreaker.',
    },
  },
  {
    id: 'heap-nlargest',
    code: `import heapq
print(heapq.nlargest(2, [3, 1, 4, 1, 5]))`,
    options: ['[5, 4]', '[4, 5]', '[1, 1]', '5'],
    why: {
      zh: 'nlargest 回傳由大到小的 list，內部用大小為 k 的堆積，O(n log k)。',
      en: 'nlargest returns a list from largest to smallest and uses a size-k heap internally: O(n log k).',
    },
  },

  // ---------- collections ----------
  {
    id: 'counter-most-common',
    code: `from collections import Counter
c = Counter('banana')
print(c.most_common(1))`,
    options: ["[('a', 3)]", "('a', 3)", "['a']", "{'a': 3}"],
    why: {
      zh: 'most_common(k) 回傳 (元素, 次數) 組成的 list，就算 k 是 1 也是 list。',
      en: 'most_common(k) returns a list of (item, count) pairs, even when k is 1.',
    },
  },
  {
    id: 'counter-missing',
    code: `from collections import Counter
c = Counter('abc')
print(c['z'])`,
    options: ['0', 'KeyError', 'None', '1'],
    why: {
      zh: 'Counter 查不到的 key 回傳 0，而且不會把 key 加進去。',
      en: 'A Counter returns 0 for a missing key and doesn’t add the key.',
    },
  },
  {
    id: 'defaultdict-list',
    code: `from collections import defaultdict
graph = defaultdict(list)
graph[1].append(2)
print(dict(graph))`,
    options: ['{1: [2]}', 'KeyError', '{1: 2}', '{}'],
    why: {
      zh: 'defaultdict(list) 第一次用到某個 key 時自動建立空 list，建鄰接表很方便。',
      en: 'defaultdict(list) creates an empty list the first time a key is used, which is handy for adjacency lists.',
    },
  },
  {
    id: 'deque-popleft',
    question: {
      zh: 'BFS 的佇列要從前面取出元素，哪個是 O(1)？',
      en: 'A BFS queue removes from the front. Which of these is O(1)?',
    },
    options: ['deque.popleft()', 'list.pop(0)', 'list.remove(x)', 'heapq.heappop(h)'],
    why: {
      zh: 'list.pop(0) 要把後面所有元素往前移，是 O(n)；collections.deque 兩端都是 O(1)。',
      en: 'list.pop(0) shifts every remaining element, so it’s O(n). collections.deque is O(1) at both ends.',
    },
  },
  {
    id: 'deque-both-ends',
    code: `from collections import deque
q = deque([1, 2])
q.appendleft(0)
q.append(3)
print(list(q))`,
    options: ['[0, 1, 2, 3]', '[3, 1, 2, 0]', '[1, 2, 0, 3]', '[0, 3, 1, 2]'],
    why: {
      zh: 'appendleft 加在最前面，append 加在最後面。單調佇列（Sliding Window Maximum）兩端都會用到。',
      en: 'appendleft adds to the front and append adds to the back. A monotonic deque (Sliding Window Maximum) uses both ends.',
    },
  },
  {
    id: 'ordereddict-lru',
    code: `from collections import OrderedDict
d = OrderedDict(a=1, b=2, c=3)
d.move_to_end('a')
d.popitem(last=False)
print(list(d))`,
    options: ["['c', 'a']", "['b', 'c']", "['a', 'b']", "['b', 'c', 'a']"],
    why: {
      zh: 'move_to_end 把 a 移到最後（最近用過），popitem(last=False) 刪掉最前面的 b（最久沒用）。這就是 LRU Cache。',
      en: 'move_to_end marks a as most recently used, and popitem(last=False) evicts b, the least recently used. That’s an LRU cache.',
    },
  },

  // ---------- bisect ----------
  {
    id: 'bisect-left',
    code: `from bisect import bisect_left
print(bisect_left([1, 2, 2, 3], 2))`,
    options: ['1', '2', '3', '0'],
    why: {
      zh: 'bisect_left 回傳第一個 >= x 的位置。',
      en: 'bisect_left returns the first index whose value is >= x.',
    },
  },
  {
    id: 'bisect-right',
    code: `from bisect import bisect_right
print(bisect_right([1, 2, 2, 3], 2))`,
    options: ['3', '2', '1', '4'],
    why: {
      zh: 'bisect_right 回傳第一個 > x 的位置。bisect_right 減 bisect_left 就是 x 出現的次數。',
      en: 'bisect_right returns the first index whose value is > x. bisect_right minus bisect_left counts the copies of x.',
    },
  },
  {
    id: 'bisect-insert-point',
    code: `from bisect import bisect_left
print(bisect_left([10, 20, 30], 25))`,
    options: ['2', '1', '3', '-1'],
    why: {
      zh: '找不到時回傳插入點，不會回傳 -1。要判斷存在，記得檢查 i < len(a) and a[i] == x。',
      en: 'It returns the insertion point, never -1. To test membership, check i < len(a) and a[i] == x.',
    },
  },

  // ---------- 排序 ----------
  {
    id: 'sort-key-reverse',
    code: `words = ['bb', 'a', 'ccc']
print(sorted(words, key=len, reverse=True))`,
    options: ["['ccc', 'bb', 'a']", "['a', 'bb', 'ccc']", "['ccc', 'a', 'bb']", "['bb', 'a', 'ccc']"],
    why: {
      zh: 'key 決定比較的依據，reverse=True 由大到小。',
      en: 'key decides what to compare, and reverse=True sorts from largest to smallest.',
    },
  },
  {
    id: 'sort-mixed-order',
    code: `pairs = [(1, 'b'), (2, 'a'), (1, 'a')]
print(sorted(pairs, key=lambda p: (-p[0], p[1])))`,
    options: [
      "[(2, 'a'), (1, 'a'), (1, 'b')]",
      "[(1, 'a'), (1, 'b'), (2, 'a')]",
      "[(2, 'a'), (1, 'b'), (1, 'a')]",
      "[(1, 'b'), (1, 'a'), (2, 'a')]",
    ],
    why: {
      zh: '數字加負號就變成由大到小，其他欄位維持由小到大。Top K Frequent Words 就是這樣排。',
      en: 'Negating a number sorts it descending while the other fields stay ascending. Top K Frequent Words sorts this way.',
    },
  },
  {
    id: 'sort-returns-none',
    code: `nums = [3, 1, 2]
result = nums.sort()
print(result)`,
    options: ['None', '[1, 2, 3]', '[3, 1, 2]', 'TypeError'],
    why: {
      zh: 'list.sort() 原地排序，回傳 None；要拿到新的 list 用 sorted()。',
      en: 'list.sort() sorts in place and returns None. Use sorted() to get a new list.',
    },
  },
  {
    id: 'sort-stable',
    code: `people = [('amy', 30), ('bob', 25), ('cat', 30)]
print([name for name, _ in sorted(people, key=lambda p: p[1])])`,
    options: ["['bob', 'amy', 'cat']", "['bob', 'cat', 'amy']", "['amy', 'cat', 'bob']", "['cat', 'amy', 'bob']"],
    why: {
      zh: 'Python 的排序是穩定的：key 相同時保持原本的先後順序。',
      en: 'Python’s sort is stable: items with equal keys keep their original order.',
    },
  },
  {
    id: 'sort-cmp-to-key',
    code: `from functools import cmp_to_key
nums = ['3', '30', '34']
nums.sort(key=cmp_to_key(lambda a, b: -1 if a + b > b + a else 1))
print(''.join(nums))`,
    options: ['34330', '33034', '30334', '34303'],
    why: {
      zh: 'Largest Number 的比較方式：a + b 比 b + a 大，a 就排前面。cmp_to_key 把比較函式轉成 key。',
      en: 'Largest Number’s rule: put a first when a + b beats b + a. cmp_to_key turns a comparator into a key.',
    },
  },
  {
    id: 'sorted-dict',
    code: `d = {'b': 1, 'a': 2}
print(sorted(d))`,
    options: ["['a', 'b']", '[1, 2]', "[('a', 2), ('b', 1)]", "{'a': 2, 'b': 1}"],
    why: {
      zh: '對 dict 排序只會拿到排好的 key；要依值排序用 sorted(d, key=d.get) 或 sorted(d.items(), key=…)。',
      en: 'Sorting a dict gives its keys. To sort by value, use sorted(d, key=d.get) or sorted(d.items(), key=…).',
    },
  },

  // ---------- list 與複製 ----------
  {
    id: 'grid-alias',
    code: `grid = [[0] * 2] * 2
grid[0][0] = 1
print(grid)`,
    options: ['[[1, 0], [1, 0]]', '[[1, 0], [0, 0]]', '[[1, 1], [0, 0]]', '[[0, 0], [0, 0]]'],
    why: {
      zh: '外層的 * 2 複製的是同一個內層 list。二維陣列要寫 [[0] * cols for _ in range(rows)]。',
      en: 'The outer * 2 repeats the same inner list. Build grids with [[0] * cols for _ in range(rows)].',
    },
  },
  {
    id: 'mutable-default',
    code: `def add(x, acc=[]):
    acc.append(x)
    return acc

add(1)
print(add(2))`,
    options: ['[1, 2]', '[2]', '[1]', 'None'],
    why: {
      zh: '預設值只在定義函式時建立一次，之後每次呼叫共用。預設值用 None，在函式裡再建新的 list。',
      en: 'A default value is created once, when the function is defined, and every call shares it. Default to None and create the list inside.',
    },
  },
  {
    id: 'backtrack-copy',
    code: `res, path = [], []
for x in [1, 2]:
    path.append(x)
    res.append(path)
print(res)`,
    options: ['[[1, 2], [1, 2]]', '[[1], [1, 2]]', '[[1], [2]]', '[1, 2]'],
    why: {
      zh: 'res 裡放的是同一個 path 物件。回溯時要存 path[:] 或 list(path) 這種複本。',
      en: 'res holds the same path object twice. In backtracking, store a copy: path[:] or list(path).',
    },
  },
  {
    id: 'slice-copy',
    code: `a = [1, 2]
b = a
c = a[:]
a.append(3)
print(b, c)`,
    options: ['[1, 2, 3] [1, 2]', '[1, 2] [1, 2]', '[1, 2, 3] [1, 2, 3]', '[1, 2] [1, 2, 3]'],
    why: {
      zh: 'b = a 只是多一個名字指向同一個 list；a[:] 才是淺複製。',
      en: 'b = a is just another name for the same list. a[:] makes a shallow copy.',
    },
  },
  {
    id: 'list-membership',
    question: {
      zh: 'nums 是 list 時，x in nums 的時間複雜度是？',
      en: 'When nums is a list, what does x in nums cost?',
    },
    options: ['O(n)', 'O(1)', 'O(log n)', 'O(n log n)'],
    why: {
      zh: 'list 要從頭找到尾。要常常查「有沒有」就先轉成 set，平均 O(1)。',
      en: 'A list is scanned from start to end. If you check membership often, convert to a set for O(1) on average.',
    },
  },
  {
    id: 'stack-ops',
    question: {
      zh: '把 list 當堆疊用，append() 和 pop() 的時間複雜度是？',
      en: 'Using a list as a stack, what do append() and pop() cost?',
    },
    options: ['O(1)', 'O(n)', 'O(log n)', 'O(n^2)'],
    why: {
      zh: '都在尾端操作，攤銷 O(1)。只有 pop(0)、insert(0, x) 這種動到開頭的操作才是 O(n)。',
      en: 'Both work at the end, so they’re amortized O(1). Only operations at the front, like pop(0) or insert(0, x), are O(n).',
    },
  },
  {
    id: 'range-backward',
    code: `print(list(range(3, -1, -1)))`,
    options: ['[3, 2, 1, 0]', '[3, 2, 1]', '[0, 1, 2, 3]', '[]'],
    why: {
      zh: 'range 不含結束值，所以要倒著走到 0，結束值要寫 -1。',
      en: 'range stops before the end value, so to count down to 0 the end must be -1.',
    },
  },

  // ---------- 數字 ----------
  {
    id: 'floor-div-negative',
    code: `print(-7 // 2)`,
    options: ['-4', '-3', '-3.5', '3'],
    why: {
      zh: '// 是往負無限大取整，不是往 0。',
      en: '// rounds toward negative infinity, not toward zero.',
    },
  },
  {
    id: 'truncate-toward-zero',
    code: `print(int(-7 / 2))`,
    options: ['-3', '-4', '-3.5', '3'],
    why: {
      zh: 'int() 是往 0 截斷。Evaluate Reverse Polish Notation 的除法要的是這個，不是 //。',
      en: 'int() truncates toward zero. Evaluate Reverse Polish Notation needs this, not //.',
    },
  },
  {
    id: 'mod-negative',
    code: `print(-1 % 5)`,
    options: ['4', '-1', '1', '-4'],
    why: {
      zh: 'Python 的 % 結果和除數同號，所以 (i - 1) % n 可以直接繞回陣列尾端。',
      en: 'Python’s % takes the sign of the divisor, so (i - 1) % n wraps around to the end of an array.',
    },
  },
  {
    id: 'ceil-div',
    code: `pile, k = 7, 3
print((pile + k - 1) // k)`,
    options: ['3', '2', '4', '2.33'],
    why: {
      zh: '不用浮點數的無條件進位：(a + b - 1) // b。Koko Eating Bananas 算時數就用這個，也可以寫 -(-a // b)。',
      en: 'Ceiling division without floats: (a + b - 1) // b. Koko Eating Bananas counts hours this way; -(-a // b) also works.',
    },
  },
  {
    id: 'divmod-carry',
    code: `print(divmod(17, 10))`,
    options: ['(1, 7)', '(7, 1)', '1.7', '(1, 70)'],
    why: {
      zh: 'divmod 一次拿到商和餘數。Add Two Numbers 可以寫 carry, digit = divmod(total, 10)。',
      en: 'divmod gives the quotient and remainder at once. Add Two Numbers can use carry, digit = divmod(total, 10).',
    },
  },
  {
    id: 'big-int',
    code: `print(2 ** 64)`,
    options: ['18446744073709551616', 'OverflowError', '0', '-1'],
    why: {
      zh: 'Python 的整數沒有溢位。Reverse Integer 這種題目要自己檢查有沒有超出 32 位元的範圍。',
      en: 'Python integers never overflow. In problems like Reverse Integer, you must check the 32-bit range yourself.',
    },
  },
  {
    id: 'infinity',
    question: {
      zh: '找最小值時，哪個可以當「無限大」的初始值？',
      en: 'Which works as an “infinity” starting value when looking for a minimum?',
    },
    options: ["float('inf')", 'sys.maxint', 'Integer.MAX_VALUE', 'inf()'],
    why: {
      zh: "用 float('inf') 或 math.inf。sys.maxint 是 Python 2 的東西，Python 3 已經沒有了。",
      en: "Use float('inf') or math.inf. sys.maxint was Python 2 and no longer exists in Python 3.",
    },
  },

  // ---------- 位元運算 ----------
  {
    id: 'bit-clear-lowest',
    code: `n = 12  # 0b1100
print(n & (n - 1))`,
    options: ['8', '4', '12', '0'],
    why: {
      zh: 'n & (n - 1) 會清掉最低位的 1。一直做到 0 為止，做了幾次就有幾個 1（Number of 1 Bits）。',
      en: 'n & (n - 1) clears the lowest set bit. Repeat until 0 and the count of steps is the number of 1 bits.',
    },
  },
  {
    id: 'bit-lowest',
    code: `n = 12  # 0b1100
print(n & -n)`,
    options: ['4', '8', '12', '1'],
    why: {
      zh: 'n & -n 只留下最低位的 1。樹狀陣列（Fenwick tree）靠的就是這個。',
      en: 'n & -n keeps only the lowest set bit. Fenwick trees rely on it.',
    },
  },
  {
    id: 'xor-single',
    code: `from functools import reduce
print(reduce(lambda a, b: a ^ b, [4, 1, 2, 1, 2]))`,
    options: ['4', '0', '10', '1'],
    why: {
      zh: 'x ^ x = 0、x ^ 0 = x，成對的數字互相抵消，剩下只出現一次的（Single Number）。',
      en: 'x ^ x = 0 and x ^ 0 = x, so pairs cancel and the single number is left.',
    },
  },
  {
    id: 'bin-count',
    code: `print(bin(11).count('1'))`,
    options: ['3', '2', '4', '11'],
    why: {
      zh: "11 是 0b1011，有三個 1。Python 3.10 以後也可以寫 (11).bit_count()。",
      en: '11 is 0b1011, which has three 1s. Since Python 3.10 you can also write (11).bit_count().',
    },
  },
  {
    id: 'shifts',
    code: `print(1 << 4, 20 >> 2)`,
    options: ['16 5', '4 10', '8 5', '16 18'],
    why: {
      zh: '左移一位乘以 2，右移一位除以 2（往下取整）。1 << k 常用來表示「第 k 位」。',
      en: 'Shifting left multiplies by 2 and shifting right halves (rounding down). 1 << k marks bit k.',
    },
  },

  // ---------- 字串 ----------
  {
    id: 'ord-offset',
    code: `print(ord('c') - ord('a'))`,
    options: ['2', '3', '99', "'b'"],
    why: {
      zh: '把小寫字母對應到 0 到 25，就能用長度 26 的陣列計數，比 dict 快。',
      en: 'Mapping lowercase letters to 0–25 lets you count with a 26-slot array, which beats a dict.',
    },
  },
  {
    id: 'str-immutable',
    question: WHICH_ERROR,
    code: `s = 'abc'
s[0] = 'x'`,
    options: ['TypeError', 'IndexError', 'ValueError', 'AttributeError'],
    why: {
      zh: '字串不能修改。先轉成 list(s)，改完再用 "".join() 接回來。',
      en: 'Strings are immutable. Convert with list(s), edit, then put it back together with "".join().',
    },
  },
  {
    id: 'str-join',
    code: `print('-'.join(['a', 'b', 'c']))`,
    options: ['a-b-c', "['a', 'b', 'c']", '-a-b-c-', 'abc'],
    why: {
      zh: '在迴圈裡用 += 接字串可能變成 O(n^2)；先把片段放進 list，最後 join 一次。',
      en: 'Building a string with += in a loop can be O(n^2). Collect the pieces in a list and join once.',
    },
  },
  {
    id: 'str-isalnum',
    code: `print('a1'.isalnum(), ' '.isalnum())`,
    options: ['True False', 'True True', 'False False', 'False True'],
    why: {
      zh: 'Valid Palindrome：用 isalnum() 跳過標點和空白，再用 lower() 比較。',
      en: 'Valid Palindrome: skip punctuation and spaces with isalnum(), then compare with lower().',
    },
  },
  {
    id: 'str-reverse',
    code: `print('hello'[::-1])`,
    options: ['olleh', 'hello', 'h', 'o'],
    why: {
      zh: '[::-1] 反轉字串或 list，會建立新的複本，需要 O(n) 的空間。',
      en: '[::-1] reverses a string or list by making a new copy, which takes O(n) space.',
    },
  },
  {
    id: 'str-split',
    code: `print('a  b'.split())`,
    options: ["['a', 'b']", "['a', '', 'b']", "['a  b']", "['a', ' ', 'b']"],
    why: {
      zh: 'split() 不給參數時，連續的空白當成一個分隔；split(" ") 則會留下空字串。',
      en: 'split() with no argument treats runs of whitespace as one separator; split(" ") keeps empty strings.',
    },
  },
  {
    id: 'anagram-key',
    code: `print(''.join(sorted('eat')))`,
    options: ['aet', 'eat', 'tea', "['a', 'e', 't']"],
    why: {
      zh: 'Group Anagrams 的 key：排序後的字串，每個字 O(k log k)；改用 26 格計數的 tuple 是 O(k)。',
      en: 'A Group Anagrams key: the sorted word, at O(k log k) per word. A tuple of 26 counts is O(k).',
    },
  },

  // ---------- dict 與 set ----------
  {
    id: 'unhashable-key',
    question: WHICH_ERROR,
    code: `seen = {}
seen[[1, 2]] = True`,
    options: ['TypeError', 'KeyError', 'ValueError', 'IndexError'],
    why: {
      zh: 'list 可以修改，所以不能當 dict 的 key 或放進 set。改用 tuple([1, 2])。',
      en: 'Lists are mutable, so they can’t be dict keys or set members. Use tuple([1, 2]) instead.',
    },
  },
  {
    id: 'dict-get-default',
    code: `d = {'a': 1}
print(d.get('b', 0) + 1)`,
    options: ['1', 'KeyError', 'None', '2'],
    why: {
      zh: 'get(key, 預設值) 找不到時回傳預設值，不會丟錯誤，計數時很好用。',
      en: 'get(key, default) returns the default instead of raising, which is handy for counting.',
    },
  },
  {
    id: 'set-ops',
    code: `a, b = {1, 2, 3}, {2, 3, 4}
print(a & b, a - b)`,
    options: ['{2, 3} {1}', '{1, 2, 3, 4} {1}', '{2, 3} {4}', '{1, 4} {1}'],
    why: {
      zh: '& 是交集、| 是聯集、- 是差集、^ 是只在其中一邊的元素。',
      en: '& is intersection, | is union, - is difference, and ^ keeps items in exactly one side.',
    },
  },
  {
    id: 'is-vs-eq',
    code: `a = [1]
b = [1]
print(a == b, a is b)`,
    options: ['True False', 'True True', 'False False', 'False True'],
    why: {
      zh: '== 比較內容，is 比較是不是同一個物件。檢查 None 用 is None。',
      en: '== compares values; is checks whether both names point to the same object. Test for None with is None.',
    },
  },

  // ---------- 內建函式與 itertools ----------
  {
    id: 'enumerate-start',
    code: `for i, ch in enumerate('ab', 1):
    print(i, ch)`,
    options: [
      `1 a
2 b`,
      `0 a
1 b`,
      `a 1
b 2`,
      '1 a',
    ],
    why: {
      zh: 'enumerate 的第二個參數是起始編號，預設從 0 開始。',
      en: 'enumerate’s second argument is the starting number; it starts at 0 by default.',
    },
  },
  {
    id: 'zip-transpose',
    code: `m = [[1, 2], [3, 4]]
print([list(row) for row in zip(*m)])`,
    options: ['[[1, 3], [2, 4]]', '[[1, 2], [3, 4]]', '[[2, 4], [1, 3]]', '[[4, 3], [2, 1]]'],
    why: {
      zh: 'zip(*m) 是轉置。Rotate Image 可以先轉置，再把每一列反轉。',
      en: 'zip(*m) transposes a matrix. Rotate Image can transpose and then reverse each row.',
    },
  },
  {
    id: 'zip-shortest',
    code: `print(list(zip([1, 2, 3], 'ab')))`,
    options: ["[(1, 'a'), (2, 'b')]", "[(1, 'a'), (2, 'b'), (3, None)]", 'ValueError', "[(1, 2, 3), ('a', 'b')]"],
    why: {
      zh: 'zip 在最短的那一個用完時就停。要補齊用 itertools.zip_longest。',
      en: 'zip stops when the shortest input runs out. Use itertools.zip_longest to pad instead.',
    },
  },
  {
    id: 'accumulate',
    code: `from itertools import accumulate
print(list(accumulate([1, 2, 3])))`,
    options: ['[1, 3, 6]', '[1, 2, 3]', '6', '[0, 1, 3, 6]'],
    why: {
      zh: 'accumulate 算前綴和。加上 initial=0 會在最前面多一個 0，算區間和比較方便。',
      en: 'accumulate builds prefix sums. Passing initial=0 adds a leading 0, which makes range sums easier.',
    },
  },
  {
    id: 'combinations-count',
    code: `from itertools import combinations
print(len(list(combinations([1, 2, 3, 4], 2))))`,
    options: ['6', '12', '4', '16'],
    why: {
      zh: 'combinations 不管順序，C(4, 2) = 6；permutations 會管順序，有 12 種。',
      en: 'combinations ignores order: C(4, 2) = 6. permutations counts order and gives 12.',
    },
  },
  {
    id: 'min-key',
    code: `words = ['pear', 'fig', 'kiwi']
print(min(words, key=len))`,
    options: ['fig', 'kiwi', 'pear', '3'],
    why: {
      zh: 'min、max 也可以給 key，回傳的是元素本身，不是 key 的值。',
      en: 'min and max accept a key too, and they return the item itself, not the key’s value.',
    },
  },
  {
    id: 'all-any-empty',
    code: `print(all([]), any([]))`,
    options: ['True False', 'False False', 'True True', 'False True'],
    why: {
      zh: '空的 all() 是 True，空的 any() 是 False。輸入可能是空的時候要特別注意。',
      en: 'all() of nothing is True and any() of nothing is False. Watch for this when the input can be empty.',
    },
  },

  // ---------- 函式與遞迴 ----------
  {
    id: 'memoize',
    question: {
      zh: '在遞迴函式上加哪一行，就能自動記住算過的結果？',
      en: 'Which decorator remembers results a recursive function already computed?',
    },
    options: ['@functools.cache', '@functools.wraps', '@staticmethod', '@property'],
    why: {
      zh: '@cache（Python 3.9 起）或 @lru_cache(None)。參數必須能雜湊，list 要先轉成 tuple。',
      en: 'Use @cache (Python 3.9+) or @lru_cache(None). Arguments must be hashable, so turn lists into tuples.',
    },
  },
  {
    id: 'recursion-limit',
    question: {
      zh: 'Python 預設的遞迴深度上限大約是多少？',
      en: 'About how deep can Python recurse by default?',
    },
    options: ['1000', '10000', '100', '1000000'],
    why: {
      zh: '節點上萬的串列或很歪的樹，遞迴 DFS 可能超過上限。可以呼叫 sys.setrecursionlimit，或改用自己的堆疊。',
      en: 'A recursive DFS over a 10,000-node list or a skewed tree can exceed it. Call sys.setrecursionlimit or use your own stack.',
    },
  },
  {
    id: 'nonlocal',
    code: `def outer():
    count = 0
    def inc():
        nonlocal count
        count += 1
    inc()
    inc()
    return count

print(outer())`,
    options: ['2', '0', '1', 'UnboundLocalError'],
    why: {
      zh: '內層函式要修改外層變數，要先宣告 nonlocal，不然會出現 UnboundLocalError。DFS 輔助函式常遇到。',
      en: 'An inner function must declare nonlocal before changing an outer variable, or you get UnboundLocalError. DFS helpers hit this often.',
    },
  },
];
