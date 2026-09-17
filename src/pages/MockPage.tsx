import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router';
import type { ExplanationFeedback } from '../../shared/protocol';
import { AiFeedbackPanel, FeedbackView } from '../components/AiFeedbackPanel';
import { BlobAudio } from '../components/BlobAudio';
import { HintPanel } from '../components/HintPanel';
import { LeaveGuard } from '../components/LeaveGuard';
import { useToast } from '../components/toast';
import { DifficultyTag, Dialog, LeetCodeLink, PageHead, Sheet } from '../components/ui';
import {
  CLARITY_OPTIONS,
  EXPLAIN_CHECKS,
  EXPLAIN_SECONDS,
  EXPLANATION_SCAFFOLD,
  INTERVIEW_STEPS,
  MOCK_MINUTES,
} from '../data/interview';
import { getPattern, getPatterns, type PatternId } from '../data/patterns';
import type { Difficulty, Problem } from '../data/problems';
import { useI18n } from '../i18n';
import { rich } from '../i18n/rich';
import { problemsInList } from '../lib/catalog';
import { formatDuration, today } from '../lib/dates';
import { HINT_LEVELS, suggestRating } from '../lib/practice';
import { useRecorder, useStopwatch } from '../lib/session';
import { speechSupported, useSpeechTranscript } from '../lib/speech';
import { masteryOf, RATINGS, type Rating } from '../lib/srs';
import { transcriptStats } from '../lib/transcript';
import { deleteMock, recordAttempt, saveMock, saveNote } from '../store/actions';
import type { Clarity, MockKind, MockRecord } from '../store/db';
import { useCatalog, useMocks, useNote, useProgressMap, useSettings } from '../store/queries';

interface Session {
  problem: Problem;
  kind: MockKind;
  limitSec: number;
  withAudio: boolean;
  withTranscript: boolean;
  startedAt: string;
}

interface SessionResult {
  usedSec: number;
  steps: string[];
  audio: Blob | null;
  /** 沒有開啟逐字稿時為 null */
  transcript: string | null;
  hints: number;
  sawSolution: boolean;
}

type Phase =
  | { name: 'setup' }
  | { name: 'running'; session: Session }
  | { name: 'review'; session: Session; result: SessionResult };

export function MockPage() {
  const { t } = useI18n();
  const [phase, setPhase] = useState<Phase>({ name: 'setup' });

  return (
    <div className="page" style={phase.name === 'setup' ? undefined : { maxWidth: 1180 }}>
      {phase.name === 'setup' && (
        <>
          <PageHead title={t.mock.title} lede={t.mock.lede} />
          <div className="stack">
            <MockSetup onStart={(session) => setPhase({ name: 'running', session })} />
            <MockHistory />
          </div>
        </>
      )}
      {phase.name === 'running' && (
        <MockSession
          session={phase.session}
          onFinish={(result) => setPhase({ name: 'review', session: phase.session, result })}
        />
      )}
      {phase.name === 'review' && (
        <MockReview session={phase.session} result={phase.result} onDone={() => setPhase({ name: 'setup' })} />
      )}

      {phase.name !== 'setup' && (
        <LeaveGuard
          title={t.leave.mockTitle}
          message={t.leave.mockMessage}
          leaveLabel={t.leave.mockLeave}
        />
      )}
    </div>
  );
}

/* ---------- 設定 ---------- */

type Source = 'unseen' | 'seen' | 'weak' | 'any';

const SOURCES: Source[] = ['unseen', 'seen', 'weak', 'any'];

function pickRandom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function MockSetup({ onStart }: { onStart: (session: Session) => void }) {
  const { t, locale } = useI18n();
  const settings = useSettings();
  const catalog = useCatalog();
  const { progress } = useProgressMap();
  const [params] = useSearchParams();
  const presetKind: MockKind = params.get('kind') === 'explain' ? 'explain' : 'full';
  const presetId = params.get('problem') ?? '';

  const [kind, setKind] = useState<MockKind>(presetKind);
  const [pick, setPick] = useState<'random' | 'specific'>(presetId ? 'specific' : 'random');
  const [specific, setSpecific] = useState(presetId);
  const [source, setSource] = useState<Source>(presetKind === 'explain' ? 'seen' : 'unseen');
  const [difficulty, setDifficulty] = useState<'any' | Difficulty>('any');
  const [patternId, setPatternId] = useState<'any' | PatternId>('any');
  const [minutes, setMinutes] = useState('');
  const [withAudio, setWithAudio] = useState(true);
  const [canTranscribe] = useState(speechSupported);
  const [withTranscript, setWithTranscript] = useState(false);
  const [error, setError] = useState<'notFound' | 'noMatch' | null>(null);

  const listProblems = useMemo(() => problemsInList(catalog, settings.activeList), [catalog, settings.activeList]);

  const pool = useMemo(() => {
    let result = listProblems.filter(
      (p) => (difficulty === 'any' || p.difficulty === difficulty) && (patternId === 'any' || p.pattern === patternId),
    );
    if (source === 'unseen') result = result.filter((p) => !progress.has(p.id));
    if (source === 'seen' || source === 'weak') result = result.filter((p) => progress.has(p.id));
    if (source === 'weak') {
      result = result
        .slice()
        .sort((a, b) => masteryOf(progress.get(a.id)) - masteryOf(progress.get(b.id)))
        .slice(0, 10);
    }
    return result;
  }, [listProblems, difficulty, patternId, source, progress]);

  const specificProblem = catalog.byId.get(Number.parseInt(specific, 10));

  function chooseKind(next: MockKind) {
    setKind(next);
    setSource(next === 'explain' ? 'seen' : 'unseen');
  }

  function start(e: FormEvent) {
    e.preventDefault();
    setError(null);
    let problem: Problem | undefined;
    if (pick === 'specific') {
      problem = specificProblem;
      if (!problem) {
        setError('notFound');
        return;
      }
    } else {
      if (pool.length === 0) {
        setError('noMatch');
        return;
      }
      problem = pickRandom(pool);
    }
    const auto = kind === 'explain' ? EXPLAIN_SECONDS : MOCK_MINUTES[problem.difficulty] * 60;
    const custom = Number(minutes);
    onStart({
      problem,
      kind,
      limitSec: custom > 0 ? Math.round(custom * 60) : auto,
      withAudio,
      withTranscript: canTranscribe && withTranscript,
      startedAt: new Date().toISOString(),
    });
  }

  return (
    <Sheet title={t.mock.setupTitle} id="mock-setup">
      <form className="sheet-body stack" style={{ gap: 20 }} onSubmit={start}>
        {error && (
          <p className="form-error" role="alert">
            {t.mock[error]}
          </p>
        )}

        <div className="field">
          <span className="field-label" id="kind-label">
            {t.mock.kind}
          </span>
          <div className="segmented" role="group" aria-labelledby="kind-label">
            {(['full', 'explain'] as const).map((k) => (
              <button key={k} type="button" aria-pressed={kind === k} onClick={() => chooseKind(k)}>
                {t.mock.kinds[k]}
              </button>
            ))}
          </div>
          <span className="field-hint">
            {kind === 'full' ? t.mock.fullHint(MOCK_MINUTES.Easy, MOCK_MINUTES.Medium, MOCK_MINUTES.Hard) : t.mock.explainHint}
          </span>
        </div>

        <div className="field">
          <span className="field-label" id="pick-label">
            {t.mock.pick}
          </span>
          <div className="segmented" role="group" aria-labelledby="pick-label">
            <button type="button" aria-pressed={pick === 'random'} onClick={() => setPick('random')}>
              {t.mock.random}
            </button>
            <button type="button" aria-pressed={pick === 'specific'} onClick={() => setPick('specific')}>
              {t.mock.specific}
            </button>
          </div>
        </div>

        {pick === 'random' ? (
          <div className="form-grid">
            <label className="field span-2">
              <span className="field-label">{t.mock.source}</span>
              <select className="select" value={source} onChange={(e) => setSource(e.target.value as Source)}>
                {SOURCES.map((s) => (
                  <option key={s} value={s}>
                    {t.mock.sources[s]}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span className="field-label">{t.problems.difficulty}</span>
              <select className="select" value={difficulty} onChange={(e) => setDifficulty(e.target.value as 'any' | Difficulty)}>
                <option value="any">{t.common.anyOption}</option>
                <option>Easy</option>
                <option>Medium</option>
                <option>Hard</option>
              </select>
            </label>
            <label className="field">
              <span className="field-label">{t.problems.pattern}</span>
              <select className="select" value={patternId} onChange={(e) => setPatternId(e.target.value as 'any' | PatternId)}>
                <option value="any">{t.common.anyOption}</option>
                {getPatterns(locale).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
            <p className="field-hint span-2">
              {t.mock.poolInfo(t.lists.labels[settings.activeList], pool.length)}
            </p>
          </div>
        ) : (
          <label className="field">
            <span className="field-label">{t.mock.number}</span>
            <input
              className="input"
              list="mock-problem-options"
              inputMode="numeric"
              placeholder={t.mock.numberPlaceholder}
              value={specific}
              onChange={(e) => setSpecific(e.target.value)}
            />
            <datalist id="mock-problem-options">
              {catalog.problems.map((p) => (
                <option key={p.id} value={String(p.id)}>
                  {p.title}
                </option>
              ))}
            </datalist>
            <span className="field-hint">
              {specificProblem ? t.mock.selected(specificProblem.title, specificProblem.difficulty) : t.mock.numberHint}
            </span>
          </label>
        )}

        <div className="form-grid">
          <label className="field">
            <span className="field-label">{t.mock.minutes}</span>
            <input
              className="input"
              type="number"
              inputMode="decimal"
              min={1}
              max={120}
              step="any"
              placeholder={kind === 'explain' ? '2' : t.mock.autoMinutes}
              value={minutes}
              onChange={(e) => setMinutes(e.target.value)}
            />
          </label>
          <label className="field" style={{ justifyContent: 'flex-end' }}>
            <span style={{ display: 'flex', gap: 8, alignItems: 'center', minHeight: 38 }}>
              <input type="checkbox" checked={withAudio} onChange={(e) => setWithAudio(e.target.checked)} />
              {t.mock.recordAudio}
            </span>
          </label>
          <p className="field-hint span-2">{t.mock.audioPrivacy}</p>
          <div className="field span-2">
            <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                type="checkbox"
                checked={canTranscribe && withTranscript}
                disabled={!canTranscribe}
                aria-describedby="transcript-hint"
                onChange={(e) => setWithTranscript(e.target.checked)}
              />
              {t.mock.transcriptOption}
            </label>
            <span className="field-hint" id="transcript-hint">
              {canTranscribe ? t.mock.transcriptHint : t.mock.transcriptUnsupported}
            </span>
          </div>
        </div>

        <div className="btn-row">
          <button type="submit" className="btn btn-primary">
            {t.mock.startTimer}
          </button>
        </div>
      </form>
    </Sheet>
  );
}

/* ---------- 進行中 ---------- */

function MockSession({ session, onFinish }: { session: Session; onFinish: (result: SessionResult) => void }) {
  const { t, locale } = useI18n();
  const { elapsedSec, running, start, pause } = useStopwatch();
  const recorder = useRecorder();
  const { start: startRecording, pause: pauseRecording, resume: resumeRecording, stop: stopRecording } = recorder;
  const speech = useSpeechTranscript();
  const { start: startSpeech, pause: pauseSpeech, resume: resumeSpeech, stop: stopSpeech } = speech;
  const [done, setDone] = useState<string[]>([]);
  const [openStep, setOpenStep] = useState(0);
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const [hints, setHints] = useState(0);
  const [sawSolution, setSawSolution] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const started = useRef(false);
  const { problem } = session;

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    start();
    if (session.withAudio) void startRecording();
    if (session.withTranscript) startSpeech();
  }, [start, startRecording, startSpeech, session.withAudio, session.withTranscript]);

  function togglePause() {
    if (running) {
      pause();
      pauseRecording();
      pauseSpeech();
    } else {
      start();
      resumeRecording();
      resumeSpeech();
    }
  }

  async function finish() {
    if (finishing) return;
    setFinishing(true);
    const ms = pause();
    const [audio, transcript] = await Promise.all([
      stopRecording(),
      session.withTranscript ? stopSpeech() : Promise.resolve(null),
    ]);
    const steps =
      session.kind === 'full' ? done : EXPLAIN_CHECKS.filter((c) => checks[`explain:${c}`]);
    onFinish({ usedSec: Math.round(ms / 1000), steps, audio, transcript, hints, sawSolution });
  }

  function completeStep(index: number) {
    const nextDone = [...done, INTERVIEW_STEPS[index].id];
    setDone(nextDone);
    const next = INTERVIEW_STEPS.findIndex((s, i) => i > index && !nextDone.includes(s.id));
    const fallback = INTERVIEW_STEPS.findIndex((s) => !nextDone.includes(s.id));
    setOpenStep(next !== -1 ? next : fallback);
  }

  const toggleCheck = (key: string) => setChecks((c) => ({ ...c, [key]: !c[key] }));
  const limit = session.limitSec;
  const over = elapsedSec > limit;
  const currentStep = INTERVIEW_STEPS.findIndex((s) => !done.includes(s.id));

  return (
    <>
      <PageHead title={`${problem.id}. ${problem.title}`}>
        <div className="detail-meta">
          <span className="chip">{t.mock.kinds[session.kind]}</span>
          <DifficultyTag difficulty={problem.difficulty} />
          {session.kind === 'explain' && <span>{getPattern(problem.pattern, locale).name}</span>}
          {problem.premium && <span>{t.common.premium}</span>}
          <LeetCodeLink slug={problem.slug}>{t.mock.openProblem}</LeetCodeLink>
        </div>
      </PageHead>

      <div className="mock-layout">
        <div className="stack">
          <section className="sheet sheet-body" aria-label={t.common.timer}>
            <div className="timer">
              <span className="timer-value" data-over={over}>
                {formatDuration(elapsedSec)}
              </span>
              <span className="timer-limit">
                {over ? t.mock.over(formatDuration(elapsedSec - limit)) : t.mock.left(formatDuration(limit - elapsedSec))}
                {!running && !finishing && t.mock.paused}
              </span>
            </div>
            <div
              className="timer-track"
              role="progressbar"
              aria-label={t.common.elapsed}
              aria-valuemin={0}
              aria-valuemax={limit}
              aria-valuenow={Math.min(elapsedSec, limit)}
            >
              <div className="timer-fill" data-over={over} style={{ width: `${Math.min(100, (elapsedSec / limit) * 100)}%` }} />
            </div>
            <p className="visually-hidden" aria-live="assertive">
              {over ? t.mock.timeUp : ''}
            </p>
            <div className="btn-row" style={{ marginTop: 16 }}>
              <button className="btn" onClick={togglePause} disabled={finishing}>
                {running ? t.common.pause : t.mock.resume}
              </button>
              <button className="btn btn-primary" onClick={() => void finish()} disabled={finishing}>
                {t.mock.finish}
              </button>
            </div>
          </section>

          {session.kind === 'full' ? (
            <Sheet title={t.mock.stepsTitle} id="steps" note={t.mock.stepsProgress(done.length, INTERVIEW_STEPS.length)}>
              <ol className="steps">
                {INTERVIEW_STEPS.map((step, i) => {
                  const state = done.includes(step.id) ? 'done' : i === currentStep ? 'current' : 'todo';
                  const open = openStep === i;
                  const text = t.interview.steps[step.id];
                  return (
                    <li key={step.id} className="step" data-state={state}>
                      <span className="step-index" aria-hidden>
                        {i + 1}
                      </span>
                      <div className="step-head">
                        <button
                          type="button"
                          className="btn btn-quiet btn-small"
                          style={{ padding: '0 4px', marginLeft: -4 }}
                          aria-expanded={open}
                          onClick={() => setOpenStep(open ? -1 : i)}
                        >
                          <span className="step-name">
                            {text.name}
                            {locale !== 'en' && <span lang="en">{step.english}</span>}
                          </span>
                        </button>
                        {state === 'done' && <span className="sheet-note">{t.mock.stepDone}</span>}
                      </div>
                      {open && (
                        <div className="step-body">
                          <p className="step-goal">{text.goal}</p>
                          <ul className="checklist">
                            {text.checks.map((c, j) => {
                              const key = `${step.id}:${j}`;
                              return (
                                <li key={key}>
                                  <input id={key} type="checkbox" checked={!!checks[key]} onChange={() => toggleCheck(key)} />
                                  <label htmlFor={key}>{c}</label>
                                </li>
                              );
                            })}
                          </ul>
                          <ul className="phrase-list">
                            {step.phrases.map((ph) => (
                              <li key={ph.en}>
                                <p className="phrase-en" lang="en">
                                  {ph.en}
                                </p>
                                {locale === 'zh-TW' && <p className="phrase-zh">{ph.zh}</p>}
                              </li>
                            ))}
                          </ul>
                          {state !== 'done' && (
                            <div>
                              <button className="btn btn-primary btn-small" onClick={() => completeStep(i)}>
                                {t.mock.completeStep}
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ol>
            </Sheet>
          ) : (
            <>
              <Sheet title={t.mock.scaffoldTitle} id="scaffold" note={t.mock.scaffoldNote}>
                <pre className="sheet-body prose-block explain-scaffold" lang="en" style={{ margin: 0, fontFamily: 'inherit' }}>
                  {EXPLANATION_SCAFFOLD}
                </pre>
              </Sheet>
              <Sheet title={t.mock.checksTitle} id="explain-checks">
                <ul className="sheet-body checklist stack" style={{ gap: 8 }}>
                  {EXPLAIN_CHECKS.map((c) => {
                    const key = `explain:${c}`;
                    return (
                      <li key={key}>
                        <input id={key} type="checkbox" checked={!!checks[key]} onChange={() => toggleCheck(key)} />
                        <label htmlFor={key}>{t.interview.explainChecks[c]}</label>
                      </li>
                    );
                  })}
                </ul>
              </Sheet>
            </>
          )}
        </div>

        <div className="stack">
          {session.kind === 'full' && (
            <HintPanel
              problem={problem}
              used={hints}
              sawSolution={sawSolution}
              onReveal={() => setHints((n) => Math.min(HINT_LEVELS, n + 1))}
              onSolution={() => setSawSolution(true)}
            />
          )}
          <Sheet title={t.mock.recordingTitle} id="recording">
            <div className="sheet-body">
              {recorder.state === 'recording' && (
                <p style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="rec-dot" aria-hidden /> {t.mock.recording}
                </p>
              )}
              {recorder.state === 'paused' && <p>{t.mock.recordingPaused}</p>}
              {recorder.state === 'idle' &&
                (recorder.error ? (
                  <p className="form-error">{t.errors.recorder[recorder.error]}</p>
                ) : (
                  <p className="sheet-note">{session.withAudio ? t.mock.openingMic : t.mock.noRecording}</p>
                ))}
            </div>
          </Sheet>
          {session.withTranscript && (
            <Sheet
              title={t.mock.transcriptTitle}
              id="transcript"
              note={
                speech.state === 'listening' ? (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <span className="rec-dot" aria-hidden /> {t.mock.transcriptListening}
                  </span>
                ) : speech.state === 'paused' ? (
                  t.mock.transcriptPaused
                ) : undefined
              }
            >
              <div className="sheet-body stack" style={{ gap: 10 }}>
                {speech.error && <p className="form-error">{t.errors.speech[speech.error]}</p>}
                {speech.finalText || speech.interim ? (
                  <p className="prose-block transcript-live" lang="en">
                    {speech.finalText}
                    {speech.interim && <span className="transcript-interim"> {speech.interim}</span>}
                  </p>
                ) : (
                  !speech.error && <p className="sheet-note">{t.mock.transcriptWaiting}</p>
                )}
              </div>
            </Sheet>
          )}
          <Sheet title={t.mock.tipsTitle} id="tips">
            <ul className="sheet-body bullets">
              {t.interview.tips.map((tip) => (
                <li key={tip}>{tip}</li>
              ))}
            </ul>
          </Sheet>
          <p className="sheet-note">
            {rich(t.mock.morePhrases, {
              link: (text) => (
                <Link to="/phrases" target="_blank">
                  {text}
                </Link>
              ),
            })}
          </p>
        </div>
      </div>
    </>
  );
}

/* ---------- 檢討 ---------- */

function MockReview({ session, result, onDone }: { session: Session; result: SessionResult; onDone: () => void }) {
  const { t } = useI18n();
  const { problem } = session;
  const note = useNote(problem.id);
  const toast = useToast();
  const isFull = session.kind === 'full';
  const [rating, setRating] = useState<Rating | null>(isFull ? suggestRating(result.hints, result.sawSolution) : null);
  const [clarity, setClarity] = useState<Clarity | null>(null);
  const [reflection, setReflection] = useState('');
  const [transcript, setTranscript] = useState(result.transcript ?? '');
  const [feedback, setFeedback] = useState<ExplanationFeedback | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const canSave = isFull ? rating !== null : clarity !== null;

  async function save() {
    if (!canSave || saving) return;
    setSaving(true);
    const record: Omit<MockRecord, 'id' | 'uid'> = {
      problemId: problem.id,
      kind: session.kind,
      day: today(),
      startedAt: session.startedAt,
      limitSec: session.limitSec,
      usedSec: result.usedSec,
      steps: result.steps,
      reflection: reflection.trim(),
    };
    if (rating) record.rating = rating;
    if (clarity) record.clarity = clarity;
    if (result.hints > 0) record.hints = result.hints;
    if (result.sawSolution) record.sawSolution = true;
    if (result.audio) record.audio = result.audio;
    if (transcript.trim()) record.transcript = transcript.trim();
    if (feedback) record.feedback = feedback;
    await saveMock(record);
    if (isFull && rating) {
      await recordAttempt(problem.id, rating, {
        mode: 'mock',
        minutes: Math.max(1, Math.round(result.usedSec / 60)),
        hints: result.hints,
        sawSolution: result.sawSolution,
      });
    }
    toast(t.mock.savedToast);
    onDone();
  }

  const overBy = result.usedSec - session.limitSec;

  return (
    <>
      <PageHead
        title={t.mock.reviewTitle(problem.title)}
        lede={t.mock.reviewLede(
          t.mock.kinds[session.kind],
          formatDuration(result.usedSec),
          overBy > 0 ? formatDuration(overBy) : null,
          formatDuration(session.limitSec),
          isFull
            ? t.mock.coverageFull(result.steps.length, INTERVIEW_STEPS.length, result.hints, result.sawSolution)
            : t.mock.coverageExplain(result.steps.length, EXPLAIN_CHECKS.length),
        )}
      />

      <div className="split">
        <div className="stack">
          <Sheet title={t.mock.playbackTitle} id="playback">
            <div className="sheet-body stack" style={{ gap: 10 }}>
              {result.audio ? (
                <>
                  <BlobAudio blob={result.audio} />
                  <p className="sheet-note">{t.mock.playbackHint}</p>
                </>
              ) : (
                <p className="sheet-note">{t.mock.noPlayback}</p>
              )}
            </div>
          </Sheet>

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

          {!isFull && (
            <Sheet title={t.mock.compareTitle} id="compare">
              <div className="sheet-body">
                {note?.explanation ? (
                  <p className="prose-block" lang="en">
                    {note.explanation}
                  </p>
                ) : (
                  <p className="sheet-note">{t.mock.noScript}</p>
                )}
              </div>
            </Sheet>
          )}

          <Sheet title={isFull ? t.mock.rateFull : t.mock.rateExplain} id="self-rating">
            <div className="sheet-body stack" style={{ gap: 16 }}>
              <div className="rating-grid">
                {isFull
                  ? RATINGS.map((r) => (
                      <button key={r} type="button" className="rating-option" aria-pressed={rating === r} onClick={() => setRating(r)}>
                        <span className="rating-label">{t.ratings[r].label}</span>
                        <span className="rating-detail">{t.ratings[r].detail}</span>
                      </button>
                    ))
                  : CLARITY_OPTIONS.map((c) => (
                      <button key={c} type="button" className="rating-option" aria-pressed={clarity === c} onClick={() => setClarity(c)}>
                        <span className="rating-label">{t.interview.clarity[c].label}</span>
                        <span className="rating-detail">{t.interview.clarity[c].detail}</span>
                      </button>
                    ))}
              </div>
              {isFull && <p className="field-hint">{t.mock.suggestedHint}</p>}
              <label className="field">
                <span className="field-label">{t.mock.reflection}</span>
                <textarea
                  className="textarea"
                  rows={4}
                  value={reflection}
                  onChange={(e) => setReflection(e.target.value)}
                  placeholder={t.mock.reflectionPlaceholder}
                />
              </label>
              <div className="btn-row">
                <button className="btn btn-primary" disabled={!canSave || saving} onClick={() => void save()}>
                  {t.common.saveRecord}
                </button>
                <button className="btn btn-quiet" onClick={() => setConfirmDiscard(true)}>
                  {t.mock.discard}
                </button>
                {!canSave && <span className="sheet-note">{t.mock.pickRating}</span>}
              </div>
            </div>
          </Sheet>
        </div>

        <Sheet title={isFull ? t.mock.coverageFullTitle : t.mock.coverageExplainTitle} id="coverage">
          <ul className="sheet-body stack" style={{ gap: 6 }}>
            {(isFull
              ? INTERVIEW_STEPS.map((s) => ({ id: s.id as string, label: t.interview.steps[s.id].name }))
              : EXPLAIN_CHECKS.map((c) => ({ id: c as string, label: t.interview.explainChecks[c] }))
            ).map((item) => {
              const hit = result.steps.includes(item.id);
              return (
                <li key={item.id} style={{ display: 'flex', gap: 8, color: hit ? undefined : 'var(--ink-3)' }}>
                  <span aria-hidden style={{ color: hit ? 'var(--good)' : 'var(--hard)', fontWeight: 700 }}>
                    {hit ? '✓' : '✗'}
                  </span>
                  <span>
                    {item.label}
                    <span className="visually-hidden">{hit ? t.mock.hit : t.mock.missed}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        </Sheet>
      </div>

      <Dialog
        open={confirmDiscard}
        onClose={() => setConfirmDiscard(false)}
        title={t.mock.discardTitle}
        footer={
          <>
            <button className="btn btn-quiet" onClick={() => setConfirmDiscard(false)}>
              {t.common.back}
            </button>
            <button className="btn btn-danger" onClick={onDone}>
              {t.mock.discard}
            </button>
          </>
        }
      >
        <p>{t.mock.discardBody}</p>
      </Dialog>
    </>
  );
}

interface TranscriptReviewProps {
  problem: Problem;
  feedback: ExplanationFeedback | null;
  onFeedback: (feedback: ExplanationFeedback) => void;
  value: string;
  onChange: (value: string) => void;
  usedSec: number;
  currentScript: string;
}

function TranscriptReview({ problem, feedback, onFeedback, value, onChange, usedSec, currentScript }: TranscriptReviewProps) {
  const { t } = useI18n();
  const toast = useToast();
  // 等待確認要存成講解稿的文字：逐字稿本身或 AI 的參考講法
  const [pendingScript, setPendingScript] = useState<string | null>(null);
  const text = value.trim();
  const stats = useMemo(() => transcriptStats(text, usedSec), [text, usedSec]);

  async function saveScript(script: string) {
    setPendingScript(null);
    await saveNote(problem.id, { explanation: script });
    toast(t.mock.scriptSaved);
  }

  function requestSave(script: string) {
    if (currentScript.trim() && currentScript.trim() !== script.trim()) setPendingScript(script);
    else void saveScript(script);
  }

  return (
    <Sheet title={t.mock.transcriptTitle} id="transcript-review" note={t.mock.transcriptReviewNote}>
      <div className="sheet-body stack" style={{ gap: 12 }}>
        <label className="visually-hidden" htmlFor="transcript-input">
          {t.mock.transcriptLabel}
        </label>
        <textarea
          id="transcript-input"
          className="textarea"
          rows={6}
          lang="en"
          value={value}
          placeholder={t.mock.transcriptNone}
          onChange={(e) => onChange(e.target.value)}
        />
        {text && (
          <ul className="bullets">
            <li>
              {t.mock.transcriptStats(stats.words, stats.wpm)}
              {stats.wpm !== null && ` ${t.mock.pace(stats.wpm)}`}
            </li>
            <li>
              {stats.fillers.length > 0
                ? t.mock.fillers(stats.fillers.map((f) => t.mock.fillerItem(f.word, f.count)).join(', '))
                : t.mock.noFillers}
            </li>
          </ul>
        )}
        <div>
          <button type="button" className="btn btn-small" disabled={!text} onClick={() => requestSave(text)}>
            {t.mock.saveAsScript}
          </button>
        </div>
        <AiFeedbackPanel
          problem={problem}
          transcript={value}
          usedSec={usedSec}
          feedback={feedback}
          onFeedback={onFeedback}
          onUseScript={requestSave}
        />
      </div>
      <Dialog
        open={pendingScript !== null}
        onClose={() => setPendingScript(null)}
        title={t.mock.replaceScriptTitle}
        footer={
          <>
            <button className="btn btn-quiet" onClick={() => setPendingScript(null)}>
              {t.common.cancel}
            </button>
            <button className="btn btn-primary" onClick={() => pendingScript !== null && void saveScript(pendingScript)}>
              {t.mock.replaceScript}
            </button>
          </>
        }
      >
        <p>{t.mock.replaceScriptBody}</p>
      </Dialog>
    </Sheet>
  );
}

/* ---------- 紀錄 ---------- */

function MockHistory() {
  const { t, fmt } = useI18n();
  const mocks = useMocks();
  const catalog = useCatalog();
  const toast = useToast();
  const [pendingDelete, setPendingDelete] = useState<MockRecord | null>(null);

  if (!mocks) return null;

  return (
    <Sheet title={t.mock.historyTitle} count={mocks.length} id="mock-history">
      {mocks.length === 0 ? (
        <p className="sheet-empty">{t.mock.historyEmpty}</p>
      ) : (
        <ul className="rows">
          {mocks.map((m) => {
            const p = catalog.byId.get(m.problemId);
            const clarity = m.clarity ? t.interview.clarity[m.clarity] : undefined;
            const total = m.kind === 'full' ? INTERVIEW_STEPS.length : EXPLAIN_CHECKS.length;
            return (
              <li key={m.id} className="sheet-body stack" style={{ gap: 8 }}>
                <div className="btn-row" style={{ justifyContent: 'space-between' }}>
                  <div className="problem-title">
                    <span className="problem-num">{m.problemId}</span>
                    <Link to={`/problems/${m.problemId}`}>{p?.title ?? t.mock.deletedProblem}</Link>
                  </div>
                  <button className="btn btn-quiet btn-small" onClick={() => setPendingDelete(m)}>
                    {t.common.delete}
                  </button>
                </div>
                <div className="problem-meta">
                  <span className="chip">{t.mock.kinds[m.kind]}</span>
                  <span>{fmt.day(m.day)}</span>
                  <span>{t.mock.usedOfLimit(formatDuration(m.usedSec), formatDuration(m.limitSec))}</span>
                  <span>
                    {m.kind === 'full' ? t.mock.stepsCount(m.steps.length, total) : t.mock.pointsCount(m.steps.length, total)}
                  </span>
                  {m.rating && <span>{t.ratings[m.rating].label}</span>}
                  {m.hints ? <span>{t.mock.hintsCount(m.hints)}</span> : null}
                  {clarity && <span>{clarity.label}</span>}
                </div>
                {m.reflection && <p className="prose-block">{m.reflection}</p>}
                {m.transcript && (
                  <details>
                    <summary>{t.mock.showTranscript}</summary>
                    <p className="prose-block" lang="en" style={{ marginTop: 8 }}>
                      {m.transcript}
                    </p>
                  </details>
                )}
                {m.feedback && (
                  <details>
                    <summary>{t.mock.showFeedback}</summary>
                    <div style={{ marginTop: 8 }}>
                      <FeedbackView feedback={m.feedback} />
                    </div>
                  </details>
                )}
                {m.audio && <MockAudio blob={m.audio} />}
              </li>
            );
          })}
        </ul>
      )}
      <Dialog
        open={pendingDelete !== null}
        onClose={() => setPendingDelete(null)}
        title={t.mock.deleteTitle}
        footer={
          <>
            <button className="btn btn-quiet" onClick={() => setPendingDelete(null)}>
              {t.common.cancel}
            </button>
            <button
              className="btn btn-danger"
              onClick={async () => {
                if (pendingDelete?.id !== undefined) await deleteMock(pendingDelete.id);
                setPendingDelete(null);
                toast(t.mock.recordDeleted);
              }}
            >
              {t.mock.deleteRecord}
            </button>
          </>
        }
      >
        <p>{t.mock.deleteBody}</p>
      </Dialog>
    </Sheet>
  );
}

function MockAudio({ blob }: { blob: Blob }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  if (open) return <BlobAudio blob={blob} autoPlay />;
  return (
    <div>
      <button className="btn btn-small" onClick={() => setOpen(true)}>
        {t.mock.playRecording}
      </button>
    </div>
  );
}
