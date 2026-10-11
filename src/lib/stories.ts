import { BEHAVIORAL_THEMES, type BehavioralTheme } from '../../shared/constants';
import { STAR_PARTS, type StarPart } from '../data/behavioral';

// 行為面試的故事：每個主題有哪些故事，以及一個故事講起來大概多長。

/** 每個主題有哪些故事；一個故事可以回答好幾個主題 */
export function storiesByTheme<T extends { themes: readonly BehavioralTheme[] }>(stories: readonly T[]): Map<BehavioralTheme, T[]> {
  const map = new Map<BehavioralTheme, T[]>(BEHAVIORAL_THEMES.map((theme) => [theme, []]));
  for (const story of stories) for (const theme of story.themes) map.get(theme)?.push(story);
  return map;
}

/** 有故事的主題有幾個 */
export function coveredThemes(stories: readonly { themes: readonly BehavioralTheme[] }[]): number {
  return [...storiesByTheme(stories).values()].filter((list) => list.length > 0).length;
}

/** 英文口說大約每分鐘 140 個字 */
export const WORDS_PER_MINUTE = 140;

export type StoryParts = Record<StarPart, string>;

export type LengthVerdict = 'empty' | 'short' | 'good' | 'long';

export interface StoryLength {
  words: number;
  /** 講完大概幾秒 */
  seconds: number;
  verdict: LengthVerdict;
  /** 行動（你做了什麼）佔全部的比例；面試官最想聽這段 */
  actionShare: number;
}

const wordsIn = (text: string) => text.match(/\S+/g)?.length ?? 0;

/** 一個故事講起來多長：1.5 到 2.5 分鐘剛好，太短講不清楚，太長聽的人會失去耐心 */
export function storyLength(parts: StoryParts): StoryLength {
  const words = STAR_PARTS.reduce((sum, part) => sum + wordsIn(parts[part]), 0);
  const seconds = Math.round((words / WORDS_PER_MINUTE) * 60);
  const verdict: LengthVerdict = words === 0 ? 'empty' : seconds < 90 ? 'short' : seconds > 150 ? 'long' : 'good';
  return { words, seconds, verdict, actionShare: words === 0 ? 0 : wordsIn(parts.action) / words };
}

/** 行動那段太少：故事有一點長度之後，行動不到四成 */
export function needsMoreAction(length: StoryLength): boolean {
  return length.words >= 60 && length.actionShare < 0.4;
}

const FIRST_PERSON = /\b(i|i'm|i’m|i've|i’ve|i'd|i’d|i'll|i’ll|me|my|myself)\b/gi;
const PLURAL = /\b(we|we're|we’re|we've|we’ve|we'd|we’d|we'll|we’ll|our|ours|ourselves)\b/gi;

/** 回答裡講「我」和講「我們」各幾次；面試官想聽的是你自己做了什麼 */
export function pronounCounts(text: string): { i: number; we: number } {
  return { i: text.match(FIRST_PERSON)?.length ?? 0, we: text.match(PLURAL)?.length ?? 0 };
}

/** 從題目裡隨機抽一題，盡量不要跟上一題一樣 */
export function drawQuestion<T extends { id: string }>(questions: readonly T[], previous?: string, random = Math.random): T | undefined {
  const pool = questions.length > 1 ? questions.filter((q) => q.id !== previous) : questions;
  return pool[Math.floor(random() * pool.length)];
}
