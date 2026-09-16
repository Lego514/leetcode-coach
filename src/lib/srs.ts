import { addDays, type Day } from './dates';

/**
 * 做完一題之後的自我評分：
 * - solo：自己一次解出
 * - hint：看了提示才解出
 * - solution：看了解答才寫出來
 * - fail：看完解答仍然不太懂
 */
export type Rating = 'solo' | 'hint' | 'solution' | 'fail';

export const RATINGS: { id: Rating; label: string; detail: string }[] = [
  { id: 'solo', label: '自己解出', detail: '沒看任何提示' },
  { id: 'hint', label: '看了提示', detail: '有方向後自己寫完' },
  { id: 'solution', label: '看了解答', detail: '照著解答理解後寫出' },
  { id: 'fail', label: '還不懂', detail: '看完解答仍然卡住' },
];

export function ratingLabel(rating: Rating): string {
  return RATINGS.find((r) => r.id === rating)?.label ?? rating;
}

export interface ReviewState {
  /** 連續成功的次數，失敗會歸零 */
  reps: number;
  ease: number;
  /** 距離下次複習的天數 */
  interval: number;
  lapses: number;
  due: Day;
}

export const INITIAL_EASE = 2.5;
export const MIN_EASE = 1.3;
export const MAX_EASE = 3.0;
export const MAX_INTERVAL = 120;

const clampEase = (ease: number) => Math.min(MAX_EASE, Math.max(MIN_EASE, Math.round(ease * 100) / 100));

/**
 * 簡化版 SM-2：把四種自評對應到下次複習的間隔。
 * 自己解出的題目間隔成長最快；看了解答或不會的題目隔天就再做一次。
 */
export function schedule(prev: ReviewState | undefined, rating: Rating, day: Day): ReviewState {
  const reps = prev?.reps ?? 0;
  const ease = prev?.ease ?? INITIAL_EASE;
  const interval = prev?.interval ?? 0;
  const lapses = prev?.lapses ?? 0;

  let next: Omit<ReviewState, 'due'>;
  switch (rating) {
    case 'solo': {
      const nextReps = reps + 1;
      const nextEase = clampEase(ease + 0.1);
      const nextInterval =
        nextReps === 1 ? 4 : nextReps === 2 ? 10 : Math.max(interval + 1, Math.round(interval * nextEase));
      next = { reps: nextReps, ease: nextEase, interval: nextInterval, lapses };
      break;
    }
    case 'hint': {
      const nextReps = reps + 1;
      const nextInterval = reps === 0 ? 2 : Math.max(interval + 1, Math.round(interval * 1.2));
      next = { reps: nextReps, ease: clampEase(ease - 0.15), interval: nextInterval, lapses };
      break;
    }
    case 'solution':
      next = { reps: 0, ease: clampEase(ease - 0.2), interval: 1, lapses: lapses + 1 };
      break;
    case 'fail':
      next = { reps: 0, ease: clampEase(ease - 0.3), interval: 1, lapses: lapses + 1 };
      break;
  }

  next.interval = Math.min(MAX_INTERVAL, next.interval);
  return { ...next, due: addDays(day, next.interval) };
}

export type Stage = 'new' | 'learning' | 'reviewing' | 'mastered';

export const STAGE_LABELS: Record<Stage, string> = {
  new: '還沒做',
  learning: '學習中',
  reviewing: '複習中',
  mastered: '已熟練',
};

export function stageOf(state: Pick<ReviewState, 'interval'> | undefined): Stage {
  if (!state) return 'new';
  if (state.interval < 7) return 'learning';
  if (state.interval < 30) return 'reviewing';
  return 'mastered';
}

/** 0 到 1 的熟練度：間隔 1 天約 0.2，7 天約 0.6，30 天以上為 1 */
export function masteryOf(state: Pick<ReviewState, 'interval'> | undefined): number {
  if (!state) return 0;
  return Math.min(1, Math.log2(state.interval + 1) / Math.log2(31));
}
