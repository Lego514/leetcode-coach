import { EXPLAIN_POINTS } from '../../shared/constants';

export interface Phrase {
  en: string;
  zh: string;
}

export type StepId = 'clarify' | 'examples' | 'brute' | 'optimize' | 'code' | 'test' | 'complexity';

/** 名稱、目標與檢查項目在 i18n 字典的 interview.steps */
export interface InterviewStep {
  id: StepId;
  english: string;
  phrases: Phrase[];
}

/** 美國技術面試常見的解題流程，模擬面試會依序走過 */
export const INTERVIEW_STEPS: InterviewStep[] = [
  {
    id: 'clarify',
    english: 'Clarify',
    phrases: [
      { en: 'Let me restate the problem to make sure I understand it correctly.', zh: '我先重述一次題目，確認我理解正確。' },
      { en: "Can the input be empty, or can I assume there's at least one element?", zh: '輸入可能是空的嗎？還是可以假設至少有一個元素？' },
      { en: 'Can there be duplicates or negative numbers?', zh: '會有重複值或負數嗎？' },
      { en: 'Roughly how large can the input get?', zh: '輸入大概會有多大？' },
      { en: 'Should I return the indices or the values themselves?', zh: '要回傳 index 還是值本身？' },
      { en: 'Is the input sorted, or should I not assume that?', zh: '輸入是排序過的嗎？還是不能這樣假設？' },
      { en: 'Is it okay if I modify the input in place?', zh: '我可以直接修改輸入嗎？' },
    ],
  },
  {
    id: 'examples',
    english: 'Examples',
    phrases: [
      { en: 'Let me walk through a small example first.', zh: '我先用一個小例子走一遍。' },
      { en: "For this input, I'd expect the output to be 4, because…", zh: '這個輸入我預期輸出是 4，因為……' },
      { en: 'Some edge cases I want to keep in mind are an empty array and a single element.', zh: '我要注意的邊界情況有空陣列和只有一個元素。' },
      { en: 'Does this example match what you have in mind?', zh: '這個例子跟你預期的一樣嗎？' },
    ],
  },
  {
    id: 'brute',
    english: 'Brute force',
    phrases: [
      { en: 'The most straightforward approach would be to check every pair.', zh: '最直接的做法是檢查每一對。' },
      { en: 'That would be O(n²) time and O(1) space.', zh: '這樣是 O(n²) 時間、O(1) 空間。' },
      { en: "It works, but it's probably too slow for large inputs, so let me think about how to optimize it.", zh: '這樣可行，但輸入很大時可能太慢，我想想怎麼優化。' },
    ],
  },
  {
    id: 'optimize',
    english: 'Optimize',
    phrases: [
      { en: 'The bottleneck is that we keep looking up the same values.', zh: '瓶頸在於我們一直重複查找同樣的值。' },
      { en: "If I store what I've seen in a hash map, each lookup becomes O(1).", zh: '如果把看過的值存進 hash map，每次查找就變成 O(1)。' },
      { en: 'Since the array is sorted, I can use two pointers from both ends.', zh: '因為陣列是排序的，我可以從兩端用雙指標。' },
      { en: 'This brings the time down to O(n), at the cost of O(n) extra space.', zh: '這樣時間降到 O(n)，代價是 O(n) 的額外空間。' },
      { en: 'Does this approach sound reasonable before I start coding?', zh: '開始寫程式之前，這個做法聽起來合理嗎？' },
    ],
  },
  {
    id: 'code',
    english: 'Code',
    phrases: [
      { en: "I'll start by initializing a dictionary to keep track of the indices.", zh: '我先初始化一個 dictionary 來記錄 index。' },
      { en: 'This loop goes through each element once.', zh: '這個迴圈會把每個元素走過一次。' },
      { en: "I'll pull this part into a helper function to keep the main logic clean.", zh: '這部分我拆成 helper function，讓主邏輯比較清楚。' },
      { en: "Let me leave a note here and come back to this edge case.", zh: '我先在這裡留個註記，等等再回來處理這個邊界情況。' },
    ],
  },
  {
    id: 'test',
    english: 'Test',
    phrases: [
      { en: 'Now let me trace through the code with our example.', zh: '我現在用剛才的例子追蹤一次程式。' },
      { en: 'At this point, left is 0 and right is 3, so the sum is 7.', zh: '這時候 left 是 0、right 是 3，所以總和是 7。' },
      { en: "I think there's an off-by-one error here. Let me fix it.", zh: '這裡應該有差一的錯誤，我來修正。' },
      { en: 'Let me also check the empty input case.', zh: '我也檢查一下空輸入的情況。' },
    ],
  },
  {
    id: 'complexity',
    english: 'Complexity',
    phrases: [
      { en: 'The time complexity is O(n log n) because of the sorting step.', zh: '因為排序，時間複雜度是 O(n log n)。' },
      { en: 'The space complexity is O(n) because of the hash map.', zh: '因為 hash map，空間複雜度是 O(n)。' },
      { en: 'If memory were tight, we could sort first and trade some time for space.', zh: '如果記憶體有限，可以先排序，用時間換空間。' },
      { en: "If the input came in as a stream, I'd keep a running count instead.", zh: '如果輸入是資料流，我會改成維護一個累計的計數。' },
    ],
  },
];

export interface PhraseGroup {
  id: 'stuck' | 'wrap-up';
  phrases: Phrase[];
}

/** 不屬於特定步驟、但面試中常用到的句子 */
export const EXTRA_PHRASE_GROUPS: PhraseGroup[] = [
  {
    id: 'stuck',
    phrases: [
      { en: 'Let me think about this for a moment.', zh: '讓我想一下。' },
      { en: "I'm considering two options: a heap or sorting. Let me compare them.", zh: '我在考慮兩個方向：heap 或排序，我比較一下。' },
      { en: "I'm a bit stuck on this part. Would you mind giving me a small hint?", zh: '這部分我有點卡住，可以給我一點提示嗎？' },
      { en: "I don't remember the exact method name, so I'll assume it works like this.", zh: '我不記得確切的方法名稱，先假設它是這樣運作。' },
      { en: 'Let me go back to the example and see what pattern shows up.', zh: '我回到例子，看看會出現什麼規律。' },
    ],
  },
  {
    id: 'wrap-up',
    phrases: [
      { en: 'Thanks, I enjoyed working through that problem.', zh: '謝謝，這題解起來很有意思。' },
      { en: 'What does a typical week look like for engineers on your team?', zh: '你們團隊的工程師，一週通常在做什麼？' },
      { en: 'How does the team decide what to build next?', zh: '團隊怎麼決定下一步要做什麼？' },
      { en: 'What do you enjoy most about working here?', zh: '你最喜歡在這裡工作的哪一點？' },
      { en: 'How do new grads usually ramp up on the team?', zh: '新鮮人進團隊通常怎麼上手？' },
    ],
  },
];

/** 每題「英文講解稿」的起手架構 */
/** 講解稿的架構，順序跟講解練習的五個重點（EXPLAIN_CHECKS）一致 */
export const EXPLANATION_SCAFFOLD = `The key insight is that ...
So I use a ... because ...
For example, with ..., I ... and end up with ...
This takes O(...) time because ..., and O(...) space for ...
One edge case is ..., which I handle by ...`;

export const MOCK_MINUTES = { Easy: 15, Medium: 25, Hard: 40 } as const;
export const EXPLAIN_SECONDS = 120;

/** 講解練習：兩分鐘內要講到的重點（文字在 interview.explainChecks） */
export const EXPLAIN_CHECKS = EXPLAIN_POINTS;
export type ExplainCheck = (typeof EXPLAIN_CHECKS)[number];

/** 講解練習的自評（文字在 interview.clarity） */
export const CLARITY_OPTIONS = [1, 2, 3] as const;
