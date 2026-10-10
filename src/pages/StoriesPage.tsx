import { Fragment, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { SaveStatus, useAutosave } from '../components/autosave';
import { useToast } from '../components/toast';
import { Dialog, PageHead, Sheet } from '../components/ui';
import { BEHAVIORAL_QUESTIONS, BEHAVIORAL_THEMES, STAR_PARTS, STAR_PHRASES, type BehavioralTheme, type StarPart } from '../data/behavioral';
import { useI18n } from '../i18n';
import { needsMoreAction, storiesByTheme, storyLength } from '../lib/stories';
import { createStory, deleteStory, saveStory } from '../store/actions';
import type { StoryRecord } from '../store/db';
import { useStories, useStory } from '../store/queries';

/** 行為面試：每個主題有沒有故事、我的故事、常見題目 */
export function StoriesPage() {
  const { t, locale } = useI18n();
  const stories = useStories();
  const navigate = useNavigate();
  const [theme, setTheme] = useState<BehavioralTheme | null>(null);
  const byTheme = useMemo(() => storiesByTheme(stories ?? []), [stories]);
  const covered = BEHAVIORAL_THEMES.filter((th) => byTheme.get(th)!.length > 0).length;
  const s = t.stories;

  /** 新增一個故事（可以先標好主題），直接打開來寫 */
  const start = async (themes: BehavioralTheme[] = []) => navigate(`/stories/${await createStory(themes)}`);
  const questions = BEHAVIORAL_QUESTIONS.filter((q) => !theme || q.theme === theme);

  return (
    <div className="page">
      <PageHead title={s.title} lede={s.lede} />
      <div className="stack">
        <Sheet title={s.coverageTitle} id="coverage" note={s.coverageNote(covered, BEHAVIORAL_THEMES.length)}>
          <ul className="sheet-body theme-grid">
            {BEHAVIORAL_THEMES.map((th) => {
              const n = byTheme.get(th)!.length;
              return (
                <li key={th}>
                  <button
                    type="button"
                    className="theme-cell"
                    data-empty={n === 0 || undefined}
                    aria-pressed={theme === th}
                    title={s.themes[th].hint}
                    onClick={() => setTheme(theme === th ? null : th)}
                  >
                    <span className="theme-name">{s.themes[th].name}</span>
                    <span className="theme-count">{n === 0 ? s.noStory : s.storyCount(n)}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </Sheet>

        <Sheet
          title={s.myTitle}
          id="my-stories"
          count={stories?.length}
          actions={
            <button type="button" className="btn btn-primary btn-small" onClick={() => void start()}>
              {s.newStory}
            </button>
          }
        >
          {stories === undefined ? null : stories.length === 0 ? (
            <p className="sheet-empty">{s.emptyList}</p>
          ) : (
            <ul className="story-list">
              {stories.map((story) => (
                <li key={story.id}>
                  <Link className="story-row" to={`/stories/${story.id}`}>
                    <span className="story-title">{story.title || s.untitled}</span>
                    <span className="story-themes">
                      {story.themes.map((th) => (
                        <span key={th} className="chip">
                          {s.themes[th].name}
                        </span>
                      ))}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Sheet>

        <Sheet
          title={theme ? s.questionsFor(s.themes[theme].name) : s.questionsTitle}
          id="questions"
          note={s.questionsNote}
          actions={
            theme && (
              <button type="button" className="btn btn-quiet btn-small" onClick={() => setTheme(null)}>
                {s.showAll}
              </button>
            )
          }
        >
          <ul className="sheet-body question-list">
            {questions.map((q) => {
              const mine = byTheme.get(q.theme)!;
              return (
                <li key={q.id} className="question-item">
                  <p className="question-en" lang="en">
                    {q.en}
                  </p>
                  {locale === 'zh-TW' && <p className="question-zh">{q.zh}</p>}
                  <p className="question-focus">
                    <span className="chip">{s.themes[q.theme].name}</span> {s.lookingFor(locale === 'zh-TW' ? q.focus.zh : q.focus.en)}
                  </p>
                  <p className="question-stories">
                    {mine.length > 0 ? (
                      <>
                        {s.yourStories}{' '}
                        {mine.map((story, i) => (
                          <Fragment key={story.id}>
                            {i > 0 && ', '}
                            <Link to={`/stories/${story.id}`}>{story.title || s.untitled}</Link>
                          </Fragment>
                        ))}
                      </>
                    ) : (
                      <button type="button" className="btn btn-quiet btn-small" onClick={() => void start([q.theme])}>
                        {s.writeOne}
                      </button>
                    )}
                  </p>
                </li>
              );
            })}
          </ul>
        </Sheet>
      </div>
    </div>
  );
}

/** 寫一個故事 */
export function StoryPage() {
  const { t } = useI18n();
  const { id = '' } = useParams();
  const story = useStory(id);
  if (story === undefined) return <div className="page" aria-busy="true" />;
  if (story === null) {
    return (
      <div className="page">
        <PageHead title={t.stories.notFound} />
        <Link className="btn" to="/stories">
          {t.stories.back}
        </Link>
      </div>
    );
  }
  return <StoryEditor key={story.id} story={story} />;
}

type StoryDraft = Omit<StoryRecord, 'id' | 'updatedAt'>;

function StoryEditor({ story }: { story: StoryRecord }) {
  const { t, locale } = useI18n();
  const s = t.stories;
  const navigate = useNavigate();
  const toast = useToast();
  const [draft, setDraft] = useState<StoryDraft>(() => ({
    title: story.title,
    situation: story.situation,
    task: story.task,
    action: story.action,
    result: story.result,
    themes: story.themes,
  }));
  const status = useAutosave(draft, (value) => saveStory(story.id, value));
  const [confirm, setConfirm] = useState(false);
  const update = (patch: Partial<StoryDraft>) => setDraft((d) => ({ ...d, ...patch }));
  const toggleTheme = (theme: BehavioralTheme) => {
    const next = new Set(draft.themes);
    if (next.has(theme)) next.delete(theme);
    else next.add(theme);
    update({ themes: BEHAVIORAL_THEMES.filter((th) => next.has(th)) });
  };
  /** 點一個開頭句，接在那一段的最後面 */
  const addPhrase = (part: StarPart, phrase: string) => {
    const before = draft[part].trimEnd();
    update({ [part]: `${before}${before ? ' ' : ''}${phrase.replace(/…$/, '')}` });
  };
  const length = storyLength(draft);
  const minutes = (Math.round((length.seconds / 60) * 10) / 10).toString();

  const remove = async () => {
    setConfirm(false);
    await deleteStory(story.id);
    toast(s.deleted);
    navigate('/stories');
  };

  return (
    <div className="page">
      <p className="back-link">
        <Link to="/stories">← {s.back}</Link>
      </p>
      <PageHead title={draft.title || s.untitled} />
      <div className="stack">
        <Sheet title={s.editorTitle} id="story" actions={<SaveStatus status={status} />}>
          <div className="sheet-body story-form">
            <label className="field">
              <span className="field-label">{s.titleLabel}</span>
              <input className="input" value={draft.title} maxLength={120} placeholder={s.titlePlaceholder} onChange={(e) => update({ title: e.target.value })} />
            </label>
            <fieldset className="field story-themes-field">
              <legend className="field-label">{s.themesLabel}</legend>
              <div className="pill-group">
                {BEHAVIORAL_THEMES.map((th) => (
                  <button key={th} type="button" aria-pressed={draft.themes.includes(th)} title={s.themes[th].hint} onClick={() => toggleTheme(th)}>
                    {s.themes[th].name}
                  </button>
                ))}
              </div>
            </fieldset>
            {STAR_PARTS.map((part) => (
              <div className="field" key={part}>
                <label className="field-label" htmlFor={`story-${part}`}>
                  {s.parts[part].name}
                </label>
                <span className="field-hint">{s.parts[part].hint}</span>
                <textarea
                  id={`story-${part}`}
                  className="input story-text"
                  lang="en"
                  rows={part === 'action' ? 6 : 3}
                  maxLength={part === 'action' ? 5000 : 3000}
                  value={draft[part]}
                  placeholder={STAR_PHRASES[part][0].en}
                  onChange={(e) => update({ [part]: e.target.value })}
                />
                <div className="story-phrases" aria-label={s.phrasesLabel(s.parts[part].name)}>
                  {STAR_PHRASES[part].map((phrase) => (
                    <button
                      key={phrase.en}
                      type="button"
                      className="phrase-chip"
                      lang="en"
                      title={locale === 'zh-TW' ? phrase.zh : undefined}
                      onClick={() => addPhrase(part, phrase.en)}
                    >
                      {phrase.en}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            {length.verdict !== 'empty' && (
              <p className="story-length" data-verdict={length.verdict}>
                {s.length(length.words, minutes)}
                {length.verdict === 'short' && ` ${s.tooShort}`}
                {length.verdict === 'long' && ` ${s.tooLong}`}
                {needsMoreAction(length) && ` ${s.moreAction}`}
              </p>
            )}
          </div>
        </Sheet>
        <div className="btn-row">
          <button type="button" className="btn btn-danger" onClick={() => setConfirm(true)}>
            {s.deleteStory}
          </button>
        </div>
      </div>
      <Dialog
        open={confirm}
        onClose={() => setConfirm(false)}
        title={s.confirmDeleteTitle}
        footer={
          <>
            <button className="btn btn-quiet" onClick={() => setConfirm(false)}>
              {t.common.cancel}
            </button>
            <button className="btn btn-danger" onClick={() => void remove()}>
              {s.deleteStory}
            </button>
          </>
        }
      >
        <p>{s.confirmDelete}</p>
      </Dialog>
    </div>
  );
}
