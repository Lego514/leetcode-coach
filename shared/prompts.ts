import type { BehavioralFeedbackRequest, FeedbackRequest } from './protocol';

// AI 回饋的評分標準和送出的訊息格式。後端呼叫 Claude 時用，
// 前端「複製提示詞」貼到 ChatGPT 或 Claude 時也用同一份，兩邊的標準才會一致。

/** 講解的五個重點，各 0、1、2 分 */
export const EXPLAIN_RUBRIC = `- insight: the key observation and why the approach works
- structure: the data structures used and why they fit
- walkthrough: tracing a small concrete example through the algorithm
- complexity: time and space complexity, with the reason for each
- edge: at least one relevant edge case and how it is handled`;

/** 行為面試回答的五個重點 */
export const BEHAVIORAL_RUBRIC = `- situation: just enough context to follow the story, without dragging on
- task: what the candidate was personally responsible for, or the goal
- action: the specific steps the candidate took and why; this should be most of the answer
- result: a concrete outcome, ideally with numbers, and what they learned
- ownership: speaks about their own contribution ("I" rather than a vague "we") and actually answers the question that was asked`;

/** 面試官追問的類型 */
export const FOLLOW_UP_KIND_GUIDE = 'edge (an input that might break the solution), complexity (justify or derive time or space), optimize (can it be faster or use less memory), alternative (another approach and its trade-offs), correctness (why it works, or a claim that looks wrong), implementation (a detail of how the code would do something)';

export const LANGUAGE_NAMES: Record<FeedbackRequest['language'], string> = {
  'zh-TW': 'Traditional Chinese (Taiwan)',
  en: 'English',
};

export function formatSeconds(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

export function buildUserMessage(request: FeedbackRequest): string {
  const { problem } = request;
  return [
    `Problem: ${problem.id}. ${problem.title} (${problem.difficulty}, pattern: ${problem.pattern})`,
    `Speaking time: ${formatSeconds(request.seconds)}`,
    `Feedback language: ${LANGUAGE_NAMES[request.language]}`,
    '',
    '<transcript>',
    request.transcript,
    '</transcript>',
  ].join('\n');
}

export function buildBehavioralMessage(request: BehavioralFeedbackRequest): string {
  const lines = [
    `Question: ${request.question}`,
    `Speaking time: ${formatSeconds(request.seconds)}`,
    `Feedback language: ${LANGUAGE_NAMES[request.language]}`,
  ];
  const { story } = request;
  if (story) {
    lines.push(
      '',
      '<notes>',
      `Title: ${story.title}`,
      `Situation: ${story.situation}`,
      `Task: ${story.task}`,
      `Action: ${story.action}`,
      `Result: ${story.result}`,
      '</notes>',
    );
  }
  lines.push('', '<transcript>', request.transcript, '</transcript>');
  return lines.join('\n');
}
