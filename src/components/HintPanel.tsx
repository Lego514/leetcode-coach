import type { ReactNode } from 'react';
import { hintFor } from '../data/hints';
import { getPattern } from '../data/patterns';
import type { Problem } from '../data/problems';
import { useI18n } from '../i18n';
import { bold, rich } from '../i18n/rich';
import { HINT_LEVELS, solutionsUrl } from '../lib/practice';
import { useNote, usePatternNote } from '../store/queries';
import { ExternalIcon, Sheet } from './ui';

interface HintPanelProps {
  problem: Problem;
  /** 已經打開幾層提示 */
  used: number;
  sawSolution: boolean;
  onReveal: () => void;
  onSolution: () => void;
}

export function HintPanel({ problem, used, sawSolution, onReveal, onSolution }: HintPanelProps) {
  const { t, locale } = useI18n();
  const note = useNote(problem.id);
  const patternNote = usePatternNote(problem.pattern);
  const pattern = getPattern(problem.pattern, locale);
  const keyHint = hintFor(problem.id, locale);
  const template = patternNote?.template ?? pattern.template;
  const myIdea = note?.idea?.trim();
  const patternLabel = t.hints.patternLabel(pattern.name, pattern.english);

  const levels: { title: string; body: ReactNode }[] = [
    {
      title: t.hints.directionTitle,
      body: (
        <>
          <p>{rich(t.hints.direction(patternLabel), { b: bold })}</p>
          <ul className="bullets" style={{ marginTop: 6 }}>
            {pattern.signals.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </>
      ),
    },
    {
      title: t.hints.insightTitle,
      body: keyHint ? <p>{keyHint}</p> : myIdea ? <p>{t.hints.yourNote(myIdea)}</p> : <p>{t.hints.noBuiltinHint}</p>,
    },
    {
      title: t.hints.templateTitle,
      body: (
        <>
          {keyHint && myIdea && <p style={{ marginBottom: 8 }}>{t.hints.yourNote(myIdea)}</p>}
          <p className="sheet-note" style={{ marginBottom: 6 }}>
            {t.hints.templateIntro(pattern.name, patternNote?.template !== undefined)}
          </p>
          <pre className="code-block hint-code">
            <code>{template}</code>
          </pre>
        </>
      ),
    },
  ];

  const remaining = HINT_LEVELS - used;

  return (
    <Sheet title={t.hints.title} id="hints" note={used === 0 ? t.hints.closedNote : t.hints.openedNote(used, HINT_LEVELS)}>
      <div className="sheet-body stack" style={{ gap: 14 }}>
        {used > 0 && (
          <ol className="hint-list">
            {levels.slice(0, used).map((level, i) => (
              <li key={level.title} className="hint">
                <p className="hint-title">{t.hints.levelTitle(i + 1, level.title)}</p>
                <div className="hint-body">{level.body}</div>
              </li>
            ))}
          </ol>
        )}

        <div className="btn-row">
          {remaining > 0 && (
            <button type="button" className="btn" onClick={onReveal}>
              {used === 0 ? t.hints.first : t.hints.next}
              <span className="sheet-note">{t.hints.remaining(remaining)}</span>
            </button>
          )}
          <a
            className={remaining > 0 ? 'icon-link' : 'btn'}
            href={solutionsUrl(problem.slug)}
            target="_blank"
            rel="noreferrer"
            onClick={onSolution}
          >
            {sawSolution ? t.hints.reopenSolution : remaining > 0 ? t.hints.skipToSolution : t.hints.lastResort}
            <ExternalIcon />
            <span className="visually-hidden">{t.common.opensInNewTab}</span>
          </a>
        </div>
        {used > 0 && !sawSolution && <p className="field-hint">{t.hints.ratingNudge}</p>}
      </div>
    </Sheet>
  );
}
