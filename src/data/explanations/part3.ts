// 回溯、圖、進階圖論、一維 DP

export const EXPLANATIONS_PART_3: Record<number, string> = {
  // Backtracking
  78: `The key insight is that every element is either in a subset or not, so the subsets form a binary decision tree.
So I use backtracking that records the current path at every node and tries adding each later element.
For example, [1, 2, 3] produces [], [1], [1, 2], [1, 2, 3], [1, 3], [2], [2, 3], and [3].
This takes O(n times 2^n) time because there are 2^n subsets of up to n elements, and O(n) recursion depth.
One edge case is an empty input, which still has one subset, the empty set.`,

  39: `The key insight is that each candidate can be reused, so after choosing one I stay at the same index instead of moving on.
So I use backtracking with a remaining target, recursing on index i again after picking candidates[i].
For example, with [2, 3, 6, 7] and target 7, I find [2, 2, 3] and [7].
This takes time exponential in target divided by the smallest candidate, and O(target / min) recursion depth.
One edge case is duplicate combinations in different orders, which I avoid by only moving forward through the candidates.`,

  40: `The key insight is that each number can be used once and the input has duplicates, so I must skip equal values at the same level of the tree.
So I sort first, then backtrack from index i + 1, skipping a candidate when it equals the previous one at the same level.
For example, with [10, 1, 2, 7, 6, 1, 5] and target 8, I get [1, 1, 6], [1, 2, 5], [1, 7], and [2, 6], each only once.
This takes exponential time in the worst case and O(n) recursion depth.
One edge case is stopping early once a candidate exceeds the remaining target, which sorting makes safe.`,

  46: `The key insight is that a permutation picks one unused element for each position.
So I use backtracking with a used array, adding an element, recursing, and then removing it.
For example, [1, 2, 3] produces six permutations, starting with [1, 2, 3] and [1, 3, 2].
This takes O(n times n!) time and O(n) space besides the output.
One edge case is a single element, which gives exactly one permutation.`,

  90: `The key insight is that this is Subsets with duplicates, so I skip equal values at the same level to avoid repeated subsets.
So I sort the input, then backtrack, skipping nums[i] when it equals nums[i - 1] and i is past the level's start.
For example, [1, 2, 2] gives [], [1], [1, 2], [1, 2, 2], [2], and [2, 2], with no repeats.
This takes O(n times 2^n) time and O(n) recursion depth.
One edge case is an input that's all duplicates, like [2, 2, 2], which gives n + 1 subsets.`,

  79: `The key insight is that from each cell I can try to continue the word in four directions, and I must not reuse a cell.
So I use DFS from every cell, temporarily marking the cell as visited and restoring it when I backtrack.
For example, "ABCCED" can be traced through adjacent cells in the classic board.
This takes O(m times n times 3^L) time, since each step has at most three new directions, and O(L) recursion depth.
One edge case is pruning early: if a letter doesn't match, I stop that path immediately.`,

  131: `The key insight is that I cut the string at every position where the piece so far is a palindrome, then solve the rest.
So I use backtracking that tries every end index, checking the piece with two pointers or a precomputed palindrome table.
For example, "aab" gives [["a", "a", "b"], ["aa", "b"]].
This takes O(n times 2^n) time in the worst case and O(n) recursion depth.
One edge case is a string of identical letters, which is the worst case because every cut is valid.`,

  17: `The key insight is that each digit maps to a few letters, and I pick one letter per digit.
So I use backtracking over the digits with a map from digit to letters.
For example, "23" gives "ad", "ae", "af", "bd", and so on, nine combinations in total.
This takes O(4^n times n) time because 7 and 9 have four letters, and O(n) recursion depth.
One edge case is an empty input string, which returns an empty list rather than [""].`,

  51: `The key insight is that each row holds exactly one queen, so I place queens row by row and only check columns and diagonals.
So I use backtracking with three sets: columns, row minus column diagonals, and row plus column anti-diagonals.
For example, with n = 4 there are two solutions, including queens at columns 1, 3, 0, 2.
This takes O(n!) time in the worst case and O(n) space for the sets.
One edge case is n = 2 or 3, which have no solutions.`,

  37: `The key insight is that I fill one empty cell at a time with a digit that doesn't break any rule, and undo it when I get stuck.
So I use backtracking with row, column, and box sets so each check is O(1).
For example, if a cell can only be 4, I place it and move on; if a later cell has no options, I go back and try another digit.
This is exponential in the worst case but fast in practice, and space is O(81).
One edge case is picking the cell with the fewest options first, which is an optional speedup.`,

  // Graphs
  733: `The key insight is that I only need to repaint cells connected to the start that have the original color.
So I use DFS or BFS from the start cell, spreading to neighbors with the same original color.
For example, starting in the middle of a region of 1s, every connected 1 becomes the new color.
This takes O(m times n) time and O(m times n) space in the worst case.
One edge case is when the new color equals the original, where I return right away to avoid an infinite loop.`,

  200: `The key insight is that each island is a connected group of land, so I count how many times I start a new search.
So I scan the grid and, for every unvisited "1", run DFS or BFS to sink the whole island and add one to the count.
For example, a grid with two separate blobs of 1s gives 2.
This takes O(m times n) time and O(m times n) space in the worst case for recursion or the queue.
One edge case is diagonal cells, which don't count as connected.`,

  695: `The key insight is that this is Number of Islands, except each search returns the size of its island.
So I use DFS that returns 1 plus the sizes from its four neighbors, and I keep the maximum.
For example, if the largest connected group of 1s has 6 cells, the answer is 6.
This takes O(m times n) time and O(m times n) space.
One edge case is a grid with no land, which returns 0.`,

  133: `The key insight is that a graph can have cycles, so I need to remember which nodes I've already copied.
So I use DFS with a hash map from original node to copy, creating a copy before visiting its neighbors.
For example, in a square graph of 4 nodes, every neighbor list in the copy points to copied nodes, not originals.
This takes O(V + E) time and O(V) space.
One edge case is an empty graph, where the input node is null.`,

  286: `The key insight is that the distance from the nearest gate is found by running BFS from all gates at once.
So I use multi-source BFS: put every gate in the queue and fill each empty room the first time it's reached.
For example, a room two steps from one gate and five from another gets 2.
This takes O(m times n) time and O(m times n) space.
One edge case is walls and rooms no gate can reach, which stay as they are.`,

  994: `The key insight is that rot spreads one step per minute from every rotten orange at once, which is exactly BFS by levels.
So I use multi-source BFS starting from all rotten oranges and count the fresh ones as they rot.
For example, in the classic grid, the last fresh orange rots at minute 4.
This takes O(m times n) time and O(m times n) space.
One edge case is fresh oranges that can't be reached, which means I return -1; with no fresh oranges at all, the answer is 0.`,

  542: `The key insight is that each cell's distance to the nearest 0 comes from BFS started at all the 0s together.
So I use multi-source BFS, setting 1s to a large value and updating them the first time a shorter distance reaches them.
For example, a 1 surrounded by 0s gets 1, and a 1 surrounded by 1s gets 2 or more.
This takes O(m times n) time and O(m times n) space; a two-pass DP also works.
One edge case is that every cell is reachable, since the problem guarantees at least one 0.`,

  417: `The key insight is that searching uphill from each ocean is easier than checking every cell's downhill path.
So I run DFS or BFS from the Pacific border and from the Atlantic border, moving to neighbors at least as high, and return cells reached by both.
For example, a mountain peak near the middle can drain to both oceans, so it's in the answer.
This takes O(m times n) time and O(m times n) space.
One edge case is the corner cells, which touch both oceans directly.`,

  130: `The key insight is that an O region survives only if it touches the border, so I mark those first.
So I run DFS from every border O and mark it safe, then flip all remaining O to X and restore the safe ones.
For example, an O in the middle surrounded by X is captured, but an O on the edge isn't.
This takes O(m times n) time and O(m times n) space.
One edge case is a board with fewer than three rows or columns, where every cell is on the border.`,

  207: `The key insight is that courses can all be finished exactly when the prerequisite graph has no cycle.
So I use topological sort with Kahn's algorithm: compute indegrees, start with courses that have none, and remove edges as I go.
For example, with 1 requiring 0 and 0 requiring 1, both have indegree 1, nothing can start, and I return false.
This takes O(V + E) time and O(V + E) space.
One edge case is courses with no prerequisites, which start in the queue; if the number processed is less than numCourses, there's a cycle.`,

  210: `The key insight is that this is Course Schedule, except I record the order in which courses come off the queue.
So I use Kahn's algorithm and append each course as its indegree drops to zero.
For example, with 4 courses and prerequisites [1, 0], [2, 0], [3, 1], [3, 2], one valid order is [0, 1, 2, 3].
This takes O(V + E) time and O(V + E) space.
One edge case is a cycle, where the order is shorter than numCourses, so I return an empty list.`,

  310: `The key insight is that the best roots are the centers of the tree, which I reach by peeling off leaves layer by layer.
So I repeatedly remove all current leaves until one or two nodes remain.
For example, with a path 0, 1, 2, 3, the centers are 1 and 2.
This takes O(n) time and O(n) space.
One edge case is n = 1, where the only node is the answer.`,

  261: `The key insight is that a graph is a tree exactly when it has n minus 1 edges and is connected, which means it also has no cycle.
So I check the edge count, then use union-find, returning false if any edge joins two nodes already in the same set.
For example, with 5 nodes and edges forming a star, there are 4 edges and no cycle, so it's a valid tree.
This takes O(n times alpha(n)) time and O(n) space.
One edge case is the wrong number of edges, which I check first to rule out extra or missing edges.`,

  323: `The key insight is that each union that joins two different sets reduces the number of components by one.
So I start with n components and use union-find with path compression, subtracting one for every successful union.
For example, with 5 nodes and edges [0, 1], [1, 2], [3, 4], there are 2 components.
This takes O(E times alpha(n)) time and O(n) space; DFS works equally well.
One edge case is isolated nodes, which each count as a component.`,

  684: `The key insight is that the extra edge is the first one that connects two nodes that are already connected.
So I use union-find and return the first edge whose endpoints already share a root.
For example, with edges [1, 2], [1, 3], [2, 3], the edge [2, 3] closes the cycle.
This takes O(n times alpha(n)) time and O(n) space.
One edge case is that the problem wants the last such edge in the input, which union-find gives naturally because it processes edges in order.`,

  721: `The key insight is that accounts sharing any email belong to the same person, so emails are connected components.
So I use union-find over emails, uniting all emails within each account, then group emails by root and sort them.
For example, two "John" accounts that share one email merge into a single account with all their emails.
This takes O(N log N) time for N emails, because of the sorting, and O(N) space.
One edge case is two different people with the same name, who stay separate because they share no email.`,

  1730: `The key insight is that the shortest path on a grid with equal step costs is found by BFS.
So I start BFS from the person and return the number of steps when I first reach any food cell.
For example, if the nearest food is three open cells away, the answer is 3.
This takes O(m times n) time and O(m times n) space.
One edge case is food that's blocked off by obstacles, which returns -1.`,

  1197: `The key insight is that the board is symmetric, so I can move the target into the first quadrant and search with BFS.
So I use BFS from (0, 0) with the eight knight moves and a visited set, allowing a small margin around the axes.
For example, reaching (2, 1) takes 1 move, and (5, 5) takes 4.
This takes O(max(x, y)^2) time and space.
One edge case is targets near the origin like (1, 1), which need a detour through negative coordinates, so I allow coordinates down to -2.`,

  127: `The key insight is that each word is a node and one-letter changes are edges, so the shortest transformation is BFS.
So I use BFS from the begin word, generating neighbors by trying every letter at every position and removing words from the set once visited.
For example, "hit" to "cog" goes hit, hot, dot, dog, cog, which is 5 words.
This takes O(n times L times 26) time and O(n) space.
One edge case is an end word that isn't in the list, which returns 0.`,

  815: `The key insight is that I care about the number of buses, not stops, so buses should be the BFS layers.
So I map each stop to the buses that serve it and run BFS where each step boards a new bus and reaches all its stops.
For example, with routes [1, 2, 7] and [3, 6, 7], going from 1 to 6 takes 2 buses, changing at 7.
This takes O(total stops across routes) time and space.
One edge case is source equal to target, which needs 0 buses.`,

  // Advanced Graphs
  1584: `The key insight is that connecting all points at minimum cost is a minimum spanning tree on a complete graph.
So I use Prim's algorithm, keeping the cheapest known distance to every point outside the tree, which fits a dense graph.
For example, with five points, I repeatedly add the closest outside point and update distances by Manhattan distance.
This takes O(n^2) time and O(n) space; Kruskal with sorting all edges is O(n^2 log n).
One edge case is a single point, which costs 0.`,

  743: `The key insight is that the signal reaches each node along its shortest path, and the answer is the largest of those.
So I use Dijkstra's algorithm with a min-heap because all edge weights are non-negative.
For example, starting from node 2 in the classic example, every node is reached within 2 units, so the answer is 2.
This takes O(E log V) time and O(V + E) space.
One edge case is a node that's never reached, which returns -1.`,

  787: `The key insight is that the limit on stops changes the problem, so I relax edges one layer of flights at a time.
So I use Bellman-Ford for k + 1 rounds, copying the distance array each round so a round only adds one flight.
For example, a cheaper route with two stops isn't allowed when k = 1, so I take the one-stop route.
This takes O(k times E) time and O(n) space.
One edge case is an unreachable destination, which returns -1.`,

  332: `The key insight is that the itinerary uses every ticket exactly once, which is an Eulerian path.
So I use Hierholzer's algorithm with destinations in sorted order, taking the smallest one first and adding airports to the route as I backtrack.
For example, from "JFK" with tickets to "ATL" and "SFO", I try "ATL" first because it's lexically smaller.
This takes O(E log E) time for sorting and O(E) space.
One edge case is a dead end reached too early, which the post-order approach handles by adding it to the end of the route.`,

  778: `The key insight is that I want the path whose highest cell is as low as possible.
So I use Dijkstra with a min-heap, where the cost of a path is the maximum elevation along it.
For example, in a 2 by 2 grid of [[0, 2], [1, 3]], the answer is 3, because I have to wait until I can stand on the last cell.
This takes O(n^2 log n) time and O(n^2) space.
One edge case is a 1 by 1 grid, whose answer is its only value.`,

  269: `The key insight is that comparing adjacent words gives letter-order edges at the first position where they differ.
So I build a graph from those differences and run a topological sort.
For example, "wrt" before "wrf" means t comes before f.
This takes O(C) time where C is the total characters, and O(1) space for at most 26 letters.
One edge case is a longer word listed before its own prefix, like "abc" before "ab", which is invalid, so I return "".`,

  // 1-D Dynamic Programming
  70: `The key insight is that the last move is either one step or two steps, so ways(n) equals ways(n - 1) plus ways(n - 2).
So I use two variables, like Fibonacci, because each step only needs the previous two values.
For example, n = 4 gives 5 ways.
This takes O(n) time and O(1) space.
One edge case is n = 1, which has exactly one way.`,

  746: `The key insight is that the cheapest way to reach step i comes from step i - 1 or step i - 2.
So I use DP where dp[i] is cost[i] plus the minimum of the previous two, keeping just two variables.
For example, with [10, 15, 20], the best is to start at 15 and jump to the top, which costs 15.
This takes O(n) time and O(1) space.
One edge case is that the top is one past the last step, so I return the minimum of the last two values.`,

  198: `The key insight is that for each house I either rob it and add the best total from two houses back, or skip it and keep the previous best.
So I use DP with two variables for the best totals ending one and two houses back.
For example, with [2, 7, 9, 3, 1], robbing houses with 2, 9, and 1 gives 12.
This takes O(n) time and O(1) space.
One edge case is a single house, which I simply rob.`,

  213: `The key insight is that the first and last houses are neighbors, so I can't rob both, which gives me two cases.
So I run the House Robber DP twice, once without the first house and once without the last, and take the better result.
For example, with [2, 3, 2], the answer is 3, because robbing both 2s isn't allowed.
This takes O(n) time and O(1) space.
One edge case is a single house, which has to be handled separately because both cases would be empty.`,

  5: `The key insight is that every palindrome grows outward from a center, and there are 2n - 1 centers, counting the gaps between letters.
So I expand around each center while the characters on both sides match, and I keep the longest one.
For example, with "babad", expanding around the "a" at index 1 gives "bab".
This takes O(n^2) time and O(1) space.
One edge case is even-length palindromes like "bb", which is why I also expand from the gap between two letters.`,

  647: `The key insight is that every palindrome has a center, so I count palindromes by expanding around each of the 2n - 1 centers.
So I expand while the ends match and add one for each step.
For example, "aaa" has 6 palindromic substrings: three single letters, two "aa", and one "aaa".
This takes O(n^2) time and O(1) space.
One edge case is that each single letter counts, so the answer is always at least n.`,

  91: `The key insight is that the last digit decodes on its own if it isn't 0, and the last two digits decode together if they're between 10 and 26.
So I use DP where dp[i] adds dp[i - 1] for a valid single digit and dp[i - 2] for a valid pair.
For example, "226" has 3 decodings: 2 2 6, 22 6, and 2 26.
This takes O(n) time and O(1) space with two variables.
One edge case is zeros, like "06" or "100", where a 0 can only be part of a 10 or 20.`,

  322: `The key insight is that the fewest coins for an amount is one plus the fewest coins for that amount minus some coin.
So I use bottom-up DP from 0 to the amount, trying every coin at each step.
For example, with coins [1, 2, 5] and amount 11, the answer is 3, using 5 plus 5 plus 1.
This takes O(amount times number of coins) time and O(amount) space.
One edge case is an amount that can't be made, which I mark with infinity and return as -1.`,

  152: `The key insight is that a negative number flips the smallest product into the largest, so I track both a running max and a running min.
So at each number I compute the new max and min from the number itself, the previous max times it, and the previous min times it.
For example, with [2, 3, -2, 4], the best is 2 times 3, which is 6; with [-2, 3, -4], it's the whole array, which is 24.
This takes O(n) time and O(1) space.
One edge case is a zero, which resets both products because the number alone becomes the new start.`,

  139: `The key insight is that the prefix up to i can be split when some earlier split point j is valid and s[j:i] is a dictionary word.
So I use DP over prefixes with the dictionary in a hash set.
For example, "leetcode" works because "leet" is valid and "code" is a word.
This takes O(n^2) time, or O(n times max word length) if I only try word-sized pieces, and O(n) space.
One edge case is the empty prefix, which I mark as valid to start the DP.`,

  300: `The key insight is that for each length, I only need to remember the smallest possible tail of an increasing subsequence of that length.
So I keep a sorted tails array and binary search where each number goes, replacing the first tail that is at least as large.
For example, [10, 9, 2, 5, 3, 7, 101, 18] ends with tails of length 4, so the answer is 4.
This takes O(n log n) time and O(n) space; the simpler DP is O(n^2).
One edge case is duplicates, which don't extend the sequence because it must be strictly increasing, so I use lower bound.`,

  416: `The key insight is that I need a subset summing to half the total, which is a 0/1 knapsack.
So I use a boolean DP of reachable sums and iterate sums from high to low so each number is used once.
For example, [1, 5, 11, 5] totals 22, and 11 is reachable with 11, or with 1 plus 5 plus 5.
This takes O(n times sum) time and O(sum) space.
One edge case is an odd total, which can't be split evenly, so I return false right away.`,

  377: `The key insight is that order matters here, so these are really permutations: the last number chosen can be any of them.
So I use DP where dp[t] is the sum of dp[t - num] over every num, with the target loop on the outside.
For example, with [1, 2, 3] and target 4, there are 7 ordered combinations.
This takes O(target times n) time and O(target) space.
One edge case is dp[0] = 1, meaning there's one way to make zero: pick nothing.`,

  1235: `The key insight is that after sorting jobs by end time, the best profit at each job either skips it or takes it plus the best profit that ended before it started.
So I sort by end time and binary search for the last compatible job, keeping DP over job indices.
For example, taking jobs worth 50 and 70 that don't overlap can beat one job worth 100 that overlaps both.
This takes O(n log n) time and O(n) space.
One edge case is a job that starts exactly when another ends, which counts as compatible.`,
};
