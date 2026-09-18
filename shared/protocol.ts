// API 的請求與回應格式。後端用這裡的 schema 驗證輸入，前端只引用型別。
import { z } from 'zod';
import {
  ATTEMPT_MODES,
  COLLECTIONS,
  DIFFICULTIES,
  EXPLAIN_POINTS,
  LIST_IDS,
  LOCALE_IDS,
  MOCK_KINDS,
  PASSWORD_MIN_LENGTH,
  PATTERN_IDS,
  RATING_IDS,
  SYNC_BATCH_SIZE,
  type Collection,
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

export const mockDataSchema = z.object({
  problemId: z.number().int().positive(),
  kind: z.enum(MOCK_KINDS),
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
});

export const noteDataSchema = z.object({
  idea: text(500),
  explanation: text(5000),
  time: text(100),
  space: text(100),
  pitfalls: text(5000),
  code: text(50_000),
  language: text(20),
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
});

const uuidKey = z.uuid();
const problemKey = z.string().regex(/^[1-9]\d{0,6}$/);

/** 每個集合的主鍵格式與資料格式 */
export const COLLECTION_SCHEMAS = {
  attempts: { key: uuidKey, data: attemptDataSchema },
  mocks: { key: uuidKey, data: mockDataSchema },
  notes: { key: problemKey, data: noteDataSchema },
  meta: { key: problemKey, data: metaDataSchema },
  patternNotes: { key: z.enum(PATTERN_IDS), data: patternNoteDataSchema },
  customProblems: { key: problemKey, data: customProblemDataSchema },
  settings: { key: z.literal('app'), data: settingsDataSchema },
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
