// 陣列與雜湊、雙指標、滑動視窗、堆疊

export const EXPLANATIONS_PART_1: Record<number, string> = {
  // Arrays & Hashing
  217: `The key insight is that a duplicate exists exactly when I see a value I've already seen.
So I use a hash set because it answers "have I seen this?" in constant time.
For example, with [1, 2, 3, 1], the set holds 1, 2, 3 and the second 1 is already in it, so I return true.
This takes O(n) time because each number is checked and inserted once, and O(n) space for the set.
One edge case is an empty or single-element array, which has no duplicate, so the loop simply finishes and I return false.`,

  242: `The key insight is that two strings are anagrams exactly when every letter appears the same number of times in both.
So I use a count array of 26 because the input is lowercase letters, and counting beats sorting.
For example, with "anagram" and "nagaram", I add counts for the first string and subtract for the second, and every count ends at zero.
This takes O(n) time because each character is touched once, and O(1) space since the array has a fixed size.
One edge case is different lengths, which I check first and return false right away.`,

  1: `The key insight is that for each number x, the partner I need is target minus x, and I can look it up instead of searching.
So I use a hash map from value to index because it lets me find the complement in constant time.
For example, with [2, 7, 11, 15] and target 9, at 7 I look up 2, find it at index 0, and return [0, 1].
This takes O(n) time because I pass through the array once, and O(n) space for the map.
One edge case is using the same element twice, which I avoid by checking the map before inserting the current number.`,

  383: `The key insight is that the note can be built only if the magazine has at least as many of every letter.
So I use a count array for the magazine's letters because each letter can be used once.
For example, with note "aab" and magazine "baa", the magazine gives a:2, b:1, and the note uses exactly that, so it works.
This takes O(m + n) time because I scan both strings once, and O(1) space for 26 counters.
One edge case is a note longer than the magazine, which can never work, so I can return false immediately.`,

  169: `The key insight is that the majority element appears more than half the time, so if different values cancel each other in pairs, it's the one left standing.
So I use Boyer-Moore voting with one candidate and one counter because that needs no extra memory.
For example, with [2, 2, 1, 1, 1, 2, 2], the count drops to zero after the 1s, then 2 takes over again and ends as the candidate.
This takes O(n) time because it's a single pass, and O(1) space for two variables.
One edge case is an array of one element, which is its own answer; the problem guarantees a majority exists, so I don't need a second pass to verify.`,

  409: `The key insight is that every pair of equal letters can go on both sides, and at most one unpaired letter can sit in the middle.
So I use a letter count because the answer depends only on how many of each letter there are.
For example, with "abccccdd", c gives 4 and d gives 2, and one leftover a or b goes in the middle, so the length is 7.
This takes O(n) time because I count once, and O(1) space since there are at most 52 letters.
One edge case is when every count is even, where I add nothing for the middle; also note the letters are case-sensitive.`,

  14: `The key insight is that the common prefix can't be longer than the shortest string, so I compare column by column.
So I use the first string as a reference because every string has to match it.
For example, with ["flower", "flow", "flight"], column 0 is all f, column 1 is all l, and column 2 has o and i, so the answer is "fl".
This takes O(total characters) time because I stop at the first mismatch, and O(1) extra space.
One edge case is an empty string in the list, which makes the answer empty right away.`,

  49: `The key insight is that anagrams share the same letter counts, so I can use those counts as a group key.
So I use a hash map from a key to a list because it groups words in one pass.
For example, "eat", "tea", and "ate" all have one a, one e, and one t, so they land in the same list.
This takes O(n times k) time for n words of length k if I build a 26-count key, and O(n times k) space for the groups.
One edge case is an empty string, which still gets its own key and forms a group.`,

  347: `The key insight is that once I know each number's frequency, I only need the k largest frequencies, not a full sort.
So I use a hash map for counts and then bucket sort by frequency, because frequencies are at most n.
For example, with [1, 1, 1, 2, 2, 3] and k = 2, bucket 3 holds 1 and bucket 2 holds 2, so I return [1, 2].
This takes O(n) time because counting and walking the buckets are both linear, and O(n) space for the map and buckets.
One edge case is k equal to the number of distinct values, where I return all of them; a min-heap of size k is a fine O(n log k) alternative.`,

  271: `The key insight is that a delimiter alone is ambiguous, because any character can appear inside a string.
So I prefix each string with its length and a separator, like "4#", because the length tells the decoder exactly where the string ends.
For example, ["neet", "co#de"] becomes "4#neet5#co#de", and the decoder reads 4, takes four characters, then reads 5.
This takes O(total length) time to encode and decode, and O(total length) space for the output.
One edge case is an empty string, which encodes as "0#" and decodes back to an empty string correctly.`,

  238: `The key insight is that the answer at i is the product of everything to its left times everything to its right.
So I build prefix products in the output array and then multiply in suffix products with one running variable, because division isn't allowed.
For example, with [1, 2, 3, 4], the prefixes are [1, 1, 2, 6] and multiplying by the suffixes 24, 12, 4, 1 gives [24, 12, 8, 6].
This takes O(n) time because it's two passes, and O(1) extra space besides the output.
One edge case is zeros in the input, which this handles naturally because I never divide.`,

  36: `The key insight is that each digit may appear once per row, once per column, and once per 3 by 3 box.
So I use a set for every row, column, and box, and the box index is (row / 3) * 3 + col / 3 using integer division.
For example, if a 5 is already in row 0's set and I see another 5 in row 0, the board is invalid.
This takes O(1) time because the board is always 81 cells, and O(1) space for the sets.
One edge case is empty cells marked with a dot, which I skip; the board only has to be valid, not solvable.`,

  128: `The key insight is that I only need to count upward from numbers that start a sequence, meaning x minus 1 isn't present.
So I use a hash set because it gives constant-time membership checks.
For example, with [100, 4, 200, 1, 3, 2], only 1, 100, and 200 are starts, and counting up from 1 reaches 4, so the answer is 4.
This takes O(n) time because each number is visited at most twice, and O(n) space for the set.
One edge case is duplicates, which the set removes; an empty array returns 0.`,

  189: `The key insight is that rotating right by k is the same as reversing the whole array, then reversing the first k and the rest separately.
So I use in-place reversal with two pointers because it needs no extra array.
For example, with [1, 2, 3, 4, 5, 6, 7] and k = 3, reversing all gives [7..1], then the two parts become [5, 6, 7, 1, 2, 3, 4].
This takes O(n) time because each element is swapped a constant number of times, and O(1) space.
One edge case is k larger than n, so I take k mod n first.`,

  525: `The key insight is that if I treat 0 as -1, a subarray with equal zeros and ones is one with sum zero.
So I use a hash map from running sum to its first index, because two equal prefix sums mean the part between them sums to zero.
For example, with [0, 1, 0], the running sums are -1, 0, -1, and the first -1 at index 0 matches index 2, giving length 2.
This takes O(n) time for one pass, and O(n) space for the map.
One edge case is a valid subarray starting at index 0, which I cover by storing sum 0 at index -1 before the loop.`,

  560: `The key insight is that a subarray from i to j sums to k when prefix[j] minus prefix[i] equals k.
So I use a hash map counting how often each prefix sum has appeared, because I need the number of earlier matches.
For example, with [1, 1, 1] and k = 2, the prefixes are 1, 2, 3, and at 2 and 3 I find one earlier prefix that is 2 less, so the answer is 2.
This takes O(n) time for one pass, and O(n) space for the counts.
One edge case is negative numbers, which break a sliding window but not this approach; I seed the map with prefix 0 seen once.`,

  380: `The key insight is that an array gives O(1) random access and a hash map gives O(1) lookup, and I need both.
So I keep values in an array and a map from value to its index, and to remove I swap the value with the last element and pop.
For example, removing 2 from [1, 2, 3] moves 3 into index 1, updates 3's index in the map, and pops the end.
Every operation is O(1) on average because it's a map lookup plus an array operation, and space is O(n).
One edge case is removing the last element itself, where the swap is with itself, so I update the map before deleting the key.`,

  31: `The key insight is that the next permutation changes the shortest possible suffix: find the rightmost place where the sequence goes up.
So I scan from the right for the first i with nums[i] less than nums[i + 1], swap it with the smallest larger value to its right, and reverse the suffix.
For example, with [1, 3, 2], i is 0, I swap 1 with 2 to get [2, 3, 1], then reverse the suffix to get [2, 1, 3].
This takes O(n) time because each step is a linear scan, and O(1) space since it's in place.
One edge case is a fully descending array like [3, 2, 1], which has no such i, so I reverse everything to get the smallest order.`,

  362: `The key insight is that I only care about the last 300 seconds, so older hits can be dropped or overwritten.
So I use a circular buffer of 300 slots storing a timestamp and a count, because each second maps to one slot.
For example, a hit at time 301 goes to slot 1; if that slot still says time 1, I reset its count before adding.
Hit and getHits are O(1) and O(300), which is constant, and space is O(300).
One edge case is many hits in the same second, which the per-slot count handles without growing memory.`,

  41: `The key insight is that the answer is between 1 and n + 1, so I can use the array itself as a lookup table.
So I place each value v in the range 1 to n at index v - 1 by swapping, because then the first index i with nums[i] not equal to i + 1 gives the answer.
For example, with [3, 4, -1, 1], after placing I get [1, -1, 3, 4], and index 1 is wrong, so the answer is 2.
This takes O(n) time because each swap puts one value in its final place, and O(1) extra space.
One edge case is duplicates, which could swap forever, so I only swap when the target slot doesn't already hold the same value.`,

  // Two Pointers
  125: `The key insight is that I can compare from both ends inward while skipping characters that don't count.
So I use two pointers, one at each end, because that avoids building a cleaned copy of the string.
For example, with "A man, a plan", I skip spaces and commas and compare letters case-insensitively as the pointers move in.
This takes O(n) time because each pointer only moves inward, and O(1) space.
One edge case is a string with no letters or digits, like ", .", which counts as a palindrome.`,

  283: `The key insight is that I can compact the non-zero values to the front in order, and everything left over is zero.
So I use a write pointer for the next non-zero position and a read pointer that scans, swapping when I find a non-zero.
For example, with [0, 1, 0, 3, 12], swapping non-zeros forward gives [1, 3, 12, 0, 0].
This takes O(n) time for one pass, and O(1) space since it's in place.
One edge case is an array with no zeros, where every swap is with itself and nothing changes.`,

  977: `The key insight is that in a sorted array the largest squares are at the two ends, because negatives can be large in magnitude.
So I use two pointers at both ends and fill the result from the back with the larger square each time.
For example, with [-4, -1, 0, 3, 10], I place 100 first, then 16, then 9, 1, and 0.
This takes O(n) time for one pass, and O(n) space for the output.
One edge case is all negative or all positive numbers, which still works because one pointer simply does all the moving.`,

  167: `The key insight is that because the array is sorted, a sum that's too small means I should move the left pointer up, and too large means move the right pointer down.
So I use two pointers from both ends because each step safely rules out one number.
For example, with [2, 7, 11, 15] and target 9, 2 plus 15 is too big, and I keep moving right until 2 plus 7 equals 9.
This takes O(n) time and O(1) space.
One edge case is the answer being 1-indexed in this problem, so I add one to both indices before returning.`,

  15: `The key insight is that after sorting, fixing one number turns the rest into Two Sum II on the numbers to its right.
So I sort and then use two pointers for each fixed index, because sorting makes both the pointer moves and skipping duplicates easy.
For example, with [-1, 0, 1, 2, -1, -4], sorted to [-4, -1, -1, 0, 1, 2], fixing -1 finds [-1, 0, 1] and [-1, -1, 2].
This takes O(n^2) time because each fixed index runs a linear scan, and O(1) extra space besides the sort.
One edge case is duplicate triplets, which I avoid by skipping repeated values for both the fixed index and the pointers.`,

  16: `The key insight is that this is 3Sum, except instead of looking for zero I track the sum closest to the target.
So I sort and use two pointers for each fixed index, because the sorted order tells me which pointer to move.
For example, with [-1, 2, 1, -4] and target 1, sorted to [-4, -1, 1, 2], the triple -1, 1, 2 sums to 2, which is closest.
This takes O(n^2) time and O(1) extra space.
One edge case is an exact match, where I can return right away because nothing is closer.`,

  11: `The key insight is that the area is limited by the shorter line, so moving the taller line inward can never help.
So I use two pointers at the ends and always move the shorter one, because that's the only move that might find more area.
For example, with [1, 8, 6, 2, 5, 4, 8, 3, 7], the best is between the 8 at index 1 and the 7 at index 8, which gives 7 times 7, or 49.
This takes O(n) time and O(1) space.
One edge case is equal heights, where moving either pointer is fine.`,

  75: `The key insight is that with only three values I can partition in one pass, keeping 0s at the front and 2s at the back.
So I use the Dutch national flag approach with three pointers: low, mid, and high.
For example, with [2, 0, 2, 1, 1, 0], a 0 at mid is swapped to low and a 2 is swapped to high until mid passes high, giving [0, 0, 1, 1, 2, 2].
This takes O(n) time for one pass, and O(1) space.
One edge case is that after swapping with high I don't advance mid, because the value that came back hasn't been checked yet.`,

  42: `The key insight is that the water above a bar is the smaller of the tallest bar to its left and to its right, minus its height.
So I use two pointers with running left and right maximums, and I move the side with the smaller maximum because that side's water is already decided.
For example, with [0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1], adding up each bar's water gives 6.
This takes O(n) time and O(1) space.
One edge case is fewer than three bars, which can't hold any water.`,

  // Sliding Window
  121: `The key insight is that the best sale on any day uses the lowest price seen before that day.
So I keep a running minimum price and the best profit so far, because one pass is enough.
For example, with [7, 1, 5, 3, 6, 4], the minimum becomes 1 and the best profit is 6 minus 1, which is 5.
This takes O(n) time and O(1) space.
One edge case is prices that only go down, where I never find a positive profit and return 0.`,

  3: `The key insight is that I can grow a window to the right and shrink it from the left whenever a character repeats.
So I use a hash map from character to its last index, because it lets me jump the left edge past the previous copy.
For example, with "abcabcbb", the window grows to "abc", and each repeat moves the left edge, so the longest length is 3.
This takes O(n) time because each index enters and leaves the window once, and O(k) space for the alphabet.
One edge case is a last index that is already left of the window, so I only move left forward, never back.`,

  424: `The key insight is that a window is valid when its length minus the count of its most frequent letter is at most k.
So I use a sliding window with letter counts and track the highest count seen, because only that bound matters for the answer.
For example, with "AABABBA" and k = 1, the window "AABA" is valid since only one letter must change, so the answer is 4.
This takes O(n) time and O(1) space for 26 counts.
One edge case is that the stored max count can be stale after shrinking, which is fine because the answer only grows when a larger count appears.`,

  567: `The key insight is that a permutation of s1 is any window of the same length in s2 with the same letter counts.
So I use a fixed-size sliding window and compare letter counts, updating them as the window slides.
For example, with s1 "ab" and s2 "eidbaooo", the window "ba" has the same counts as "ab", so I return true.
This takes O(n) time because each slide updates two counts, and O(1) space for 26 counts.
One edge case is s1 longer than s2, which can never match.`,

  438: `The key insight is that this is Permutation in String, except I collect every starting index instead of stopping at the first match.
So I use a fixed-size window with letter counts and record the index whenever the counts match.
For example, with s "cbaebabacd" and p "abc", the windows starting at 0 and 6 match, so I return [0, 6].
This takes O(n) time and O(1) space for the counts.
One edge case is p longer than s, which returns an empty list.`,

  76: `The key insight is that I expand the window until it covers every needed character, then shrink it from the left as far as possible.
So I use a count map of what t needs and a counter of how many requirements are satisfied, because checking the whole map each time would be slow.
For example, with s "ADOBECODEBANC" and t "ABC", the smallest window that still covers A, B, and C is "BANC".
This takes O(m + n) time because each pointer moves forward only, and O(k) space for the counts.
One edge case is duplicate letters in t, like "AA", which need counts rather than a set.`,

  239: `The key insight is that a smaller number to the left of a bigger one can never be a window's maximum again.
So I use a deque of indices with decreasing values, because the front is always the current maximum.
For example, with [1, 3, -1, -3, 5, 3, 6, 7] and k = 3, the maximums are 3, 3, 5, 5, 6, 7.
This takes O(n) time because each index is pushed and popped once, and O(k) space for the deque.
One edge case is dropping the front index once it slides out of the window.`,

  // Stack
  20: `The key insight is that the most recent unmatched opening bracket must be the next one to close.
So I use a stack because it gives me the last opener first.
For example, with "([])", I push ( and [, then ] matches [ and ) matches (, and the stack ends empty, so it's valid.
This takes O(n) time and O(n) space for the stack.
One edge case is a closing bracket with an empty stack, or leftover openers at the end, which both mean invalid.`,

  232: `The key insight is that pouring one stack into another reverses the order, which turns LIFO into FIFO.
So I use an input stack for pushes and an output stack for pops, and I only pour when the output stack is empty.
For example, after pushing 1, 2, 3 and popping, I pour to get 3, 2, 1 in the output stack, and pop returns 1.
Each operation is amortized O(1) because every element moves between stacks at most once, and space is O(n).
One edge case is peek, which needs the same pour-if-empty step as pop.`,

  844: `The key insight is that a backspace only affects characters before it, so I can process both strings from the end.
So I use two pointers moving backward and a skip counter for pending backspaces, which avoids building new strings.
For example, with "ab#c" and "ad#c", both reduce to "ac", so the answer is true.
This takes O(m + n) time and O(1) space.
One edge case is more backspaces than characters, which just leaves an empty string.`,

  155: `The key insight is that the minimum only changes on push and pop, so I can remember it alongside each element.
So I use a stack of pairs, the value and the minimum so far, because getMin then just reads the top.
For example, pushing -2, 0, -3 gives minimums -2, -2, -3, and after one pop getMin returns -2.
Every operation is O(1), and space is O(n).
One edge case is duplicate minimums, which this handles because each entry stores its own minimum.`,

  150: `The key insight is that in reverse Polish notation an operator always applies to the two most recent operands.
So I use a stack of numbers, popping two for each operator and pushing the result.
For example, with ["2", "1", "+", "3", "*"], I compute 2 plus 1 as 3, then 3 times 3 as 9.
This takes O(n) time and O(n) space.
One edge case is order: the second value popped is the left operand, and division truncates toward zero.`,

  22: `The key insight is that a string stays valid as long as I never close more parentheses than I've opened.
So I use backtracking and track the open and close counts, adding "(" while open is below n and ")" while close is below open.
For example, with n = 2, the valid strings are "(())" and "()()".
This takes time proportional to the Catalan number of valid strings, roughly O(4^n over the square root of n), and O(n) recursion depth.
One edge case is n = 1, which returns just "()".`,

  739: `The key insight is that each day waits for the next warmer day, and a monotonic stack finds all of those in one pass.
So I use a stack of indices with decreasing temperatures, popping whenever today is warmer and recording the distance.
For example, with [73, 74, 75, 71, 69, 72, 76, 73], day 71 waits two days for 72.
This takes O(n) time because each index is pushed and popped once, and O(n) space.
One edge case is days with no warmer day, which stay 0.`,

  853: `The key insight is that a car can't pass the car ahead of it, so if it would arrive sooner it joins that fleet.
So I sort cars by position from closest to the target and compute each arrival time, keeping a stack of fleet times.
For example, a car behind that would arrive in 1 hour catches a car ahead arriving in 3 hours and becomes part of its fleet.
This takes O(n log n) time for the sort and O(n) space.
One edge case is two cars arriving at exactly the same time, which count as one fleet.`,

  394: `The key insight is that nested brackets are like nested function calls, so I save the current state when I enter a bracket.
So I use a stack of (previous string, repeat count) and build the current string as I go.
For example, with "3[a2[c]]", the inner part becomes "acc" and repeating it three times gives "accaccacc".
This takes time proportional to the output length and O(n) space for the stack.
One edge case is multi-digit counts like "12[a]", so I accumulate digits before each bracket.`,

  735: `The key insight is that a collision only happens when a right-moving asteroid is followed by a left-moving one.
So I use a stack of surviving asteroids and resolve collisions whenever a negative asteroid meets a positive top.
For example, with [5, 10, -5], the -5 hits 10 and explodes, so the answer is [5, 10].
This takes O(n) time because each asteroid is pushed and popped at most once, and O(n) space.
One edge case is equal sizes, where both explode.`,

  227: `The key insight is that multiplication and division bind tighter, so I apply them right away and postpone addition.
So I use a stack of terms: push +num or -num, and for * or / pop the top, combine it, and push the result back.
For example, with "3+2*2", I push 3, then replace 2 with 2 times 2, and the sum is 7.
This takes O(n) time and O(n) space, which can drop to O(1) by keeping just the last term.
One edge case is division, which should truncate toward zero, including for negative results.`,

  84: `The key insight is that each bar's best rectangle extends until the first shorter bar on each side.
So I use a monotonic increasing stack of indices, and when a shorter bar arrives I pop and compute the popped bar's area.
For example, with [2, 1, 5, 6, 2, 3], the bars 5 and 6 form a rectangle of height 5 and width 2, which gives 10.
This takes O(n) time because each bar is pushed and popped once, and O(n) space.
One edge case is bars still on the stack at the end, which I flush by adding a zero-height bar.`,

  224: `The key insight is that parentheses only change the sign context, so I can save the running result and sign when I enter one.
So I use a stack of (result, sign) pairs and keep a running result for the current level.
For example, with "1 + (2 - 3)", I compute the inner part as -1 and add it to 1, which gives 0.
This takes O(n) time and O(n) space for nesting.
One edge case is a unary minus like "-(2+3)", which the saved sign handles.`,

  895: `The key insight is that ties in frequency go to the most recent push, which is exactly stack behavior within each frequency level.
So I use a map of value to frequency and a map of frequency to a stack of values, plus the current maximum frequency.
For example, after pushing 5, 7, 5, 7, 4, 5, pop returns 5, then 7, then 5.
Push and pop are both O(1), and space is O(n).
One edge case is emptying the top frequency's stack, where I lower the maximum by one.`,

  32: `The key insight is that a valid substring can't span an unmatched ")", so unmatched positions act as boundaries.
So I use a stack of indices seeded with -1 as a base, and after each match I measure from the new top of the stack.
For example, with ")()())", the longest valid part is "()()", which has length 4.
This takes O(n) time and O(n) space.
One edge case is an unmatched ")" emptying the stack, where I push its index as the new base.`,
};
