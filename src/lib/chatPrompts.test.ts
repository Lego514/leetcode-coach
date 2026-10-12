import { describe, expect, it } from 'vitest';
import { BEHAVIORAL_RUBRIC, EXPLAIN_RUBRIC, FOLLOW_UP_KIND_GUIDE } from '../../shared/prompts';
import type { BehavioralFeedbackRequest, FeedbackRequest } from '../../shared/protocol';
import { behavioralChatPrompt, explanationChatPrompt, followUpChatPrompt } from './chatPrompts';

const request: FeedbackRequest = {
  problem: { id: 1, title: 'Two Sum', difficulty: 'Easy', pattern: 'Arrays & Hashing' },
  transcript: 'I use a hash map from value to index.',
  seconds: 95,
  language: 'zh-TW',
};

describe('chat prompts', () => {
  it('asks for explanation feedback on the same five points, in the UI language, with the transcript at the end', () => {
    const prompt = explanationChatPrompt(request);
    expect(prompt).toContain(EXPLAIN_RUBRIC);
    expect(prompt).toContain('Reply in Traditional Chinese (Taiwan), in plain text');
    expect(prompt).toContain('Problem: 1. Two Sum (Easy, pattern: Arrays & Hashing)');
    expect(prompt).toContain('Speaking time: 1:35');
    expect(prompt.trimEnd().endsWith('<transcript>\nI use a hash map from value to index.\n</transcript>')).toBe(true);
    expect(explanationChatPrompt({ ...request, language: 'en' })).toContain('Reply in English');
  });

  it('turns the chat into an interviewer that asks one question at a time, then grades', () => {
    const prompt = followUpChatPrompt(request);
    expect(prompt).toContain(FOLLOW_UP_KIND_GUIDE);
    expect(prompt).toContain('one at a time');
    expect(prompt).toContain('wait for my reply');
    expect(prompt).toContain('Start with your first question.');
    expect(prompt).toContain('I use a hash map from value to index.');
  });

  it('asks for STAR feedback with the notes, without inventing facts', () => {
    const behavioral: BehavioralFeedbackRequest = {
      question: 'Tell me about a time you failed.',
      story: { title: 'Pipeline fix', situation: 'Nightly jobs failed.', task: 'I owned it.', action: 'I added retries.', result: 'No failures.' },
      transcript: 'We had failing jobs and I added retries.',
      seconds: 80,
      language: 'en',
    };
    const prompt = behavioralChatPrompt(behavioral);
    expect(prompt).toContain(BEHAVIORAL_RUBRIC);
    expect(prompt).toContain('Question: Tell me about a time you failed.');
    expect(prompt).toContain('<notes>\nTitle: Pipeline fix');
    expect(prompt).toContain('Do not invent events, numbers, or names');
    expect(behavioralChatPrompt({ ...behavioral, story: undefined })).not.toContain('<notes>');
  });
});
