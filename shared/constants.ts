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

export const ATTEMPT_MODES = ['practice', 'review', 'mock', 'explain'] as const;
export type AttemptMode = (typeof ATTEMPT_MODES)[number];

export const MOCK_KINDS = ['full', 'explain'] as const;
export type MockKind = (typeof MOCK_KINDS)[number];

/** 會同步到伺服器的資料集合；複習排程由練習紀錄推算，不需要同步 */
export const COLLECTIONS = ['attempts', 'mocks', 'notes', 'meta', 'patternNotes', 'customProblems', 'settings'] as const;
export type Collection = (typeof COLLECTIONS)[number];

/** 一次同步最多上傳、下載幾筆 */
export const SYNC_BATCH_SIZE = 500;

export const PASSWORD_MIN_LENGTH = 8;
