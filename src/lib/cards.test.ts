import { describe, expect, it } from 'vitest';
import { cardReviewDataSchema } from '../../shared/protocol';
import { EXPLANATIONS_EN } from '../data/explanations';
import { getPatterns, PATTERN_ORDER } from '../data/patterns';
import { BUILTIN_PROBLEMS } from '../data/problems';
import { PYTHON_TIPS } from '../data/tips';
import {
  buildDeck,
  cardStates,
  confusableWith,
  dealCard,
  dealRound,
  formatBigO,
  keyInsight,
  nextBox,
  parseComplexity,
  pickRound,
  splitComplexityKey,
  type CardRef,
  type DealContext,
} from './cards';

// 中日韓文字與全形標點；用字元碼組出範圍，原始碼裡才不會出現全形空白
const range = (from: number, to: number) => `${String.fromCharCode(from)}-${String.fromCharCode(to)}`;
const CJK = new RegExp(`[${range(0x3000, 0x303f)}${range(0x4e00, 0x9fff)}${range(0xff00, 0xffef)}]`);

/** 可重現的亂數 */
function seeded(seed = 1) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

const problems = new Map(BUILTIN_PROBLEMS.map((p) => [p.id, p]));
const signalCounts = Object.fromEntries(getPatterns('zh-TW').map((p) => [p.id, p.signals.length]));
const context: DealContext = {
  problems,
  explanations: EXPLANATIONS_EN,
  tipOptionCounts: new Map(PYTHON_TIPS.map((t) => [t.id, t.options.length])),
};

const review = (cardId: string, day: string, result: 'good' | 'fuzzy' | 'again', time = '12:00') => ({
  cardId,
  day,
  at: `${day}T${time}:00.000Z`,
  result,
});

describe('card scheduling', () => {
  it('moves up a box when right, stays when fuzzy, and drops to zero when wrong', () => {
    expect(nextBox(0, 'good')).toBe(1);
    expect(nextBox(5, 'good')).toBe(5);
    expect(nextBox(0, 'fuzzy')).toBe(1);
    expect(nextBox(3, 'fuzzy')).toBe(3);
    expect(nextBox(4, 'again')).toBe(0);
  });

  it('replays reviews in time order', () => {
    const states = cardStates([
      review('tip:a', '2026-10-03', 'good'),
      review('tip:a', '2026-10-01', 'good'),
      review('tip:b', '2026-10-01', 'again'),
    ]);
    expect(states.get('tip:a')).toMatchObject({ box: 2, due: '2026-10-06', reviews: 2 });
    // 答錯當天就到期，下一回合會再出現
    expect(states.get('tip:b')).toMatchObject({ box: 0, due: '2026-10-01' });
  });
});

describe('reference explanation parsing', () => {
  it('reads the time and space complexity from most explanations', () => {
    expect(parseComplexity(EXPLANATIONS_EN[1])).toEqual({ time: 'O(n)', space: 'O(n)' });
    expect(parseComplexity(EXPLANATIONS_EN[4])).toEqual({ time: 'O(log(min(m, n)))', space: 'O(1)' });
    expect(parseComplexity(EXPLANATIONS_EN[148])).toEqual({ time: 'O(n log n)', space: 'O(log n)' });
    expect(parseComplexity(EXPLANATIONS_EN[1197])).toEqual({ time: 'O(max(x, y)^2)', space: 'O(max(x, y)^2)' });
    // 句型不清楚的不出卡
    expect(parseComplexity(EXPLANATIONS_EN[22])).toBeNull();
    expect(parseComplexity(EXPLANATIONS_EN[199])).toBeNull();
    expect(parseComplexity(EXPLANATIONS_EN[202])).toBeNull();
    expect(parseComplexity(EXPLANATIONS_EN[692])).toBeNull();

    const parsed = Object.values(EXPLANATIONS_EN).map(parseComplexity).filter(Boolean);
    expect(parsed.length).toBeGreaterThan(180);
    for (const c of parsed) {
      expect(c!.time).toMatch(/^O\(.+\)$/);
      expect(c!.space).toMatch(/^O\(.+\)$/);
    }
  });

  it('turns the first line into a standalone key insight', () => {
    expect(keyInsight(EXPLANATIONS_EN[217])).toBe("A duplicate exists exactly when I see a value I've already seen.");
    for (const text of Object.values(EXPLANATIONS_EN)) expect(keyInsight(text)).not.toMatch(/^The key insight/);
  });

  it('writes "times" as a multiplication sign', () => {
    expect(formatBigO('O(m times n)')).toBe('O(m × n)');
  });
});

describe('deck', () => {
  it('only makes problem cards for attempted problems', () => {
    const deck = buildDeck({
      problems: [problems.get(1)!, problems.get(22)!],
      explanations: EXPLANATIONS_EN,
      signalCounts,
      tipIds: ['heap-min'],
    });
    const ids = deck.map((c) => c.id);
    expect(ids).toEqual(expect.arrayContaining(['pattern:1', 'insight:1', 'complexity:1', 'explain:1', 'pattern:22', 'tip:heap-min']));
    // 22 的複雜度句子不是固定句型
    expect(ids).not.toContain('complexity:22');
    expect(ids.some((id) => id.startsWith('pattern:217'))).toBe(false);
    expect(ids.filter((id) => id.startsWith('signal:arrays:'))).toHaveLength(signalCounts.arrays);
  });

  it('builds ids the server accepts', () => {
    const deck = buildDeck({ problems: BUILTIN_PROBLEMS, explanations: EXPLANATIONS_EN, signalCounts, tipIds: PYTHON_TIPS.map((t) => t.id) });
    expect(new Set(deck.map((c) => c.id)).size).toBe(deck.length);
    for (const card of deck) {
      const ok = cardReviewDataSchema.safeParse({ cardId: card.id, day: '2026-10-05', at: '2026-10-05T12:00:00.000Z', result: 'good' }).success;
      expect(ok, card.id).toBe(true);
    }
  });
});

describe('picking a round', () => {
  const deck = buildDeck({
    problems: BUILTIN_PROBLEMS.slice(0, 20),
    explanations: EXPLANATIONS_EN,
    signalCounts,
    tipIds: PYTHON_TIPS.map((t) => t.id),
  });

  it('deals five cards without two cards about the same problem', () => {
    for (let seed = 1; seed < 30; seed += 1) {
      const round = pickRound(deck, new Map(), '2026-10-05', seeded(seed));
      expect(round).toHaveLength(5);
      const problemIds = round.flatMap((c) => ('problemId' in c ? [c.problemId] : []));
      expect(new Set(problemIds).size).toBe(problemIds.length);
    }
  });

  it('puts due cards first but keeps a slot for a new card', () => {
    const due = deck.filter((c) => c.kind === 'tip').slice(0, 6);
    const states = cardStates(due.map((c, i) => review(c.id, '2026-10-01', 'good', `1${i}:00`)));
    const round = pickRound(deck, states, '2026-10-05', seeded(3));
    const fromDue = round.filter((c) => states.has(c.id));
    expect(fromDue).toHaveLength(4);
    // 最久沒看的先出
    expect(fromDue.map((c) => c.id).sort()).toEqual(due.slice(0, 4).map((c) => c.id).sort());
  });

  it('skips cards that are not due yet while new cards remain', () => {
    const tip = deck.find((c) => c.kind === 'tip')!;
    const states = cardStates([review(tip.id, '2026-10-05', 'good')]);
    for (let seed = 1; seed < 10; seed += 1) {
      expect(pickRound(deck, states, '2026-10-05', seeded(seed)).map((c) => c.id)).not.toContain(tip.id);
    }
  });

  it('still fills a round when every card has been seen', () => {
    const small: CardRef[] = deck.filter((c) => c.kind === 'tip').slice(0, 3);
    const states = cardStates(small.map((c) => review(c.id, '2026-10-05', 'good')));
    expect(pickRound(small, states, '2026-10-05', seeded(1))).toHaveLength(3);
  });
});

describe('dealing cards', () => {
  it('gives every card four distinct options with the right answer among them', () => {
    const deck = buildDeck({ problems: BUILTIN_PROBLEMS, explanations: EXPLANATIONS_EN, signalCounts, tipIds: PYTHON_TIPS.map((t) => t.id) });
    const random = seeded(7);
    for (const ref of deck) {
      const card = dealCard(ref, context, random);
      expect(card, ref.id).not.toBeNull();
      if (ref.kind === 'explain') {
        expect(card!.options).toEqual([]);
        continue;
      }
      expect(new Set(card!.options).size, ref.id).toBe(4);
      expect(card!.answer, ref.id).toBeGreaterThanOrEqual(0);
    }
  });

  it('marks the right pattern, problem, and complexity as the answer', () => {
    const random = seeded(2);
    const pattern = dealCard({ id: 'pattern:1', kind: 'pattern', problemId: 1 }, context, random)!;
    expect(pattern.options[pattern.answer]).toBe('arrays');
    const insight = dealCard({ id: 'insight:1', kind: 'insight', problemId: 1 }, context, random)!;
    expect(insight.options[insight.answer]).toBe('1');
    const complexity = dealCard({ id: 'complexity:1', kind: 'complexity', problemId: 1 }, context, random)!;
    expect(splitComplexityKey(complexity.options[complexity.answer])).toEqual({ time: 'O(n)', space: 'O(n)' });
    // 干擾選項只差時間或空間其中一個
    for (const [i, key] of complexity.options.entries()) {
      if (i === complexity.answer) continue;
      const { time, space } = splitComplexityKey(key);
      expect(time === 'O(n)' || space === 'O(n)').toBe(true);
    }
    const tip = dealCard({ id: 'tip:heap-min', kind: 'tip', tipId: 'heap-min' }, context, random)!;
    expect(tip.options[tip.answer]).toBe('0');
  });

  it('never offers a pattern that could also be right as a distractor', () => {
    expect(confusableWith('heap')).toEqual(new Set(['linked-list']));
    expect(confusableWith('dp-1d')).toEqual(new Set(['dp-2d', 'greedy']));
    for (let seed = 1; seed < 40; seed += 1) {
      const card = dealCard({ id: 'signal:dp-1d:0', kind: 'signal', patternId: 'dp-1d', index: 0 }, context, seeded(seed))!;
      expect(card.options).not.toContain('dp-2d');
      expect(card.options).not.toContain('greedy');
      // Merge k Sorted Lists 在題庫裡算串列題，用堆積解也對
      const mergeK = dealCard({ id: 'pattern:23', kind: 'pattern', problemId: 23 }, context, seeded(seed))!;
      expect(mergeK.options).toContain('linked-list');
      expect(mergeK.options).not.toContain('heap');
    }
  });

  it('skips cards whose problem is gone', () => {
    expect(dealCard({ id: 'pattern:99999', kind: 'pattern', problemId: 99999 }, context)).toBeNull();
    const deck: CardRef[] = [
      { id: 'pattern:99999', kind: 'pattern', problemId: 99999 },
      { id: 'tip:heap-min', kind: 'tip', tipId: 'heap-min' },
    ];
    expect(dealRound(deck, new Map(), '2026-10-05', context).map((c) => c.ref.id)).toEqual(['tip:heap-min']);
  });
});

describe('Python tips', () => {
  it('have unique ids and four distinct options', () => {
    expect(new Set(PYTHON_TIPS.map((t) => t.id)).size).toBe(PYTHON_TIPS.length);
    expect(PYTHON_TIPS.length).toBeGreaterThanOrEqual(40);
    for (const tip of PYTHON_TIPS) {
      expect(new Set(tip.options).size, tip.id).toBe(4);
      expect(tip.code || tip.question, tip.id).toBeTruthy();
    }
  });

  it('keep Chinese out of the code, options, and English text', () => {
    for (const tip of PYTHON_TIPS) {
      const english = [tip.code ?? '', ...tip.options, tip.why.en, tip.question?.en ?? ''];
      expect(english.filter((text) => CJK.test(text)), tip.id).toEqual([]);
      expect(tip.why.zh, tip.id).toMatch(CJK);
    }
  });
});

describe('pattern signals', () => {
  it('have the same number of clues in every language', () => {
    const zh = getPatterns('zh-TW');
    const en = getPatterns('en');
    for (const id of PATTERN_ORDER) {
      expect(en.find((p) => p.id === id)!.signals.length, id).toBe(zh.find((p) => p.id === id)!.signals.length);
    }
  });
});
