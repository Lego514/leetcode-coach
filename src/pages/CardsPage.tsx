import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { useToast } from '../components/toast';
import { DifficultyTag } from '../components/ui';
import { EXPLANATIONS_EN } from '../data/explanations';
import { getPattern, getPatterns, type PatternId } from '../data/patterns';
import { PYTHON_TIPS } from '../data/tips';
import { useI18n, type Messages } from '../i18n';
import type { Locale } from '../i18n/locale';
import { bold, rich } from '../i18n/rich';
import type { Catalog } from '../lib/catalog';
import {
  buildDeck,
  cardStates,
  dealRound,
  formatBigO,
  keyInsight,
  splitComplexityKey,
  type CardResult,
  type DealtCard,
} from '../lib/cards';
import { practiceAttempts, practiceStreak, streakDays } from '../lib/stats';
import { recordCardReview } from '../store/actions';
import type { AttemptRecord, CardReviewRecord, ProgressRecord } from '../store/db';
import { useAttempts, useCardReviews, useCatalog, useProgressMap, useToday } from '../store/queries';

const TIPS = new Map(PYTHON_TIPS.map((tip) => [tip.id, tip]));
const TIP_IDS = PYTHON_TIPS.map((tip) => tip.id);
const TIP_OPTION_COUNTS = new Map(PYTHON_TIPS.map((tip) => [tip.id, tip.options.length]));
// 各語言的線索數量相同（有測試檢查），用中文版來數
const SIGNAL_COUNTS = Object.fromEntries(getPatterns('zh-TW').map((p) => [p.id, p.signals.length]));
const RATE_ORDER: CardResult[] = ['good', 'fuzzy', 'again'];

export function CardsPage() {
  const { t } = useI18n();
  const catalog = useCatalog();
  const { progress, loaded } = useProgressMap();
  const reviews = useCardReviews();
  const attempts = useAttempts();
  const [round, setRound] = useState(0);

  const ready = loaded && catalog.loaded && reviews !== undefined && attempts !== undefined;
  return (
    <div className="page">
      {ready ? (
        <Round
          key={round}
          catalog={catalog}
          progress={progress}
          reviews={reviews}
          attempts={attempts}
          onAgain={() => setRound((n) => n + 1)}
        />
      ) : (
        <p aria-busy="true">{t.common.loading}</p>
      )}
    </div>
  );
}

interface RoundProps {
  catalog: Catalog;
  progress: ReadonlyMap<number, ProgressRecord>;
  reviews: CardReviewRecord[];
  attempts: AttemptRecord[];
  onAgain: () => void;
}

/** 一回合：開始時發好牌，之後資料變動也不重發 */
function Round({ catalog, progress, reviews, attempts, onAgain }: RoundProps) {
  const { t, locale } = useI18n();
  const day = useToday();
  const toast = useToast();
  const [cards] = useState(() => {
    // 只出做過的題目，沒做過的會被參考講法劇透
    const attempted = catalog.problems.filter((p) => progress.has(p.id));
    const deck = buildDeck({ problems: attempted, explanations: EXPLANATIONS_EN, signalCounts: SIGNAL_COUNTS, tipIds: TIP_IDS });
    return dealRound(deck, cardStates(reviews), day, {
      problems: catalog.byId,
      explanations: EXPLANATIONS_EN,
      tipOptionCounts: TIP_OPTION_COUNTS,
    });
  });
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [results, setResults] = useState<CardResult[]>([]);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);

  const card = cards[index] as DealtCard | undefined;
  const answered = results.length > index;
  const isLast = index === cards.length - 1;

  // 換卡時回到最上面，焦點移到題目，螢幕閱讀器會念出新題目
  useEffect(() => {
    if (index === 0) return;
    window.scrollTo({ top: 0 });
    headingRef.current?.focus({ preventScroll: true });
  }, [index]);

  // 選擇題答完後，焦點移到「下一張」，按 Enter 或空白鍵就能繼續
  useEffect(() => {
    if (answered && card && card.options.length > 0) nextRef.current?.focus({ preventScroll: true });
  }, [answered, card]);

  const save = (result: CardResult) => {
    if (!card || answered) return;
    setResults((prev) => [...prev, result]);
    recordCardReview(card.ref.id, result).catch(() => toast(t.cards.saveFailed));
  };

  const next = () => {
    setIndex((i) => i + 1);
    setPicked(null);
    setRevealed(false);
  };

  const choose = (i: number) => {
    if (!card || answered) return;
    setPicked(i);
    save(i === card.answer ? 'good' : 'again');
  };

  const rate = (result: CardResult) => {
    if (answered) return;
    save(result);
    next();
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!card || e.altKey || e.ctrlKey || e.metaKey) return;
      // 焦點在按鈕上時，Enter 和空白鍵交給按鈕本身處理
      const onControl = e.target instanceof HTMLElement && e.target.closest('button, a, input, textarea, select');
      if (onControl && (e.key === 'Enter' || e.key === ' ')) return;
      const digit = Number(e.key);
      if (card.options.length > 0) {
        if (!answered && digit >= 1 && digit <= card.options.length) choose(digit - 1);
        else if (answered && e.key === 'Enter') next();
      } else if (!revealed && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        setRevealed(true);
      } else if (revealed && digit >= 1 && digit <= RATE_ORDER.length) {
        rate(RATE_ORDER[digit - 1]);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (!card) {
    const todayCount = reviews.filter((r) => r.day === day).length;
    const streak = practiceStreak(streakDays(practiceAttempts(attempts), reviews), day);
    return <Summary results={results} todayCount={todayCount} streak={streak} onAgain={onAgain} />;
  }

  const { ref } = card;
  const problem = 'problemId' in ref ? catalog.byId.get(ref.problemId) : undefined;
  const explanation = problem ? EXPLANATIONS_EN[problem.id] : undefined;
  const tip = ref.kind === 'tip' ? TIPS.get(ref.tipId) : undefined;
  const lang = locale === 'en' ? 'en' : 'zh';
  const right = answered && results[index] === 'good';
  const isChoice = card.options.length > 0;

  return (
    <div className="flash">
      <div className="flash-top">
        <h1 className="flash-title">{t.cards.title}</h1>
        <span className="flash-count">{t.cards.progress(index + 1, cards.length)}</span>
        <Link className="btn btn-quiet btn-small" to="/">
          {t.cards.quit}
        </Link>
      </div>
      <ProgressDots total={cards.length} index={index} results={results} />

      <section className="flash-card" aria-labelledby="flash-question">
        <p className="flash-kind">{t.cards.kinds[ref.kind]}</p>
        {problem && (
          <p className="flash-problem">
            <span>
              {problem.id}. {problem.title}
            </span>
            <DifficultyTag difficulty={problem.difficulty} />
          </p>
        )}
        <h2 className="flash-question" id="flash-question" tabIndex={-1} ref={headingRef}>
          {questionOf(card, t, lang)}
        </h2>
        {ref.kind === 'signal' && <p className="flash-clue">{signalText(ref.patternId, ref.index, locale)}</p>}
        {tip?.code && <pre className="code-block flash-code">{tip.code}</pre>}
        {ref.kind === 'explain' && revealed && explanation && (
          <p className="prose-block flash-reference" lang="en">
            {explanation.split('\n').map((line) => (
              <span key={line} className="reference-line">
                {line}
              </span>
            ))}
          </p>
        )}
      </section>

      {isChoice && (
        <ol className="flash-options">
          {card.options.map((key, i) => {
            const label = optionLabel(card, key, t, locale);
            const state = !answered ? undefined : i === card.answer ? 'correct' : i === picked ? 'wrong' : 'dim';
            return (
              <li key={key}>
                <button type="button" className="flash-option" data-state={state} disabled={answered} onClick={() => choose(i)}>
                  <span className="flash-key" aria-hidden>
                    {i + 1}
                  </span>
                  <OptionText label={label} />
                  {state === 'correct' && <span className="visually-hidden">{t.cards.correctAnswer}</span>}
                  {state === 'wrong' && <span className="visually-hidden">{t.cards.yourAnswer}</span>}
                </button>
              </li>
            );
          })}
        </ol>
      )}

      {/* 答完的結果和下一步固定在畫面底部，內容很長也不用往下捲才找得到按鈕 */}
      {isChoice && answered && (
        <div className="flash-panel">
          <div className="flash-feedback" data-correct={right}>
            <p className="flash-verdict">{right ? t.cards.correct : t.cards.wrong}</p>
            {!right && (
              <p className="flash-solution">
                <b>{t.cards.solution}</b> <OptionText label={optionLabel(card, card.options[card.answer], t, locale)} />
              </p>
            )}
            <FeedbackDetail card={card} lang={lang} locale={locale} />
          </div>
          <button ref={nextRef} type="button" className="btn btn-primary flash-big" onClick={next}>
            {isLast ? t.cards.finish : t.cards.next}
          </button>
        </div>
      )}
      {!isChoice && (
        <div className="flash-panel">
          {!revealed ? (
            <button type="button" className="btn btn-primary flash-big" onClick={() => setRevealed(true)}>
              {t.cards.reveal}
            </button>
          ) : (
            <>
              <p className="flash-rate-question">{t.cards.rateQuestion}</p>
              <div className="flash-rates">
                {RATE_ORDER.map((result, i) => (
                  <button key={result} type="button" className="btn flash-rate" data-result={result} onClick={() => rate(result)}>
                    <span className="flash-key" aria-hidden>
                      {i + 1}
                    </span>
                    {t.cards.rate[result]}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      <p className="visually-hidden" role="status">
        {isChoice && answered ? (right ? t.cards.correct : t.cards.wrong) : ''}
      </p>
      <p className="flash-hint">{t.cards.keyboardHint}</p>
    </div>
  );
}

function OptionText({ label }: { label: OptionLabel }) {
  return (
    <span className={label.mono ? 'flash-option-text flash-mono' : 'flash-option-text'} lang={label.lang}>
      {label.text}
    </span>
  );
}

type Lang = 'zh' | 'en';

function questionOf(card: DealtCard, t: Messages, lang: Lang): string {
  switch (card.ref.kind) {
    case 'pattern':
      return t.cards.patternQuestion;
    case 'insight':
      return t.cards.insightQuestion;
    case 'complexity':
      return t.cards.complexityQuestion;
    case 'explain':
      return t.cards.explainPrompt;
    case 'signal':
      return t.cards.signalQuestion;
    case 'tip':
      return TIPS.get(card.ref.tipId)?.question?.[lang] ?? t.cards.tipQuestion;
  }
}

function signalText(patternId: PatternId, index: number, locale: Locale): string {
  return getPattern(patternId, locale).signals[index] ?? getPattern(patternId).signals[index] ?? '';
}

interface OptionLabel {
  text: string;
  mono?: boolean;
  lang?: string;
}

function optionLabel(card: DealtCard, key: string, t: Messages, locale: Locale): OptionLabel {
  switch (card.ref.kind) {
    case 'pattern':
    case 'signal':
      return { text: getPattern(key as PatternId, locale).name };
    case 'insight':
      return { text: keyInsight(EXPLANATIONS_EN[Number(key)] ?? ''), lang: 'en' };
    case 'complexity': {
      const { time, space } = splitComplexityKey(key);
      return { text: t.cards.complexityOption(formatBigO(time), formatBigO(space)) };
    }
    case 'tip':
      return { text: TIPS.get(card.ref.tipId)?.options[Number(key)] ?? '', mono: true };
    case 'explain':
      return { text: '' };
  }
}

/** 答完之後多看一句：模式的重點、參考講法的下一句或複雜度的原因、小知識的說明 */
function FeedbackDetail({ card, lang, locale }: { card: DealtCard; lang: Lang; locale: Locale }) {
  const { ref } = card;
  let text: string | undefined;
  let textLang: string | undefined;
  switch (ref.kind) {
    case 'pattern':
    case 'signal':
      // 正解就是模式 id
      text = getPattern(card.options[card.answer] as PatternId, locale).summary;
      break;
    case 'insight':
    case 'complexity':
      text = EXPLANATIONS_EN[ref.problemId]?.split('\n')[ref.kind === 'insight' ? 1 : 3];
      textLang = 'en';
      break;
    case 'tip':
      text = TIPS.get(ref.tipId)?.why[lang];
      break;
    case 'explain':
      break;
  }
  return text ? (
    <p className="flash-detail" lang={textLang}>
      {text}
    </p>
  ) : null;
}

function ProgressDots({ total, index, results }: { total: number; index: number; results: CardResult[] }) {
  return (
    <ol className="flash-dots" aria-hidden>
      {Array.from({ length: total }, (_, i) => (
        <li key={i} data-result={results[i]} data-current={i === index ? '' : undefined} />
      ))}
    </ol>
  );
}

interface SummaryProps {
  results: CardResult[];
  todayCount: number;
  streak: number;
  onAgain: () => void;
}

function Summary({ results, todayCount, streak, onAgain }: SummaryProps) {
  const { t } = useI18n();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const right = results.filter((r) => r === 'good').length;

  useEffect(() => {
    window.scrollTo({ top: 0 });
    headingRef.current?.focus({ preventScroll: true });
  }, []);

  return (
    <div className="flash">
      <section className="flash-card flash-done" aria-labelledby="flash-done-title">
        <h1 className="flash-question" id="flash-done-title" tabIndex={-1} ref={headingRef}>
          {t.cards.doneTitle}
        </h1>
        <ProgressDots total={results.length} index={-1} results={results} />
        <p>{rich(t.cards.doneScore(right, results.length), { b: bold })}</p>
        <p>
          {rich(t.cards.doneToday(todayCount), { b: bold })}
          <br />
          {rich(t.today.streak(streak), { b: bold })}
        </p>
        {results.includes('again') && <p className="flash-detail">{t.cards.missedNote}</p>}
      </section>
      <div className="flash-actions">
        <button type="button" className="btn btn-primary flash-big" onClick={onAgain}>
          {t.cards.another}
        </button>
        <Link className="btn flash-big" to="/">
          {t.common.backToToday}
        </Link>
      </div>
    </div>
  );
}
