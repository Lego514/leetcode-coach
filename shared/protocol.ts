// API 的請求與回應格式。後端用這裡的 schema 驗證輸入，前端只引用型別。
import { BOARD_MAX_BYTES, boardDocSchema, type BoardDoc, type BoardElement } from 'dsa-whiteboard/schema';
import { z } from 'zod';
import {
  ATTEMPT_MODES,
  BEHAVIORAL_POINTS,
  BEHAVIORAL_THEMES,
  CARD_RESULTS,
  COLLECTIONS,
  DIFFICULTIES,
  EXPLAIN_POINTS,
  FOLLOW_UP_KINDS,
  LIST_IDS,
  LOCALE_IDS,
  MOCK_KINDS,
  PASSWORD_MIN_LENGTH,
  PATTERN_IDS,
  RATING_IDS,
  STUCK_REASONS,
  REPORT_KINDS,
  REPORT_MAX_LENGTH,
  STEP_NOTE_KEYS,
  SYNC_BATCH_SIZE,
  type Collection,
  type ReportKind,
} from './constants';

const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const timestamp = z.string().min(10).max(40);
const text = (max: number) => z.string().max(max);

export const attemptDataSchema = z.object({
  problemId: z.number().int().positive(),
  day,
  at: timestamp,
  rating: z.enum(RATING_IDS),
  minutes: z.number().int().min(1).max(600).optional(),
  mode: z.enum(ATTEMPT_MODES),
  hints: z.number().int().min(0).max(10).optional(),
  sawSolution: z.boolean().optional(),
  delayDays: z.number().int().min(1).max(365).optional(),
  /** 卡在哪；沒勾就沒有 */
  stuck: z.array(z.enum(STUCK_REASONS)).max(STUCK_REASONS.length).optional(),
  /** 事後改過的時間（ISO）；同步時用來判斷哪一版比較新 */
  editedAt: timestamp.optional(),
});

/** AI 對一次講解的回饋；分數 0 沒講到、1 講得不完整、2 講清楚 */
export const explanationFeedbackSchema = z.object({
  summary: text(1000),
  points: z
    .array(
      z.object({
        id: z.enum(EXPLAIN_POINTS),
        score: z.union([z.literal(0), z.literal(1), z.literal(2)]),
        comment: text(600),
      }),
    )
    .max(EXPLAIN_POINTS.length),
  strengths: z.array(text(300)).max(5),
  improvements: z
    .array(
      z.object({
        quote: text(300),
        suggestion: text(600),
      }),
    )
    .max(6),
  improvedScript: text(4000),
});
export type ExplanationFeedback = z.infer<typeof explanationFeedbackSchema>;

const score = z.union([z.literal(0), z.literal(1), z.literal(2)]);

/** 面試官的一個追問：英文的問題，和面試官想確認什麼（用介面語言） */
export const followUpQuestionSchema = z.object({
  kind: z.enum(FOLLOW_UP_KINDS),
  question: text(400),
  intent: text(400),
});
export type FollowUpQuestion = z.infer<typeof followUpQuestionSchema>;

/** 對追問回答的評分：每題 0 沒答到、1 不完整、2 清楚，加上更好的答法 */
export const followUpGradeSchema = z.object({
  summary: text(1000),
  answers: z.array(z.object({ score, comment: text(600), betterAnswer: text(1500) })).max(3),
});
export type FollowUpGrade = z.infer<typeof followUpGradeSchema>;

/** 存在練習紀錄裡的追問：問題、我的回答，有評分的話也一起存 */
export const followUpRecordSchema = z.object({
  items: z
    .array(
      followUpQuestionSchema.extend({
        answer: text(5000),
        score: score.optional(),
        comment: text(600).optional(),
        betterAnswer: text(1500).optional(),
      }),
    )
    .max(3),
  summary: text(1000).optional(),
});
export type FollowUpRecord = z.infer<typeof followUpRecordSchema>;

/** AI 對一次行為面試回答的回饋；分數 0 沒講到、1 不完整、2 清楚 */
export const behavioralFeedbackSchema = z.object({
  summary: text(1000),
  points: z
    .array(
      z.object({
        id: z.enum(BEHAVIORAL_POINTS),
        score: z.union([z.literal(0), z.literal(1), z.literal(2)]),
        comment: text(600),
      }),
    )
    .max(BEHAVIORAL_POINTS.length),
  strengths: z.array(text(300)).max(5),
  improvements: z
    .array(
      z.object({
        quote: text(300),
        suggestion: text(600),
      }),
    )
    .max(6),
  improvedAnswer: text(4000),
});
export type BehavioralFeedback = z.infer<typeof behavioralFeedbackSchema>;

export const mockDataSchema = z.object({
  problemId: z.number().int().positive(),
  kind: z.enum(MOCK_KINDS),
  /** 在白板上照著步驟講的講解練習 */
  board: z.boolean().optional(),
  day,
  startedAt: timestamp,
  limitSec: z.number().int().min(0).max(24 * 3600),
  usedSec: z.number().int().min(0).max(24 * 3600),
  steps: z.array(text(40)).max(20),
  rating: z.enum(RATING_IDS).optional(),
  clarity: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional(),
  hints: z.number().int().min(0).max(10).optional(),
  sawSolution: z.boolean().optional(),
  reflection: text(5000),
  transcript: text(20000).optional(),
  feedback: explanationFeedbackSchema.optional(),
  /** 講完之後面試官的追問和回答 */
  followUp: followUpRecordSchema.optional(),
  /** 自己貼回來的 ChatGPT 或 Claude 回覆 */
  chatReply: text(20000).optional(),
});

export const noteDataSchema = z.object({
  idea: text(500),
  explanation: text(5000),
  time: text(100),
  space: text(100),
  pitfalls: text(5000),
  code: text(50_000),
  language: text(20),
  /** 解題步驟每一步的一句話；舊版本的筆記沒有這個欄位 */
  steps: z.partialRecord(z.enum(STEP_NOTE_KEYS), text(1000)).optional(),
  updatedAt: timestamp,
});

export const metaDataSchema = z.object({
  companies: z.array(text(60)).max(50),
});

export const patternNoteDataSchema = z.object({
  template: text(20_000).optional(),
  notes: text(10_000),
  updatedAt: timestamp,
});

export const customProblemDataSchema = z.object({
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(120),
  title: z.string().min(1).max(200),
  difficulty: z.enum(DIFFICULTIES),
  pattern: z.enum(PATTERN_IDS),
  premium: z.boolean(),
});

export const settingsDataSchema = z.object({
  activeList: z.enum(LIST_IDS),
  dailyNew: z.number().int().min(0).max(20),
  language: text(20),
  targetDate: day.optional(),
  /** 複習排程的目標記憶率（FSRS）；沒寫是 0.9 */
  retention: z.number().min(0.7).max(0.97).optional(),
  /** 面試衝刺：面試日、公司、每天的時間、最後只複習幾天 */
  sprint: z
    .object({
      date: day,
      company: text(60).optional(),
      weekdayMinutes: z.number().int().min(0).max(24 * 60),
      weekendMinutes: z.number().int().min(0).max(24 * 60),
      reviewDays: z.number().int().min(0).max(14),
    })
    .optional(),
});

/** 微複習的一次作答；卡片 id 像 pattern:217、tip:heap-max、signal:arrays:0 */
export const cardReviewDataSchema = z.object({
  cardId: z.string().regex(/^[a-z]+(?::[a-z0-9-]+)+$/).max(80),
  day,
  at: timestamp,
  result: z.enum(CARD_RESULTS),
});

// ---------- 白板 ----------

// 白板內容的格式在 dsa-whiteboard 套件裡，這裡只包上存檔時間和大小限制
export type { BoardDoc, BoardElement };

export const boardDataSchema = z
  .object({ doc: boardDocSchema, updatedAt: timestamp })
  .refine((data) => JSON.stringify(data).length <= BOARD_MAX_BYTES, 'Board is too large');

/** 行為面試的一個故事，用 STAR 四段寫 */
export const storyDataSchema = z.object({
  title: text(120),
  situation: text(3000),
  task: text(3000),
  action: text(5000),
  result: text(3000),
  themes: z.array(z.enum(BEHAVIORAL_THEMES)).max(BEHAVIORAL_THEMES.length),
  updatedAt: timestamp,
});

/** 練習講一題行為面試：講了多久、逐字稿、自己勾的 STAR 檢查和 AI 回饋；錄音只留在本機 */
export const rehearsalDataSchema = z.object({
  questionId: z.string().regex(/^[a-z]+(?:-[a-z]+)+$/).max(60),
  storyId: z.uuid().optional(),
  day,
  startedAt: timestamp,
  limitSec: z.number().int().min(0).max(3600),
  usedSec: z.number().int().min(0).max(3600),
  covered: z.array(z.enum(BEHAVIORAL_POINTS)).max(BEHAVIORAL_POINTS.length),
  clarity: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional(),
  transcript: text(20000).optional(),
  feedback: behavioralFeedbackSchema.optional(),
  /** 自己貼回來的 ChatGPT 或 Claude 回覆 */
  chatReply: text(20000).optional(),
});

const uuidKey = z.uuid();
const problemKey = z.string().regex(/^[1-9]\d{0,6}$/);

/** 每個集合的主鍵格式與資料格式 */
export const COLLECTION_SCHEMAS = {
  attempts: { key: uuidKey, data: attemptDataSchema },
  stories: { key: uuidKey, data: storyDataSchema },
  rehearsals: { key: uuidKey, data: rehearsalDataSchema },
  mocks: { key: uuidKey, data: mockDataSchema },
  notes: { key: problemKey, data: noteDataSchema },
  meta: { key: problemKey, data: metaDataSchema },
  patternNotes: { key: z.enum(PATTERN_IDS), data: patternNoteDataSchema },
  customProblems: { key: problemKey, data: customProblemDataSchema },
  settings: { key: z.literal('app'), data: settingsDataSchema },
  cardReviews: { key: uuidKey, data: cardReviewDataSchema },
  /** scratch 是自由白板，p 加題號是那一題的白板 */
  boards: { key: z.string().regex(/^(scratch|p[1-9]\d{0,6})$/), data: boardDataSchema },
} satisfies Record<Collection, { key: z.ZodType<string>; data: z.ZodType }>;

export type CollectionData = { [C in Collection]: z.infer<(typeof COLLECTION_SCHEMAS)[C]['data']> };

/** 一筆變更：deleted 為 true 時沒有 data（刪除標記） */
export interface SyncChange {
  collection: Collection;
  key: string;
  /** 用戶端修改的時間（epoch 毫秒），衝突時較新的勝出；相同時保留伺服器上已有的版本 */
  updatedAt: number;
  deleted: boolean;
  data?: unknown;
}

const rawChangeSchema = z.object({
  collection: z.enum(COLLECTIONS),
  key: z.string().min(1).max(64),
  updatedAt: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  deleted: z.boolean(),
  data: z.unknown().optional(),
});

export const syncRequestSchema = z.object({
  /** 上次同步拿到的伺服器版本號，第一次同步為 0 */
  cursor: z.number().int().nonnegative(),
  changes: z.array(rawChangeSchema).max(SYNC_BATCH_SIZE),
});
export type SyncRequest = z.infer<typeof syncRequestSchema>;

export interface SyncResponse {
  cursor: number;
  /** 還有更多變更，需要再呼叫一次 */
  hasMore: boolean;
  /** 伺服器上比 cursor 新的變更 */
  changes: SyncChange[];
  /** 伺服器上已經有更新的版本而沒有套用的上傳，附上伺服器目前的版本 */
  rejected: SyncChange[];
}

export type ChangeValidation = { ok: true; change: SyncChange } | { ok: false; message: string };

/** 依集合檢查主鍵與資料；刪除標記不能帶資料 */
export function validateChange(raw: z.infer<typeof rawChangeSchema>): ChangeValidation {
  const schemas = COLLECTION_SCHEMAS[raw.collection];
  if (!schemas.key.safeParse(raw.key).success) {
    return { ok: false, message: `Invalid key for ${raw.collection}` };
  }
  if (raw.deleted) {
    if (raw.data !== undefined && raw.data !== null) {
      return { ok: false, message: 'Deleted changes must not include data' };
    }
    return { ok: true, change: { collection: raw.collection, key: raw.key, updatedAt: raw.updatedAt, deleted: true } };
  }
  const parsed = schemas.data.safeParse(raw.data);
  if (!parsed.success) {
    return { ok: false, message: `Invalid ${raw.collection} data: ${parsed.error.issues[0]?.message ?? 'unknown error'}` };
  }
  return {
    ok: true,
    change: { collection: raw.collection, key: raw.key, updatedAt: raw.updatedAt, deleted: false, data: parsed.data },
  };
}

export const credentialsSchema = z.object({
  email: z.string().trim().toLowerCase().max(254).pipe(z.email()),
  password: z.string().min(PASSWORD_MIN_LENGTH).max(200),
});
export type Credentials = z.infer<typeof credentialsSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().max(254).pipe(z.email()),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(10).max(200),
  password: z.string().min(PASSWORD_MIN_LENGTH).max(200),
});

export const deleteAccountSchema = z.object({
  password: z.string().min(1).max(200),
});

export interface PublicUser {
  id: string;
  email: string;
  createdAt: string;
}

export type ApiErrorCode =
  | 'invalid_request'
  | 'unsupported_media_type'
  | 'forbidden_origin'
  | 'email_taken'
  | 'invalid_credentials'
  | 'unauthorized'
  | 'forbidden'
  | 'rate_limited'
  | 'payload_too_large'
  | 'not_found'
  | 'ai_unavailable'
  | 'ai_quota_exceeded'
  | 'ai_not_allowed'
  | 'ai_failed'
  | 'mail_unavailable'
  | 'invalid_token'
  | 'server_error';

export interface ApiErrorBody {
  error: { code: ApiErrorCode; message: string };
}

export const feedbackRequestSchema = z.object({
  problem: z.object({
    id: z.number().int().positive().max(9_999_999),
    title: z.string().trim().min(1).max(200),
    difficulty: z.enum(DIFFICULTIES),
    pattern: z.string().trim().min(1).max(80),
  }),
  /** 語音辨識出來、使用者可能修正過的英文逐字稿 */
  transcript: z.string().trim().min(20).max(20_000),
  seconds: z.number().int().min(0).max(24 * 3600),
  language: z.enum(LOCALE_IDS),
});
export type FeedbackRequest = z.infer<typeof feedbackRequestSchema>;

/** 請面試官追問：跟講解回饋送一樣的東西 */
export const followUpQuestionsRequestSchema = feedbackRequestSchema;

/** 請 Claude 評分追問的回答；沒講話的回答可以是空的 */
export const followUpGradeRequestSchema = feedbackRequestSchema.extend({
  answers: z
    .array(z.object({ question: z.string().trim().min(1).max(400), answer: z.string().trim().max(5000) }))
    .min(1)
    .max(3),
});
export type FollowUpGradeRequest = z.infer<typeof followUpGradeRequestSchema>;

export interface FollowUpQuestionsResponse {
  questions: FollowUpQuestion[];
  usedToday: number;
  dailyLimit: number;
}

export interface FollowUpGradeResponse {
  grade: FollowUpGrade;
  usedToday: number;
  dailyLimit: number;
}

export const behavioralFeedbackRequestSchema = z.object({
  /** 面試官問的英文題目 */
  question: z.string().trim().min(1).max(300),
  /** 事先寫好的 STAR 筆記，有選故事才有 */
  story: z
    .object({
      title: z.string().max(120),
      situation: z.string().max(3000),
      task: z.string().max(3000),
      action: z.string().max(5000),
      result: z.string().max(3000),
    })
    .optional(),
  transcript: z.string().trim().min(20).max(20_000),
  seconds: z.number().int().min(0).max(24 * 3600),
  language: z.enum(LOCALE_IDS),
});
export type BehavioralFeedbackRequest = z.infer<typeof behavioralFeedbackRequestSchema>;

export interface BehavioralFeedbackResponse {
  feedback: BehavioralFeedback;
  usedToday: number;
  dailyLimit: number;
}

export interface AiStatus {
  available: boolean;
  /** available 為 false 的原因：伺服器沒設定 API key，或這個帳號不在允許名單 */
  reason?: 'not_configured' | 'not_allowed';
  dailyLimit: number;
  usedToday: number;
}

export interface FeedbackResponse {
  feedback: ExplanationFeedback;
  usedToday: number;
  dailyLimit: number;
}

/** 回報附上的資訊：從哪個頁面送出、哪張卡、剛才的錯誤訊息、版本與瀏覽器 */
export const reportContextSchema = z
  .object({
    page: text(200).optional(),
    card: z
      .object({
        id: text(100),
        question: text(500),
        answer: text(500).optional(),
        picked: text(500).optional(),
      })
      .strict()
      .optional(),
    error: text(2000).optional(),
    version: text(40).optional(),
    userAgent: text(400).optional(),
    language: text(20).optional(),
    screen: text(20).optional(),
  })
  .strict();
export type ReportContext = z.infer<typeof reportContextSchema>;

export const reportRequestSchema = z.object({
  kind: z.enum(REPORT_KINDS),
  message: z.string().trim().min(1).max(REPORT_MAX_LENGTH),
  /** 沒登入時可以留聯絡方式；登入時用帳號的 email */
  contact: z.string().trim().max(200).optional(),
  context: reportContextSchema,
});
export type ReportRequest = z.infer<typeof reportRequestSchema>;

export const reportResolveSchema = z.object({ resolved: z.boolean() });

export interface ReportItem {
  id: string;
  kind: ReportKind;
  message: string;
  context: ReportContext;
  createdAt: string;
  resolvedAt: string | null;
  /** 只有管理者看得到：登入帳號的 email，或沒登入時留的聯絡方式 */
  from?: string | null;
}

export interface ReportsResponse {
  /** 管理者看到所有人的回報，其他人只看到自己的 */
  admin: boolean;
  reports: ReportItem[];
}
