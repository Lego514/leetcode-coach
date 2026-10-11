import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { BEHAVIORAL_POINTS, type BehavioralPoint } from '../../shared/constants';
import type { BehavioralFeedback } from '../../shared/protocol';
import { BehavioralFeedbackPanel } from '../components/BehavioralFeedback';
import { BlobAudio } from '../components/BlobAudio';
import { useToast } from '../components/toast';
import { PageHead, Sheet } from '../components/ui';
import { BEHAVIORAL_QUESTIONS, BEHAVIORAL_THEMES, STAR_PARTS, type BehavioralQuestion, type BehavioralTheme } from '../data/behavioral';
import { useI18n } from '../i18n';
import { formatDuration, toDay } from '../lib/dates';
import { useRecorder, useStopwatch } from '../lib/session';
import { speechSupported, useSpeechTranscript } from '../lib/speech';
import { drawQuestion, pronounCounts } from '../lib/stories';
import { transcriptStats } from '../lib/transcript';
import { saveRehearsal } from '../store/actions';
import type { Clarity, StoryRecord } from '../store/db';
import { useStories } from '../store/queries';

/** 抓 1.5 到 2.5 分鐘；超過 2.5 分鐘標成超時 */
const LIMIT_SEC = 150;

interface Setup {
  question: BehavioralQuestion;
  story: StoryRecord | null;
  withAudio: boolean;
  withTranscript: boolean;
  startedAt: string;
}

interface Spoken {
  usedSec: number;
  audio: Blob | null;
  transcript: string | null;
}

/** 練習講一題行為面試：抽題、選故事、計時用英文講，講完看逐字稿、自評和 AI 回饋 */
export function RehearsePage() {
  const [setup, setSetup] = useState<Setup | null>(null);
  const [spoken, setSpoken] = useState<Spoken | null>(null);
  if (!setup) return <RehearseSetup onStart={setSetup} />;
  if (!spoken) return <RehearseSession key={setup.startedAt} setup={setup} onFinish={setSpoken} />;
  return (
    <RehearseReview
      setup={setup}
      spoken={spoken}
      onAgain={() => {
        setSpoken(null);
        setSetup(null);
      }}
    />
  );
}

function RehearseSetup({ onStart }: { onStart: (setup: Setup) => void }) {
  const { t, locale } = useI18n();
  const r = t.rehearse;
  const stories = useStories();
  const [theme, setTheme] = useState<BehavioralTheme | 'all'>('all');
  const [question, setQuestion] = useState<BehavioralQuestion | undefined>(() => drawQuestion(BEHAVIORAL_QUESTIONS));
  const [storyId, setStoryId] = useState<string | null>(null);
  const [withAudio, setWithAudio] = useState(true);
  const [withTranscript, setWithTranscript] = useState(speechSupported());

  const draw = (next: BehavioralTheme | 'all', previous?: string) => {
    const pool = BEHAVIORAL_QUESTIONS.filter((q) => next === 'all' || q.theme === next);
    setQuestion(drawQuestion(pool, previous));
    setStoryId(null);
  };

  // 這一題主題的故事排前面；預設選第一個
  const matching = (stories ?? []).filter((s) => question && s.themes.includes(question.theme));
  const others = (stories ?? []).filter((s) => !matching.includes(s));
  const chosenId = storyId ?? matching[0]?.id ?? '';
  const story = stories?.find((s) => s.id === chosenId) ?? null;

  return (
    <div className="page">
      <p className="back-link">
        <Link to="/stories">← {t.stories.back}</Link>
      </p>
      <PageHead title={r.title} lede={r.lede} />
      <div className="stack">
        <Sheet title={r.questionTitle} id="rehearse-question">
          <div className="sheet-body stack" style={{ gap: 14 }}>
            <div className="btn-row">
              <label className="field" style={{ flex: '1 1 200px' }}>
                <span className="field-label">{r.themeLabel}</span>
                <select
                  className="input"
                  value={theme}
                  onChange={(e) => {
                    const next = e.target.value as BehavioralTheme | 'all';
                    setTheme(next);
                    draw(next);
                  }}
                >
                  <option value="all">{r.anyTheme}</option>
                  {BEHAVIORAL_THEMES.map((th) => (
                    <option key={th} value={th}>
                      {t.stories.themes[th].name}
                    </option>
                  ))}
                </select>
              </label>
              <button type="button" className="btn" style={{ alignSelf: 'flex-end' }} onClick={() => draw(theme, question?.id)}>
                {r.drawAnother}
              </button>
            </div>
            {question && (
              <div className="rehearse-question">
                <p className="question-en" lang="en">
                  {question.en}
                </p>
                {locale === 'zh-TW' && <p className="question-zh">{question.zh}</p>}
                <p className="question-focus">
                  <span className="chip">{t.stories.themes[question.theme].name}</span>{' '}
                  {t.stories.lookingFor(locale === 'zh-TW' ? question.focus.zh : question.focus.en)}
                </p>
              </div>
            )}
          </div>
        </Sheet>

        <Sheet title={r.storyTitle} id="rehearse-story" note={r.storyNote}>
          <div className="sheet-body stack" style={{ gap: 12 }}>
            <label className="field">
              <span className="field-label">{r.storyLabel}</span>
              <select className="input" value={chosenId} onChange={(e) => setStoryId(e.target.value)}>
                {matching.length > 0 && (
                  <optgroup label={r.matchingStories}>
                    {matching.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.title || t.stories.untitled}
                      </option>
                    ))}
                  </optgroup>
                )}
                {others.length > 0 && (
                  <optgroup label={r.otherStories}>
                    {others.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.title || t.stories.untitled}
                      </option>
                    ))}
                  </optgroup>
                )}
                <option value="">{r.noStory}</option>
              </select>
            </label>
            {story && <StoryNotes story={story} />}
            {stories?.length === 0 && (
              <p className="sheet-note">
                <Link to="/stories">{r.writeFirst}</Link>
              </p>
            )}
          </div>
        </Sheet>

        <div className="stack" style={{ gap: 10 }}>
          <label className="check">
            <input type="checkbox" checked={withAudio} onChange={(e) => setWithAudio(e.target.checked)} />
            {r.withAudio}
          </label>
          <label className="check">
            <input type="checkbox" checked={withTranscript} disabled={!speechSupported()} onChange={(e) => setWithTranscript(e.target.checked)} />
            {speechSupported() ? r.withTranscript : r.noTranscript}
          </label>
          <div className="btn-row">
            <button
              type="button"
              className="btn btn-primary"
              disabled={!question}
              onClick={() => question && onStart({ question, story, withAudio, withTranscript, startedAt: new Date().toISOString() })}
            >
              {r.start}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** 故事的 STAR 筆記，收起來，要看再打開 */
function StoryNotes({ story, open = false }: { story: StoryRecord; open?: boolean }) {
  const { t } = useI18n();
  return (
    <details className="story-notes" open={open}>
      <summary>{t.rehearse.notes(story.title || t.stories.untitled)}</summary>
      <dl className="facts">
        {STAR_PARTS.map((part) => (
          <div key={part} style={{ display: 'contents' }}>
            <dt>{t.stories.parts[part].name}</dt>
            <dd lang="en">{story[part] || '—'}</dd>
          </div>
        ))}
      </dl>
    </details>
  );
}

function RehearseSession({ setup, onFinish }: { setup: Setup; onFinish: (spoken: Spoken) => void }) {
  const { t, locale } = useI18n();
  const r = t.rehearse;
  const { elapsedSec, start, pause } = useStopwatch();
  const recorder = useRecorder();
  const { start: startRecording, stop: stopRecording } = recorder;
  const speech = useSpeechTranscript();
  const { start: startSpeech, stop: stopSpeech } = speech;
  const [finishing, setFinishing] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    start();
    if (setup.withAudio) void startRecording();
    if (setup.withTranscript) startSpeech();
  }, [start, startRecording, startSpeech, setup.withAudio, setup.withTranscript]);

  async function finish() {
    if (finishing) return;
    setFinishing(true);
    const ms = pause();
    const [audio, transcript] = await Promise.all([stopRecording(), setup.withTranscript ? stopSpeech() : Promise.resolve(null)]);
    onFinish({ usedSec: Math.round(ms / 1000), audio, transcript });
  }

  const over = elapsedSec > LIMIT_SEC;
  const live = `${speech.finalText} ${speech.interim}`.trim();
  return (
    <div className="page">
      <PageHead title={r.speaking}>
        <p className="rehearse-big-question" lang="en">
          {setup.question.en}
        </p>
        {locale === 'zh-TW' && <p className="question-zh">{setup.question.zh}</p>}
      </PageHead>
      <div className="stack">
        <section className="sheet sheet-body" aria-label={t.common.timer}>
          <div className="timer">
            <span className="timer-value" data-over={over}>
              {formatDuration(elapsedSec)}
            </span>
            <span className="timer-limit">{over ? r.over : r.target}</span>
          </div>
          <div
            className="timer-track"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={LIMIT_SEC}
            aria-valuenow={Math.min(elapsedSec, LIMIT_SEC)}
            aria-label={r.target}
          >
            <div className="timer-fill" data-over={over} style={{ width: `${Math.min(100, (elapsedSec / LIMIT_SEC) * 100)}%` }} />
          </div>
          {recorder.error && <p className="form-error">{t.errors.recorder[recorder.error]}</p>}
          {speech.error && <p className="form-error">{t.errors.speech[speech.error]}</p>}
          <div className="btn-row" style={{ marginTop: 12 }}>
            <button type="button" className="btn btn-primary" disabled={finishing} onClick={() => void finish()}>
              {r.done}
            </button>
          </div>
        </section>
        {setup.withTranscript && (
          <Sheet title={r.liveTranscript} id="rehearse-live">
            <p className="sheet-body prose-block" lang="en" aria-live="polite">
              {live || r.listening}
            </p>
          </Sheet>
        )}
        {setup.story && <StoryNotes story={setup.story} />}
      </div>
    </div>
  );
}

function RehearseReview({ setup, spoken, onAgain }: { setup: Setup; spoken: Spoken; onAgain: () => void }) {
  const { t } = useI18n();
  const r = t.rehearse;
  const navigate = useNavigate();
  const toast = useToast();
  const [transcript, setTranscript] = useState(spoken.transcript ?? '');
  const [covered, setCovered] = useState<BehavioralPoint[]>([]);
  const [clarity, setClarity] = useState<Clarity | null>(null);
  const [feedback, setFeedback] = useState<BehavioralFeedback | null>(null);
  const [saving, setSaving] = useState(false);
  const text = transcript.trim();
  const stats = useMemo(() => transcriptStats(text, spoken.usedSec), [text, spoken.usedSec]);
  const pronouns = useMemo(() => pronounCounts(text), [text]);

  const toggle = (point: BehavioralPoint) =>
    setCovered((prev) => BEHAVIORAL_POINTS.filter((p) => (p === point ? !prev.includes(p) : prev.includes(p))));

  async function save() {
    setSaving(true);
    await saveRehearsal({
      questionId: setup.question.id,
      ...(setup.story ? { storyId: setup.story.id } : {}),
      day: toDay(new Date(setup.startedAt)),
      startedAt: setup.startedAt,
      limitSec: LIMIT_SEC,
      usedSec: spoken.usedSec,
      covered,
      ...(clarity ? { clarity } : {}),
      ...(text ? { transcript: text } : {}),
      ...(feedback ? { feedback } : {}),
      ...(spoken.audio ? { audio: spoken.audio } : {}),
    });
    toast(r.saved);
    navigate('/stories');
  }

  const story = setup.story;
  return (
    <div className="page">
      <PageHead title={r.reviewTitle} lede={r.reviewLede(formatDuration(spoken.usedSec))}>
        <p className="question-en" lang="en">
          {setup.question.en}
        </p>
      </PageHead>
      <div className="stack">
        {spoken.audio && (
          <Sheet title={r.recording} id="rehearse-audio">
            <div className="sheet-body">
              <BlobAudio blob={spoken.audio} />
            </div>
          </Sheet>
        )}

        <Sheet title={t.mock.transcriptTitle} id="rehearse-transcript" note={t.mock.transcriptReviewNote}>
          <div className="sheet-body stack" style={{ gap: 12 }}>
            <label className="visually-hidden" htmlFor="rehearse-transcript-input">
              {t.mock.transcriptLabel}
            </label>
            <textarea
              id="rehearse-transcript-input"
              className="textarea"
              rows={6}
              lang="en"
              value={transcript}
              placeholder={t.mock.transcriptNone}
              onChange={(e) => setTranscript(e.target.value)}
            />
            {text && (
              <ul className="bullets">
                <li>
                  {t.mock.transcriptStats(stats.words, stats.wpm)}
                  {stats.wpm !== null && ` ${t.mock.pace(stats.wpm)}`}
                </li>
                <li>
                  {stats.fillers.length > 0 ? t.mock.fillers(stats.fillers.map((f) => t.mock.fillerItem(f.word, f.count)).join(', ')) : t.mock.noFillers}
                </li>
                <li data-warn={pronouns.we > pronouns.i || undefined}>
                  {r.pronouns(pronouns.i, pronouns.we)}
                  {pronouns.we > pronouns.i && ` ${r.tooMuchWe}`}
                </li>
              </ul>
            )}
            <BehavioralFeedbackPanel
              request={{
                question: setup.question.en,
                ...(story
                  ? { story: { title: story.title, situation: story.situation, task: story.task, action: story.action, result: story.result } }
                  : {}),
                transcript: text,
                seconds: spoken.usedSec,
              }}
              feedback={feedback}
              onFeedback={setFeedback}
            />
          </div>
        </Sheet>

        <Sheet title={r.checkTitle} id="rehearse-check" note={r.checkNote}>
          <div className="sheet-body stack" style={{ gap: 10 }}>
            {BEHAVIORAL_POINTS.map((point) => (
              <label key={point} className="check">
                <input type="checkbox" checked={covered.includes(point)} onChange={() => toggle(point)} />
                {r.checks[point]}
              </label>
            ))}
            <div className="field">
              <span className="field-label">{r.clarityLabel}</span>
              <div className="pill-group">
                {([1, 2, 3] as const).map((c) => (
                  <button key={c} type="button" aria-pressed={clarity === c} onClick={() => setClarity(c)}>
                    {r.clarity[c]}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Sheet>

        {story && <StoryNotes story={story} open />}

        <div className="btn-row">
          <button type="button" className="btn btn-primary" disabled={saving} onClick={() => void save()}>
            {r.save}
          </button>
          <button type="button" className="btn btn-quiet" onClick={onAgain}>
            {r.discard}
          </button>
        </div>
      </div>
    </div>
  );
}
