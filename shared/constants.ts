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

/** 行為面試故事可以回答的主題（名稱和說明在 i18n 字典） */
export const BEHAVIORAL_THEMES = [
  'conflict',
  'failure',
  'leadership',
  'deadline',
  'ambiguity',
  'influence',
  'learning',
  'proud',
  'feedback',
  'teamwork',
] as const;
export type BehavioralTheme = (typeof BEHAVIORAL_THEMES)[number];

/** 行為面試回答的五個評分重點：STAR 四段，再加上講的是「我」做了什麼 */
/** 做完一題時勾的「卡在哪」：沒看出模式、想不到優化、知道做法但寫不出來、漏了邊界情況、有 bug、時間不夠 */
export const STUCK_REASONS = ['pattern', 'optimize', 'implement', 'edge', 'bug', 'time'] as const;
export type StuckReason = (typeof STUCK_REASONS)[number];

/** 面試官追問的類型：邊界情況、複雜度、能不能更好、換個做法、正確性、實作細節 */
export const FOLLOW_UP_KINDS = ['edge', 'complexity', 'optimize', 'alternative', 'correctness', 'implementation'] as const;
export type FollowUpKind = (typeof FOLLOW_UP_KINDS)[number];

export const BEHAVIORAL_POINTS = ['situation', 'task', 'action', 'result', 'ownership'] as const;
export type BehavioralPoint = (typeof BEHAVIORAL_POINTS)[number];

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
  'stories',
  'rehearsals',
] as const;
export type Collection = (typeof COLLECTIONS)[number];

/**
 * 解題步驟每一步寫的一句話，存在題目筆記的 steps 裡。
 * 舉例拆成例子和邊界情況，優化拆成三個問題：笨在哪、哪裡重複算、要留下什麼。
 */
export const STEP_NOTE_KEYS = ['clarify', 'example', 'edge', 'brute', 'slow', 'repeated', 'keep', 'code', 'test', 'complexity'] as const;
export type StepNoteKey = (typeof STEP_NOTE_KEYS)[number];

/** 回報的種類：程式錯誤、內容有錯、看不懂、建議、其他 */
export const REPORT_KINDS = ['bug', 'wrong', 'unclear', 'idea', 'other'] as const;
export type ReportKind = (typeof REPORT_KINDS)[number];

/** 回報內容最多幾個字 */
export const REPORT_MAX_LENGTH = 2000;

/** 一次同步最多上傳、下載幾筆 */
export const SYNC_BATCH_SIZE = 500;

export const PASSWORD_MIN_LENGTH = 8;
