import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import type { FeedbackRequest, FollowUpRecord } from '../../shared/protocol';
import { getPattern } from '../data/patterns';
import type { Problem } from '../data/problems';
import { useI18n } from '../i18n';
import { rich } from '../i18n/rich';
import { speechSupported, useSpeechTranscript } from '../lib/speech';
import { markAiQuotaUsed, requestFollowUpGrade, requestFollowUpQuestions, updateAiUsage, useAiStatus } from '../store/ai';
import { errorCode } from '../store/api';
import { useCloud } from '../store/cloud';
import { MIN_TRANSCRIPT_LENGTH } from './AiFeedbackPanel';

// 面試官追問：講完之後 Claude 扮演面試官問兩三題，一題一題用英文回答，最後再請 Claude 評分。

const READ_ALOUD_KEY = 'coach:follow-up-read-aloud';

function readAloudPreference(): boolean {
  try {
    return localStorage.getItem(READ_ALOUD_KEY) !== '0';
  } catch {
    return true;
  }
}

/** 用瀏覽器的語音念出英文問題，像面試官在問 */
function speak(text: string) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'en-US';
  utterance.rate = 0.95;
  window.speechSynthesis.speak(utterance);
}

interface FollowUpPanelProps {
  problem: Problem;
  transcript: string;
  usedSec: number;
  value: FollowUpRecord | null;
  onChange: (value: FollowUpRecord) => void;
}

export function FollowUpPanel({ problem, transcript, usedSec, value, onChange }: FollowUpPanelProps) {
  const { t, locale } = useI18n();
  const f = t.followUp;
  const signedIn = useCloud().account.kind === 'signed-in';
  const status = useAiStatus(signedIn);
  const [loading, setLoading] = useState<'ask' | 'grade' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const [readAloud, setReadAloud] = useState(readAloudPreference);
  const text = transcript.trim();
  const items = value?.items ?? [];
  const graded = items.length > 0 && items.every((item) => item.score !== undefined);

  const base = (): FeedbackRequest => ({
    problem: { id: problem.id, title: problem.title, difficulty: problem.difficulty, pattern: getPattern(problem.pattern, 'en').name },
    transcript: text,
    seconds: usedSec,
    language: locale,
  });

  async function run<T extends { usedToday: number; dailyLimit: number }>(kind: 'ask' | 'grade', call: () => Promise<T>): Promise<T | null> {
    setLoading(kind);
    setError(null);
    try {
      const response = await call();
      updateAiUsage(response.usedToday, response.dailyLimit);
      return response;
    } catch (err) {
      const code = errorCode(err);
      setError(t.errors.api[code]);
      if (code === 'ai_quota_exceeded') markAiQuotaUsed();
      return null;
    } finally {
      setLoading(null);
    }
  }

  async function ask() {
    const response = await run('ask', () => requestFollowUpQuestions(base()));
    if (!response) return;
    setIndex(0);
    onChange({ items: response.questions.map((q) => ({ ...q, answer: '' })) });
  }

  async function grade() {
    const response = await run('grade', () =>
      requestFollowUpGrade({ ...base(), answers: items.map((item) => ({ question: item.question, answer: item.answer.trim() })) }),
    );
    if (!response) return;
    onChange({
      items: items.map((item, i) => ({ ...item, ...response.grade.answers[i] })),
      summary: response.grade.summary,
    });
  }

  const setAnswer = (i: number, answer: string) => onChange({ items: items.map((item, j) => (j === i ? { ...item, answer } : item)) });

  const toggleReadAloud = () => {
    const next = !readAloud;
    setReadAloud(next);
    try {
      localStorage.setItem(READ_ALOUD_KEY, next ? '1' : '0');
    } catch {
      // 存不了就只在這次有效
    }
  };

  // 換到新的問題時念出來
  const current = items[index];
  const spokenFor = useRef<string | null>(null);
  useEffect(() => {
    if (!readAloud || graded || !current || spokenFor.current === current.question) return;
    spokenFor.current = current.question;
    speak(current.question);
  }, [readAloud, graded, current]);

  let gate = null;
  if (!signedIn) gate = <p className="sheet-note">{rich(t.mock.aiSignIn, { link: (s) => <Link to="/account">{s}</Link> })}</p>;
  else if (!status) gate = <p className="sheet-note">{t.common.loading}</p>;
  else if (!status.available) gate = <p className="sheet-note">{status.reason === 'not_allowed' ? t.mock.aiNotAllowed : t.mock.aiOff}</p>;
  const remaining = status ? Math.max(0, status.dailyLimit - status.usedToday) : 0;
  const tooShort = text.length < MIN_TRANSCRIPT_LENGTH;

  return (
    <div className="ai-feedback follow-up stack" style={{ gap: 12 }}>
      <h3 className="ai-feedback-title">{f.title}</h3>
      <p className="sheet-note">{f.intro}</p>
      {gate ?? (
        <>
          {items.length === 0 ? (
            <div className="stack" style={{ gap: 8 }}>
              <div className="btn-row">
                <button type="button" className="btn btn-primary btn-small" disabled={loading !== null || tooShort || remaining === 0} onClick={() => void ask()}>
                  {f.ask}
                </button>
                <span className="sheet-note">{t.mock.aiRemaining(remaining, status!.dailyLimit)}</span>
              </div>
              {tooShort && <p className="field-hint">{t.mock.aiNeedsText}</p>}
            </div>
          ) : graded ? (
            <FollowUpResult record={value!} />
          ) : (
            <div className="stack" style={{ gap: 12 }}>
              <div className="follow-up-head">
                <span className="follow-up-count">{f.position(index + 1, items.length)}</span>
                <label className="check">
                  <input type="checkbox" checked={readAloud} onChange={toggleReadAloud} />
                  {f.readAloud}
                </label>
              </div>
              <p className="follow-up-question" lang="en">
                {current.question}
              </p>
              <div className="btn-row">
                <button type="button" className="btn btn-small btn-quiet" onClick={() => speak(current.question)}>
                  {f.hear}
                </button>
                <span className="chip">{f.kinds[current.kind]}</span>
              </div>
              <AnswerBox key={index} label={f.answerLabel(index + 1)} value={current.answer} onChange={(answer) => setAnswer(index, answer)} />
              <div className="btn-row">
                {index > 0 && (
                  <button type="button" className="btn btn-small" onClick={() => setIndex(index - 1)}>
                    {f.prev}
                  </button>
                )}
                {index < items.length - 1 ? (
                  <button type="button" className="btn btn-small btn-primary" onClick={() => setIndex(index + 1)}>
                    {f.next}
                  </button>
                ) : (
                  <button type="button" className="btn btn-small btn-primary" disabled={loading !== null || remaining === 0} onClick={() => void grade()}>
                    {f.grade}
                  </button>
                )}
                {index === items.length - 1 && <span className="sheet-note">{t.mock.aiRemaining(remaining, status!.dailyLimit)}</span>}
              </div>
            </div>
          )}
          {loading && (
            <p className="sheet-note" role="status">
              {loading === 'ask' ? f.asking : f.grading}
            </p>
          )}
          {graded && (
            <div className="btn-row">
              <button type="button" className="btn btn-small" disabled={loading !== null || tooShort || remaining === 0} onClick={() => void ask()}>
                {f.askAgain}
              </button>
              <span className="sheet-note">{t.mock.aiRemaining(remaining, status!.dailyLimit)}</span>
            </div>
          )}
        </>
      )}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

/** 一題的回答：可以打字，也可以按麥克風用英文講，講的內容接在後面 */
function AnswerBox({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const { t } = useI18n();
  const f = t.followUp;
  const speech = useSpeechTranscript();
  const { start, stop } = speech;
  const [canSpeak] = useState(speechSupported);
  /** 開始講之前已經有的文字，和這一題已經收進答案的辨識結果長度 */
  const [before, setBefore] = useState('');
  const [consumed, setConsumed] = useState(0);
  const listening = speech.state === 'listening';

  const toggle = async () => {
    if (listening) {
      const all = await stop();
      setConsumed(all.length);
      onChange([before.trim(), all.slice(consumed).trim()].filter(Boolean).join(' '));
    } else {
      setBefore(value);
      start();
    }
  };

  const live = `${speech.finalText.slice(consumed)} ${speech.interim}`.trim();
  return (
    <div className="stack" style={{ gap: 8 }}>
      <label className="visually-hidden" htmlFor="follow-up-answer">
        {label}
      </label>
      <textarea
        id="follow-up-answer"
        className="textarea"
        rows={4}
        lang="en"
        value={listening ? [before.trim(), live].filter(Boolean).join(' ') : value}
        readOnly={listening}
        placeholder={canSpeak ? f.answerPlaceholder : f.typePlaceholder}
        onChange={(e) => onChange(e.target.value)}
      />
      <div className="btn-row">
        {canSpeak && (
          <button type="button" className={listening ? 'btn btn-small btn-danger' : 'btn btn-small'} onClick={() => void toggle()}>
            {listening && <span className="rec-dot" aria-hidden />}
            {listening ? f.stopSpeaking : f.speak}
          </button>
        )}
        {speech.error && <span className="form-error">{t.errors.speech[speech.error]}</span>}
      </div>
    </div>
  );
}

/** 評分完：總分、每題的分數、評語和更好的答法 */
export function FollowUpResult({ record }: { record: FollowUpRecord }) {
  const { t } = useI18n();
  const f = t.followUp;
  const total = record.items.reduce((sum, item) => sum + (item.score ?? 0), 0);
  return (
    <div className="stack" style={{ gap: 14 }}>
      {record.summary && (
        <p className="prose-block">
          <strong>{t.mock.aiTotal(total, record.items.length * 2)}</strong> {record.summary}
        </p>
      )}
      <ol className="follow-up-results">
        {record.items.map((item) => (
          <li key={item.question} className="stack" style={{ gap: 6 }}>
            <p className="follow-up-q" lang="en">
              {item.question}
            </p>
            <p className="sheet-note">{f.intent(item.intent)}</p>
            <p className="prose-block" lang="en">
              <span className="follow-up-label">{f.yourAnswer}</span> {item.answer || f.noAnswer}
            </p>
            {item.score !== undefined && (
              <p>
                <span className="ai-score" data-score={item.score}>
                  {t.mock.aiScore(item.score)}
                </span>{' '}
                {item.comment}
              </p>
            )}
            {item.betterAnswer && (
              <p className="prose-block follow-up-better" lang="en">
                <span className="follow-up-label">{f.betterAnswer}</span> {item.betterAnswer}
              </p>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
