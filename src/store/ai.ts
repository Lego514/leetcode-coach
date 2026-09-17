import type { AiStatus, FeedbackRequest, FeedbackResponse } from '../../shared/protocol';
import { apiRequest, type FetchLike } from './api';

const fetchImpl: FetchLike = (input, init) => fetch(input, init);

export function fetchAiStatus(): Promise<AiStatus> {
  return apiRequest<AiStatus>(fetchImpl, '/api/ai/status');
}

/** 把逐字稿送到後端，由 Claude 產生講解回饋 */
export function requestExplanationFeedback(body: FeedbackRequest): Promise<FeedbackResponse> {
  return apiRequest<FeedbackResponse>(fetchImpl, '/api/ai/explanation-feedback', { method: 'POST', body });
}
