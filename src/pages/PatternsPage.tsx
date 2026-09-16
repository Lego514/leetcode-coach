import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router';
import { SaveStatus, useAutosave } from '../components/autosave';
import { CodeTextarea } from '../components/CodeTextarea';
import { ProblemRow } from '../components/ProblemRow';
import { MasteryCell, MasteryLegend, PageHead, Sheet } from '../components/ui';
import { PATTERNS, type Pattern } from '../data/patterns';
import { LIST_FILTER_LABELS, problemsInList } from '../lib/catalog';
import { summarizePatterns } from '../lib/stats';
import { savePatternNote } from '../store/actions';
import type { PatternNoteRecord } from '../store/db';
import { useCatalog, usePatternNote, useProgressMap, useSettings, useToday } from '../store/queries';

export function PatternsPage() {
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
      <PageHead
        title="模板卡"
        lede={`每種解題模式的辨識訊號、常見錯誤和 Python 模板。方格是 ${LIST_FILTER_LABELS[settings.activeList]} 裡這個模式的題目。`}
      />
      <div style={{ marginBottom: 16 }}>
        <MasteryLegend />
      </div>
      <section className="sheet" aria-label="解題模式">
        <ul className="pattern-list">
          {PATTERNS.map((p) => {
            const summary = summaries.get(p.id);
            const problems = listProblems.filter((x) => x.pattern === p.id);
            return (
              <li key={p.id}>
                <Link className="pattern-link" to={`/patterns/${p.id}`}>
                  <span className="pattern-name">
                    {p.name}
                    <span className="pattern-english" lang="en">
                      {p.english}
                    </span>
                  </span>
                  <span className="pattern-summary">
                    {p.summary}
                    {summary && (
                      <>
                        {' '}
                        做過 {summary.started} / {summary.total} 題。
                      </>
                    )}
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
  const { id } = useParams();
  const pattern = PATTERNS.find((p) => p.id === id);
  if (!pattern) {
    return (
      <div className="page">
        <Link className="back-link" to="/patterns">
          回到模板卡
        </Link>
        <PageHead title="找不到這個模式" />
      </div>
    );
  }
  return <PatternDetail key={pattern.id} pattern={pattern} />;
}

function PatternDetail({ pattern }: { pattern: Pattern }) {
  const day = useToday();
  const catalog = useCatalog();
  const { progress } = useProgressMap();
  const note = usePatternNote(pattern.id);
  const problems = catalog.problems.filter((p) => p.pattern === pattern.id);

  return (
    <div className="page">
      <Link className="back-link" to="/patterns">
        回到模板卡
      </Link>
      <PageHead
        title={
          <>
            {pattern.name}{' '}
            <span lang="en" style={{ fontWeight: 400, color: 'var(--ink-3)' }}>
              {pattern.english}
            </span>
          </>
        }
        lede={pattern.summary}
      />
      <div className="stack">
        <div className="split split-even">
          <Sheet title="看到這些線索就想到它" id="signals">
            <ul className="sheet-body bullets">
              {pattern.signals.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </Sheet>
          <Sheet title="常見錯誤" id="pitfalls">
            <ul className="sheet-body bullets bullets-warn">
              {pattern.pitfalls.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </Sheet>
        </div>

        {note === undefined ? null : <PatternNotes pattern={pattern} initial={note} />}

        <Sheet title="這個模式的題目" count={problems.length} id="pattern-problems">
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
  const [draft, setDraft] = useState<PatternDraft>(() => ({ template: initial?.template, notes: initial?.notes ?? '' }));
  const [editing, setEditing] = useState(false);
  const status = useAutosave(draft, (value) => savePatternNote(pattern.id, value));
  const template = draft.template ?? pattern.template;
  const customized = draft.template !== undefined;

  return (
    <>
      <Sheet
        title="模板"
        id="template"
        note={customized ? '已改成你的版本' : 'Python'}
        actions={
          <div className="btn-row">
            {customized && (
              <button className="btn btn-quiet btn-small" onClick={() => setDraft((d) => ({ ...d, template: undefined }))}>
                還原內建模板
              </button>
            )}
            <button className="btn btn-small" onClick={() => setEditing((e) => !e)}>
              {editing ? '完成編輯' : '改成我的版本'}
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

      <Sheet title="我的心得" id="pattern-notes" actions={<SaveStatus status={status} />}>
        <div className="sheet-body">
          <label className="visually-hidden" htmlFor="pattern-notes-input">
            我的心得
          </label>
          <textarea
            id="pattern-notes-input"
            className="textarea"
            rows={5}
            value={draft.notes}
            onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))}
            placeholder={`例如：看到「${pattern.signals[0]}」時，我會先確認……`}
          />
        </div>
      </Sheet>
    </>
  );
}
