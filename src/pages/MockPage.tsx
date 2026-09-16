import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Link, useBeforeUnload, useBlocker, useSearchParams } from 'react-router';
import { BlobAudio } from '../components/BlobAudio';
import { useToast } from '../components/toast';
import { DifficultyTag, Dialog, LeetCodeLink, PageHead, Sheet } from '../components/ui';
import {
  CLARITY_OPTIONS,
  EXPLAIN_CHECKS,
  EXPLAIN_SECONDS,
  EXPLANATION_SCAFFOLD,
  INTERVIEW_STEPS,
  MOCK_MINUTES,
  THINK_ALOUD_TIPS,
} from '../data/interview';
import { getPattern, PATTERNS, type PatternId } from '../data/patterns';
import type { Difficulty, Problem } from '../data/problems';
import { LIST_FILTER_LABELS, problemsInList } from '../lib/catalog';
import { formatDay, formatDuration, today } from '../lib/dates';
import { useRecorder, useStopwatch } from '../lib/session';
import { masteryOf, RATINGS, ratingLabel, type Rating } from '../lib/srs';
import { deleteMock, recordAttempt, saveMock } from '../store/actions';
import type { Clarity, MockKind, MockRecord } from '../store/db';
import { useCatalog, useMocks, useNote, useProgressMap, useSettings } from '../store/queries';

interface Session {
  problem: Problem;
  kind: MockKind;
  limitSec: number;
  withAudio: boolean;
  startedAt: string;
}

interface SessionResult {
  usedSec: number;
  steps: string[];
  audio: Blob | null;
}

type Phase =
  | { name: 'setup' }
  | { name: 'running'; session: Session }
  | { name: 'review'; session: Session; result: SessionResult };

const KIND_LABELS: Record<MockKind, string> = { full: '完整模擬', explain: '講解練習' };

export function MockPage() {
  const [phase, setPhase] = useState<Phase>({ name: 'setup' });

  return (
    <div className="page" style={phase.name === 'setup' ? undefined : { maxWidth: 1180 }}>
      {phase.name === 'setup' && (
        <>
          <PageHead
            title="模擬面試"
            lede="照美國面試的流程計時練習，邊做邊把想法講出來。講解是你最需要練的部分，建議開著錄音，結束後聽一次。"
          />
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

      {phase.name !== 'setup' && <LeaveGuard />}
    </div>
  );
}

/** 練習進行中或還沒存檔時，離開頁面前先確認 */
function LeaveGuard() {
  const blocker = useBlocker(({ currentLocation, nextLocation }) => currentLocation.pathname !== nextLocation.pathname);
  useBeforeUnload(
    useCallback((e: BeforeUnloadEvent) => {
      e.preventDefault();
    }, []),
  );

  return (
    <Dialog
      open={blocker.state === 'blocked'}
      onClose={() => blocker.reset?.()}
      title="離開這次模擬面試？"
      footer={
        <>
          <button className="btn btn-quiet" onClick={() => blocker.reset?.()}>
            留在這裡
          </button>
          <button className="btn btn-danger" onClick={() => blocker.proceed?.()}>
            離開，不儲存
          </button>
        </>
      }
    >
      <p>計時和錄音會停止，這次的紀錄不會儲存。</p>
    </Dialog>
  );
}

/* ---------- 設定 ---------- */

type Source = 'unseen' | 'seen' | 'weak' | 'any';

const SOURCE_LABELS: Record<Source, string> = {
  unseen: '還沒做過的題目',
  seen: '做過的題目',
  weak: '做過但最不熟的題目',
  any: '全部題目',
};

function MockSetup({ onStart }: { onStart: (session: Session) => void }) {
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
  const [error, setError] = useState('');

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
    setError('');
    let problem: Problem | undefined;
    if (pick === 'specific') {
      problem = specificProblem;
      if (!problem) {
        setError('找不到這個題號。輸入題號，或從建議清單選一題。');
        return;
      }
    } else {
      if (pool.length === 0) {
        setError('沒有符合條件的題目。放寬難度、模式或題目來源再試一次。');
        return;
      }
      problem = pool[Math.floor(Math.random() * pool.length)];
    }
    const auto = kind === 'explain' ? EXPLAIN_SECONDS : MOCK_MINUTES[problem.difficulty] * 60;
    const custom = Number(minutes);
    onStart({
      problem,
      kind,
      limitSec: custom > 0 ? Math.round(custom * 60) : auto,
      withAudio,
      startedAt: new Date().toISOString(),
    });
  }

  return (
    <Sheet title="開始一次練習" id="mock-setup">
      <form className="sheet-body stack" style={{ gap: 20 }} onSubmit={start}>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}

        <div className="field">
          <span className="field-label" id="kind-label">
            練習類型
          </span>
          <div className="segmented" role="group" aria-labelledby="kind-label">
            {(['full', 'explain'] as const).map((k) => (
              <button key={k} type="button" aria-pressed={kind === k} onClick={() => chooseKind(k)}>
                {KIND_LABELS[k]}
              </button>
            ))}
          </div>
          <span className="field-hint">
            {kind === 'full'
              ? `走完釐清題意到分析複雜度的七個步驟。時間依難度：Easy ${MOCK_MINUTES.Easy} 分鐘、Medium ${MOCK_MINUTES.Medium} 分鐘、Hard ${MOCK_MINUTES.Hard} 分鐘。`
              : '挑一題做過的題目，不寫程式，用兩分鐘把解法用英文講清楚。'}
          </span>
        </div>

        <div className="field">
          <span className="field-label" id="pick-label">
            選題方式
          </span>
          <div className="segmented" role="group" aria-labelledby="pick-label">
            <button type="button" aria-pressed={pick === 'random'} onClick={() => setPick('random')}>
              隨機抽題
            </button>
            <button type="button" aria-pressed={pick === 'specific'} onClick={() => setPick('specific')}>
              指定題目
            </button>
          </div>
        </div>

        {pick === 'random' ? (
          <div className="form-grid">
            <label className="field span-2">
              <span className="field-label">題目來源</span>
              <select className="select" value={source} onChange={(e) => setSource(e.target.value as Source)}>
                {(Object.keys(SOURCE_LABELS) as Source[]).map((s) => (
                  <option key={s} value={s}>
                    {SOURCE_LABELS[s]}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span className="field-label">難度</span>
              <select className="select" value={difficulty} onChange={(e) => setDifficulty(e.target.value as 'any' | Difficulty)}>
                <option value="any">不限</option>
                <option>Easy</option>
                <option>Medium</option>
                <option>Hard</option>
              </select>
            </label>
            <label className="field">
              <span className="field-label">解題模式</span>
              <select className="select" value={patternId} onChange={(e) => setPatternId(e.target.value as 'any' | PatternId)}>
                <option value="any">不限</option>
                {PATTERNS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
            <p className="field-hint span-2">
              從 {LIST_FILTER_LABELS[settings.activeList]} 抽題，符合條件的有 {pool.length} 題。
            </p>
          </div>
        ) : (
          <label className="field">
            <span className="field-label">題號</span>
            <input
              className="input"
              list="mock-problem-options"
              inputMode="numeric"
              placeholder="例如 15"
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
              {specificProblem ? `已選：${specificProblem.title}（${specificProblem.difficulty}）` : '輸入題號，或從建議清單選一題。'}
            </span>
          </label>
        )}

        <div className="form-grid">
          <label className="field">
            <span className="field-label">時間（分鐘）</span>
            <input
              className="input"
              type="number"
              inputMode="decimal"
              min={1}
              max={120}
              step="any"
              placeholder={kind === 'explain' ? '2' : '依難度自動'}
              value={minutes}
              onChange={(e) => setMinutes(e.target.value)}
            />
          </label>
          <label className="field" style={{ justifyContent: 'flex-end' }}>
            <span style={{ display: 'flex', gap: 8, alignItems: 'center', minHeight: 38 }}>
              <input type="checkbox" checked={withAudio} onChange={(e) => setWithAudio(e.target.checked)} />
              錄下我的講解
            </span>
          </label>
          <p className="field-hint span-2">錄音只存在這個瀏覽器裡，不會上傳，也不會放進匯出的備份。</p>
        </div>

        <div className="btn-row">
          <button type="submit" className="btn btn-primary">
            開始計時
          </button>
        </div>
      </form>
    </Sheet>
  );
}

/* ---------- 進行中 ---------- */

function MockSession({ session, onFinish }: { session: Session; onFinish: (result: SessionResult) => void }) {
  const { elapsedSec, running, start, pause } = useStopwatch();
  const recorder = useRecorder();
  const { start: startRecording, pause: pauseRecording, resume: resumeRecording, stop: stopRecording } = recorder;
  const [done, setDone] = useState<string[]>([]);
  const [openStep, setOpenStep] = useState(0);
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const [finishing, setFinishing] = useState(false);
  const started = useRef(false);
  const { problem } = session;

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    start();
    if (session.withAudio) void startRecording();
  }, [start, startRecording, session.withAudio]);

  function togglePause() {
    if (running) {
      pause();
      pauseRecording();
    } else {
      start();
      resumeRecording();
    }
  }

  async function finish() {
    if (finishing) return;
    setFinishing(true);
    const ms = pause();
    const audio = await stopRecording();
    const steps =
      session.kind === 'full' ? done : EXPLAIN_CHECKS.filter((c) => checks[`explain:${c.id}`]).map((c) => c.id);
    onFinish({ usedSec: Math.round(ms / 1000), steps, audio });
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
          <span className="chip">{KIND_LABELS[session.kind]}</span>
          <DifficultyTag difficulty={problem.difficulty} />
          {session.kind === 'explain' && <span>{getPattern(problem.pattern).name}</span>}
          {problem.premium && <span>需要 Premium</span>}
          <LeetCodeLink slug={problem.slug}>在新分頁打開題目</LeetCodeLink>
        </div>
      </PageHead>

      <div className="mock-layout">
        <div className="stack">
          <section className="sheet sheet-body" aria-label="計時">
            <div className="timer">
              <span className="timer-value" data-over={over}>
                {formatDuration(elapsedSec)}
              </span>
              <span className="timer-limit">
                {over ? `已超過 ${formatDuration(elapsedSec - limit)}` : `還剩 ${formatDuration(limit - elapsedSec)}`}
                {!running && !finishing && '，已暫停'}
              </span>
            </div>
            <div
              className="timer-track"
              role="progressbar"
              aria-label="已用時間"
              aria-valuemin={0}
              aria-valuemax={limit}
              aria-valuenow={Math.min(elapsedSec, limit)}
            >
              <div className="timer-fill" data-over={over} style={{ width: `${Math.min(100, (elapsedSec / limit) * 100)}%` }} />
            </div>
            <p className="visually-hidden" aria-live="assertive">
              {over ? '時間到了' : ''}
            </p>
            <div className="btn-row" style={{ marginTop: 16 }}>
              <button className="btn" onClick={togglePause} disabled={finishing}>
                {running ? '暫停' : '繼續'}
              </button>
              <button className="btn btn-primary" onClick={() => void finish()} disabled={finishing}>
                結束並檢討
              </button>
            </div>
          </section>

          {session.kind === 'full' ? (
            <Sheet title="面試流程" id="steps" note={`完成 ${done.length} / ${INTERVIEW_STEPS.length}`}>
              <ol className="steps">
                {INTERVIEW_STEPS.map((step, i) => {
                  const state = done.includes(step.id) ? 'done' : i === currentStep ? 'current' : 'todo';
                  const open = openStep === i;
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
                            {step.name}
                            <span lang="en">{step.english}</span>
                          </span>
                        </button>
                        {state === 'done' && <span className="sheet-note">已完成</span>}
                      </div>
                      {open && (
                        <div className="step-body">
                          <p className="step-goal">{step.goal}</p>
                          <ul className="checklist">
                            {step.checks.map((c, j) => {
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
                                <p className="phrase-zh">{ph.zh}</p>
                              </li>
                            ))}
                          </ul>
                          {state !== 'done' && (
                            <div>
                              <button className="btn btn-primary btn-small" onClick={() => completeStep(i)}>
                                完成這一步
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
              <Sheet title="用這個架構講" id="scaffold" note="不要看筆記，講給想像中的面試官聽">
                <pre className="sheet-body prose-block explain-scaffold" lang="en" style={{ margin: 0, fontFamily: 'inherit' }}>
                  {EXPLANATION_SCAFFOLD}
                </pre>
              </Sheet>
              <Sheet title="有講到這些嗎？" id="explain-checks">
                <ul className="sheet-body checklist stack" style={{ gap: 8 }}>
                  {EXPLAIN_CHECKS.map((c) => {
                    const key = `explain:${c.id}`;
                    return (
                      <li key={key}>
                        <input id={key} type="checkbox" checked={!!checks[key]} onChange={() => toggleCheck(key)} />
                        <label htmlFor={key}>{c.label}</label>
                      </li>
                    );
                  })}
                </ul>
              </Sheet>
            </>
          )}
        </div>

        <div className="stack">
          <Sheet title="錄音" id="recording">
            <div className="sheet-body">
              {recorder.state === 'recording' && (
                <p style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="rec-dot" aria-hidden /> 錄音中
                </p>
              )}
              {recorder.state === 'paused' && <p>錄音已暫停</p>}
              {recorder.state === 'idle' &&
                (recorder.error ? (
                  <p className="form-error">{recorder.error}</p>
                ) : (
                  <p className="sheet-note">{session.withAudio ? '正在開啟麥克風…' : '這次沒有錄音。'}</p>
                ))}
            </div>
          </Sheet>
          <Sheet title="放聲思考" id="tips">
            <ul className="sheet-body bullets">
              {THINK_ALOUD_TIPS.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          </Sheet>
          <p className="sheet-note">
            需要更多句子？<Link to="/phrases" target="_blank">在新分頁打開英文句型</Link>
          </p>
        </div>
      </div>
    </>
  );
}

/* ---------- 檢討 ---------- */

function MockReview({ session, result, onDone }: { session: Session; result: SessionResult; onDone: () => void }) {
  const { problem } = session;
  const note = useNote(problem.id);
  const toast = useToast();
  const [rating, setRating] = useState<Rating | null>(null);
  const [clarity, setClarity] = useState<Clarity | null>(null);
  const [reflection, setReflection] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const isFull = session.kind === 'full';
  const canSave = isFull ? rating !== null : clarity !== null;

  async function save() {
    if (!canSave || saving) return;
    setSaving(true);
    const record: Omit<MockRecord, 'id'> = {
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
    if (result.audio) record.audio = result.audio;
    await saveMock(record);
    if (isFull && rating) {
      await recordAttempt(problem.id, rating, { mode: 'mock', minutes: Math.max(1, Math.round(result.usedSec / 60)) });
    }
    toast('已儲存這次練習。');
    onDone();
  }

  const overBy = result.usedSec - session.limitSec;

  return (
    <>
      <PageHead
        title={`檢討：${problem.title}`}
        lede={`${KIND_LABELS[session.kind]}，用了 ${formatDuration(result.usedSec)}，${
          overBy > 0 ? `超過目標 ${formatDuration(overBy)}` : `目標 ${formatDuration(session.limitSec)} 內完成`
        }。${
          isFull
            ? `完成 ${result.steps.length} / ${INTERVIEW_STEPS.length} 個步驟。`
            : `講到 ${result.steps.length} / ${EXPLAIN_CHECKS.length} 個重點。`
        }`}
      />

      <div className="split">
        <div className="stack">
          <Sheet title="聽一次錄音" id="playback">
            <div className="sheet-body stack" style={{ gap: 10 }}>
              {result.audio ? (
                <>
                  <BlobAudio blob={result.audio} />
                  <p className="sheet-note">注意有沒有長時間沉默、有沒有先講思路再動手，以及複雜度有沒有講出原因。</p>
                </>
              ) : (
                <p className="sheet-note">這次沒有錄音。下次開著錄音，檢討時會更清楚自己卡在哪裡。</p>
              )}
            </div>
          </Sheet>

          {!isFull && (
            <Sheet title="對照我的講解稿" id="compare">
              <div className="sheet-body">
                {note?.explanation ? (
                  <p className="prose-block" lang="en">
                    {note.explanation}
                  </p>
                ) : (
                  <p className="sheet-note">這題還沒有講解稿。儲存後到題目詳情，把剛才講的內容整理成講解稿。</p>
                )}
              </div>
            </Sheet>
          )}

          <Sheet title={isFull ? '這題解得怎麼樣？' : '講得怎麼樣？'} id="self-rating">
            <div className="sheet-body stack" style={{ gap: 16 }}>
              <div className="rating-grid">
                {isFull
                  ? RATINGS.map((r) => (
                      <button key={r.id} type="button" className="rating-option" aria-pressed={rating === r.id} onClick={() => setRating(r.id)}>
                        <span className="rating-label">{r.label}</span>
                        <span className="rating-detail">{r.detail}</span>
                      </button>
                    ))
                  : CLARITY_OPTIONS.map((c) => (
                      <button key={c.id} type="button" className="rating-option" aria-pressed={clarity === c.id} onClick={() => setClarity(c.id)}>
                        <span className="rating-label">{c.label}</span>
                        <span className="rating-detail">{c.detail}</span>
                      </button>
                    ))}
              </div>
              {isFull && <p className="field-hint">評分會一起更新這題的複習排程。</p>}
              <label className="field">
                <span className="field-label">哪裡卡住？下次要怎麼講？</span>
                <textarea
                  className="textarea"
                  rows={4}
                  value={reflection}
                  onChange={(e) => setReflection(e.target.value)}
                  placeholder="例如：講暴力解時太快跳過複雜度；忘了先確認輸入可能為空"
                />
              </label>
              <div className="btn-row">
                <button className="btn btn-primary" disabled={!canSave || saving} onClick={() => void save()}>
                  儲存紀錄
                </button>
                <button className="btn btn-quiet" onClick={() => setConfirmDiscard(true)}>
                  不儲存
                </button>
                {!canSave && <span className="sheet-note">先選一個自評結果</span>}
              </div>
            </div>
          </Sheet>
        </div>

        <Sheet title={isFull ? '步驟完成情況' : '講到的重點'} id="coverage">
          <ul className="sheet-body stack" style={{ gap: 6 }}>
            {(isFull ? INTERVIEW_STEPS.map((s) => ({ id: s.id, label: s.name })) : EXPLAIN_CHECKS).map((item) => {
              const hit = result.steps.includes(item.id);
              return (
                <li key={item.id} style={{ display: 'flex', gap: 8, color: hit ? undefined : 'var(--ink-3)' }}>
                  <span aria-hidden style={{ color: hit ? 'var(--good)' : 'var(--hard)', fontWeight: 700 }}>
                    {hit ? '✓' : '✗'}
                  </span>
                  <span>
                    {item.label}
                    <span className="visually-hidden">{hit ? '（有做到）' : '（沒做到）'}</span>
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
        title="不儲存這次練習？"
        footer={
          <>
            <button className="btn btn-quiet" onClick={() => setConfirmDiscard(false)}>
              返回
            </button>
            <button className="btn btn-danger" onClick={onDone}>
              不儲存
            </button>
          </>
        }
      >
        <p>錄音和自評都會捨棄。</p>
      </Dialog>
    </>
  );
}

/* ---------- 紀錄 ---------- */

function MockHistory() {
  const mocks = useMocks();
  const catalog = useCatalog();
  const toast = useToast();
  const [pendingDelete, setPendingDelete] = useState<MockRecord | null>(null);

  if (!mocks) return null;

  return (
    <Sheet title="過去的練習" count={mocks.length} id="mock-history">
      {mocks.length === 0 ? (
        <p className="sheet-empty">
          還沒有紀錄。可以先從講解練習開始：挑一題做過的題目，用兩分鐘把解法講給自己聽。
        </p>
      ) : (
        <ul className="rows">
          {mocks.map((m) => {
            const p = catalog.byId.get(m.problemId);
            const clarity = CLARITY_OPTIONS.find((c) => c.id === m.clarity);
            const total = m.kind === 'full' ? INTERVIEW_STEPS.length : EXPLAIN_CHECKS.length;
            return (
              <li key={m.id} className="sheet-body stack" style={{ gap: 8 }}>
                <div className="btn-row" style={{ justifyContent: 'space-between' }}>
                  <div className="problem-title">
                    <span className="problem-num">{m.problemId}</span>
                    <Link to={`/problems/${m.problemId}`}>{p?.title ?? '已刪除的題目'}</Link>
                  </div>
                  <button className="btn btn-quiet btn-small" onClick={() => setPendingDelete(m)}>
                    刪除
                  </button>
                </div>
                <div className="problem-meta">
                  <span className="chip">{KIND_LABELS[m.kind]}</span>
                  <span>{formatDay(m.day)}</span>
                  <span>
                    {formatDuration(m.usedSec)}（目標 {formatDuration(m.limitSec)}）
                  </span>
                  <span>
                    {m.kind === 'full' ? '步驟' : '重點'} {m.steps.length} / {total}
                  </span>
                  {m.rating && <span>{ratingLabel(m.rating)}</span>}
                  {clarity && <span>{clarity.label}</span>}
                </div>
                {m.reflection && <p className="prose-block">{m.reflection}</p>}
                {m.audio && <MockAudio blob={m.audio} />}
              </li>
            );
          })}
        </ul>
      )}
      <Dialog
        open={pendingDelete !== null}
        onClose={() => setPendingDelete(null)}
        title="刪除這筆紀錄？"
        footer={
          <>
            <button className="btn btn-quiet" onClick={() => setPendingDelete(null)}>
              取消
            </button>
            <button
              className="btn btn-danger"
              onClick={async () => {
                if (pendingDelete?.id !== undefined) await deleteMock(pendingDelete.id);
                setPendingDelete(null);
                toast('已刪除紀錄。');
              }}
            >
              刪除紀錄
            </button>
          </>
        }
      >
        <p>錄音也會一起刪除。題目的複習排程不受影響。</p>
      </Dialog>
    </Sheet>
  );
}

function MockAudio({ blob }: { blob: Blob }) {
  const [open, setOpen] = useState(false);
  if (open) return <BlobAudio blob={blob} autoPlay />;
  return (
    <div>
      <button className="btn btn-small" onClick={() => setOpen(true)}>
        播放錄音
      </button>
    </div>
  );
}
