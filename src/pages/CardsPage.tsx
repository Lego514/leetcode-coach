import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import type { ReportKind } from '../../shared/constants';
import type { ReportContext } from '../../shared/protocol';
import { emptyDraft, ReportForm } from '../components/ReportForm';
import { useToast } from '../components/toast';
import { Dialog, DifficultyTag } from '../components/ui';
import { EXPLANATIONS_EN } from '../data/explanations';
import { getPattern, getPatterns, type PatternId } from '../data/patterns';
import type { Problem } from '../data/problems';
import { PYTHON_TIPS } from '../data/tips';
import { useI18n, type Messages } from '../i18n';
import type { Locale } from '../i18n/locale';
import { bold, rich } from '../i18n/rich';
import { loadScope, REST_PRESETS, saveScope } from '../lib/cardPrefs';
import {
  buildDeck,
  cardStates,
  dealCard,
  dealRound,
  filterDeck,
  formatBigO,
  keyInsight,
  splitComplexityKey,
  type CardResult,
  type CardScope,
  type DealContext,
  type DealtCard,
} from '../lib/cards';
import type { Catalog } from '../lib/catalog';
import { formatDuration } from '../lib/dates';
import { practiceAttempts, practiceStreak, streakDays } from '../lib/stats';
import { useRestTimer, type RestTimer } from '../lib/useRestTimer';
import { recordCardReview } from '../store/actions';
import type { AttemptRecord, CardReviewRecord, ProgressRecord } from '../store/db';
import { useAttempts, useCardReviews, useCatalog, useProgressMap, useRehearsals, useToday } from '../store/queries';

const TIPS = new Map(PYTHON_TIPS.map((tip) => [tip.id, tip]));
const TIP_IDS = PYTHON_TIPS.map((tip) => tip.id);
const TIP_OPTION_COUNTS = new Map(PYTHON_TIPS.map((tip) => [tip.id, tip.options.length]));
// 各語言的線索數量相同（有測試檢查），用中文版來數
const SIGNAL_COUNTS = Object.fromEntries(getPatterns('zh-TW').map((p) => [p.id, p.signals.length]));
const RATE_ORDER: CardResult[] = ['good', 'fuzzy', 'again'];
const CARD_REPORT_KINDS: ReportKind[] = ['wrong', 'unclear', 'idea'];

export function CardsPage() {
  const { t } = useI18n();
  const catalog = useCatalog();
  const { progress, loaded } = useProgressMap();
  const reviews = useCardReviews();
  const attempts = useAttempts();
  // 計時器放在這一層，換下一回合也不會中斷
  const timer = useRestTimer();
  const [scope, setScope] = useState<CardScope>(loadScope);
  const [round, setRound] = useState(0);

  const changeScope = (next: CardScope) => {
    setScope(next);
    saveScope(next);
    setRound((n) => n + 1);
  };

  const ready = loaded && catalog.loaded && reviews !== undefined && attempts !== undefined;
  return (
    <div className="page">
      {timer.done && <RestAlarm timer={timer} />}
      {ready ? (
        <Round
          key={round}
          catalog={catalog}
          progress={progress}
          reviews={reviews}
          attempts={attempts}
          scope={scope}
          settings={<RoundSettings scope={scope} onScope={changeScope} timer={timer} />}
          timerButton={<TimerButton timer={timer} />}
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
  scope: CardScope;
  /** 範圍和休息時間的選單；回合開始前和結束後才顯示 */
  settings: ReactNode;
  timerButton: ReactNode;
  onAgain: () => void;
}

interface QueueItem {
  card: DealtCard;
  /** 回合最後重考答錯的卡 */
  retry: boolean;
}

/** 一回合：開始時發好牌，之後資料變動也不重發 */
function Round({ catalog, progress, reviews, attempts, scope, settings, timerButton, onAgain }: RoundProps) {
  const rehearsals = useRehearsals();
  const { t, locale } = useI18n();
  const day = useToday();
  const toast = useToast();
  const [{ cards, context }] = useState(() => {
    // 只出做過的題目，沒做過的會被參考講法劇透
    const attempted = catalog.problems.filter((p) => progress.has(p.id));
    const deck = buildDeck({ problems: attempted, explanations: EXPLANATIONS_EN, signalCounts: SIGNAL_COUNTS, tipIds: TIP_IDS });
    const dealContext: DealContext = {
      problems: catalog.byId,
      explanations: EXPLANATIONS_EN,
      tipOptionCounts: TIP_OPTION_COUNTS,
    };
    return {
      cards: dealRound(filterDeck(deck, scope, catalog.byId), cardStates(reviews), day, dealContext),
      context: dealContext,
    };
  });
  // 答錯的選擇題會排到最後重考，答對才算過關
  const [queue, setQueue] = useState<QueueItem[]>(() => cards.map((card) => ({ card, retry: false })));
  const [answers, setAnswers] = useState<CardResult[]>([]);
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  /** 按了「我不知道」：直接看答案，記成答錯，不用亂猜 */
  const [gaveUp, setGaveUp] = useState(false);
  const [revealed, setRevealed] = useState(false);
  /** 答完後可以回報這張卡：內容有錯、看不懂或建議 */
  const [reporting, setReporting] = useState(false);
  const [reportDraft, setReportDraft] = useState(() => emptyDraft('wrong'));
  const headingRef = useRef<HTMLHeadingElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);

  const card = queue[index]?.card;
  const answered = answers.length > index;
  const isLast = index === queue.length - 1;
  const inRetry = index >= cards.length;

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
    setAnswers((prev) => [...prev, result]);
    recordCardReview(card.ref.id, result).catch(() => toast(t.cards.saveFailed));
    // 選項重新洗牌，不能靠記位置答對
    if (result === 'again' && card.options.length > 0) {
      setQueue((prev) => [...prev, { card: dealCard(card.ref, context) ?? card, retry: true }]);
    }
  };

  const next = () => {
    setIndex((i) => i + 1);
    setPicked(null);
    setGaveUp(false);
    setRevealed(false);
    setReporting(false);
    setReportDraft(emptyDraft('wrong'));
  };

  const choose = (i: number) => {
    if (!card || answered) return;
    setPicked(i);
    save(i === card.answer ? 'good' : 'again');
  };

  const giveUp = () => {
    if (!card || answered) return;
    setGaveUp(true);
    save('again');
  };

  const rate = (result: CardResult) => {
    if (answered) return;
    save(result);
    next();
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // 寫回報時打的數字不能拿來作答
      if (!card || reporting || e.altKey || e.ctrlKey || e.metaKey) return;
      // 焦點在按鈕或選單上時，Enter 和空白鍵交給它們自己處理
      const onControl = e.target instanceof HTMLElement && e.target.closest('button, a, input, textarea, select');
      if (onControl && (e.key === 'Enter' || e.key === ' ')) return;
      if (e.target instanceof HTMLSelectElement) return;
      const digit = Number(e.key);
      if (card.options.length > 0) {
        if (!answered && digit >= 1 && digit <= card.options.length) choose(digit - 1);
        else if (!answered && e.key === '0') giveUp();
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

  const topBar = (count?: string) => (
    <div className="flash-top">
      <h1 className="flash-title">{t.cards.title}</h1>
      {count && <span className="flash-count">{count}</span>}
      {timerButton}
      <Link className="btn btn-quiet btn-small" to="/">
        {t.cards.quit}
      </Link>
    </div>
  );

  if (cards.length === 0) {
    return (
      <div className="flash">
        {topBar()}
        {settings}
        <section className="flash-card flash-done" aria-labelledby="flash-empty-title">
          <h2 className="flash-question" id="flash-empty-title">
            {t.cards.emptyTitle}
          </h2>
          <p>{t.cards.emptyBody}</p>
        </section>
      </div>
    );
  }

  if (!card) {
    const firstTry = answers.slice(0, cards.length);
    return (
      <Summary
        topBar={topBar()}
        settings={settings}
        results={firstTry}
        missed={cards.filter((c, i) => firstTry[i] === 'again' && c.options.length > 0)}
        forgotExplain={cards.some((c, i) => firstTry[i] === 'again' && c.options.length === 0)}
        problems={catalog.byId}
        todayCount={reviews.filter((r) => r.day === day).length}
        streak={practiceStreak(streakDays(practiceAttempts(attempts), reviews, rehearsals ?? []), day)}
        onAgain={onAgain}
      />
    );
  }

  const { ref } = card;
  const problem = 'problemId' in ref ? catalog.byId.get(ref.problemId) : undefined;
  const explanation = problem ? EXPLANATIONS_EN[problem.id] : undefined;
  const tip = ref.kind === 'tip' ? TIPS.get(ref.tipId) : undefined;
  const lang = locale === 'en' ? 'en' : 'zh';
  const right = answered && answers[index] === 'good';
  const isChoice = card.options.length > 0;
  const outcome = !answered ? undefined : right ? 'right' : gaveUp ? 'unknown' : 'wrong';
  const verdict = outcome === 'right' ? t.cards.correct : outcome === 'unknown' ? t.cards.unknownVerdict : t.cards.wrong;
  const reportContext: ReportContext = {
    page: '/cards',
    card: {
      id: ref.id,
      question: [
        problem && `${problem.id}. ${problem.title}`,
        questionOf(card, t, lang),
        ref.kind === 'signal' ? signalText(ref.patternId, ref.index, locale) : tip?.code,
      ]
        .filter(Boolean)
        .join(' — ')
        .slice(0, 500),
      ...(isChoice && { answer: optionLabel(card, card.options[card.answer], t, locale).text.slice(0, 500) }),
      ...(isChoice &&
        picked !== null &&
        picked !== card.answer && { picked: optionLabel(card, card.options[picked], t, locale).text.slice(0, 500) }),
    },
  };

  return (
    <div className="flash">
      {topBar(inRetry ? t.cards.retryLeft(queue.length - index) : t.cards.progress(index + 1, cards.length))}
      {index === 0 && !answered && settings}
      <ProgressDots total={cards.length} index={inRetry ? -1 : index} results={answers.slice(0, cards.length)} />

      <section className="flash-card" aria-labelledby="flash-question">
        <div className="flash-card-top">
          <p className="flash-kind">{t.cards.kinds[ref.kind]}</p>
          {(answered || revealed) && (
            <button type="button" className="flash-report" aria-label={t.report.cardTitle} onClick={() => setReporting(true)}>
              {FlagIcon}
              {t.report.cardButton}
            </button>
          )}
        </div>
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
      {isChoice && !answered && (
        <button type="button" className="btn flash-unknown" onClick={giveUp}>
          <span className="flash-key" aria-hidden>
            0
          </span>
          {t.cards.unknown}
        </button>
      )}

      {/* 答完的結果和下一步固定在畫面底部，內容很長也不用往下捲才找得到按鈕 */}
      {isChoice && answered && (
        <div className="flash-panel">
          <div className="flash-feedback" data-outcome={outcome}>
            <p className="flash-verdict">{verdict}</p>
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
        {isChoice && answered ? verdict : ''}
      </p>
      <p className="flash-hint">{t.cards.keyboardHint}</p>

      <Dialog open={reporting} onClose={() => setReporting(false)} title={t.report.cardTitle} subtitle={t.report.cardLede}>
        <ReportForm
          kinds={CARD_REPORT_KINDS}
          draft={reportDraft}
          onDraft={setReportDraft}
          context={reportContext}
          onSent={() => {
            setReporting(false);
            setReportDraft(emptyDraft('wrong'));
            toast(t.report.sent);
          }}
          onCancel={() => setReporting(false)}
        />
      </Dialog>
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

const FlagIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M5 21V4M5 4h11l-2 4 2 4H5" />
  </svg>
);

const TimerIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M12 9v4l2.5 2.5M12 21a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM10 2h4" />
  </svg>
);

/** 組間休息的計時按鈕：沒在倒數時按一下開始，倒數中再按一下停止 */
function TimerButton({ timer }: { timer: RestTimer }) {
  const { t } = useI18n();
  const running = timer.remaining !== null;
  return (
    <button
      type="button"
      className="btn btn-small flash-timer"
      data-running={running ? '' : undefined}
      aria-label={running ? t.cards.restStop : t.cards.restStart(timer.seconds)}
      onClick={running ? timer.stop : timer.start}
    >
      {TimerIcon}
      <span aria-hidden>{formatDuration(timer.remaining ?? timer.seconds)}</span>
    </button>
  );
}

function RestAlarm({ timer }: { timer: RestTimer }) {
  const { t } = useI18n();
  return (
    <div className="flash-alarm" role="alert">
      <p>{t.cards.restDone}</p>
      <div className="btn-row">
        <button type="button" className="btn btn-small" onClick={timer.start}>
          {t.cards.restAgain}
        </button>
        <button type="button" className="btn btn-small btn-quiet" onClick={timer.dismiss}>
          {t.common.close}
        </button>
      </div>
    </div>
  );
}

function RoundSettings({ scope, onScope, timer }: { scope: CardScope; onScope: (scope: CardScope) => void; timer: RestTimer }) {
  const { t, locale } = useI18n();
  return (
    <div className="flash-settings">
      <label className="field">
        <span className="field-label">{t.cards.scopeLabel}</span>
        <select className="select" value={scope} onChange={(e) => onScope(e.target.value as CardScope)}>
          <option value="all">{t.cards.scopes.all}</option>
          <option value="problems">{t.cards.scopes.problems}</option>
          <option value="signals">{t.cards.scopes.signals}</option>
          <option value="tips">{t.cards.scopes.tips}</option>
          <optgroup label={t.cards.scopes.byPattern}>
            {getPatterns(locale).map((p) => (
              <option key={p.id} value={`pattern:${p.id}`}>
                {p.name}
              </option>
            ))}
          </optgroup>
        </select>
      </label>
      <label className="field">
        <span className="field-label">{t.cards.restLabel}</span>
        <select className="select" value={timer.seconds} onChange={(e) => timer.setSeconds(Number(e.target.value))}>
          {REST_PRESETS.map((seconds) => (
            <option key={seconds} value={seconds}>
              {t.cards.restOption(seconds)}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

interface SummaryProps {
  topBar: ReactNode;
  settings: ReactNode;
  /** 每張卡第一次作答的結果 */
  results: CardResult[];
  /** 第一次答錯、已經重考過的選擇題 */
  missed: DealtCard[];
  /** 有沒有講不出來的講解卡；這種卡不重考，今天稍後再出現 */
  forgotExplain: boolean;
  problems: ReadonlyMap<number, Problem>;
  todayCount: number;
  streak: number;
  onAgain: () => void;
}

function Summary({ topBar, settings, results, missed, forgotExplain, problems, todayCount, streak, onAgain }: SummaryProps) {
  const { t } = useI18n();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const right = results.filter((r) => r === 'good').length;

  useEffect(() => {
    window.scrollTo({ top: 0 });
    headingRef.current?.focus({ preventScroll: true });
  }, []);

  return (
    <div className="flash">
      {topBar}
      <section className="flash-card flash-done" aria-labelledby="flash-done-title">
        <h2 className="flash-question" id="flash-done-title" tabIndex={-1} ref={headingRef}>
          {t.cards.doneTitle}
        </h2>
        <ProgressDots total={results.length} index={-1} results={results} />
        <p>{rich(t.cards.doneScore(right, results.length), { b: bold })}</p>
        <p>
          {rich(t.cards.doneToday(todayCount), { b: bold })}
          <br />
          {rich(t.today.streak(streak), { b: bold })}
        </p>
        {forgotExplain && <p className="flash-detail">{t.cards.missedNote}</p>}
      </section>

      {missed.length > 0 && (
        <section className="flash-card flash-done" aria-labelledby="flash-missed-title">
          <h2 className="flash-missed-title" id="flash-missed-title">
            {t.cards.missedTitle}
          </h2>
          <p className="flash-detail">{t.cards.missedRetried}</p>
          <ul className="flash-missed">
            {missed.map((card) => (
              <MissedCard key={card.ref.id} card={card} problems={problems} />
            ))}
          </ul>
        </section>
      )}

      {settings}
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

/** 結果頁的錯題：題目是什麼、正確答案是什麼 */
function MissedCard({ card, problems }: { card: DealtCard; problems: ReadonlyMap<number, Problem> }) {
  const { t, locale } = useI18n();
  const { ref } = card;
  const lang: Lang = locale === 'en' ? 'en' : 'zh';
  const tip = ref.kind === 'tip' ? TIPS.get(ref.tipId) : undefined;
  const problem = 'problemId' in ref ? problems.get(ref.problemId) : undefined;
  return (
    <li>
      <p className="flash-kind">{t.cards.kinds[ref.kind]}</p>
      {problem && (
        <p className="flash-missed-subject">
          {problem.id}. {problem.title}
        </p>
      )}
      {ref.kind === 'signal' && <p className="flash-missed-subject">{signalText(ref.patternId, ref.index, locale)}</p>}
      {tip && (tip.code ? <pre className="code-block flash-code">{tip.code}</pre> : <p className="flash-missed-subject">{questionOf(card, t, lang)}</p>)}
      <p className="flash-solution">
        <b>{t.cards.solution}</b> <OptionText label={optionLabel(card, card.options[card.answer], t, locale)} />
      </p>
    </li>
  );
}
