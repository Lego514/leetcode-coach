import { useEffect, useSyncExternalStore } from 'react';
import type {
  AiStatus,
  BehavioralFeedbackRequest,
  BehavioralFeedbackResponse,
  FeedbackRequest,
  FeedbackResponse,
  FollowUpGradeRequest,
  FollowUpGradeResponse,
  FollowUpQuestionsResponse,
} from '../../shared/protocol';
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
} from '../../shared/ai';
import { buildBehavioralMessage, buildUserMessage } from '../../shared/prompts';
import { askJson, LlmError, PROVIDER_INFO, type LlmConfig } from '../lib/llm';
import { ApiError, apiRequest, type FetchLike } from './api';
import { ownAi, useOwnAi } from './ownAi';

const fetchImpl: FetchLike = (input, init) => fetch(input, init);

export function fetchAiStatus(): Promise<AiStatus> {
  return apiRequest<AiStatus>(fetchImpl, '/api/ai/status');
}

// 每個 AI 功能都有兩條路：設了自己的金鑰就從瀏覽器直接問那家 AI（提示詞、評分標準和伺服器同一份，shared/ai.ts）；
// 沒有的話送到後端，用伺服器的金鑰和每日額度。回傳的格式一樣，畫面不用分兩套

/** 自己的金鑰失敗時轉成跟後端一樣的錯誤，畫面照樣用 errors.api 顯示 */
async function own<T>(config: LlmConfig, run: (config: LlmConfig) => Promise<T>): Promise<T> {
  try {
    return await run(config);
  } catch (err) {
    if (!(err instanceof LlmError)) throw new ApiError(0, 'ai_failed', err instanceof Error ? err.message : 'AI request failed');
    const code = err.reason === 'key' ? 'ai_key_invalid' : err.reason === 'busy' ? 'ai_busy' : err.reason === 'network' ? 'network_error' : 'ai_failed';
    throw new ApiError(err.status ?? 0, code, err.message);
  }
}

/** 自己的金鑰沒有每日額度 */
const NO_QUOTA = { usedToday: 0, dailyLimit: 0 };

/** 講解回饋：逐字稿交給 AI 依五個重點評分 */
export async function requestExplanationFeedback(body: FeedbackRequest): Promise<FeedbackResponse> {
  const config = ownAi();
  if (!config) return apiRequest<FeedbackResponse>(fetchImpl, '/api/ai/explanation-feedback', { method: 'POST', body });
  const feedback = await own(config, (c) =>
    askJson(c, { system: EXPLANATION_PROMPT, schema: EXPLANATION_SCHEMA, message: buildUserMessage(body), normalize: normalizeFeedback }),
  );
  return { feedback, ...NO_QUOTA };
}

/** 行為面試的回答，依 STAR 給回饋 */
export async function requestBehavioralFeedback(body: BehavioralFeedbackRequest): Promise<BehavioralFeedbackResponse> {
  const config = ownAi();
  if (!config) return apiRequest<BehavioralFeedbackResponse>(fetchImpl, '/api/ai/behavioral-feedback', { method: 'POST', body });
  const feedback = await own(config, (c) =>
    askJson(c, { system: BEHAVIORAL_PROMPT, schema: BEHAVIORAL_SCHEMA, message: buildBehavioralMessage(body), normalize: normalizeBehavioralFeedback }),
  );
  return { feedback, ...NO_QUOTA };
}

/** 講完之後請面試官追問兩三題 */
export async function requestFollowUpQuestions(body: FeedbackRequest): Promise<FollowUpQuestionsResponse> {
  const config = ownAi();
  if (!config) return apiRequest<FollowUpQuestionsResponse>(fetchImpl, '/api/ai/follow-up-questions', { method: 'POST', body });
  const questions = await own(config, (c) =>
    askJson(c, { system: FOLLOW_UP_PROMPT, schema: FOLLOW_UP_SCHEMA, message: buildUserMessage(body), normalize: normalizeFollowUpQuestions }),
  );
  return { questions, ...NO_QUOTA };
}

/** 追問都回答完，請 AI 評分 */
export async function requestFollowUpGrade(body: FollowUpGradeRequest): Promise<FollowUpGradeResponse> {
  const config = ownAi();
  if (!config) return apiRequest<FollowUpGradeResponse>(fetchImpl, '/api/ai/follow-up-grade', { method: 'POST', body });
  const grade = await own(config, (c) =>
    askJson(c, {
      system: GRADE_PROMPT,
      schema: GRADE_SCHEMA,
      message: buildGradeMessage(body),
      normalize: (raw) => normalizeGrade(raw, body.answers.length),
    }),
  );
  return { grade, ...NO_QUOTA };
}

/** 用自己的金鑰時的 AI 狀態：一定能用、沒有每日上限；own 是供應商的名稱 */
export type AiAccess = AiStatus & { own?: string };

// 同一頁可能有好幾個 AI 功能，共用一份剩餘次數，用掉一次大家一起更新
let currentStatus: AiStatus | null = null;
const listeners = new Set<() => void>();

export function setAiStatus(status: AiStatus): void {
  currentStatus = status;
  for (const listener of listeners) listener();
}

/** 用掉一次之後，照後端回傳的次數更新 */
export function updateAiUsage(usedToday: number, dailyLimit: number): void {
  if (ownAi()) return;
  setAiStatus({ available: true, dailyLimit, usedToday });
}

/** 今天的次數用完了 */
export function markAiQuotaUsed(): void {
  if (currentStatus) setAiStatus({ ...currentStatus, usedToday: currentStatus.dailyLimit });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * AI 能不能用：設了自己的金鑰就一定能用（不用登入、沒有每日上限）；
 * 沒有的話登入時讀一次伺服器的狀態（能不能用、今天還剩幾次），沒登入是 null
 */
export function useAiStatus(signedIn: boolean): AiAccess | null {
  const config = useOwnAi();
  const status = useSyncExternalStore(subscribe, () => currentStatus);
  useEffect(() => {
    if (!signedIn) return;
    let active = true;
    fetchAiStatus()
      .then((s) => active && setAiStatus(s))
      .catch(() => active && setAiStatus({ available: false, dailyLimit: 0, usedToday: 0 }));
    return () => {
      active = false;
    };
  }, [signedIn]);
  if (config) return { available: true, dailyLimit: 0, usedToday: 0, own: PROVIDER_INFO[config.provider].label };
  return signedIn ? status : null;
}
