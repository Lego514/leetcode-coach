// 二分搜尋、鏈結串列、樹、字典樹、堆積

export const EXPLANATIONS_PART_2: Record<number, string> = {
  // Binary Search
  704: `The key insight is that in a sorted array, comparing with the middle value rules out half of the remaining range.
So I use binary search with left and right bounds and move one bound past the middle each time.
For example, searching for 9 in [-1, 0, 3, 5, 9, 12], the middle is 3, which is too small, so I search the right half and find 9 at index 4.
This takes O(log n) time and O(1) space.
One edge case is a target that isn't present, where the bounds cross and I return -1; I compute the middle as left + (right - left) / 2 to avoid overflow.`,

  278: `The key insight is that versions are good and then bad, so the first bad version is a boundary I can binary search for.
So I use binary search that keeps the right bound on a bad version and moves left past good ones.
For example, with n = 5 and the first bad version 4, I check 3, which is good, then 4, which is bad, and the bounds meet at 4.
This takes O(log n) calls to isBadVersion and O(1) space.
One edge case is the very first version being bad, which the loop still finds because right can reach 1.`,

  74: `The key insight is that the rows are sorted and each row starts after the previous one ends, so the matrix is one sorted list.
So I binary search over indices 0 to m times n minus 1 and convert each index to row = i / n and column = i % n.
For example, in a 3 by 4 matrix, index 5 is row 1, column 1.
This takes O(log(m times n)) time and O(1) space.
One edge case is an empty matrix or empty rows, which I check before searching.`,

  875: `The key insight is that if Koko can finish at speed k, she can finish at any faster speed, so the answer is a boundary on speed.
So I binary search the speed between 1 and the largest pile, and for each speed add up the ceiling of pile over speed.
For example, with piles [3, 6, 7, 11] and h = 8, speed 4 takes 1 + 2 + 2 + 3 = 8 hours, and speed 3 takes 10, so the answer is 4.
This takes O(n log m) time, where m is the largest pile, and O(1) space.
One edge case is h equal to the number of piles, where the answer is the largest pile.`,

  153: `The key insight is that comparing the middle value with the right end tells me which half contains the rotation point.
So I use binary search: if mid is greater than the right value, the minimum is to the right; otherwise it's at mid or to the left.
For example, with [3, 4, 5, 1, 2], the middle 5 is greater than 2, so I search the right side and find 1.
This takes O(log n) time and O(1) space.
One edge case is an array that isn't rotated at all, where the loop keeps moving left and returns the first element.`,

  33: `The key insight is that at least one half around the middle is always sorted, and I can check whether the target falls inside it.
So I use binary search: find the sorted half, then keep that half if the target is in its range and otherwise search the other half.
For example, looking for 0 in [4, 5, 6, 7, 0, 1, 2], the left half 4 to 7 is sorted but doesn't contain 0, so I go right.
This takes O(log n) time and O(1) space.
One edge case is a two-element range, where the comparisons need to use less-than-or-equal on the left bound.`,

  981: `The key insight is that timestamps for each key arrive in increasing order, so each key's list is already sorted.
So I use a map from key to a list of (timestamp, value) pairs and binary search for the last timestamp that is at most the query.
For example, after setting foo at times 1 and 4, get(foo, 3) finds time 1 and returns its value.
Set is O(1), get is O(log n), and space is O(total sets).
One edge case is a query earlier than every timestamp, which returns an empty string.`,

  528: `The key insight is that if I lay the weights end to end, a random point on that line lands in each index with probability proportional to its weight.
So I build prefix sums of the weights and binary search for the first prefix sum greater than a random number.
For example, with weights [1, 3], the prefixes are [1, 4], and a random value in [0, 4) lands in index 1 three quarters of the time.
Setup is O(n), each pick is O(log n), and space is O(n).
One edge case is off-by-one at the boundaries, so I pick a random integer from 1 to the total and search for the first prefix at least that large.`,

  658: `The key insight is that the answer is a contiguous window of size k in the sorted array, so I only need to find where it starts.
So I binary search the start between 0 and n minus k, comparing x minus arr[mid] with arr[mid + k] minus x to decide which way to move.
For example, with [1, 2, 3, 4, 5], k = 4, and x = 3, the window starts at 0 and gives [1, 2, 3, 4], because ties prefer the smaller values.
This takes O(log(n - k) + k) time and O(1) extra space.
One edge case is x outside the array's range, where the window simply ends up at one end.`,

  4: `The key insight is that the median splits all the numbers into two equal halves, so I binary search where to cut the shorter array.
So I pick a cut in the smaller array, which forces the cut in the other one, and check that both left maximums are at most both right minimums.
For example, with [1, 3] and [2], cutting after 1 and after 2 gives left {1, 2} and right {3}, so the median is 2.
This takes O(log(min(m, n))) time and O(1) space.
One edge case is a cut at an end of an array, where I treat the missing side as negative or positive infinity.`,

  // Linked List
  206: `The key insight is that reversing a list just means pointing each node back at the node before it.
So I walk the list with previous and current pointers, saving next before I redirect current.next.
For example, 1 to 2 to 3 becomes 3 to 2 to 1, and previous ends at the new head, 3.
This takes O(n) time and O(1) space iteratively; the recursive version uses O(n) stack.
One edge case is an empty list or a single node, which returns as is.`,

  21: `The key insight is that the smaller of the two current heads is always the next node in the merged list.
So I use a dummy head and a tail pointer, attaching the smaller node each time.
For example, merging 1, 2, 4 with 1, 3, 4 gives 1, 1, 2, 3, 4, 4.
This takes O(m + n) time and O(1) space because I reuse the existing nodes.
One edge case is one list running out first, where I attach the rest of the other list in one step.`,

  141: `The key insight is that if there's a cycle, a fast pointer moving two steps will eventually lap a slow pointer moving one.
So I use Floyd's tortoise and hare with two pointers, which needs no extra memory.
For example, in a list where the tail points back to the second node, the pointers meet inside the loop.
This takes O(n) time and O(1) space.
One edge case is fast reaching null, which means there's no cycle, so I check fast and fast.next before each step.`,

  876: `The key insight is that when a fast pointer moving two steps reaches the end, a slow pointer moving one step is halfway.
So I use slow and fast pointers because that finds the middle in one pass.
For example, with 1 to 5, slow stops at 3; with 1 to 6, it stops at 4, the second middle.
This takes O(n) time and O(1) space.
One edge case is an even length, where the loop condition decides which middle I return, and here it's the second.`,

  234: `The key insight is that I can compare the first half with the reversed second half.
So I find the middle with slow and fast pointers, reverse the second half in place, and walk both halves together.
For example, 1, 2, 2, 1 splits into 1, 2 and the reversed 1, 2, which match.
This takes O(n) time and O(1) space.
One edge case is an odd length, where the middle node doesn't need a partner; I can also reverse back afterwards to restore the list.`,

  143: `The key insight is that the new order alternates between the front and the back, which is the first half merged with the reversed second half.
So I find the middle, reverse the second half, and then interleave the two lists.
For example, 1, 2, 3, 4, 5 becomes 1, 5, 2, 4, 3.
This takes O(n) time and O(1) space.
One edge case is cutting the list at the middle so the first half ends with null, otherwise the result has a cycle.`,

  19: `The key insight is that if one pointer starts n nodes ahead, it reaches the end exactly when the other is just before the node to remove.
So I use a dummy head and two pointers with a gap of n, then move both until the lead pointer hits the end.
For example, removing the 2nd from the end of 1, 2, 3, 4, 5 unlinks 4.
This takes O(n) time in one pass and O(1) space.
One edge case is removing the head itself, which the dummy node handles cleanly.`,

  138: `The key insight is that I need a way to find the copy of any node, so I can wire up both next and random pointers.
So I use a hash map from original node to its copy, making all copies in one pass and wiring pointers in a second.
For example, if node A's random points to C, then copy(A).random is map[C].
This takes O(n) time and O(n) space; interleaving copies into the list brings the space down to O(1).
One edge case is a null random pointer, which should stay null in the copy.`,

  2: `The key insight is that the digits are stored in reverse, so adding from the head is the same as adding from the ones place.
So I walk both lists at once, add the digits plus a carry, and append each result digit to a new list.
For example, 342 plus 465 is stored as 2, 4, 3 and 5, 6, 4, and gives 7, 0, 8, which is 807.
This takes O(max(m, n)) time and O(max(m, n)) space for the result.
One edge case is a final carry, like 5 plus 5, which adds an extra node with 1.`,

  287: `The key insight is that if I treat each value as a pointer to an index, the duplicate is the entrance to a cycle.
So I use Floyd's cycle detection: find where slow and fast meet, then move one pointer to the start and advance both one step until they meet again.
For example, with [1, 3, 4, 2, 2], following indices leads to a loop that enters at 2.
This takes O(n) time and O(1) space without modifying the array.
One edge case is a value repeated many times, which still forms a single cycle entrance at that value.`,

  146: `The key insight is that I need O(1) lookup and O(1) reordering, so I combine a hash map with a doubly linked list.
So the map points from key to node, and the list keeps nodes from most to least recently used, with dummy head and tail.
For example, with capacity 2, after putting 1 and 2 and reading 1, putting 3 evicts 2, because 2 is now the least recently used.
Get and put are both O(1), and space is O(capacity).
One edge case is updating an existing key, which should change its value and move it to the front without evicting anything.`,

  24: `The key insight is that each step only rewires three pointers: the node before the pair and the two nodes in it.
So I use a dummy head and a previous pointer, swap each pair, and move previous forward by two.
For example, 1, 2, 3, 4 becomes 2, 1, 4, 3.
This takes O(n) time and O(1) space.
One edge case is an odd length, where the last node stays in place.`,

  328: `The key insight is that I can split the list into odd-position and even-position chains in one pass and join them.
So I keep an odd tail, an even tail, and the even head, advancing both tails by skipping every other node.
For example, 1, 2, 3, 4, 5 becomes 1, 3, 5, 2, 4.
This takes O(n) time and O(1) space.
One edge case is stopping when the even tail or its next is null, so I don't lose the end of the list.`,

  148: `The key insight is that merge sort fits linked lists well, because merging needs no random access and no extra array.
So I split the list at the middle with slow and fast pointers, sort each half recursively, and merge them.
For example, 4, 2, 1, 3 splits into 4, 2 and 1, 3, which sort to 2, 4 and 1, 3 and merge into 1, 2, 3, 4.
This takes O(n log n) time and O(log n) recursion depth; a bottom-up version uses O(1) space.
One edge case is splitting a two-node list, where the middle must be the first node or the recursion never ends.`,

  61: `The key insight is that rotating by k just picks a new head: the node k positions from the end.
So I find the length and the tail, connect the tail to the head to make a ring, and break it at length minus k mod length.
For example, rotating 1, 2, 3, 4, 5 by 2 gives 4, 5, 1, 2, 3.
This takes O(n) time and O(1) space.
One edge case is k being a multiple of the length, where the list doesn't change.`,

  23: `The key insight is that the next node in the merged list is always the smallest current head among the k lists.
So I use a min-heap of size k keyed by node value, popping the smallest and pushing its next.
For example, with heads 1, 1, and 2, I pop a 1, push its successor, and repeat until the heap is empty.
This takes O(N log k) time for N total nodes, and O(k) space for the heap.
One edge case is empty lists in the input, which I skip when building the heap; merging pairs divide-and-conquer style is an equally good answer.`,

  25: `The key insight is that each group of k nodes is a small reverse-the-list problem, followed by reconnecting it to the rest.
So I use a dummy head, check that k nodes remain, reverse them, and link the previous group's tail to the new group head.
For example, with 1, 2, 3, 4, 5 and k = 2, the result is 2, 1, 4, 3, 5.
This takes O(n) time and O(1) space.
One edge case is the last group having fewer than k nodes, which stays in its original order.`,

  // Trees
  226: `The key insight is that inverting a tree means swapping the left and right child at every node.
So I use recursion: swap the children, then invert each subtree.
For example, a root 4 with children 2 and 7 becomes 4 with 7 on the left and 2 on the right, all the way down.
This takes O(n) time and O(h) space for the recursion, where h is the height.
One edge case is an empty tree, which returns null.`,

  104: `The key insight is that a tree's depth is one more than the deeper of its two subtrees.
So I use recursive depth-first search that returns 1 plus the maximum of the left and right depths.
For example, a root with a left leaf and a right child that has one more child has depth 3.
This takes O(n) time and O(h) space.
One edge case is an empty tree, which has depth 0; level-order BFS counting levels is an equally good answer.`,

  543: `The key insight is that the longest path through a node is its left height plus its right height.
So I use DFS that returns each subtree's height while updating a global best with left plus right.
For example, in a tree where the longest path goes 4, 2, 1, 3, the diameter is 3 edges.
This takes O(n) time and O(h) space.
One edge case is that the longest path may not pass through the root, which is why I check every node.`,

  110: `The key insight is that I can compute heights and check balance in the same bottom-up pass.
So I use DFS that returns a subtree's height, or -1 as soon as any subtree is unbalanced.
For example, if a node's left height is 3 and its right height is 1, the difference is more than 1, so it returns -1.
This takes O(n) time and O(h) space, compared with O(n^2) if I recompute heights at every node.
One edge case is an empty tree, which is balanced.`,

  100: `The key insight is that two trees are the same when their roots match and both pairs of subtrees are the same.
So I use recursion that compares values and recurses on left with left and right with right.
For example, [1, 2, 3] and [1, 2, 3] match, but [1, 2] and [1, null, 2] don't, because the shapes differ.
This takes O(n) time and O(h) space.
One edge case is null nodes: both null is a match, and exactly one null is a mismatch.`,

  101: `The key insight is that a tree is symmetric when its left subtree mirrors its right subtree.
So I use a helper that compares a node with its mirror partner: left's left against right's right, and left's right against right's left.
For example, [1, 2, 2, 3, 4, 4, 3] is symmetric, but [1, 2, 2, null, 3, null, 3] isn't.
This takes O(n) time and O(h) space.
One edge case is an empty tree, which counts as symmetric.`,

  572: `The key insight is that a subtree match must start at some node, so I check "same tree" at every node of the main tree.
So I use DFS over the main tree and call a sameTree helper at each node.
For example, if the main tree contains a node 4 with children 1 and 2, and the target is exactly that, I return true.
This takes O(m times n) time in the worst case and O(h) space; serializing both trees and using string matching gets it to O(m + n).
One edge case is a partial match, where extra descendants below the matching node mean it's not a subtree.`,

  108: `The key insight is that picking the middle element as the root keeps the two sides equal in size, so the tree stays balanced.
So I use recursion on index ranges, making the middle the root and building each half as a child.
For example, [-10, -3, 0, 5, 9] makes 0 the root, with -3 and 9 below it.
This takes O(n) time and O(log n) recursion depth.
One edge case is an even-length range, where either middle works and both give a valid answer.`,

  235: `The key insight is that in a BST the lowest common ancestor is the first node whose value lies between p and q.
So I walk down from the root: if both values are smaller I go left, if both are larger I go right, otherwise I stop.
For example, with p = 2 and q = 8 and root 6, they split at 6, so 6 is the answer.
This takes O(h) time and O(1) space iteratively.
One edge case is one node being the ancestor of the other, which also stops at that node because its value equals p or q.`,

  236: `The key insight is that the lowest common ancestor is the node where p and q are found in different subtrees, or the node that is p or q itself.
So I use DFS that returns p or q if found and otherwise passes up whatever the children return.
For example, if the left subtree returns p and the right returns q, the current node is the answer.
This takes O(n) time and O(h) space.
One edge case is p being an ancestor of q, which works because the search returns p before looking below it.`,

  102: `The key insight is that a queue naturally processes nodes level by level.
So I use BFS and, at the start of each round, record the queue size so I know which nodes belong to this level.
For example, [3, 9, 20, null, null, 15, 7] gives [[3], [9, 20], [15, 7]].
This takes O(n) time and O(w) space, where w is the widest level.
One edge case is an empty tree, which returns an empty list.`,

  103: `The key insight is that this is level-order traversal, except every other level is read in reverse.
So I use BFS with a level-size loop and reverse the level's list, or fill it from the back, on odd levels.
For example, [3, 9, 20, null, null, 15, 7] gives [[3], [20, 9], [15, 7]].
This takes O(n) time and O(w) space.
One edge case is an empty tree, which returns an empty list.`,

  199: `The key insight is that the right side view is the last node of each level.
So I use BFS and take the last node from each level, or DFS that visits the right child first and records the first node at each depth.
For example, [1, 2, 3, null, 5, null, 4] gives [1, 3, 4].
This takes O(n) time and O(h) or O(w) space.
One edge case is a left branch that's deeper than the right, whose nodes still show on the deeper levels.`,

  1448: `The key insight is that a node is good when its value is at least the largest value on the path from the root.
So I use DFS that carries the maximum seen so far down the path.
For example, in [3, 1, 4, 3, null, 1, 5], the good nodes are 3, 4, 3, and 5, so the answer is 4.
This takes O(n) time and O(h) space.
One edge case is the root, which is always good.`,

  98: `The key insight is that every node must fall within bounds set by all its ancestors, not just its parent.
So I use DFS that passes down a low and high bound, narrowing them at each step.
For example, a 3 in the right subtree of 5 is invalid, even if it's greater than its own parent.
This takes O(n) time and O(h) space; an in-order traversal that checks for strictly increasing values also works.
One edge case is values at the integer limits, so I use null or infinity for the bounds instead of min and max ints.`,

  230: `The key insight is that an in-order traversal of a BST visits values in sorted order.
So I use an iterative in-order traversal with a stack and stop at the kth node.
For example, with k = 1 in [3, 1, 4, null, 2], the first value visited is 1.
This takes O(h + k) time and O(h) space.
One edge case is a follow-up with frequent inserts, where storing subtree sizes in each node gives O(h) lookups.`,

  285: `The key insight is that the successor is the smallest value greater than p, which a BST lets me find by walking down.
So I start at the root: when a node is greater than p, I record it and go left; otherwise I go right.
For example, in a BST with 2, 1, 3, the successor of 1 is 2.
This takes O(h) time and O(1) space.
One edge case is p being the largest value, which has no successor, so I return null.`,

  105: `The key insight is that preorder gives me the root first, and its position in inorder splits the left and right subtrees.
So I use recursion with a hash map from value to inorder index, which avoids searching for the root each time.
For example, with preorder [3, 9, 20, 15, 7] and inorder [9, 3, 15, 20, 7], 3 is the root, 9 is on the left, and 15, 20, 7 are on the right.
This takes O(n) time and O(n) space for the map.
One edge case is that the approach relies on unique values, which the problem guarantees.`,

  113: `The key insight is that I explore every root-to-leaf path and keep the ones whose sum equals the target.
So I use DFS with backtracking: add the node to the path, recurse, and remove it when I return.
For example, with target 22, the path 5, 4, 11, 2 is recorded.
This takes O(n^2) time in the worst case because copying paths costs up to n each, and O(h) space besides the output.
One edge case is only counting paths that end at a leaf, not at any node where the sum happens to match.`,

  437: `The key insight is that any downward path sums to the target when the current prefix sum minus the target equals an earlier prefix sum on the same path.
So I use DFS with a hash map of prefix sums along the current path, adding the count when I enter a node and removing it when I leave.
For example, if the path prefix sums are 10, 15, 18 and the target is 8, then 18 minus 8 is 10, so the path after 10 sums to 8.
This takes O(n) time and O(h) space for the map.
One edge case is a path that starts at the root, which I cover by seeding prefix sum 0 with count 1.`,

  662: `The key insight is that if I number nodes like a heap, where children are 2i and 2i + 1, a level's width is the last index minus the first plus one.
So I use BFS that carries each node's index.
For example, a level with indices 4 and 7 has width 4, even though the nodes in between are null.
This takes O(n) time and O(w) space.
One edge case is indices overflowing on deep, sparse trees, so I subtract each level's first index before computing its children.`,

  863: `The key insight is that distance K can go up through parents, so I need to treat the tree like an undirected graph.
So I first record each node's parent, then run BFS from the target over children and parents with a visited set.
For example, starting at 5 with K = 2, I reach 7 and 4 below it and 1 through the root.
This takes O(n) time and O(n) space.
One edge case is K = 0, which returns just the target.`,

  124: `The key insight is that at each node the best path either bends through it, using both sides, or continues up to its parent using one side.
So I use DFS that returns the node's value plus its best single branch, while updating a global best with node plus both branches.
For example, in [-10, 9, 20, null, null, 15, 7], the best path is 15, 20, 7 with sum 42.
This takes O(n) time and O(h) space.
One edge case is negative branches, which I treat as 0 so they're simply left out.`,

  297: `The key insight is that a preorder traversal with explicit null markers describes a tree uniquely.
So I serialize with DFS, writing values and "#" for null, and deserialize by reading the tokens in the same order.
For example, [1, 2, 3, null, null, 4, 5] becomes "1,2,#,#,3,4,#,#,5,#,#".
Both directions take O(n) time and O(n) space.
One edge case is negative or multi-digit values, which is why I separate tokens with commas.`,

  // Tries
  208: `The key insight is that words with the same prefix share a path from the root, so a prefix lookup is just a walk down the tree.
So I use trie nodes with a children map and an end-of-word flag.
For example, after inserting "apple", search("app") is false because the flag isn't set there, but startsWith("app") is true.
Each operation takes O(L) time for a word of length L, and space is O(total characters).
One edge case is inserting a word that's a prefix of another, which only sets the flag partway along.`,

  211: `The key insight is that a trie handles normal letters directly, and a dot just means I have to try every child.
So I use a trie with DFS on search, branching into all children when I see a dot.
For example, after adding "bad", "dad", and "mad", ".ad" matches, and "b.." matches too.
Adding is O(L), search is O(L) without dots and up to O(26^L) in the worst case, and space is O(total characters).
One edge case is a search ending on a node that isn't the end of a word, which returns false.`,

  212: `The key insight is that searching for every word separately repeats work, so I put the words in a trie and explore the grid once.
So I run DFS from each cell, following the trie only while the path is still a prefix, and marking cells visited as I go.
For example, from the "o" in the grid, the path o, a, t, h spells "oath", which is in the trie.
This takes about O(m times n times 4^L) time in the worst case, and O(total word length) for the trie.
One edge case is finding the same word twice, so I clear the word from the trie once found and prune empty branches.`,

  336: `The key insight is that words[i] plus words[j] is a palindrome when one word's reverse matches part of the other and the leftover part is itself a palindrome.
So I store each word's reverse in a hash map, and for every split of each word into prefix and suffix, I look for a matching reverse on the correct side.
For example, "abcd" and "dcba" pair both ways, and "s" and "lls" form "llss".
This takes O(n times k^2) time for n words of length k, and O(n times k) space.
One edge case is the empty string, which pairs with every word that is already a palindrome.`,

  588: `The key insight is that a file system path is a sequence of names, which maps naturally onto a trie.
So each node holds a map of children, a flag for whether it's a file, and the file's content.
For example, mkdir("/a/b") creates two nodes, and ls("/a") lists "b" in sorted order.
Each operation takes O(path length) plus sorting names for ls, and space is O(total path length plus content).
One edge case is ls on a file path, which should return just that file's name.`,

  // Heap
  703: `The key insight is that the kth largest is the smallest value among the k largest, which a min-heap of size k keeps at its top.
So I keep a min-heap of at most k values and pop whenever it grows past k.
For example, with k = 3 and [4, 5, 8, 2], the heap keeps 4, 5, 8, and adding 3 still returns 4.
Each add takes O(log k) time, and space is O(k).
One edge case is starting with fewer than k numbers, where the heap simply isn't full yet.`,

  1046: `The key insight is that each turn needs the two heaviest stones, which a max-heap gives me quickly.
So I use a max-heap, which in Python means pushing negated values.
For example, with [2, 7, 4, 1, 8, 1], I smash 8 and 7 into 1 and repeat until at most one stone is left.
This takes O(n log n) time and O(n) space.
One edge case is two equal stones, which both disappear, and an empty heap at the end, which returns 0.`,

  973: `The key insight is that I only need the k closest points, so I don't need to sort all of them.
So I keep a max-heap of size k by distance, using squared distance to skip the square root.
For example, with k = 1 and points (1, 3) and (-2, 2), the squared distances are 10 and 8, so (-2, 2) wins.
This takes O(n log k) time and O(k) space; quickselect is O(n) on average.
One edge case is ties in distance, where any order of the tied points is accepted.`,

  215: `The key insight is that I don't need to sort everything to find the kth largest value.
So I keep a min-heap of size k, whose top is the answer at the end; quickselect is another option with O(n) average time.
For example, with [3, 2, 1, 5, 6, 4] and k = 2, the heap ends with 5 and 6, so the answer is 5.
This takes O(n log k) time and O(k) space.
One edge case is duplicates, which count separately, since it's the kth largest element and not the kth distinct one.`,

  621: `The key insight is that the most frequent task sets the minimum length, because copies of it need n idle slots between them.
So I count tasks and use the formula (maxCount - 1) times (n + 1) plus the number of tasks that share the max count.
For example, with A:3, B:3 and n = 2, that's 2 times 3 plus 2, which is 8.
This takes O(total tasks) time and O(1) space for 26 counts.
One edge case is when there are enough different tasks to fill every gap, so the answer is the larger of that formula and the number of tasks.`,

  355: `The key insight is that the news feed is a merge of already-sorted tweet lists, one per followed user.
So I store each user's tweets with a global timestamp and use a heap to pull the 10 most recent from the user and their followees.
For example, if user 1 follows user 2, getNewsFeed(1) mixes both users' tweets newest first.
Posting is O(1), and getting the feed is O(f log f) for f followees, with O(total tweets) space.
One edge case is users following themselves or unfollowing someone they don't follow, which I ignore.`,

  692: `The key insight is that this is top K by frequency, but ties must be broken alphabetically.
So I count words and then use a heap, or sort, with the key (negative count, word).
For example, with ["i", "love", "leetcode", "i", "love", "coding"] and k = 2, the answer is ["i", "love"].
This takes O(n log k) with a size-k heap, or O(n log n) with a sort, and O(n) space.
One edge case is the heap comparison: in a min-heap of size k, the word that sorts later alphabetically must be treated as smaller.`,

  295: `The key insight is that the median sits between the largest value of the lower half and the smallest value of the upper half.
So I use a max-heap for the lower half and a min-heap for the upper half, and keep their sizes within one of each other.
For example, after adding 1, 2, 3, the lower half holds 1 and 2 and the upper holds 3, so the median is 2.
Adding is O(log n), finding the median is O(1), and space is O(n).
One edge case is an even count, where the median is the average of the two tops.`,

  632: `The key insight is that a range covering one element from each list is defined by the current smallest and largest of the chosen elements.
So I use a min-heap holding one element per list plus the current maximum, and I always advance the list that has the minimum.
For example, with lists [4, 10, 15, 24, 26], [0, 9, 12, 20], and [5, 18, 22, 30], the best range is [20, 24], covering 24, 20, and 22.
This takes O(N log k) time for N total elements, and O(k) space.
One edge case is when one list runs out, which ends the search because no range can cover it anymore.`,
};
