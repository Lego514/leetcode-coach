import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router';
import { SaveStatus, useAutosave } from '../components/autosave';
import { CodeTextarea } from '../components/CodeTextarea';
import { ProblemRow } from '../components/ProblemRow';
import { MasteryCell, MasteryLegend, PageHead, Sheet } from '../components/ui';
import { getPattern, getPatterns, isPatternId, type Pattern } from '../data/patterns';
import { useI18n } from '../i18n';
import { problemsInList } from '../lib/catalog';
import { summarizePatterns } from '../lib/stats';
import { savePatternNote } from '../store/actions';
import type { PatternNoteRecord } from '../store/db';
import { useCatalog, usePatternNote, useProgressMap, useSettings, useToday } from '../store/queries';

export function PatternsPage() {
  const { t, locale } = useI18n();
  const settings = useSettings();
  const catalog = useCatalog();
  const { progress } = useProgressMap();
  const listProblems = useMemo(() => problemsInList(catalog, settings.activeList), [catalog, settings.activeList]);
  const summaries = useMemo(
    () => new Map(summarizePatterns(listProblems, progress).map((s) => [s.pattern, s])),
    [listProblems, progress],
  );

  return (
    <div className="page">
      <PageHead title={t.patterns.title} lede={t.patterns.lede(t.lists.labels[settings.activeList])} />
      <div style={{ marginBottom: 16 }}>
        <MasteryLegend />
      </div>
      <section className="sheet" aria-label={t.patterns.listLabel}>
        <ul className="pattern-list">
          {getPatterns(locale).map((p) => {
            const summary = summaries.get(p.id);
            const problems = listProblems.filter((x) => x.pattern === p.id);
            return (
              <li key={p.id}>
                <Link className="pattern-link" to={`/patterns/${p.id}`}>
                  <span className="pattern-name">
                    {p.name}
                    {locale !== 'en' && (
                      <span className="pattern-english" lang="en">
                        {p.english}
                      </span>
                    )}
                  </span>
                  <span className="pattern-summary">
                    {p.summary}
                    {summary && t.patterns.doneCount(summary.started, summary.total)}
                  </span>
                  <span className="pattern-cells" aria-hidden>
                    {problems.map((x) => (
                      <MasteryCell key={x.id} progress={progress.get(x.id)} />
                    ))}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}

export function PatternDetailPage() {
  const { t, locale } = useI18n();
  const { id } = useParams();
  const pattern = id && isPatternId(id) ? getPattern(id, locale) : undefined;
  if (!pattern) {
    return (
      <div className="page">
        <Link className="back-link" to="/patterns">
          {t.patterns.back}
        </Link>
        <PageHead title={t.patterns.notFound} />
      </div>
    );
  }
  return <PatternDetail key={pattern.id} pattern={pattern} />;
}

function PatternDetail({ pattern }: { pattern: Pattern }) {
  const { t, locale } = useI18n();
  const day = useToday();
  const catalog = useCatalog();
  const { progress } = useProgressMap();
  const note = usePatternNote(pattern.id);
  const problems = catalog.problems.filter((p) => p.pattern === pattern.id);

  return (
    <div className="page">
      <Link className="back-link" to="/patterns">
        {t.patterns.back}
      </Link>
      <PageHead
        title={
          <>
            {pattern.name}
            {locale !== 'en' && (
              <>
                {' '}
                <span lang="en" style={{ fontWeight: 400, color: 'var(--ink-3)' }}>
                  {pattern.english}
                </span>
              </>
            )}
          </>
        }
        lede={pattern.summary}
      />
      <div className="stack">
        <div className="split split-even">
          <Sheet title={t.patterns.signalsTitle} id="signals">
            <ul className="sheet-body bullets">
              {pattern.signals.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </Sheet>
          <Sheet title={t.patterns.pitfallsTitle} id="pitfalls">
            <ul className="sheet-body bullets bullets-warn">
              {pattern.pitfalls.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </Sheet>
        </div>

        {note === undefined ? null : <PatternNotes pattern={pattern} initial={note} />}

        <Sheet title={t.patterns.problemsTitle} count={problems.length} id="pattern-problems">
          <ul className="rows">
            {problems.map((p) => {
              const state = progress.get(p.id);
              return (
                <li key={p.id}>
                  <ProblemRow problem={p} progress={state} today={day} marked={!!state && state.due <= day} />
                </li>
              );
            })}
          </ul>
        </Sheet>
      </div>
    </div>
  );
}

interface PatternDraft {
  template?: string;
  notes: string;
}

function PatternNotes({ pattern, initial }: { pattern: Pattern; initial: PatternNoteRecord | null }) {
  const { t } = useI18n();
  const [draft, setDraft] = useState<PatternDraft>(() => ({ template: initial?.template, notes: initial?.notes ?? '' }));
  const [editing, setEditing] = useState(false);
  const status = useAutosave(draft, (value) => savePatternNote(pattern.id, value));
  const template = draft.template ?? pattern.template;
  const customized = draft.template !== undefined;

  return (
    <>
      <Sheet
        title={t.patterns.templateTitle}
        id="template"
        note={customized ? t.patterns.customized : 'Python'}
        actions={
          <div className="btn-row">
            {customized && (
              <button className="btn btn-quiet btn-small" onClick={() => setDraft((d) => ({ ...d, template: undefined }))}>
                {t.patterns.restore}
              </button>
            )}
            <button className="btn btn-small" onClick={() => setEditing((e) => !e)}>
              {editing ? t.patterns.doneEditing : t.patterns.edit}
            </button>
          </div>
        }
      >
        <div className="sheet-body">
          {editing ? (
            <CodeTextarea
              value={template}
              rows={Math.min(40, template.split('\n').length + 2)}
              onChange={(value) => setDraft((d) => ({ ...d, template: value }))}
            />
          ) : (
            <pre className="code-block">
              <code>{template}</code>
            </pre>
          )}
        </div>
      </Sheet>

      <Sheet title={t.patterns.notesTitle} id="pattern-notes" actions={<SaveStatus status={status} />}>
        <div className="sheet-body">
          <label className="visually-hidden" htmlFor="pattern-notes-input">
            {t.patterns.notesTitle}
          </label>
          <textarea
            id="pattern-notes-input"
            className="textarea"
            rows={5}
            value={draft.notes}
            onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))}
            placeholder={t.patterns.notesPlaceholder(pattern.signals[0])}
          />
        </div>
      </Sheet>
    </>
  );
}
