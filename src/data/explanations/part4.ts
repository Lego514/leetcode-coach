// 二維 DP、貪心、區間、數學與幾何、位元運算

export const EXPLANATIONS_PART_4: Record<number, string> = {
  // 2-D Dynamic Programming
  62: `The key insight is that I can only arrive at a cell from above or from the left, so its path count is the sum of those two.
So I use DP over the grid, keeping just one row because each cell only needs the cell above and the cell to its left.
For example, a 3 by 7 grid has 28 unique paths.
This takes O(m times n) time and O(n) space; the combination C(m + n - 2, m - 1) also gives it in O(min(m, n)).
One edge case is a grid with one row or one column, which has exactly one path.`,

  1143: `The key insight is that when the last characters match, they extend the common subsequence; otherwise I drop one of them and take the better result.
So I use a 2D DP where dp[i][j] is the LCS of the first i characters of one string and the first j of the other.
For example, "abcde" and "ace" have an LCS of "ace", length 3.
This takes O(m times n) time and O(min(m, n)) space with a rolling row.
One edge case is an empty string, where the LCS is 0.`,

  309: `The key insight is that each day I'm in one of three states: holding a stock, just sold and cooling down, or free to buy.
So I use state-machine DP with three variables that update from the previous day's states.
For example, with [1, 2, 3, 0, 2], buying at 1, selling at 3, cooling down, buying at 0, and selling at 2 gives 3.
This takes O(n) time and O(1) space.
One edge case is a single day, where no trade is possible and the answer is 0.`,

  518: `The key insight is that I'm counting combinations, not orders, so each coin is considered in a fixed order.
So I use DP with the coin loop on the outside and the amount loop on the inside, adding dp[a - coin] to dp[a].
For example, with amount 5 and coins [1, 2, 5], there are 4 combinations.
This takes O(amount times coins) time and O(amount) space.
One edge case is amount 0, which has one combination: use no coins.`,

  494: `The key insight is that choosing signs splits the numbers into a positive group P and a negative group, so P equals (total + target) / 2.
So I turn it into counting subsets that sum to P, using a 0/1 knapsack DP from high to low sums.
For example, with five 1s and target 3, P is 4, and there are 5 ways to choose four of the ones.
This takes O(n times P) time and O(P) space.
One edge case is when total + target is odd or the target's absolute value exceeds the total, where the answer is 0.`,

  97: `The key insight is that each character of s3 comes from the next unused character of s1 or of s2.
So I use DP where dp[i][j] says whether the first i of s1 and the first j of s2 can form the first i + j of s3.
For example, "aabcc" and "dbbca" can interleave into "aadbbcbcac".
This takes O(m times n) time and O(n) space with a rolling row.
One edge case is lengths that don't add up, which I check first and return false.`,

  72: `The key insight is that the last characters either match for free or need one operation: insert, delete, or replace.
So I use a 2D DP where dp[i][j] is the edit distance between the first i and first j characters, taking one plus the minimum of three neighbors when they differ.
For example, "horse" to "ros" takes 3 operations.
This takes O(m times n) time and O(min(m, n)) space.
One edge case is an empty string, where the distance is the other string's length.`,

  221: `The key insight is that the largest square ending at a cell is limited by the squares ending above, to the left, and diagonally up-left.
So I use DP where dp[i][j] is one plus the minimum of those three when the cell is 1.
For example, a 2 by 2 block of ones gives a square of side 2, so the area is 4.
This takes O(m times n) time and O(n) space.
One edge case is that the answer is the area, so I square the largest side.`,

  329: `The key insight is that the longest increasing path from a cell doesn't depend on how I got there, so I can cache it.
So I use DFS with memoization, moving only to strictly larger neighbors, which also rules out cycles.
For example, in [[9, 9, 4], [6, 6, 8], [2, 1, 1]], the longest path is 1, 2, 6, 9, with length 4.
This takes O(m times n) time because each cell is computed once, and O(m times n) space.
One edge case is equal neighbors, which I can't move between because the path must be strictly increasing.`,

  115: `The key insight is that when s[i] equals t[j], I can either use this match or skip it; when they differ, I must skip s[i].
So I use DP where dp[i][j] is the number of ways the first i characters of s contain the first j of t.
For example, "rabbbit" contains "rabbit" in 3 ways, one for each b I leave out.
This takes O(m times n) time and O(n) space if I iterate j backward.
One edge case is an empty t, which appears exactly once in any s.`,

  312: `The key insight is that choosing the last balloon to burst in a range splits the problem into two independent halves.
So I pad the ends with 1s and use interval DP where dp[l][r] tries each k as the last balloon between l and r.
For example, with [3, 1, 5, 8], the best order earns 167 coins.
This takes O(n^3) time and O(n^2) space.
One edge case is an empty input, which earns 0.`,

  10: `The key insight is that a star can match zero copies of the previous character or one more copy, so it needs two branches.
So I use DP where dp[i][j] says whether the first i of s match the first j of p, handling star and dot as separate cases.
For example, "aa" matches "a*", and "ab" matches ".*".
This takes O(m times n) time and O(m times n) space.
One edge case is a pattern like "a*b*" matching an empty string, which I set up in the first row of the table.`,

  // Greedy
  53: `The key insight is that a negative running sum can only hurt what comes after it, so I start fresh whenever it drops below zero.
So I use Kadane's algorithm, keeping the best sum ending here and the best overall.
For example, with [-2, 1, -3, 4, -1, 2, 1, -5, 4], the best subarray is [4, -1, 2, 1], with sum 6.
This takes O(n) time and O(1) space.
One edge case is all negative numbers, where I have to return the largest single number, not 0.`,

  55: `The key insight is that I only need the farthest index I can reach so far.
So I scan left to right, updating the farthest reach, and fail if I ever land on an index beyond it.
For example, with [3, 2, 1, 0, 4], I get stuck at index 3, which is a 0, so I can't reach the end.
This takes O(n) time and O(1) space.
One edge case is a single element, where I'm already at the end.`,

  45: `The key insight is that each jump covers a range of indices, and the next range reaches as far as the best jump from inside the current one.
So I use greedy BFS-like levels: track the current range's end and the farthest reach, and count a jump each time I pass the end.
For example, with [2, 3, 1, 1, 4], the answer is 2, jumping to the 3 and then to the end.
This takes O(n) time and O(1) space.
One edge case is that I stop before the last index, so I don't count an extra jump once I'm already there.`,

  134: `The key insight is that if the total gas covers the total cost, a solution exists, and it starts right after the last point where the running tank went negative.
So I use one pass, resetting the start to i + 1 whenever the tank drops below zero.
For example, with gas [1, 2, 3, 4, 5] and cost [3, 4, 5, 1, 2], the start is index 3.
This takes O(n) time and O(1) space.
One edge case is total gas less than total cost, which means no start works and I return -1.`,

  846: `The key insight is that the smallest remaining card must start a group, because nothing smaller can go before it.
So I count cards in a sorted map, or a min-heap, and form groups starting from the smallest card.
For example, [1, 2, 3, 6, 2, 3, 4, 7, 8] with groupSize 3 forms [1, 2, 3], [2, 3, 4], and [6, 7, 8].
This takes O(n log n) time and O(n) space.
One edge case is a hand size that isn't divisible by the group size, which I can reject immediately.`,

  1899: `The key insight is that any triplet with a value larger than the target in any position can never be used, and the rest can safely be merged.
So I skip triplets that exceed the target anywhere and track whether each target value is matched by some remaining triplet.
For example, if one safe triplet matches the target's first value and another matches the second and third, merging them works.
This takes O(n) time and O(1) space.
One edge case is a triplet that matches one value but exceeds another, which must be skipped even though it looks useful.`,

  763: `The key insight is that a part must extend at least to the last occurrence of every letter inside it.
So I record each letter's last index, then scan and extend the current part's end until I reach it.
For example, "ababcbacadefegdehijhklij" splits into parts of length 9, 7, and 8.
This takes O(n) time and O(1) space for 26 letters.
One edge case is a letter that appears only once, which can form a part by itself.`,

  678: `The key insight is that since a star can be "(", ")", or empty, I can track the range of possible open counts instead of every choice.
So I keep a low and a high count: "(" raises both, ")" lowers both, and "*" lowers low and raises high, clamping low at zero.
For example, "(*))" is valid because the star can be "(".
This takes O(n) time and O(1) space.
One edge case is high dropping below zero, which means too many ")" no matter what, so I return false immediately.`,

  179: `The key insight is that a should come before b exactly when a + b as strings is larger than b + a.
So I convert the numbers to strings and sort with that comparison.
For example, with [3, 30, 34, 5, 9], the result is "9534330".
This takes O(n log n) comparisons, each O(k) for the digit length, and O(n) space.
One edge case is all zeros, like [0, 0], which should return "0" instead of "00".`,

  // Intervals
  252: `The key insight is that after sorting by start time, any overlap has to be between neighbors.
So I sort the intervals and check whether each meeting starts before the previous one ends.
For example, [[0, 30], [5, 10]] overlaps, so the answer is false.
This takes O(n log n) time and O(1) extra space.
One edge case is a meeting that starts exactly when another ends, which is fine.`,

  57: `The key insight is that the intervals are already sorted, so the new interval only affects a contiguous block of them.
So I add intervals that end before it, merge the ones that overlap it by widening its bounds, and add the rest.
For example, inserting [4, 8] into [[1, 2], [3, 5], [6, 7], [8, 10], [12, 16]] gives [[1, 2], [3, 10], [12, 16]].
This takes O(n) time and O(n) space for the output.
One edge case is a new interval that goes before all or after all the others, which the same three phases handle.`,

  56: `The key insight is that after sorting by start, an interval overlaps the previous merged one exactly when it starts before that one ends.
So I sort, then either extend the last merged interval's end or start a new one.
For example, [[1, 3], [2, 6], [8, 10]] becomes [[1, 6], [8, 10]].
This takes O(n log n) time and O(n) space.
One edge case is touching intervals like [1, 4] and [4, 5], which merge into [1, 5] in this problem.`,

  435: `The key insight is that to keep as many intervals as possible, I should always keep the one that ends earliest.
So I sort by end time and count how many intervals start before the last kept end.
For example, with [[1, 2], [2, 3], [3, 4], [1, 3]], only [1, 3] needs to be removed, so the answer is 1.
This takes O(n log n) time and O(1) extra space.
One edge case is intervals that only touch, which don't count as overlapping.`,

  253: `The key insight is that the number of rooms needed is the largest number of meetings happening at the same time.
So I sort meetings by start and keep a min-heap of end times, freeing a room when the earliest end is at or before the next start.
For example, [[0, 30], [5, 10], [15, 20]] needs 2 rooms.
This takes O(n log n) time and O(n) space; sorting starts and ends separately and sweeping works too.
One edge case is a meeting ending exactly when another starts, where the room can be reused.`,

  1851: `The key insight is that if I process queries in increasing order, the intervals that can contain them become available in order of start.
So I sort intervals by start and queries by value, push intervals that have started into a min-heap by size, and pop ones that ended before the query.
For example, for query 3, the smallest interval still covering it is on top of the heap.
This takes O((n + q) log n) time and O(n + q) space.
One edge case is a query no interval covers, which gets -1.`,

  759: `The key insight is that free time is the gaps in the union of everyone's working intervals.
So I flatten all intervals, sort by start, merge them, and report the gaps between merged blocks.
For example, if the merged busy blocks are [1, 3] and [4, 10], the common free time is [3, 4].
This takes O(n log n) time and O(n) space; a heap over each employee's sorted list avoids the full sort.
One edge case is intervals that touch, which leave no gap between them.`,

  // Math & Geometry
  202: `The key insight is that repeatedly summing the squares of the digits either reaches 1 or falls into a cycle.
So I use a hash set of seen values, or fast and slow pointers, to detect the cycle.
For example, 19 goes 82, 68, 100, then 1, so it's happy.
This takes O(log n) time per step with a small number of steps, and O(1) space with the two-pointer version.
One edge case is 1 itself, which is happy immediately.`,

  66: `The key insight is that adding one only carries through trailing 9s.
So I walk from the last digit, turning 9s into 0s until I find a digit I can increase.
For example, [1, 2, 9] becomes [1, 3, 0].
This takes O(n) time and O(1) extra space, except in the all-nines case.
One edge case is all 9s, like [9, 9], which becomes [1, 0, 0].`,

  13: `The key insight is that a smaller numeral before a larger one is subtracted, and otherwise numerals are added.
So I use a map of symbol values and compare each symbol with the one after it.
For example, "MCMXCIV" is 1000 plus 900 plus 90 plus 4, which is 1994.
This takes O(n) time and O(1) space.
One edge case is the last symbol, which has nothing after it, so it's always added.`,

  9: `The key insight is that I can reverse just the second half of the number and compare it with the first half.
So I pop digits from the end into a reversed number until it's at least as large as what's left.
For example, 1221 splits into 12 and 12, which match.
This takes O(log n) time and O(1) space, without converting to a string.
One edge case is negative numbers and numbers ending in 0 other than 0 itself, which are never palindromes.`,

  48: `The key insight is that rotating 90 degrees clockwise is the same as transposing the matrix and then reversing each row.
So I swap across the diagonal in place and then reverse every row.
For example, [[1, 2, 3], [4, 5, 6], [7, 8, 9]] becomes [[7, 4, 1], [8, 5, 2], [9, 6, 3]].
This takes O(n^2) time and O(1) space.
One edge case is that the transpose must only swap the upper triangle, or each pair gets swapped back.`,

  54: `The key insight is that a spiral peels off the outer layer and then repeats on the inner rectangle.
So I keep four bounds, top, bottom, left, and right, and shrink one after walking each side.
For example, a 3 by 3 matrix gives 1, 2, 3, 6, 9, 8, 7, 4, 5.
This takes O(m times n) time and O(1) extra space.
One edge case is a single remaining row or column, so I check the bounds again before walking the bottom and left sides.`,

  73: `The key insight is that I can use the first row and first column as markers instead of extra memory.
So I first note whether the first row and column themselves have a zero, mark zeros into them, clear the inner cells, and then handle the first row and column.
For example, a zero at (1, 1) marks row 1 and column 1, which are then cleared.
This takes O(m times n) time and O(1) space.
One edge case is the order of steps: I must clear the first row and column last, or the markers get erased too early.`,

  50: `The key insight is that x^n equals (x^(n/2))^2, so I can halve the exponent each time.
So I use fast exponentiation, squaring the base and multiplying it into the result when the current bit of n is 1.
For example, 2^10 needs only about four squarings.
This takes O(log n) time and O(1) space iteratively.
One edge case is a negative n, where I use 1/x and a positive exponent, taking care with the smallest integer, which can't simply be negated.`,

  43: `The key insight is that the digit at position i of one number times position j of the other lands at position i + j + 1 of the result.
So I use a result array of length m + n and add each digit product there, carrying into position i + j.
For example, "123" times "456" gives "56088".
This takes O(m times n) time and O(m + n) space.
One edge case is either number being "0", and in general I strip leading zeros from the result.`,

  2013: `The key insight is that once I fix a query point and a diagonal point with the same side length, the other two corners are determined.
So I count points in a hash map and, for each stored point on the query's diagonal, multiply the counts of the two remaining corners.
For example, with points (3, 10), (11, 2), and (3, 2), querying (11, 10) finds one square.
Add is O(1), count is O(number of distinct points), and space is O(n).
One edge case is duplicate points, which multiply the count, and a diagonal point with zero side length, which I skip.`,

  8: `The key insight is that the parsing follows a fixed order: skip spaces, read an optional sign, then read digits until something else appears.
So I use a single index scan and clamp the result to the 32-bit range.
For example, "   -42abc" gives -42.
This takes O(n) time and O(1) space.
One edge case is overflow, which I check before multiplying by 10, returning the limit instead.`,

  // Bit Manipulation
  136: `The key insight is that XOR of a number with itself is 0 and XOR with 0 is the number, so pairs cancel out.
So I XOR every number together, and what's left is the single one.
For example, [4, 1, 2, 1, 2] leaves 4.
This takes O(n) time and O(1) space.
One edge case is negative numbers, which XOR handles the same way.`,

  191: `The key insight is that n and (n - 1) clears the lowest set bit.
So I repeat that until n is zero and count the steps.
For example, 11 is 1011 in binary, which has three 1 bits.
This takes O(number of set bits) time and O(1) space.
One edge case is the input being an unsigned 32-bit value, so in Python I don't need to worry about the sign.`,

  338: `The key insight is that i has the same number of 1 bits as i shifted right by one, plus its lowest bit.
So I use DP where bits[i] equals bits[i >> 1] plus (i and 1).
For example, 5 is 101 and 2 is 10, so bits[5] is bits[2] plus 1, which is 2.
This takes O(n) time and O(n) space for the output.
One edge case is n = 0, which returns [0].`,

  190: `The key insight is that I can build the reversed number by taking bits off the input's end and pushing them onto the result.
So I loop 32 times, shifting the result left and adding the input's lowest bit.
For example, a number whose lowest bit is 1 ends up with its highest bit set.
This takes O(1) time for 32 steps and O(1) space.
One edge case is leading zeros in the input, which become trailing zeros, so I always loop all 32 times.`,

  268: `The key insight is that XOR-ing all indices 0 to n with all the values cancels everything except the missing number.
So I XOR n with each index and value, or compare the sum 0 through n with the array's sum.
For example, [3, 0, 1] with n = 3 is missing 2.
This takes O(n) time and O(1) space.
One edge case is the missing number being n itself, which the XOR with n covers.`,

  67: `The key insight is that binary addition works like decimal addition from the right, with a carry.
So I walk both strings from the end, add the bits and the carry, and build the result backwards.
For example, "11" plus "1" gives "100".
This takes O(max(m, n)) time and O(max(m, n)) space.
One edge case is a final carry, which adds an extra "1" at the front.`,

  371: `The key insight is that XOR adds without carrying, and AND shifted left by one gives the carries.
So I repeat a = a XOR b and b = (a AND b) shifted left until there's no carry left.
For example, 2 plus 3 is 10 plus 11 in binary, which ends at 101, or 5.
This takes O(1) time for 32-bit integers and O(1) space.
One edge case is negative numbers in Python, which has unbounded integers, so I mask to 32 bits and convert back at the end.`,

  7: `The key insight is that reversing a number is popping digits from the end and pushing them onto the result.
So I loop with mod and division, checking for 32-bit overflow before each push.
For example, -123 becomes -321.
This takes O(log n) time and O(1) space.
One edge case is overflow, like 1534236469, where the answer is 0.`,
};
