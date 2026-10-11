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
import { apiRequest, type FetchLike } from './api';

const fetchImpl: FetchLike = (input, init) => fetch(input, init);

export function fetchAiStatus(): Promise<AiStatus> {
  return apiRequest<AiStatus>(fetchImpl, '/api/ai/status');
}

/** 把逐字稿送到後端，由 Claude 產生講解回饋 */
export function requestExplanationFeedback(body: FeedbackRequest): Promise<FeedbackResponse> {
  return apiRequest<FeedbackResponse>(fetchImpl, '/api/ai/explanation-feedback', { method: 'POST', body });
}

/** 行為面試的回答送到後端，由 Claude 依 STAR 給回饋 */
export function requestBehavioralFeedback(body: BehavioralFeedbackRequest): Promise<BehavioralFeedbackResponse> {
  return apiRequest<BehavioralFeedbackResponse>(fetchImpl, '/api/ai/behavioral-feedback', { method: 'POST', body });
}

/** 講完之後請面試官追問兩三題 */
export function requestFollowUpQuestions(body: FeedbackRequest): Promise<FollowUpQuestionsResponse> {
  return apiRequest<FollowUpQuestionsResponse>(fetchImpl, '/api/ai/follow-up-questions', { method: 'POST', body });
}

/** 追問都回答完，請 Claude 評分 */
export function requestFollowUpGrade(body: FollowUpGradeRequest): Promise<FollowUpGradeResponse> {
  return apiRequest<FollowUpGradeResponse>(fetchImpl, '/api/ai/follow-up-grade', { method: 'POST', body });
}

// 同一頁可能有好幾個 AI 功能，共用一份剩餘次數，用掉一次大家一起更新
let currentStatus: AiStatus | null = null;
const listeners = new Set<() => void>();

export function setAiStatus(status: AiStatus): void {
  currentStatus = status;
  for (const listener of listeners) listener();
}

/** 用掉一次之後，照後端回傳的次數更新 */
export function updateAiUsage(usedToday: number, dailyLimit: number): void {
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

/** 登入時讀一次 AI 的狀態（能不能用、今天還剩幾次）；沒登入是 null */
export function useAiStatus(signedIn: boolean): AiStatus | null {
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
  return signedIn ? status : null;
}
