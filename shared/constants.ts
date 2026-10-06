// 前端與後端共用的識別碼。只放常數，不引入任何套件，前端打包時不會多帶東西。

export const PATTERN_IDS = [
  'arrays',
  'two-pointers',
  'sliding-window',
  'stack',
  'binary-search',
  'linked-list',
  'trees',
  'tries',
  'heap',
  'backtracking',
  'graphs',
  'adv-graphs',
  'dp-1d',
  'dp-2d',
  'greedy',
  'intervals',
  'math',
  'bits',
] as const;
export type PatternId = (typeof PATTERN_IDS)[number];

export const LIST_IDS = ['neetcode150', 'blind75', 'grind169'] as const;
export type ListId = (typeof LIST_IDS)[number];

export const DIFFICULTIES = ['Easy', 'Medium', 'Hard'] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

export const RATING_IDS = ['solo', 'hint', 'solution', 'fail'] as const;
export type Rating = (typeof RATING_IDS)[number];

/** import：開始使用前就刷過的題目，批次標記進複習排程，不算在練習次數裡 */
export const ATTEMPT_MODES = ['practice', 'review', 'mock', 'explain', 'import'] as const;
export type AttemptMode = (typeof ATTEMPT_MODES)[number];

export const MOCK_KINDS = ['full', 'explain'] as const;

/** 講解時要講到的五個重點，自我檢查與 AI 回饋共用 */
export const EXPLAIN_POINTS = ['insight', 'structure', 'walkthrough', 'complexity', 'edge'] as const;
export type ExplainPoint = (typeof EXPLAIN_POINTS)[number];

/** 介面語言；AI 回饋的說明文字也用這個語言 */
export const LOCALE_IDS = ['zh-TW', 'en'] as const;
export type MockKind = (typeof MOCK_KINDS)[number];

/** 微複習卡片的作答結果：答對或記得、有點模糊、答錯或忘了 */
export const CARD_RESULTS = ['good', 'fuzzy', 'again'] as const;
export type CardResult = (typeof CARD_RESULTS)[number];

/** 會同步到伺服器的資料集合；複習排程由練習紀錄推算，不需要同步 */
export const COLLECTIONS = [
  'attempts',
  'mocks',
  'notes',
  'meta',
  'patternNotes',
  'customProblems',
  'settings',
  'cardReviews',
  'boards',
] as const;
export type Collection = (typeof COLLECTIONS)[number];

/** 一張白板最多約 400 KB，一次同步的請求才不會太大 */
export const BOARD_MAX_BYTES = 400_000;

/** 白板的筆跡與箭頭顏色；畫面上對應到各自的 CSS 變數 */
export const BOARD_COLORS = ['ink', 'red', 'blue', 'green', 'orange'] as const;
export type BoardColor = (typeof BOARD_COLORS)[number];

/** 白板陣列格子可以上的底色，追蹤時標出看過的、視窗裡的格子 */
export const CELL_COLORS = ['yellow', 'green', 'blue', 'red', 'purple', 'gray'] as const;
export type CellColor = (typeof CELL_COLORS)[number];

/** 一次同步最多上傳、下載幾筆 */
export const SYNC_BATCH_SIZE = 500;

export const PASSWORD_MIN_LENGTH = 8;
