import type { PatternContent } from './patterns';
import type { PatternId } from '../../shared/constants';

// 模板卡的英文版：程式碼和中文版完全相同，只有說明與註解是英文。

export const PATTERN_CONTENT_EN: Record<PatternId, PatternContent> = {
  arrays: {
    name: 'Arrays & Hashing',
    summary: 'Use a hash map to answer “have I seen this?” in O(1), and group items by counts or a normalized key.',
    signals: [
      'You need to know quickly whether a value has appeared before',
      'Counting, finding duplicates, or grouping (for example, anagrams)',
      'Subarray sum equals k → prefix sums plus a hash map',
    ],
    pitfalls: [
      'A list can’t be a dict key in Python; convert it to a tuple',
      'Seed the prefix-sum Counter with {0: 1}',
      'When looking up as you go, check before inserting so one element isn’t used twice',
    ],
    template: `from collections import Counter, defaultdict

# 1) Look up as you go: Two Sum style
def two_sum(nums, target):
    seen = {}  # value -> index
    for i, x in enumerate(nums):
        if target - x in seen:
            return [seen[target - x], i]
        seen[x] = i
    return []

# 2) Prefix sums + hash map: count subarrays that sum to k
def subarray_sum(nums, k):
    count = Counter({0: 1})
    prefix = ans = 0
    for x in nums:
        prefix += x
        ans += count[prefix - k]
        count[prefix] += 1
    return ans

# 3) Group by a normalized key
def group_by_key(words):
    groups = defaultdict(list)
    for w in words:
        groups[tuple(sorted(w))].append(w)
    return list(groups.values())
`,
  },
  'two-pointers': {
    name: 'Two Pointers',
    summary: 'Close in from both ends of a sorted array, or use slow and fast pointers to rearrange an array in place.',
    signals: [
      'A sorted array where you need a pair (or triple) of numbers',
      'Palindrome checks',
      'Removing, moving, or partitioning in place with O(1) extra space',
    ],
    pitfalls: [
      'In 3Sum, skip duplicates in both the outer and inner loops',
      'Decide deliberately between l < r and l <= r',
      'Sorting changes the original indices, which matters if the problem asks for indices',
    ],
    template: `# 1) Close in from both ends (sorted input)
def pair_with_sum(nums, target):
    l, r = 0, len(nums) - 1
    while l < r:
        s = nums[l] + nums[r]
        if s == target:
            return [l, r]
        if s < target:
            l += 1
        else:
            r -= 1
    return []

# 2) Slow and fast pointers: keep matching elements in place
def remove_value(nums, val):
    slow = 0
    for fast in range(len(nums)):
        if nums[fast] != val:
            nums[slow] = nums[fast]
            slow += 1
    return slow
`,
  },
  'sliding-window': {
    name: 'Sliding Window',
    summary: 'Grow the right edge one step at a time, move the left edge when the window becomes invalid, and keep the window’s state up to date.',
    signals: [
      'Contiguous subarrays or substrings',
      'The “longest” or “shortest” window that meets a condition',
      'Statistics over a fixed window of size k',
    ],
    pitfalls: [
      'For the longest window, update the answer after shrinking; for the shortest, update it inside the shrinking loop',
      'Decide whether to delete keys whose count drops to zero, since it affects len(count)',
      'The window length is right - left + 1',
    ],
    template: `from collections import defaultdict

# Variable window, longest valid one (e.g. no repeated characters)
def longest_valid(s):
    count = defaultdict(int)
    left = best = 0
    for right, ch in enumerate(s):
        count[ch] += 1
        while count[ch] > 1:          # shrink from the left while invalid
            count[s[left]] -= 1
            left += 1
        best = max(best, right - left + 1)
    return best

# Variable window, shortest valid one (grow until valid, then shrink)
def shortest_at_least(nums, target):
    left = total = 0
    best = float('inf')
    for right, x in enumerate(nums):
        total += x
        while total >= target:
            best = min(best, right - left + 1)
            total -= nums[left]
            left += 1
    return 0 if best == float('inf') else best
`,
  },
  stack: {
    name: 'Stack',
    summary: 'Handle matching pairs and nested structures, and answer “next greater / smaller” questions with a monotonic stack.',
    signals: [
      'Matching brackets or decoding nested strings',
      'Next greater or smaller element, or areas in a histogram',
      'Evaluating expressions',
    ],
    pitfalls: [
      'Monotonic stacks usually store indices, not values',
      'Check that the stack isn’t empty before popping',
      'Elements left on the stack after the loop may still need handling',
    ],
    template: `# Monotonic decreasing stack: how long until a larger value appears
def next_greater_distance(nums):
    ans = [0] * len(nums)
    stack = []  # indices; their values decrease from bottom to top
    for i, x in enumerate(nums):
        while stack and nums[stack[-1]] < x:
            j = stack.pop()
            ans[j] = i - j
        stack.append(i)
    return ans

# Matching brackets
def is_valid(s):
    pairs = {')': '(', ']': '[', '}': '{'}
    stack = []
    for ch in s:
        if ch in pairs:
            if not stack or stack.pop() != pairs[ch]:
                return False
        else:
            stack.append(ch)
    return not stack
`,
  },
  'binary-search': {
    name: 'Binary Search',
    summary: 'Whenever the answer is monotonic, you can binary search on an index or on the answer itself.',
    signals: [
      'A sorted array, or a rotated sorted array',
      'O(log n) is required',
      '“The smallest x for which a condition holds” → binary search on the answer',
    ],
    pitfalls: [
      'Choose [lo, hi] or [lo, hi) up front and stay consistent',
      'Decide what to return when nothing is found',
      'In a rotated array, first work out which half is sorted',
    ],
    template: `import math

# First value where condition(x) is True (lower bound)
# Searches [lo, hi]; returns hi + 1 if nothing matches
def first_true(lo, hi, condition):
    while lo <= hi:
        mid = (lo + hi) // 2
        if condition(mid):
            hi = mid - 1
        else:
            lo = mid + 1
    return lo

# Example: Koko Eating Bananas, binary search on the answer
def min_eating_speed(piles, h):
    return first_true(1, max(piles),
                      lambda k: sum(math.ceil(p / k) for p in piles) <= h)
`,
  },
  'linked-list': {
    name: 'Linked List',
    summary: 'A dummy node simplifies handling the head; slow and fast pointers find the middle, detect cycles, and locate the n-th node from the end.',
    signals: [
      'Reversing all or part of a list',
      'Finding the middle or detecting a cycle',
      'Merging sorted lists or removing specific nodes',
    ],
    pitfalls: [
      'Save the next node before changing next',
      'Use a dummy node whenever the head might be removed',
      'Keep the order in while fast and fast.next',
    ],
    template: `class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next

def reverse(head):
    prev, cur = None, head
    while cur:
        nxt = cur.next
        cur.next = prev
        prev, cur = cur, nxt
    return prev

def middle(head):
    slow = fast = head
    while fast and fast.next:
        slow, fast = slow.next, fast.next.next
    return slow

def merge(a, b):
    dummy = tail = ListNode()
    while a and b:
        if a.val <= b.val:
            tail.next, a = a, a.next
        else:
            tail.next, b = b, b.next
        tail = tail.next
    tail.next = a or b
    return dummy.next
`,
  },
  trees: {
    name: 'Trees',
    summary: 'Let DFS return subtree information while updating a global answer, use BFS for level-by-level problems, and remember that an in-order traversal of a BST is sorted.',
    signals: [
      'Depth, diameter, path sums, or balance checks → post-order DFS',
      'Level-by-level processing or right-side views → BFS',
      'k-th smallest in a BST or BST validation → in-order traversal or bounds',
    ],
    pitfalls: [
      'What the recursive function returns and what you track globally are two different things',
      'Validating a BST needs lower and upper bounds, not just parent-child comparisons',
      'Python’s default recursion limit is about 1000; very deep trees need an iterative approach',
    ],
    template: `from collections import deque

# DFS: return subtree info and update a global answer (e.g. diameter)
def diameter(root):
    best = 0
    def depth(node):
        nonlocal best
        if not node:
            return 0
        l, r = depth(node.left), depth(node.right)
        best = max(best, l + r)
        return 1 + max(l, r)
    depth(root)
    return best

# BFS level-order traversal
def level_order(root):
    if not root:
        return []
    ans, q = [], deque([root])
    while q:
        level = []
        for _ in range(len(q)):
            node = q.popleft()
            level.append(node.val)
            if node.left:
                q.append(node.left)
            if node.right:
                q.append(node.right)
        ans.append(level)
    return ans

# Validate a BST by passing bounds down
def is_bst(node, lo=float('-inf'), hi=float('inf')):
    if not node:
        return True
    return (lo < node.val < hi
            and is_bst(node.left, lo, node.val)
            and is_bst(node.right, node.val, hi))
`,
  },
  tries: {
    name: 'Tries',
    summary: 'Store many strings so they share common prefixes; a prefix lookup then costs only the length of the string.',
    signals: [
      'Prefix queries or autocomplete',
      'Searches with wildcards',
      'Finding many words in a grid at once',
    ],
    pitfalls: [
      'Mark word endings with is_word, or you can’t tell a prefix from a whole word',
      'In Word Search II, deduplicate found words (or clear the end marker)',
    ],
    template: `class TrieNode:
    def __init__(self):
        self.children = {}
        self.is_word = False

class Trie:
    def __init__(self):
        self.root = TrieNode()

    def insert(self, word):
        node = self.root
        for ch in word:
            node = node.children.setdefault(ch, TrieNode())
        node.is_word = True

    def _walk(self, s):
        node = self.root
        for ch in s:
            if ch not in node.children:
                return None
            node = node.children[ch]
        return node

    def search(self, word):
        node = self._walk(word)
        return node is not None and node.is_word

    def starts_with(self, prefix):
        return self._walk(prefix) is not None
`,
  },
  heap: {
    name: 'Heap / Priority Queue',
    summary: 'Use a heap when you repeatedly need the smallest or largest item; for the top k largest, keep a min-heap of size k.',
    signals: [
      'The k-th largest or the top k',
      'Merging k sorted lists',
      'Median of a data stream → two heaps',
    ],
    pitfalls: [
      'Python’s heapq is a min-heap; store negated values for a max-heap',
      'Tuples with equal first values compare the next field, so add an index to avoid comparing objects',
      'heapify is O(n), while pushing items one by one is O(n log n)',
    ],
    template: `import heapq

# k-th largest: keep a min-heap of size k
def kth_largest(nums, k):
    heap = []
    for x in nums:
        heapq.heappush(heap, x)
        if len(heap) > k:
            heapq.heappop(heap)
    return heap[0]

# Merge k sorted lists
def merge_k_sorted(lists):
    heap = [(lst[0], i, 0) for i, lst in enumerate(lists) if lst]
    heapq.heapify(heap)
    out = []
    while heap:
        val, i, j = heapq.heappop(heap)
        out.append(val)
        if j + 1 < len(lists[i]):
            heapq.heappush(heap, (lists[i][j + 1], i, j + 1))
    return out
`,
  },
  backtracking: {
    name: 'Backtracking',
    summary: 'Make a choice, recurse, then undo the choice, to enumerate every combination, permutation, or placement.',
    signals: [
      'The problem asks for all combinations, permutations, or subsets',
      'Placing pieces on a board (N-Queens, Sudoku)',
      'Trial and error, stepping back when a path fails',
    ],
    pitfalls: [
      'Add a copy (path[:]) to the answer, not path itself',
      'With duplicates, sort first and skip repeated values at the same level',
      'Combinations use a start index; permutations use a used array',
    ],
    template: `def subsets(nums):
    ans, path = [], []
    def backtrack(start):
        ans.append(path[:])
        for i in range(start, len(nums)):
            # With duplicates: call nums.sort() first, then add
            # if i > start and nums[i] == nums[i - 1]: continue
            path.append(nums[i])     # choose
            backtrack(i + 1)
            path.pop()               # undo the choice
    backtrack(0)
    return ans

def permutations(nums):
    ans, path, used = [], [], [False] * len(nums)
    def backtrack():
        if len(path) == len(nums):
            ans.append(path[:])
            return
        for i, x in enumerate(nums):
            if used[i]:
                continue
            used[i] = True
            path.append(x)
            backtrack()
            path.pop()
            used[i] = False
    backtrack()
    return ans
`,
  },
  graphs: {
    name: 'Graphs',
    summary: 'Use BFS or DFS for grids and relationship graphs, topological sort for dependencies, and Union-Find for connectivity.',
    signals: [
      'Islands, regions, or spreading on a grid',
      'Fewest steps in an unweighted graph → BFS',
      'Course prerequisites or cycle detection → topological sort',
      'Merging sets dynamically → Union-Find',
    ],
    pitfalls: [
      'Mark a node as visited when you enqueue it, not when you dequeue it',
      'For multi-source BFS, enqueue every source at the start',
      'When detecting cycles in an undirected graph, ignore the parent node',
    ],
    template: `from collections import deque, defaultdict

# Grid BFS (also multi-source: enqueue every start up front)
def grid_bfs(grid, starts):
    rows, cols = len(grid), len(grid[0])
    dist = {s: 0 for s in starts}
    q = deque(starts)
    while q:
        r, c = q.popleft()
        for dr, dc in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nr, nc = r + dr, c + dc
            if (0 <= nr < rows and 0 <= nc < cols
                    and (nr, nc) not in dist and grid[nr][nc] != '#'):
                dist[(nr, nc)] = dist[(r, c)] + 1
                q.append((nr, nc))
    return dist

# Topological sort (Kahn); returns [] if there is a cycle
def topo_sort(n, edges):
    graph = defaultdict(list)
    indegree = [0] * n
    for u, v in edges:          # u must come before v
        graph[u].append(v)
        indegree[v] += 1
    q = deque(i for i in range(n) if indegree[i] == 0)
    order = []
    while q:
        u = q.popleft()
        order.append(u)
        for v in graph[u]:
            indegree[v] -= 1
            if indegree[v] == 0:
                q.append(v)
    return order if len(order) == n else []

# Union-Find
class DSU:
    def __init__(self, n):
        self.parent = list(range(n))
        self.size = [1] * n

    def find(self, x):
        while self.parent[x] != x:
            self.parent[x] = self.parent[self.parent[x]]
            x = self.parent[x]
        return x

    def union(self, a, b):
        ra, rb = self.find(a), self.find(b)
        if ra == rb:
            return False
        if self.size[ra] < self.size[rb]:
            ra, rb = rb, ra
        self.parent[rb] = ra
        self.size[ra] += self.size[rb]
        return True
`,
  },
  'adv-graphs': {
    name: 'Advanced Graphs',
    summary: 'Use Dijkstra for weighted shortest paths, Bellman-Ford when the number of steps is limited, and Prim or Kruskal for minimum spanning trees.',
    signals: [
      'Shortest paths with weighted edges',
      '“At most k stops”',
      'Connecting every point at minimum cost',
    ],
    pitfalls: [
      'Skip stale entries popped from Dijkstra’s heap',
      'Dijkstra can’t handle negative weights',
      'Each Bellman-Ford round must read from a copy of the previous round’s distances',
    ],
    template: `import heapq
from collections import defaultdict

# Dijkstra: single-source shortest paths with non-negative weights
def dijkstra(n, edges, src):
    graph = defaultdict(list)
    for u, v, w in edges:
        graph[u].append((v, w))
    dist = [float('inf')] * n
    dist[src] = 0
    heap = [(0, src)]
    while heap:
        d, u = heapq.heappop(heap)
        if d > dist[u]:
            continue            # stale entry
        for v, w in graph[u]:
            if d + w < dist[v]:
                dist[v] = d + w
                heapq.heappush(heap, (dist[v], v))
    return dist

# Bellman-Ford: use at most k + 1 edges
def cheapest_within_k(n, flights, src, dst, k):
    dist = [float('inf')] * n
    dist[src] = 0
    for _ in range(k + 1):
        nxt = dist[:]
        for u, v, w in flights:
            if dist[u] + w < nxt[v]:
                nxt[v] = dist[u] + w
        dist = nxt
    return -1 if dist[dst] == float('inf') else dist[dst]
`,
  },
  'dp-1d': {
    name: '1-D Dynamic Programming',
    summary: 'Define the state, write the transition, start with memoized recursion, then convert to bottom-up and compress the space.',
    signals: [
      '“Maximum / minimum / number of ways”',
      'The current answer depends only on a few previous states',
      'Take or skip each element',
    ],
    pitfalls: [
      'In an interview, first say in one sentence what dp[i] means',
      'Initial values and the dp[0] boundary are the easiest parts to get wrong',
      'Counting combinations and counting orderings need different loop orders (Coin Change II vs. Combination Sum IV)',
    ],
    template: `from functools import cache

# Start with memoized recursion
def rob(nums):
    @cache
    def dp(i):                  # dp(i): the most you can take starting at house i
        if i >= len(nums):
            return 0
        return max(dp(i + 1), nums[i] + dp(i + 2))
    return dp(0)

# Then go bottom-up with O(1) space
def rob_iterative(nums):
    prev2 = prev1 = 0
    for x in nums:
        prev2, prev1 = prev1, max(prev1, prev2 + x)
    return prev1

# Unbounded knapsack: fewest coins that make up amount
def coin_change(coins, amount):
    dp = [0] + [float('inf')] * amount
    for a in range(1, amount + 1):
        for c in coins:
            if c <= a:
                dp[a] = min(dp[a], dp[a - c] + 1)
    return -1 if dp[amount] == float('inf') else dp[amount]
`,
  },
  'dp-2d': {
    name: '2-D Dynamic Programming',
    summary: 'Comparing two sequences, paths on a grid, and interval problems usually use a dp[i][j] state.',
    signals: [
      'Comparing two strings (LCS, edit distance)',
      'Number of paths or minimum cost on a grid',
      'The best way to merge intervals (Burst Balloons)',
    ],
    pitfalls: [
      'Add an extra row and column for the empty string to simplify the boundaries',
      'Build 2-D lists with a list comprehension, not [[0] * n] * m',
      'Fill the table in an order where every dependency is already computed',
    ],
    template: `# Two strings: LCS
def lcs(a, b):
    m, n = len(a), len(b)
    dp = [[0] * (n + 1) for _ in range(m + 1)]
    for i in range(m - 1, -1, -1):
        for j in range(n - 1, -1, -1):
            if a[i] == b[j]:
                dp[i][j] = 1 + dp[i + 1][j + 1]
            else:
                dp[i][j] = max(dp[i + 1][j], dp[i][j + 1])
    return dp[0][0]

# Grid paths (moving only right or down) with a rolling row
def unique_paths(m, n):
    row = [1] * n
    for _ in range(1, m):
        for j in range(1, n):
            row[j] += row[j - 1]
    return row[-1]
`,
  },
  greedy: {
    name: 'Greedy',
    summary: 'Make the locally best choice at every step, and be able to explain why that choice never needs to be undone.',
    signals: [
      'Maximum subarray sum (Kadane)',
      'How far you can jump',
      'Making decisions in order after sorting',
    ],
    pitfalls: [
      'In an interview, explain why greedy is correct, or use a counterexample to rule out the alternatives',
      'Many problems look greedy but need DP, so try small examples first',
    ],
    template: `# Kadane: maximum subarray sum
def max_subarray(nums):
    best = cur = nums[0]
    for x in nums[1:]:
        cur = max(x, cur + x)
        best = max(best, cur)
    return best

# Farthest reach: Jump Game
def can_jump(nums):
    reach = 0
    for i, x in enumerate(nums):
        if i > reach:
            return False
        reach = max(reach, i + x)
    return True
`,
  },
  intervals: {
    name: 'Intervals',
    summary: 'Sort first: by start to merge, by end to keep the most non-overlapping intervals, and use a min-heap to count concurrent ones.',
    signals: [
      'Merging or inserting intervals',
      'Meeting rooms and schedule conflicts',
      'The fewest removals needed to eliminate overlaps',
    ],
    pitfalls: [
      'Confirm with the interviewer whether touching endpoints count as overlapping',
      'Sorting by start versus by end decides whether the answer is correct',
    ],
    template: `import heapq

def merge(intervals):
    intervals.sort(key=lambda x: x[0])
    merged = []
    for start, end in intervals:
        if merged and start <= merged[-1][1]:
            merged[-1][1] = max(merged[-1][1], end)
        else:
            merged.append([start, end])
    return merged

# Fewest removals to avoid overlap: sort by end time
def erase_overlap(intervals):
    intervals.sort(key=lambda x: x[1])
    removed, prev_end = 0, float('-inf')
    for start, end in intervals:
        if start >= prev_end:
            prev_end = end
        else:
            removed += 1
    return removed

# Most intervals at the same time (Meeting Rooms II)
def min_rooms(intervals):
    intervals.sort(key=lambda x: x[0])
    ends = []
    for start, end in intervals:
        if ends and ends[0] <= start:
            heapq.heappop(ends)
        heapq.heappush(ends, end)
    return len(ends)
`,
  },
  math: {
    name: 'Math & Geometry',
    summary: 'Rotating and spiraling through matrices, fast exponentiation, digit manipulation, and overflow handling.',
    signals: [
      'Rotating a matrix in place or printing it in spiral order',
      'Powers, or multiplying large numbers',
      'Converting strings to numbers or reversing digits',
    ],
    pitfalls: [
      'Python integers don’t overflow, so check 32-bit limits yourself when the problem requires it',
      'Floor division and modulo behave differently for negative numbers in Python (-7 // 2 == -4)',
    ],
    template: `# Rotate a matrix clockwise: transpose, then reverse each row
def rotate(matrix):
    n = len(matrix)
    for i in range(n):
        for j in range(i + 1, n):
            matrix[i][j], matrix[j][i] = matrix[j][i], matrix[i][j]
    for row in matrix:
        row.reverse()

# Fast exponentiation
def my_pow(x, n):
    if n < 0:
        x, n = 1 / x, -n
    result = 1.0
    while n:
        if n & 1:
            result *= x
        x *= x
        n >>= 1
    return result
`,
  },
  bits: {
    name: 'Bit Manipulation',
    summary: 'XOR cancels out pairs, and x & (x - 1) clears the lowest set bit.',
    signals: [
      'Finding the number that appears only once',
      'Counting the 1 bits in a number',
      'Adding without + or -',
    ],
    pitfalls: [
      'Python integers have no fixed width, so mask negative numbers with 0xFFFFFFFF',
      'Shifts bind more loosely than + and -, so add parentheses',
    ],
    template: `# x & (x - 1) clears the lowest set bit
def count_ones(n):
    count = 0
    while n:
        n &= n - 1
        count += 1
    return count

# XOR: pairs cancel each other out
def single_number(nums):
    ans = 0
    for x in nums:
        ans ^= x
    return ans

# Counting Bits: dp[i] = dp[i >> 1] + (i & 1)
def count_bits(n):
    dp = [0] * (n + 1)
    for i in range(1, n + 1):
        dp[i] = dp[i >> 1] + (i & 1)
    return dp
`,
  },
};
