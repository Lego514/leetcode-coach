import Anthropic from '@anthropic-ai/sdk';
import type {
  BehavioralFeedback,
  BehavioralFeedbackRequest,
  ExplanationFeedback,
  FeedbackRequest,
  FollowUpGrade,
  FollowUpGradeRequest,
  FollowUpQuestion,
} from '../../../shared/protocol';
import {
  BEHAVIORAL_PROMPT,
  BEHAVIORAL_SCHEMA,
  buildGradeMessage,
  EXPLANATION_PROMPT,
  EXPLANATION_SCHEMA,
  FOLLOW_UP_PROMPT,
  FOLLOW_UP_SCHEMA,
  GRADE_PROMPT,
  GRADE_SCHEMA,
  normalizeBehavioralFeedback,
  normalizeFeedback,
  normalizeFollowUpQuestions,
  normalizeGrade,
} from '../../../shared/ai';
import { buildBehavioralMessage, buildUserMessage } from '../../../shared/prompts';

// 提示詞、schema、整理輸出的函式放在 shared/ai.ts，使用者在瀏覽器用自己的金鑰時也用同一份
export { buildBehavioralMessage, buildGradeMessage, buildUserMessage, normalizeBehavioralFeedback, normalizeFeedback, normalizeFollowUpQuestions, normalizeGrade };

export const FEEDBACK_MODEL = 'claude-opus-5-5';

export interface Usage {
  inputTokens: number;
  outputTokens: number;
}

export interface FeedbackResult {
  feedback: ExplanationFeedback;
  usage: Usage;
}

/** 產生講解回饋；測試時換成假的實作，不會呼叫真正的 API */
export type FeedbackGenerator = (request: FeedbackRequest) => Promise<FeedbackResult>;

export interface BehavioralFeedbackResult {
  feedback: BehavioralFeedback;
  usage: Usage;
}

/** 產生行為面試回答的回饋 */
export type BehavioralFeedbackGenerator = (request: BehavioralFeedbackRequest) => Promise<BehavioralFeedbackResult>;

/** 面試官追問：先出題，回答完再評分；兩次都是一次 API 呼叫 */
export interface FollowUpGenerator {
  ask: (request: FeedbackRequest) => Promise<{ feedback: FollowUpQuestion[]; usage: Usage }>;
  grade: (request: FollowUpGradeRequest) => Promise<{ feedback: FollowUpGrade; usage: Usage }>;
}

export type FeedbackFailure = 'refused' | 'busy' | 'invalid_output' | 'failed';

export class FeedbackError extends Error {
  constructor(
    readonly reason: FeedbackFailure,
    message: string,
    readonly usage?: Usage,
  ) {
    super(message);
  }
}

type Log = (message: string, error?: unknown) => void;

/** 呼叫 Claude、要求照 JSON schema 回答，再整理成資料格式；失敗時說明是哪一種 */
async function askClaude<T>(
  client: Anthropic,
  log: Log,
  { system, schema, message, normalize }: { system: string; schema: Record<string, unknown>; message: string; normalize: (raw: unknown) => T },
): Promise<{ feedback: T; usage: Usage }> {
  let response;
  try {
    response = await client.beta.messages.create({
      model: FEEDBACK_MODEL,
      max_tokens: 16000,
      // Claude 婉拒時由伺服器自動改用建議的備援模型重試
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      // Opus 5.5 一定會思考，預設的思考深度是 medium；評分要抓出錯的複雜度和做法，用 high，跟原本 Opus 5 的預設一樣
      output_config: { effort: 'high', format: { type: 'json_schema', schema } },
      system,
      messages: [{ role: 'user', content: message }],
    });
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError || err instanceof Anthropic.InternalServerError) {
      throw new FeedbackError('busy', 'Claude is busy, try again later');
    }
    if (err instanceof Anthropic.APIConnectionError) {
      throw new FeedbackError('busy', 'Could not reach Claude');
    }
    log('Claude feedback request failed', err);
    throw new FeedbackError('failed', 'Claude request failed');
  }

  const usage = {
    inputTokens:
      response.usage.input_tokens + (response.usage.cache_creation_input_tokens ?? 0) + (response.usage.cache_read_input_tokens ?? 0),
    outputTokens: response.usage.output_tokens,
  };

  if (response.stop_reason === 'refusal') {
    throw new FeedbackError('refused', 'Claude declined this request', usage);
  }
  if (response.stop_reason === 'max_tokens') {
    throw new FeedbackError('invalid_output', 'Feedback was cut off', usage);
  }

  const text = response.content.flatMap((block) => (block.type === 'text' ? [block.text] : [])).join('');
  try {
    return { feedback: normalize(JSON.parse(text)), usage };
  } catch (err) {
    log('Claude feedback was not valid', err);
    throw new FeedbackError('invalid_output', 'Feedback was not in the expected format', usage);
  }
}

export function createClaudeFeedback(apiKey: string, log: Log): FeedbackGenerator {
  const client = new Anthropic({ apiKey, timeout: 120_000, maxRetries: 2 });
  return (request) =>
    askClaude(client, log, { system: EXPLANATION_PROMPT, schema: EXPLANATION_SCHEMA, message: buildUserMessage(request), normalize: normalizeFeedback });
}

export function createClaudeBehavioralFeedback(apiKey: string, log: Log): BehavioralFeedbackGenerator {
  const client = new Anthropic({ apiKey, timeout: 120_000, maxRetries: 2 });
  return (request) =>
    askClaude(client, log, {
      system: BEHAVIORAL_PROMPT,
      schema: BEHAVIORAL_SCHEMA,
      message: buildBehavioralMessage(request),
      normalize: normalizeBehavioralFeedback,
    });
}

export function createClaudeFollowUp(apiKey: string, log: Log): FollowUpGenerator {
  const client = new Anthropic({ apiKey, timeout: 120_000, maxRetries: 2 });
  return {
    ask: (request) =>
      askClaude(client, log, {
        system: FOLLOW_UP_PROMPT,
        schema: FOLLOW_UP_SCHEMA,
        message: buildUserMessage(request),
        normalize: normalizeFollowUpQuestions,
      }),
    grade: (request) =>
      askClaude(client, log, {
        system: GRADE_PROMPT,
        schema: GRADE_SCHEMA,
        message: buildGradeMessage(request),
        normalize: (raw) => normalizeGrade(raw, request.answers.length),
      }),
  };
}
