import {
  BEHAVIORAL_RUBRIC,
  buildBehavioralMessage,
  buildUserMessage,
  EXPLAIN_RUBRIC,
  FOLLOW_UP_KIND_GUIDE,
  LANGUAGE_NAMES,
} from '../../shared/prompts';
import type { BehavioralFeedbackRequest, FeedbackRequest } from '../../shared/protocol';

// 「複製提示詞」：貼到自己的 ChatGPT 或 Claude 對話裡用。評分標準跟 App 裡的 AI 回饋同一份，
// 只是不要求 JSON，改請它用一般文字回答，評語用介面的語言。

const SPEECH_NOTE =
  'The transcript comes from speech recognition, so it may lack punctuation or contain misheard words. Judge what I meant and do not penalize recognition errors.';

/** 講解回饋：五個重點打分數、要改的句子、改寫成英文講法 */
export function explanationChatPrompt(request: FeedbackRequest): string {
  const lang = LANGUAGE_NAMES[request.language];
  return `I'm preparing for US software engineering interviews, and explaining my solution out loud in English is the skill I most want to improve. Below is a transcript of me explaining my solution to a LeetCode problem as if to an interviewer. ${SPEECH_NOTE}

Score my explanation on five points, each 0 (missing), 1 (mentioned but incomplete or unclear), or 2 (clear and correct):
${EXPLAIN_RUBRIC}

Also check that my approach and complexity are actually correct for this problem, and tell me if something is wrong.

Reply in ${lang}, in plain text:
1. The total score out of 10, and two or three sentences on how my explanation would come across to an interviewer.
2. Each of the five points with its score and a short comment.
3. Up to three specific things I did well.
4. Up to four phrases from my transcript to fix: quote the phrase exactly, then give a concrete rewrite or say what to add.
5. My explanation rewritten in natural spoken English (keep this part in English), 120 to 200 words. Keep my approach unless it is wrong, and cover all five points.

${buildUserMessage(request)}`;
}

/** 面試官追問：一次問一題、等我回答，三題問完再評分 */
export function followUpChatPrompt(request: FeedbackRequest): string {
  const lang = LANGUAGE_NAMES[request.language];
  return `Let's practice the follow-up part of a coding interview. You play the interviewer at a US tech company, and I'm practicing how to explain and defend my solution out loud in English. Below are the problem and a transcript of my explanation. ${SPEECH_NOTE}

Ask me the follow-up questions a real interviewer would most likely ask next, one at a time. Prefer questions about what my explanation left vague, skipped, or got wrong. Mix these kinds: ${FOLLOW_UP_KIND_GUIDE}. Ask each question in short spoken English, do not hint at the answer, and wait for my reply before asking the next one.

After I have answered three questions, grade each answer 0 (wrong or missing), 1 (on the right track but incomplete or vague), or 2 (correct, direct, and clear), with a short comment in ${lang}, and show how a strong candidate would answer it out loud in 40 to 90 words of English. If an answer is technically wrong, explain the correct reasoning. End with two sentences in ${lang} on how I handled being probed.

Start with your first question.

${buildUserMessage(request)}`;
}

/** 行為面試回饋：STAR 五個重點、要改的句子、照 STAR 改寫但不編造事實 */
export function behavioralChatPrompt(request: BehavioralFeedbackRequest): string {
  const lang = LANGUAGE_NAMES[request.language];
  return `I'm preparing for the behavioral round of US tech interviews, and telling a clear, specific story out loud in English is the skill I most want to improve. Below is the question, a transcript of my spoken answer, and sometimes the STAR notes I prepared beforehand. ${SPEECH_NOTE} Judge the spoken answer, not the notes; use the notes only to understand the story and to point out important details I prepared but left out.

Score my answer on five points, each 0 (missing), 1 (present but vague, too long, or unclear), or 2 (clear and specific). "The candidate" below means me:
${BEHAVIORAL_RUBRIC}

Reply in ${lang}, in plain text:
1. The total score out of 10, and two or three sentences on how my answer would come across. Mention the length if it is far from 1.5 to 2.5 minutes.
2. Each of the five points with its score and a short comment.
3. Up to three specific things I did well.
4. Up to four phrases from my transcript to fix: quote the phrase exactly, then give a concrete rewrite or say what to add.
5. My answer rewritten in natural spoken English following STAR (keep this part in English), 200 to 300 words. Keep my facts. Do not invent events, numbers, or names; where a number would help but I gave none, write a placeholder such as [X%].

${buildBehavioralMessage(request)}`;
}
