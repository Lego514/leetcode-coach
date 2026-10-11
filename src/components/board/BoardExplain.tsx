import { useEffect, useRef, useState, type RefObject } from 'react';
import type { ExplanationFeedback } from '../../../shared/protocol';
import { CLARITY_OPTIONS, EXPLAIN_CHECKS, EXPLAIN_SECONDS, type ExplainCheck } from '../../data/interview';
import type { Problem } from '../../data/problems';
import { useI18n } from '../../i18n';
import { formatDuration, today } from '../../lib/dates';
import type { BoardStep } from '../../lib/board/model';
import { useRecorder, useStopwatch } from '../../lib/session';
import { speechSupported, useSpeechTranscript } from '../../lib/speech';
import { saveMock } from '../../store/actions';
import type { Clarity, MockRecord } from '../../store/db';
import { useNote } from '../../store/queries';
import { BlobAudio } from '../BlobAudio';
import { TranscriptReview } from '../TranscriptReview';
import { useToast } from '../toast';
import { Sheet } from '../ui';

// 講解模式：照著記好的步驟一步一步講，同時錄音、產生逐字稿、記下每一步講了多久，
// 講完再回頭看。在題目的白板講的可以存成講解練習，也能請 Claude 給回饋。

export interface ExplainResult {
  startedAt: string;
  usedSec: number;
  /** 每一步停留的秒數（到小數一位），順序跟步驟一樣；來回翻的時間會加在一起；0 是沒講到 */
  stepSecs: number[];
  audio: Blob | null;
  /** 不支援語音辨識時是 null */
  transcript: string | null;
}

/** 某一步停留的時間：在每一步之間換來換去時，把每次停留的時間加起來 */
export function addStepTime(secs: readonly number[], index: number, ms: number): number[] {
  const next = [...secs];
  next[index] = (next[index] ?? 0) + ms / 1000;
  return next;
}

interface ExplainSessionProps {
  index: number;
  stepCount: number;
  /** 讓白板的 Esc 也能結束講解 */
  finishRef: RefObject<(() => void) | null>;
  onFinish: (result: ExplainResult) => void;
}

/** 講解時播放列下方：計時、錄音中、即時逐字稿、講完了 */
export function ExplainSession({ index, stepCount, finishRef, onFinish }: ExplainSessionProps) {
  const { t } = useI18n();
  const s = t.board.explain;
  const { elapsedSec, start, pause } = useStopwatch();
  const recorder = useRecorder();
  const { start: startRecording, stop: stopRecording } = recorder;
  const speech = useSpeechTranscript();
  const { start: startSpeech, stop: stopSpeech } = speech;
  const [withTranscript] = useState(speechSupported);
  const started = useRef<string | null>(null);
  const stepSecs = useRef<number[]>(Array.from({ length: stepCount }, () => 0));
  const current = useRef<{ index: number; since: number } | null>(null);
  const [finishing, setFinishing] = useState(false);

  useEffect(() => {
    if (started.current) return;
    started.current = new Date().toISOString();
    start();
    void startRecording();
    if (withTranscript) startSpeech();
  }, [start, startRecording, startSpeech, withTranscript]);

  // 換步時把上一步停留的時間記下來
  useEffect(() => {
    const now = Date.now();
    const prev = current.current;
    if (prev) stepSecs.current = addStepTime(stepSecs.current, prev.index, now - prev.since);
    current.current = { index, since: now };
  }, [index]);

  async function finish() {
    if (finishing) return;
    setFinishing(true);
    const prev = current.current;
    if (prev) stepSecs.current = addStepTime(stepSecs.current, prev.index, Date.now() - prev.since);
    current.current = null;
    const ms = pause();
    const [audio, transcript] = await Promise.all([stopRecording(), withTranscript ? stopSpeech() : Promise.resolve(null)]);
    onFinish({
      startedAt: started.current ?? new Date().toISOString(),
      usedSec: Math.round(ms / 1000),
      stepSecs: stepSecs.current.map((sec) => (sec > 0 ? Math.max(0.1, Math.round(sec * 10) / 10) : 0)),
      audio,
      transcript,
    });
  }

  useEffect(() => {
    finishRef.current = () => void finish();
    return () => {
      finishRef.current = null;
    };
  });

  const live = `${speech.finalText} ${speech.interim}`.trim();
  const error = recorder.error ? t.errors.recorder[recorder.error] : speech.error ? t.errors.speech[speech.error] : null;
  return (
    <div className="board-explain">
      <div className="board-explain-row">
        <span className="board-explain-timer" role="timer" aria-label={s.elapsed}>
          {recorder.state === 'recording' && <span className="rec-dot" aria-hidden />}
          {formatDuration(elapsedSec)}
        </span>
        <p className="board-explain-live" lang="en" aria-live="off">
          {live ? (
            <span>{live}</span>
          ) : error ? (
            <span className="form-error">{error}</span>
          ) : (
            <span className="board-explain-hint">{withTranscript ? s.listening : s.speak}</span>
          )}
        </p>
        <button type="button" className="btn btn-small btn-primary" disabled={finishing} onClick={() => void finish()}>
          {s.finish}
        </button>
      </div>
    </div>
  );
}

interface ExplainReviewProps {
  result: ExplainResult;
  steps: readonly BoardStep[];
  /** 自由白板沒有題目，就不能存紀錄、請 AI 回饋 */
  problem?: Problem;
  onAgain: () => void;
  onClose: () => void;
}

/** 講完之後：每一步講了多久、錄音、逐字稿；題目的白板還可以自評、存起來 */
export function ExplainReview({ result, steps, problem, onAgain, onClose }: ExplainReviewProps) {
  const { t } = useI18n();
  const s = t.board.explain;
  const toast = useToast();
  const note = useNote(problem?.id ?? 0);
  const [transcript, setTranscript] = useState(result.transcript ?? '');
  const [feedback, setFeedback] = useState<ExplanationFeedback | null>(null);
  const [checks, setChecks] = useState<ReadonlySet<ExplainCheck>>(() => new Set());
  const [clarity, setClarity] = useState<Clarity | null>(null);
  const [saved, setSaved] = useState(false);
  const longest = Math.max(1, ...result.stepSecs);
  const seen = result.stepSecs.filter((sec) => sec > 0).length;

  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => headingRef.current?.focus(), []);

  const toggle = (check: ExplainCheck) => {
    const next = new Set(checks);
    if (next.has(check)) next.delete(check);
    else next.add(check);
    setChecks(next);
  };

  async function save() {
    if (!problem || clarity === null || saved) return;
    setSaved(true);
    const record: Omit<MockRecord, 'id' | 'uid'> = {
      problemId: problem.id,
      kind: 'explain',
      board: true,
      day: today(),
      startedAt: result.startedAt,
      limitSec: EXPLAIN_SECONDS,
      usedSec: result.usedSec,
      steps: EXPLAIN_CHECKS.filter((c) => checks.has(c)),
      clarity,
      reflection: '',
    };
    if (result.audio) record.audio = result.audio;
    if (transcript.trim()) record.transcript = transcript.trim();
    if (feedback) record.feedback = feedback;
    await saveMock(record);
    toast(s.saved);
  }

  return (
    <div className="board-review" role="dialog" aria-modal="true" aria-labelledby="board-review-title" data-ui>
      <div className="board-review-inner">
        <header className="board-review-head">
          <h2 id="board-review-title" className="board-review-title" tabIndex={-1} ref={headingRef}>
            {s.reviewTitle}
          </h2>
          <p className="board-review-lede">{s.reviewLede(formatDuration(result.usedSec), seen, steps.length)}</p>
        </header>
        <div className="stack">
          <Sheet title={s.stepTimesTitle} id="board-step-times" note={s.stepTimesNote}>
            <ol className="sheet-body board-step-times">
              {steps.map((step, i) => {
                const sec = result.stepSecs[i] ?? 0;
                return (
                  <li key={step.id} data-skipped={sec === 0 || undefined}>
                    <span className="board-step-time-name">
                      <span className="board-step-time-num">{s.stepName(i + 1)}</span>
                      {step.caption && (
                        <span className="board-step-time-caption" lang="en">
                          {step.caption}
                        </span>
                      )}
                    </span>
                    <span className="board-step-time-bar" aria-hidden>
                      <span style={{ width: `${(sec / longest) * 100}%` }} />
                    </span>
                    <span className="board-step-time-sec">{sec === 0 ? s.skipped : formatDuration(Math.round(sec))}</span>
                  </li>
                );
              })}
            </ol>
          </Sheet>

          {result.audio && (
            <Sheet title={t.mock.playbackTitle} id="board-explain-audio">
              <div className="sheet-body stack" style={{ gap: 10 }}>
                <BlobAudio blob={result.audio} />
                <p className="sheet-note">{t.mock.playbackHint}</p>
              </div>
            </Sheet>
          )}

          {result.transcript !== null && (
            <TranscriptReview
              problem={problem}
              feedback={feedback}
              onFeedback={setFeedback}
              value={transcript}
              onChange={setTranscript}
              usedSec={result.usedSec}
              currentScript={note?.explanation ?? ''}
            />
          )}

          {problem ? (
            <Sheet title={t.mock.rateExplain} id="board-explain-rating">
              <div className="sheet-body stack" style={{ gap: 16 }}>
                <fieldset className="board-review-checks">
                  <legend className="field-label">{t.mock.checksTitle}</legend>
                  <ul className="checklist stack" style={{ gap: 8 }}>
                    {EXPLAIN_CHECKS.map((c) => (
                      <li key={c}>
                        <input id={`board-explain-${c}`} type="checkbox" checked={checks.has(c)} onChange={() => toggle(c)} />
                        <label htmlFor={`board-explain-${c}`}>{t.interview.explainChecks[c]}</label>
                      </li>
                    ))}
                  </ul>
                </fieldset>
                <div className="rating-grid">
                  {CLARITY_OPTIONS.map((c) => (
                    <button key={c} type="button" className="rating-option" aria-pressed={clarity === c} onClick={() => setClarity(c)}>
                      <span className="rating-label">{t.interview.clarity[c].label}</span>
                      <span className="rating-detail">{t.interview.clarity[c].detail}</span>
                    </button>
                  ))}
                </div>
              </div>
            </Sheet>
          ) : (
            <p className="sheet-note">{s.scratchNote}</p>
          )}

          <div className="btn-row">
            {problem && (
              <button type="button" className="btn btn-primary" disabled={clarity === null || saved} onClick={() => void save()}>
                {saved ? s.savedButton : s.save}
              </button>
            )}
            <button type="button" className="btn" onClick={onAgain}>
              {s.again}
            </button>
            <button type="button" className="btn btn-quiet" onClick={onClose}>
              {problem && !saved ? s.closeUnsaved : s.close}
            </button>
            {problem && clarity === null && !saved && <span className="sheet-note">{t.mock.pickRating}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
