export type PatternId =
  | 'arrays'
  | 'two-pointers'
  | 'sliding-window'
  | 'stack'
  | 'binary-search'
  | 'linked-list'
  | 'trees'
  | 'tries'
  | 'heap'
  | 'backtracking'
  | 'graphs'
  | 'adv-graphs'
  | 'dp-1d'
  | 'dp-2d'
  | 'greedy'
  | 'intervals'
  | 'math'
  | 'bits';

export interface Pattern {
  id: PatternId;
  name: string;
  english: string;
  summary: string;
  /** 題目裡出現這些線索時，優先考慮這個模式 */
  signals: string[];
  pitfalls: string[];
  /** 預設的 Python 模板，使用者可以覆寫 */
  template: string;
}

export const PATTERNS: Pattern[] = [
  {
    id: 'arrays',
    name: '陣列與雜湊',
    english: 'Arrays & Hashing',
    summary: '用雜湊表把「找有沒有看過」變成 O(1)，用計數或正規化後的 key 做分組。',
    signals: [
      '需要快速判斷某個值是否出現過',
      '統計次數、找重複、分組（例如 anagram）',
      '子陣列和等於 k → 前綴和 + 雜湊表',
    ],
    pitfalls: [
      'list 不能當 dict 的 key，要轉成 tuple',
      '前綴和的 Counter 要先放入 {0: 1}',
      '邊走邊查時，先查再放，避免同一個元素用兩次',
    ],
    template: `from collections import Counter, defaultdict

# 1) 邊走邊查：Two Sum 型
def two_sum(nums, target):
    seen = {}  # value -> index
    for i, x in enumerate(nums):
        if target - x in seen:
            return [seen[target - x], i]
        seen[x] = i
    return []

# 2) 前綴和 + 雜湊：和為 k 的子陣列數量
def subarray_sum(nums, k):
    count = Counter({0: 1})
    prefix = ans = 0
    for x in nums:
        prefix += x
        ans += count[prefix - k]
        count[prefix] += 1
    return ans

# 3) 分組：用「正規化後的 key」
def group_by_key(words):
    groups = defaultdict(list)
    for w in words:
        groups[tuple(sorted(w))].append(w)
    return list(groups.values())
`,
  },
  {
    id: 'two-pointers',
    name: '雙指標',
    english: 'Two Pointers',
    summary: '在排序過的陣列上從兩端往內夾，或用快慢指標原地整理陣列。',
    signals: [
      '陣列已排序，要找一對（或三個）數字',
      '回文判斷',
      '原地移除、搬移、分區，要求 O(1) 額外空間',
    ],
    pitfalls: [
      '3Sum 要跳過重複值，外層和內層都要跳',
      '迴圈條件是 l < r 還是 l <= r，要想清楚',
      '先排序會改變原本的 index，題目若要回傳 index 要注意',
    ],
    template: `# 1) 左右夾擠（已排序）
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

# 2) 快慢指標：原地保留符合條件的元素
def remove_value(nums, val):
    slow = 0
    for fast in range(len(nums)):
        if nums[fast] != val:
            nums[slow] = nums[fast]
            slow += 1
    return slow
`,
  },
  {
    id: 'sliding-window',
    name: '滑動視窗',
    english: 'Sliding Window',
    summary: '右邊界一路往前擴張，視窗不合法時移動左邊界，維持視窗內的狀態。',
    signals: [
      '連續的子陣列或子字串',
      '「最長」或「最短」且滿足某條件',
      '固定長度 k 的視窗統計',
    ],
    pitfalls: [
      '求最長：在 while 縮完之後更新答案；求最短：在 while 裡面更新答案',
      '計數歸零時要不要從 dict 刪掉，會影響 len(count) 的判斷',
      '視窗長度是 right - left + 1',
    ],
    template: `from collections import defaultdict

# 可變長度視窗：最長且合法（例：沒有重複字元）
def longest_valid(s):
    count = defaultdict(int)
    left = best = 0
    for right, ch in enumerate(s):
        count[ch] += 1
        while count[ch] > 1:          # 視窗不合法就縮左邊
            count[s[left]] -= 1
            left += 1
        best = max(best, right - left + 1)
    return best

# 可變長度視窗：最短且合法（先擴張到合法，再盡量縮）
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
  {
    id: 'stack',
    name: '堆疊',
    english: 'Stack',
    summary: '處理配對、巢狀結構，以及「下一個更大 / 更小」的單調堆疊。',
    signals: [
      '括號配對、巢狀字串解碼',
      '下一個更大 / 更小的元素、柱狀圖面積',
      '運算式求值',
    ],
    pitfalls: [
      '單調堆疊通常存 index，不是值',
      'pop 之前先確認堆疊不是空的',
      '迴圈結束後，堆疊裡剩下的元素可能也要處理',
    ],
    template: `# 單調遞減堆疊：每個元素要等幾天才遇到更大的值
def next_greater_distance(nums):
    ans = [0] * len(nums)
    stack = []  # 存 index，對應的值由底到頂遞減
    for i, x in enumerate(nums):
        while stack and nums[stack[-1]] < x:
            j = stack.pop()
            ans[j] = i - j
        stack.append(i)
    return ans

# 括號配對
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
  {
    id: 'binary-search',
    name: '二分搜尋',
    english: 'Binary Search',
    summary: '只要答案具有單調性，就能對「索引」或「答案本身」做二分。',
    signals: [
      '陣列已排序，或是旋轉過的排序陣列',
      '要求 O(log n)',
      '「最小的 x 使得條件成立」→ 對答案二分',
    ],
    pitfalls: [
      '先決定搜尋區間是 [lo, hi] 還是 [lo, hi)，再照著寫，不要混用',
      '找不到時回傳什麼要先講清楚',
      '旋轉陣列要先判斷哪一半是有序的',
    ],
    template: `import math

# 找第一個讓 condition(x) 為 True 的值（lower bound）
# 在 [lo, hi] 中搜尋；若全部不成立回傳 hi + 1
def first_true(lo, hi, condition):
    while lo <= hi:
        mid = (lo + hi) // 2
        if condition(mid):
            hi = mid - 1
        else:
            lo = mid + 1
    return lo

# 範例：Koko 吃香蕉，對答案二分
def min_eating_speed(piles, h):
    return first_true(1, max(piles),
                      lambda k: sum(math.ceil(p / k) for p in piles) <= h)
`,
  },
  {
    id: 'linked-list',
    name: '鏈結串列',
    english: 'Linked List',
    summary: '用 dummy 節點簡化頭部處理，用快慢指標找中點、找環、找倒數第 n 個。',
    signals: [
      '反轉整段或部分串列',
      '找中點、判斷有沒有環',
      '合併排序串列、刪除特定節點',
    ],
    pitfalls: [
      '改 next 之前先存下一個節點',
      '可能刪到頭節點時就用 dummy',
      'while fast and fast.next 的順序不能反過來',
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
  {
    id: 'trees',
    name: '樹',
    english: 'Trees',
    summary: 'DFS 讓子樹回傳資訊、順便更新全域答案；層序問題用 BFS；BST 記得中序是遞增的。',
    signals: [
      '深度、直徑、路徑和、平衡判斷 → 後序 DFS',
      '一層一層處理、右視圖 → BFS',
      'BST 的第 k 小、驗證 → 中序或上下界',
    ],
    pitfalls: [
      '想清楚遞迴函式「回傳什麼」和「全域要記什麼」是兩件事',
      '驗證 BST 不能只比較父子，要帶上下界',
      'Python 遞迴深度預設約 1000，極深的樹要改成迭代',
    ],
    template: `from collections import deque

# DFS：子樹回傳資訊，順便更新全域答案（例：直徑）
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

# BFS 層序走訪
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

# 驗證 BST：把上下界往下傳
def is_bst(node, lo=float('-inf'), hi=float('inf')):
    if not node:
        return True
    return (lo < node.val < hi
            and is_bst(node.left, lo, node.val)
            and is_bst(node.right, node.val, hi))
`,
  },
  {
    id: 'tries',
    name: '字典樹',
    english: 'Tries',
    summary: '把大量字串依前綴共用節點，前綴查詢只跟字串長度有關。',
    signals: [
      '前綴查詢、自動完成',
      '萬用字元搜尋',
      '在網格裡同時找很多個單字',
    ],
    pitfalls: [
      '結尾要標記 is_word，否則分不出「前綴」和「完整單字」',
      'Word Search II 找到單字後要從結果去重（或把標記清掉）',
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
  {
    id: 'heap',
    name: '堆積',
    english: 'Heap / Priority Queue',
    summary: '需要反覆取出最小或最大值時使用；前 k 大用大小為 k 的最小堆積。',
    signals: [
      '第 k 大 / 前 k 個',
      '合併 k 個排序串列',
      '資料流的中位數 → 兩個堆積',
    ],
    pitfalls: [
      'Python heapq 只有最小堆積，最大堆積要存負數',
      'tuple 比較到相同值時會比下一個欄位，放 index 避免比較到物件',
      'heapify 是 O(n)，逐一 push 是 O(n log n)',
    ],
    template: `import heapq

# 第 k 大：維持大小為 k 的最小堆積
def kth_largest(nums, k):
    heap = []
    for x in nums:
        heapq.heappush(heap, x)
        if len(heap) > k:
            heapq.heappop(heap)
    return heap[0]

# 合併 k 個排序串列
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
  {
    id: 'backtracking',
    name: '回溯',
    english: 'Backtracking',
    summary: '做選擇、遞迴、撤銷選擇，列舉所有可能的組合、排列或放置方式。',
    signals: [
      '題目要「所有」組合、排列、子集',
      '棋盤放置（N-Queens、數獨）',
      '需要試錯，失敗就退回上一步',
    ],
    pitfalls: [
      '加入答案時要複製 path[:]，不能直接放 path',
      '有重複元素時先排序，再跳過同一層的重複值',
      '組合用 start 避免回頭，排列用 used 陣列',
    ],
    template: `def subsets(nums):
    ans, path = [], []
    def backtrack(start):
        ans.append(path[:])
        for i in range(start, len(nums)):
            # 有重複元素時：先 nums.sort()，再加上
            # if i > start and nums[i] == nums[i - 1]: continue
            path.append(nums[i])     # 做選擇
            backtrack(i + 1)
            path.pop()               # 撤銷選擇
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
  {
    id: 'graphs',
    name: '圖',
    english: 'Graphs',
    summary: '網格和關係圖用 BFS / DFS；相依順序用拓撲排序；連通性用 Union-Find。',
    signals: [
      '網格上的島嶼、區域、擴散',
      '無權重的最短步數 → BFS',
      '課程相依、有沒有環 → 拓撲排序',
      '動態合併集合 → Union-Find',
    ],
    pitfalls: [
      '放進佇列時就標記 visited，不要等到取出才標記',
      '多源 BFS 要一開始就把所有起點放進佇列',
      '無向圖判斷環時要排除父節點',
    ],
    template: `from collections import deque, defaultdict

# 網格 BFS（多源也適用：一開始把所有起點放進佇列）
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

# 拓撲排序（Kahn）：有環則回傳 []
def topo_sort(n, edges):
    graph = defaultdict(list)
    indegree = [0] * n
    for u, v in edges:          # u 必須在 v 之前
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
  {
    id: 'adv-graphs',
    name: '進階圖論',
    english: 'Advanced Graphs',
    summary: '帶權重的最短路徑用 Dijkstra，有步數限制用 Bellman-Ford，最小生成樹用 Prim 或 Kruskal。',
    signals: [
      '邊有權重的最短路徑',
      '「最多經過 k 站」',
      '用最小成本把所有點連起來',
    ],
    pitfalls: [
      'Dijkstra 取出過期的項目要跳過',
      'Dijkstra 不能處理負權重',
      'Bellman-Ford 每一輪要用上一輪的 dist 複本',
    ],
    template: `import heapq
from collections import defaultdict

# Dijkstra：非負權重的單源最短路徑
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
            continue            # 過期的項目
        for v, w in graph[u]:
            if d + w < dist[v]:
                dist[v] = d + w
                heapq.heappush(heap, (dist[v], v))
    return dist

# Bellman-Ford：最多使用 k + 1 條邊
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
  {
    id: 'dp-1d',
    name: '一維 DP',
    english: '1-D Dynamic Programming',
    summary: '先定義狀態，寫出轉移式，從記憶化遞迴開始，再改成 bottom-up 並壓縮空間。',
    signals: [
      '「最多 / 最少 / 有幾種方法」',
      '目前的答案只依賴前面幾個狀態',
      '每個元素選或不選',
    ],
    pitfalls: [
      '面試時先用一句話講清楚 dp[i] 代表什麼',
      '初始值和邊界（dp[0]）最容易錯',
      '組合數與排列數的迴圈順序不同（Coin Change II vs Combination Sum IV）',
    ],
    template: `from functools import cache

# 先寫記憶化遞迴
def rob(nums):
    @cache
    def dp(i):                  # dp(i)：從第 i 間開始能拿到的最大金額
        if i >= len(nums):
            return 0
        return max(dp(i + 1), nums[i] + dp(i + 2))
    return dp(0)

# 再改成 bottom-up，空間壓到 O(1)
def rob_iterative(nums):
    prev2 = prev1 = 0
    for x in nums:
        prev2, prev1 = prev1, max(prev1, prev2 + x)
    return prev1

# 完全背包：湊出 amount 的最少硬幣數
def coin_change(coins, amount):
    dp = [0] + [float('inf')] * amount
    for a in range(1, amount + 1):
        for c in coins:
            if c <= a:
                dp[a] = min(dp[a], dp[a - c] + 1)
    return -1 if dp[amount] == float('inf') else dp[amount]
`,
  },
  {
    id: 'dp-2d',
    name: '二維 DP',
    english: '2-D Dynamic Programming',
    summary: '兩個序列比對、網格路徑、區間問題，狀態通常是 dp[i][j]。',
    signals: [
      '兩個字串的比對（LCS、編輯距離）',
      '網格上的路徑數或最小成本',
      '區間合併的最佳解（戳氣球）',
    ],
    pitfalls: [
      'dp 表多開一列一欄當作空字串，邊界比較好寫',
      '二維 list 要用 list comprehension 建立，不能用 [[0] * n] * m',
      '確認填表順序讓依賴的格子先算好',
    ],
    template: `# 兩個字串：LCS
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

# 網格路徑數（只能往右或往下），用一列滾動
def unique_paths(m, n):
    row = [1] * n
    for _ in range(1, m):
        for j in range(1, n):
            row[j] += row[j - 1]
    return row[-1]
`,
  },
  {
    id: 'greedy',
    name: '貪心',
    english: 'Greedy',
    summary: '每一步都做局部最佳選擇，而且要說得出為什麼不會後悔。',
    signals: [
      '最大子陣列和（Kadane）',
      '最遠能跳到哪裡',
      '排序之後依序決定',
    ],
    pitfalls: [
      '面試時要說明為什麼貪心是對的，或舉反例排除其他做法',
      '看起來像貪心但其實要 DP 的題目很多，先試小例子',
    ],
    template: `# Kadane：最大子陣列和
def max_subarray(nums):
    best = cur = nums[0]
    for x in nums[1:]:
        cur = max(x, cur + x)
        best = max(best, cur)
    return best

# 最遠可達：Jump Game
def can_jump(nums):
    reach = 0
    for i, x in enumerate(nums):
        if i > reach:
            return False
        reach = max(reach, i + x)
    return True
`,
  },
  {
    id: 'intervals',
    name: '區間',
    english: 'Intervals',
    summary: '先排序：合併類依起點，挑最多不重疊依終點，同時進行的數量用最小堆積。',
    signals: [
      '合併、插入區間',
      '會議室、行程衝突',
      '最少移除幾個才不重疊',
    ],
    pitfalls: [
      '端點相等算不算重疊，要先跟面試官確認',
      '依起點還是依終點排序會決定答案對不對',
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

# 最少要移除幾個區間才不重疊：依結束時間排序
def erase_overlap(intervals):
    intervals.sort(key=lambda x: x[1])
    removed, prev_end = 0, float('-inf')
    for start, end in intervals:
        if start >= prev_end:
            prev_end = end
        else:
            removed += 1
    return removed

# 同時進行的最大數量（Meeting Rooms II）
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
  {
    id: 'math',
    name: '數學與幾何',
    english: 'Math & Geometry',
    summary: '矩陣旋轉與螺旋走訪、快速冪、數字的位數操作與溢位處理。',
    signals: [
      '矩陣原地旋轉、螺旋輸出',
      '次方、大數相乘',
      '字串轉數字、反轉數字',
    ],
    pitfalls: [
      '題目若限制 32 位元整數，Python 不會自動溢位，要自己檢查',
      '負數的整除與取餘數在 Python 行為不同（-7 // 2 == -4）',
    ],
    template: `# 順時針旋轉矩陣：轉置 + 每列反轉
def rotate(matrix):
    n = len(matrix)
    for i in range(n):
        for j in range(i + 1, n):
            matrix[i][j], matrix[j][i] = matrix[j][i], matrix[i][j]
    for row in matrix:
        row.reverse()

# 快速冪
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
  {
    id: 'bits',
    name: '位元運算',
    english: 'Bit Manipulation',
    summary: 'XOR 讓成對的數抵銷，x & (x - 1) 消掉最低位的 1。',
    signals: [
      '只出現一次的數字',
      '計算二進位中 1 的個數',
      '不能用加減號做加法',
    ],
    pitfalls: [
      'Python 整數沒有固定位數，負數要用 0xFFFFFFFF 遮罩',
      '位移運算的優先順序比加減低，記得加括號',
    ],
    template: `# x & (x - 1) 會消掉最低位的 1
def count_ones(n):
    count = 0
    while n:
        n &= n - 1
        count += 1
    return count

# XOR：成對的數會互相抵銷
def single_number(nums):
    ans = 0
    for x in nums:
        ans ^= x
    return ans

# Counting Bits：dp[i] = dp[i >> 1] + (i & 1)
def count_bits(n):
    dp = [0] * (n + 1)
    for i in range(1, n + 1):
        dp[i] = dp[i >> 1] + (i & 1)
    return dp
`,
  },
];

const PATTERN_MAP = new Map(PATTERNS.map((p) => [p.id, p]));

export function getPattern(id: PatternId): Pattern {
  const pattern = PATTERN_MAP.get(id);
  if (!pattern) throw new Error(`Unknown pattern: ${id}`);
  return pattern;
}

export const PATTERN_ORDER: PatternId[] = PATTERNS.map((p) => p.id);
