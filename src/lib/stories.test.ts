import { describe, expect, it } from 'vitest';
import { BEHAVIORAL_QUESTIONS, BEHAVIORAL_THEMES, STAR_PARTS, STAR_PHRASES } from '../data/behavioral';
import { coveredThemes, drawQuestion, needsMoreAction, pronounCounts, storiesByTheme, storyLength } from './stories';

const words = (n: number) => Array.from({ length: n }, () => 'word').join(' ');

describe('behavioral question bank', () => {
  it('has three questions for every theme, with unique ids, translations, and what they look for', () => {
    for (const theme of BEHAVIORAL_THEMES) expect(BEHAVIORAL_QUESTIONS.filter((q) => q.theme === theme), theme).toHaveLength(3);
    expect(new Set(BEHAVIORAL_QUESTIONS.map((q) => q.id)).size).toBe(BEHAVIORAL_QUESTIONS.length);
    for (const q of BEHAVIORAL_QUESTIONS) {
      expect(q.en && q.zh && q.focus.en && q.focus.zh, q.id).toBeTruthy();
      expect(/[\u4e00-\u9fff]/.test(q.en + q.focus.en), q.id).toBe(false);
    }
    for (const part of STAR_PARTS) expect(STAR_PHRASES[part].length).toBeGreaterThanOrEqual(3);
  });
});

describe('story coverage', () => {
  it('lists the stories for each theme, a story counting for every theme it has', () => {
    const a = { id: 'a', themes: ['conflict', 'teamwork'] as const };
    const b = { id: 'b', themes: ['conflict'] as const };
    const map = storiesByTheme([a, b]);
    expect(map.get('conflict')!.map((s) => s.id)).toEqual(['a', 'b']);
    expect(map.get('teamwork')!.map((s) => s.id)).toEqual(['a']);
    expect(map.get('failure')).toEqual([]);
    expect(coveredThemes([a, b])).toBe(2);
    expect(coveredThemes([])).toBe(0);
  });
});

describe('story length', () => {
  const story = (s: number, t: number, a: number, r: number) => ({ situation: words(s), task: words(t), action: words(a), result: words(r) });

  it('estimates speaking time at about 140 words a minute', () => {
    expect(storyLength(story(0, 0, 0, 0))).toMatchObject({ words: 0, verdict: 'empty' });
    expect(storyLength(story(30, 20, 120, 40))).toMatchObject({ words: 210, seconds: 90, verdict: 'good' });
    expect(storyLength(story(10, 10, 40, 10)).verdict).toBe('short');
    expect(storyLength(story(80, 60, 200, 60)).verdict).toBe('long');
  });

  it('flags a story that is mostly background instead of what you did', () => {
    expect(needsMoreAction(storyLength(story(80, 40, 30, 30)))).toBe(true);
    expect(needsMoreAction(storyLength(story(30, 20, 120, 40)))).toBe(false);
    // 太短的還不用提醒
    expect(needsMoreAction(storyLength(story(20, 10, 5, 5)))).toBe(false);
  });
});

describe('practicing out loud', () => {
  it('counts how often you say “I” versus “we”', () => {
    expect(pronounCounts('We had a problem, so I traced it. I’m proud of my fix, and our team adopted it.')).toEqual({ i: 3, we: 2 });
    expect(pronounCounts('')).toEqual({ i: 0, we: 0 });
  });

  it('draws a question other than the last one', () => {
    const questions = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
    expect(drawQuestion(questions, 'a', () => 0)?.id).toBe('b');
    expect(drawQuestion(questions, 'c', () => 0.99)?.id).toBe('b');
    expect(drawQuestion([{ id: 'a' }], 'a')?.id).toBe('a');
    expect(drawQuestion([])).toBeUndefined();
  });
});
