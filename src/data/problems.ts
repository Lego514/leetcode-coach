import type { PatternId } from './patterns';

export type Difficulty = 'Easy' | 'Medium' | 'Hard';

export interface Problem {
  id: number;
  slug: string;
  title: string;
  difficulty: Difficulty;
  pattern: PatternId;
  /** 需要 LeetCode Premium 才能在官方網站作答 */
  premium: boolean;
  /** 使用者自己新增的題目 */
  custom: boolean;
}

type Row = [id: number, slug: string, title: string, difficulty: 'E' | 'M' | 'H', pattern: PatternId];

const DIFFICULTY = { E: 'Easy', M: 'Medium', H: 'Hard' } as const;

/** 只能在 Premium 作答的題目 */
const PREMIUM = new Set([252, 253, 261, 269, 271, 285, 286, 323, 362, 588, 759, 1197, 1730]);

// 依 NeetCode 路線圖的模式順序排列；題目內容不收錄，只存連結用的資訊。
const ROWS: Row[] = [
  // 陣列與雜湊
  [217, 'contains-duplicate', 'Contains Duplicate', 'E', 'arrays'],
  [242, 'valid-anagram', 'Valid Anagram', 'E', 'arrays'],
  [1, 'two-sum', 'Two Sum', 'E', 'arrays'],
  [383, 'ransom-note', 'Ransom Note', 'E', 'arrays'],
  [169, 'majority-element', 'Majority Element', 'E', 'arrays'],
  [409, 'longest-palindrome', 'Longest Palindrome', 'E', 'arrays'],
  [14, 'longest-common-prefix', 'Longest Common Prefix', 'E', 'arrays'],
  [49, 'group-anagrams', 'Group Anagrams', 'M', 'arrays'],
  [347, 'top-k-frequent-elements', 'Top K Frequent Elements', 'M', 'arrays'],
  [271, 'encode-and-decode-strings', 'Encode and Decode Strings', 'M', 'arrays'],
  [238, 'product-of-array-except-self', 'Product of Array Except Self', 'M', 'arrays'],
  [36, 'valid-sudoku', 'Valid Sudoku', 'M', 'arrays'],
  [128, 'longest-consecutive-sequence', 'Longest Consecutive Sequence', 'M', 'arrays'],
  [189, 'rotate-array', 'Rotate Array', 'M', 'arrays'],
  [525, 'contiguous-array', 'Contiguous Array', 'M', 'arrays'],
  [560, 'subarray-sum-equals-k', 'Subarray Sum Equals K', 'M', 'arrays'],
  [380, 'insert-delete-getrandom-o1', 'Insert Delete GetRandom O(1)', 'M', 'arrays'],
  [31, 'next-permutation', 'Next Permutation', 'M', 'arrays'],
  [362, 'design-hit-counter', 'Design Hit Counter', 'M', 'arrays'],
  [41, 'first-missing-positive', 'First Missing Positive', 'H', 'arrays'],

  // 雙指標
  [125, 'valid-palindrome', 'Valid Palindrome', 'E', 'two-pointers'],
  [283, 'move-zeroes', 'Move Zeroes', 'E', 'two-pointers'],
  [977, 'squares-of-a-sorted-array', 'Squares of a Sorted Array', 'E', 'two-pointers'],
  [167, 'two-sum-ii-input-array-is-sorted', 'Two Sum II - Input Array Is Sorted', 'M', 'two-pointers'],
  [15, '3sum', '3Sum', 'M', 'two-pointers'],
  [16, '3sum-closest', '3Sum Closest', 'M', 'two-pointers'],
  [11, 'container-with-most-water', 'Container With Most Water', 'M', 'two-pointers'],
  [75, 'sort-colors', 'Sort Colors', 'M', 'two-pointers'],
  [42, 'trapping-rain-water', 'Trapping Rain Water', 'H', 'two-pointers'],

  // 滑動視窗
  [121, 'best-time-to-buy-and-sell-stock', 'Best Time to Buy and Sell Stock', 'E', 'sliding-window'],
  [3, 'longest-substring-without-repeating-characters', 'Longest Substring Without Repeating Characters', 'M', 'sliding-window'],
  [424, 'longest-repeating-character-replacement', 'Longest Repeating Character Replacement', 'M', 'sliding-window'],
  [567, 'permutation-in-string', 'Permutation in String', 'M', 'sliding-window'],
  [438, 'find-all-anagrams-in-a-string', 'Find All Anagrams in a String', 'M', 'sliding-window'],
  [76, 'minimum-window-substring', 'Minimum Window Substring', 'H', 'sliding-window'],
  [239, 'sliding-window-maximum', 'Sliding Window Maximum', 'H', 'sliding-window'],

  // 堆疊
  [20, 'valid-parentheses', 'Valid Parentheses', 'E', 'stack'],
  [232, 'implement-queue-using-stacks', 'Implement Queue using Stacks', 'E', 'stack'],
  [844, 'backspace-string-compare', 'Backspace String Compare', 'E', 'stack'],
  [155, 'min-stack', 'Min Stack', 'M', 'stack'],
  [150, 'evaluate-reverse-polish-notation', 'Evaluate Reverse Polish Notation', 'M', 'stack'],
  [22, 'generate-parentheses', 'Generate Parentheses', 'M', 'stack'],
  [739, 'daily-temperatures', 'Daily Temperatures', 'M', 'stack'],
  [853, 'car-fleet', 'Car Fleet', 'M', 'stack'],
  [394, 'decode-string', 'Decode String', 'M', 'stack'],
  [735, 'asteroid-collision', 'Asteroid Collision', 'M', 'stack'],
  [227, 'basic-calculator-ii', 'Basic Calculator II', 'M', 'stack'],
  [84, 'largest-rectangle-in-histogram', 'Largest Rectangle in Histogram', 'H', 'stack'],
  [224, 'basic-calculator', 'Basic Calculator', 'H', 'stack'],
  [895, 'maximum-frequency-stack', 'Maximum Frequency Stack', 'H', 'stack'],
  [32, 'longest-valid-parentheses', 'Longest Valid Parentheses', 'H', 'stack'],

  // 二分搜尋
  [704, 'binary-search', 'Binary Search', 'E', 'binary-search'],
  [278, 'first-bad-version', 'First Bad Version', 'E', 'binary-search'],
  [74, 'search-a-2d-matrix', 'Search a 2D Matrix', 'M', 'binary-search'],
  [875, 'koko-eating-bananas', 'Koko Eating Bananas', 'M', 'binary-search'],
  [153, 'find-minimum-in-rotated-sorted-array', 'Find Minimum in Rotated Sorted Array', 'M', 'binary-search'],
  [33, 'search-in-rotated-sorted-array', 'Search in Rotated Sorted Array', 'M', 'binary-search'],
  [981, 'time-based-key-value-store', 'Time Based Key-Value Store', 'M', 'binary-search'],
  [528, 'random-pick-with-weight', 'Random Pick with Weight', 'M', 'binary-search'],
  [658, 'find-k-closest-elements', 'Find K Closest Elements', 'M', 'binary-search'],
  [4, 'median-of-two-sorted-arrays', 'Median of Two Sorted Arrays', 'H', 'binary-search'],

  // 鏈結串列
  [206, 'reverse-linked-list', 'Reverse Linked List', 'E', 'linked-list'],
  [21, 'merge-two-sorted-lists', 'Merge Two Sorted Lists', 'E', 'linked-list'],
  [141, 'linked-list-cycle', 'Linked List Cycle', 'E', 'linked-list'],
  [876, 'middle-of-the-linked-list', 'Middle of the Linked List', 'E', 'linked-list'],
  [234, 'palindrome-linked-list', 'Palindrome Linked List', 'E', 'linked-list'],
  [143, 'reorder-list', 'Reorder List', 'M', 'linked-list'],
  [19, 'remove-nth-node-from-end-of-list', 'Remove Nth Node From End of List', 'M', 'linked-list'],
  [138, 'copy-list-with-random-pointer', 'Copy List with Random Pointer', 'M', 'linked-list'],
  [2, 'add-two-numbers', 'Add Two Numbers', 'M', 'linked-list'],
  [287, 'find-the-duplicate-number', 'Find the Duplicate Number', 'M', 'linked-list'],
  [146, 'lru-cache', 'LRU Cache', 'M', 'linked-list'],
  [24, 'swap-nodes-in-pairs', 'Swap Nodes in Pairs', 'M', 'linked-list'],
  [328, 'odd-even-linked-list', 'Odd Even Linked List', 'M', 'linked-list'],
  [148, 'sort-list', 'Sort List', 'M', 'linked-list'],
  [61, 'rotate-list', 'Rotate List', 'M', 'linked-list'],
  [23, 'merge-k-sorted-lists', 'Merge k Sorted Lists', 'H', 'linked-list'],
  [25, 'reverse-nodes-in-k-group', 'Reverse Nodes in k-Group', 'H', 'linked-list'],

  // 樹
  [226, 'invert-binary-tree', 'Invert Binary Tree', 'E', 'trees'],
  [104, 'maximum-depth-of-binary-tree', 'Maximum Depth of Binary Tree', 'E', 'trees'],
  [543, 'diameter-of-binary-tree', 'Diameter of Binary Tree', 'E', 'trees'],
  [110, 'balanced-binary-tree', 'Balanced Binary Tree', 'E', 'trees'],
  [100, 'same-tree', 'Same Tree', 'E', 'trees'],
  [101, 'symmetric-tree', 'Symmetric Tree', 'E', 'trees'],
  [572, 'subtree-of-another-tree', 'Subtree of Another Tree', 'E', 'trees'],
  [108, 'convert-sorted-array-to-binary-search-tree', 'Convert Sorted Array to Binary Search Tree', 'E', 'trees'],
  [235, 'lowest-common-ancestor-of-a-binary-search-tree', 'Lowest Common Ancestor of a Binary Search Tree', 'M', 'trees'],
  [236, 'lowest-common-ancestor-of-a-binary-tree', 'Lowest Common Ancestor of a Binary Tree', 'M', 'trees'],
  [102, 'binary-tree-level-order-traversal', 'Binary Tree Level Order Traversal', 'M', 'trees'],
  [103, 'binary-tree-zigzag-level-order-traversal', 'Binary Tree Zigzag Level Order Traversal', 'M', 'trees'],
  [199, 'binary-tree-right-side-view', 'Binary Tree Right Side View', 'M', 'trees'],
  [1448, 'count-good-nodes-in-binary-tree', 'Count Good Nodes in Binary Tree', 'M', 'trees'],
  [98, 'validate-binary-search-tree', 'Validate Binary Search Tree', 'M', 'trees'],
  [230, 'kth-smallest-element-in-a-bst', 'Kth Smallest Element in a BST', 'M', 'trees'],
  [285, 'inorder-successor-in-bst', 'Inorder Successor in BST', 'M', 'trees'],
  [105, 'construct-binary-tree-from-preorder-and-inorder-traversal', 'Construct Binary Tree from Preorder and Inorder Traversal', 'M', 'trees'],
  [113, 'path-sum-ii', 'Path Sum II', 'M', 'trees'],
  [437, 'path-sum-iii', 'Path Sum III', 'M', 'trees'],
  [662, 'maximum-width-of-binary-tree', 'Maximum Width of Binary Tree', 'M', 'trees'],
  [863, 'all-nodes-distance-k-in-binary-tree', 'All Nodes Distance K in Binary Tree', 'M', 'trees'],
  [124, 'binary-tree-maximum-path-sum', 'Binary Tree Maximum Path Sum', 'H', 'trees'],
  [297, 'serialize-and-deserialize-binary-tree', 'Serialize and Deserialize Binary Tree', 'H', 'trees'],

  // 字典樹
  [208, 'implement-trie-prefix-tree', 'Implement Trie (Prefix Tree)', 'M', 'tries'],
  [211, 'design-add-and-search-words-data-structure', 'Design Add and Search Words Data Structure', 'M', 'tries'],
  [212, 'word-search-ii', 'Word Search II', 'H', 'tries'],
  [336, 'palindrome-pairs', 'Palindrome Pairs', 'H', 'tries'],
  [588, 'design-in-memory-file-system', 'Design In-Memory File System', 'H', 'tries'],

  // 堆積
  [703, 'kth-largest-element-in-a-stream', 'Kth Largest Element in a Stream', 'E', 'heap'],
  [1046, 'last-stone-weight', 'Last Stone Weight', 'E', 'heap'],
  [973, 'k-closest-points-to-origin', 'K Closest Points to Origin', 'M', 'heap'],
  [215, 'kth-largest-element-in-an-array', 'Kth Largest Element in an Array', 'M', 'heap'],
  [621, 'task-scheduler', 'Task Scheduler', 'M', 'heap'],
  [355, 'design-twitter', 'Design Twitter', 'M', 'heap'],
  [692, 'top-k-frequent-words', 'Top K Frequent Words', 'M', 'heap'],
  [295, 'find-median-from-data-stream', 'Find Median from Data Stream', 'H', 'heap'],
  [632, 'smallest-range-covering-elements-from-k-lists', 'Smallest Range Covering Elements from K Lists', 'H', 'heap'],

  // 回溯
  [78, 'subsets', 'Subsets', 'M', 'backtracking'],
  [39, 'combination-sum', 'Combination Sum', 'M', 'backtracking'],
  [40, 'combination-sum-ii', 'Combination Sum II', 'M', 'backtracking'],
  [46, 'permutations', 'Permutations', 'M', 'backtracking'],
  [90, 'subsets-ii', 'Subsets II', 'M', 'backtracking'],
  [79, 'word-search', 'Word Search', 'M', 'backtracking'],
  [131, 'palindrome-partitioning', 'Palindrome Partitioning', 'M', 'backtracking'],
  [17, 'letter-combinations-of-a-phone-number', 'Letter Combinations of a Phone Number', 'M', 'backtracking'],
  [51, 'n-queens', 'N-Queens', 'H', 'backtracking'],
  [37, 'sudoku-solver', 'Sudoku Solver', 'H', 'backtracking'],

  // 圖
  [733, 'flood-fill', 'Flood Fill', 'E', 'graphs'],
  [200, 'number-of-islands', 'Number of Islands', 'M', 'graphs'],
  [695, 'max-area-of-island', 'Max Area of Island', 'M', 'graphs'],
  [133, 'clone-graph', 'Clone Graph', 'M', 'graphs'],
  [286, 'walls-and-gates', 'Walls and Gates', 'M', 'graphs'],
  [994, 'rotting-oranges', 'Rotting Oranges', 'M', 'graphs'],
  [542, '01-matrix', '01 Matrix', 'M', 'graphs'],
  [417, 'pacific-atlantic-water-flow', 'Pacific Atlantic Water Flow', 'M', 'graphs'],
  [130, 'surrounded-regions', 'Surrounded Regions', 'M', 'graphs'],
  [207, 'course-schedule', 'Course Schedule', 'M', 'graphs'],
  [210, 'course-schedule-ii', 'Course Schedule II', 'M', 'graphs'],
  [310, 'minimum-height-trees', 'Minimum Height Trees', 'M', 'graphs'],
  [261, 'graph-valid-tree', 'Graph Valid Tree', 'M', 'graphs'],
  [323, 'number-of-connected-components-in-an-undirected-graph', 'Number of Connected Components in an Undirected Graph', 'M', 'graphs'],
  [684, 'redundant-connection', 'Redundant Connection', 'M', 'graphs'],
  [721, 'accounts-merge', 'Accounts Merge', 'M', 'graphs'],
  [1730, 'shortest-path-to-get-food', 'Shortest Path to Get Food', 'M', 'graphs'],
  [1197, 'minimum-knight-moves', 'Minimum Knight Moves', 'M', 'graphs'],
  [127, 'word-ladder', 'Word Ladder', 'H', 'graphs'],
  [815, 'bus-routes', 'Bus Routes', 'H', 'graphs'],

  // 進階圖論
  [1584, 'min-cost-to-connect-all-points', 'Min Cost to Connect All Points', 'M', 'adv-graphs'],
  [743, 'network-delay-time', 'Network Delay Time', 'M', 'adv-graphs'],
  [787, 'cheapest-flights-within-k-stops', 'Cheapest Flights Within K Stops', 'M', 'adv-graphs'],
  [332, 'reconstruct-itinerary', 'Reconstruct Itinerary', 'H', 'adv-graphs'],
  [778, 'swim-in-rising-water', 'Swim in Rising Water', 'H', 'adv-graphs'],
  [269, 'alien-dictionary', 'Alien Dictionary', 'H', 'adv-graphs'],

  // 一維 DP
  [70, 'climbing-stairs', 'Climbing Stairs', 'E', 'dp-1d'],
  [746, 'min-cost-climbing-stairs', 'Min Cost Climbing Stairs', 'E', 'dp-1d'],
  [198, 'house-robber', 'House Robber', 'M', 'dp-1d'],
  [213, 'house-robber-ii', 'House Robber II', 'M', 'dp-1d'],
  [5, 'longest-palindromic-substring', 'Longest Palindromic Substring', 'M', 'dp-1d'],
  [647, 'palindromic-substrings', 'Palindromic Substrings', 'M', 'dp-1d'],
  [91, 'decode-ways', 'Decode Ways', 'M', 'dp-1d'],
  [322, 'coin-change', 'Coin Change', 'M', 'dp-1d'],
  [152, 'maximum-product-subarray', 'Maximum Product Subarray', 'M', 'dp-1d'],
  [139, 'word-break', 'Word Break', 'M', 'dp-1d'],
  [300, 'longest-increasing-subsequence', 'Longest Increasing Subsequence', 'M', 'dp-1d'],
  [416, 'partition-equal-subset-sum', 'Partition Equal Subset Sum', 'M', 'dp-1d'],
  [377, 'combination-sum-iv', 'Combination Sum IV', 'M', 'dp-1d'],
  [1235, 'maximum-profit-in-job-scheduling', 'Maximum Profit in Job Scheduling', 'H', 'dp-1d'],

  // 二維 DP
  [62, 'unique-paths', 'Unique Paths', 'M', 'dp-2d'],
  [1143, 'longest-common-subsequence', 'Longest Common Subsequence', 'M', 'dp-2d'],
  [309, 'best-time-to-buy-and-sell-stock-with-cooldown', 'Best Time to Buy and Sell Stock with Cooldown', 'M', 'dp-2d'],
  [518, 'coin-change-ii', 'Coin Change II', 'M', 'dp-2d'],
  [494, 'target-sum', 'Target Sum', 'M', 'dp-2d'],
  [97, 'interleaving-string', 'Interleaving String', 'M', 'dp-2d'],
  [72, 'edit-distance', 'Edit Distance', 'M', 'dp-2d'],
  [221, 'maximal-square', 'Maximal Square', 'M', 'dp-2d'],
  [329, 'longest-increasing-path-in-a-matrix', 'Longest Increasing Path in a Matrix', 'H', 'dp-2d'],
  [115, 'distinct-subsequences', 'Distinct Subsequences', 'H', 'dp-2d'],
  [312, 'burst-balloons', 'Burst Balloons', 'H', 'dp-2d'],
  [10, 'regular-expression-matching', 'Regular Expression Matching', 'H', 'dp-2d'],

  // 貪心
  [53, 'maximum-subarray', 'Maximum Subarray', 'M', 'greedy'],
  [55, 'jump-game', 'Jump Game', 'M', 'greedy'],
  [45, 'jump-game-ii', 'Jump Game II', 'M', 'greedy'],
  [134, 'gas-station', 'Gas Station', 'M', 'greedy'],
  [846, 'hand-of-straights', 'Hand of Straights', 'M', 'greedy'],
  [1899, 'merge-triplets-to-form-target-triplet', 'Merge Triplets to Form Target Triplet', 'M', 'greedy'],
  [763, 'partition-labels', 'Partition Labels', 'M', 'greedy'],
  [678, 'valid-parenthesis-string', 'Valid Parenthesis String', 'M', 'greedy'],
  [179, 'largest-number', 'Largest Number', 'M', 'greedy'],

  // 區間
  [252, 'meeting-rooms', 'Meeting Rooms', 'E', 'intervals'],
  [57, 'insert-interval', 'Insert Interval', 'M', 'intervals'],
  [56, 'merge-intervals', 'Merge Intervals', 'M', 'intervals'],
  [435, 'non-overlapping-intervals', 'Non-overlapping Intervals', 'M', 'intervals'],
  [253, 'meeting-rooms-ii', 'Meeting Rooms II', 'M', 'intervals'],
  [1851, 'minimum-interval-to-include-each-query', 'Minimum Interval to Include Each Query', 'H', 'intervals'],
  [759, 'employee-free-time', 'Employee Free Time', 'H', 'intervals'],

  // 數學與幾何
  [202, 'happy-number', 'Happy Number', 'E', 'math'],
  [66, 'plus-one', 'Plus One', 'E', 'math'],
  [13, 'roman-to-integer', 'Roman to Integer', 'E', 'math'],
  [9, 'palindrome-number', 'Palindrome Number', 'E', 'math'],
  [48, 'rotate-image', 'Rotate Image', 'M', 'math'],
  [54, 'spiral-matrix', 'Spiral Matrix', 'M', 'math'],
  [73, 'set-matrix-zeroes', 'Set Matrix Zeroes', 'M', 'math'],
  [50, 'powx-n', 'Pow(x, n)', 'M', 'math'],
  [43, 'multiply-strings', 'Multiply Strings', 'M', 'math'],
  [2013, 'detect-squares', 'Detect Squares', 'M', 'math'],
  [8, 'string-to-integer-atoi', 'String to Integer (atoi)', 'M', 'math'],

  // 位元運算
  [136, 'single-number', 'Single Number', 'E', 'bits'],
  [191, 'number-of-1-bits', 'Number of 1 Bits', 'E', 'bits'],
  [338, 'counting-bits', 'Counting Bits', 'E', 'bits'],
  [190, 'reverse-bits', 'Reverse Bits', 'E', 'bits'],
  [268, 'missing-number', 'Missing Number', 'E', 'bits'],
  [67, 'add-binary', 'Add Binary', 'E', 'bits'],
  [371, 'sum-of-two-integers', 'Sum of Two Integers', 'M', 'bits'],
  [7, 'reverse-integer', 'Reverse Integer', 'M', 'bits'],
];

export const BUILTIN_PROBLEMS: Problem[] = ROWS.map(([id, slug, title, d, pattern]) => ({
  id,
  slug,
  title,
  difficulty: DIFFICULTY[d],
  pattern,
  premium: PREMIUM.has(id),
  custom: false,
}));

export function leetcodeUrl(slug: string): string {
  return `https://leetcode.com/problems/${slug}/`;
}
