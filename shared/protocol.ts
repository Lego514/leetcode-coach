// API 的請求與回應格式。後端用這裡的 schema 驗證輸入，前端只引用型別。
import { z } from 'zod';
import {
  ATTEMPT_MODES,
  BOARD_COLORS,
  BOARD_MAX_BYTES,
  CARD_RESULTS,
  CELL_COLORS,
  COLLECTIONS,
  DIFFICULTIES,
  EXPLAIN_POINTS,
  LIST_IDS,
  LOCALE_IDS,
  MOCK_KINDS,
  PASSWORD_MIN_LENGTH,
  PATTERN_IDS,
  RATING_IDS,
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
});

/** 微複習的一次作答；卡片 id 像 pattern:217、tip:heap-max、signal:arrays:0 */
export const cardReviewDataSchema = z.object({
  cardId: z.string().regex(/^[a-z]+(?::[a-z0-9-]+)+$/).max(80),
  day,
  at: timestamp,
  result: z.enum(CARD_RESULTS),
});

// ---------- 白板 ----------

const boardElementId = z.string().regex(/^[a-z0-9]{1,12}$/);
const coord = z.number().min(-1e6).max(1e6);
const cell = text(40);
const boardEnd = z.union([z.object({ id: boardElementId }), z.object({ x: coord, y: coord })]);
const placed = { id: boardElementId, x: coord, y: coord };

/** 白板上的一個元件；陣列、表格這些結構化元件存的是內容，畫面依內容排版 */
export const boardElementSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('text'), ...placed, variant: z.enum(['heading', 'text', 'code', 'sticky']), text: text(2000), w: z.number().min(40).max(2000) }),
  z.object({
    type: z.literal('list'),
    ...placed,
    variant: z.enum(['array', 'stack', 'queue', 'set', 'linked', 'heap']),
    label: text(40),
    items: z.array(cell).max(64),
    /** 每一格的底色，跟 items 一一對應；沒有上色就沒有這一項 */
    colors: z.array(z.enum(CELL_COLORS).nullable()).max(64).optional(),
    /** 鏈結串列：第 i 個和第 i+1 個節點之間的連線，往後、反過來或斷開；沒寫就全部往後 */
    links: z.array(z.enum(['next', 'prev', 'none'])).max(63).optional(),
    /** 鏈結串列：尾巴接回第幾個節點（有環）；沒寫就是接到 null */
    cycle: z.number().int().min(0).max(63).optional(),
    /** 堆積：最小堆或最大堆（沒寫是最小堆） */
    order: z.enum(['min', 'max']).optional(),
    /** 堆積：只畫陣列或只畫樹；沒寫就兩個都畫 */
    view: z.enum(['array', 'tree']).optional(),
  }),
  z.object({ type: z.literal('table'), ...placed, variant: z.enum(['dict', 'grid', 'table']), label: text(40), rows: z.array(z.array(cell).max(26)).min(1).max(26) }),
  z.object({ type: z.literal('var'), ...placed, name: text(40), value: text(80) }),
  /** 二元樹：依層序存，第 i 個節點的子節點是 2i+1 和 2i+2，null 是沒有節點；最多 6 層 */
  z.object({
    type: z.literal('tree'),
    ...placed,
    label: text(40),
    nodes: z.array(cell.nullable()).min(1).max(63),
    colors: z.array(z.enum(CELL_COLORS).nullable()).max(63).optional(),
  }),
  z.object({ type: z.literal('node'), ...placed, variant: z.enum(['tree', 'list', 'graph']), value: cell }),
  /** 框出重點用的矩形框或圓形框；裡面是空的，不會擋到框住的元件 */
  z.object({
    type: z.literal('shape'),
    ...placed,
    variant: z.enum(['rect', 'ellipse']),
    w: z.number().min(8).max(4000),
    h: z.number().min(8).max(4000),
    color: z.enum(BOARD_COLORS),
  }),
  z.object({
    type: z.literal('pointer'),
    ...placed,
    name: text(12),
    /** 吸附在陣列、鏈結串列的哪一格，或二元樹的哪個節點；有吸附時位置跟著它走 */
    attach: z.object({ id: boardElementId, index: z.number().int().min(0).max(63) }).optional(),
  }),
  z.object({
    type: z.literal('arrow'),
    id: boardElementId,
    from: boardEnd,
    to: boardEnd,
    color: z.enum(BOARD_COLORS),
    /** none 是沒有箭頭的直線（例如無向圖的邊）；沒寫就是有箭頭 */
    head: z.enum(['end', 'none']).optional(),
  }),
  /** 圖：節點自動排成一圈；邊從 a 連到 b（有向時是 a → b），可以有權重、可以標記成走過 */
  z.object({
    type: z.literal('graph'),
    ...placed,
    label: text(40),
    nodes: z.array(cell).min(1).max(20),
    edges: z
      .array(
        z.object({
          a: z.number().int().min(0).max(19),
          b: z.number().int().min(0).max(19),
          w: text(12).optional(),
          mark: z.boolean().optional(),
        }),
      )
      .max(60),
    directed: z.boolean().optional(),
    colors: z.array(z.enum(CELL_COLORS).nullable()).max(20).optional(),
  }),
  /** 範圍框：框住同一個陣列上兩個指標之間的格子，指標移動時跟著變（滑動視窗）；位置由指標決定，不存座標 */
  z.object({
    type: z.literal('range'),
    id: boardElementId,
    from: boardElementId,
    to: boardElementId,
    color: z.enum(BOARD_COLORS),
  }),
  z.object({
    type: z.literal('stroke'),
    id: boardElementId,
    color: z.enum(BOARD_COLORS),
    /** 攤平的整數座標 x0, y0, x1, y1, … */
    points: z.array(z.number().int().min(-1e6).max(1e6)).min(2).max(4000),
  }),
]);

/** 逐步播放的一步：當時整張白板的快照，加上一句說明 */
export const boardStepSchema = z.object({
  id: boardElementId,
  caption: text(200),
  elements: z.array(boardElementSchema).max(800),
});

export const boardDocSchema = z.object({
  elements: z.array(boardElementSchema).max(800),
  /** 記下來的步驟，最多 50 步；沒記過就沒有這一項 */
  steps: z.array(boardStepSchema).max(50).optional(),
});
export type BoardDoc = z.infer<typeof boardDocSchema>;
export type BoardElement = BoardDoc['elements'][number];

export const boardDataSchema = z
  .object({ doc: boardDocSchema, updatedAt: timestamp })
  .refine((data) => JSON.stringify(data).length <= BOARD_MAX_BYTES, 'Board is too large');

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
