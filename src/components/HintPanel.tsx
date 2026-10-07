import { useState, type ReactNode } from 'react';
import { hintFor } from '../data/hints';
import { INTERVIEW_STEPS, STEP_CONTEXT, STEP_HINT_LEVEL, type StepId } from '../data/interview';
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
  /** 卡在某一步時直接打開對應的那層提示（前面幾層一起打開） */
  onRevealTo?: (level: number) => void;
  /** 卡在舉例時可以直接開白板 */
  onOpenBoard?: () => void;
}

export function HintPanel({ problem, used, sawSolution, onReveal, onSolution, onRevealTo, onOpenBoard }: HintPanelProps) {
  const { t, locale } = useI18n();
  const note = useNote(problem.id);
  const [stuck, setStuck] = useState<StepId | null>(null);
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
  const stepLevel = stuck ? STEP_HINT_LEVEL[stuck] : undefined;
  const context = stuck ? STEP_CONTEXT[stuck].filter((key) => note?.steps?.[key]?.trim()) : [];

  return (
    <Sheet title={t.hints.title} id="hints" note={used === 0 ? t.hints.closedNote : t.hints.openedNote(used, HINT_LEVELS)}>
      <div className="sheet-body stack" style={{ gap: 14 }}>
        {/* 先選卡在哪一步，看這一步可以怎麼想；這部分不算用了提示 */}
        <div className="stuck">
          <p className="field-label" id="stuck-label">
            {t.hints.stuckLabel}
          </p>
          <div className="pill-group" role="group" aria-labelledby="stuck-label">
            {INTERVIEW_STEPS.map((step) => (
              <button key={step.id} type="button" aria-pressed={stuck === step.id} onClick={() => setStuck(stuck === step.id ? null : step.id)}>
                {t.interview.steps[step.id].name}
              </button>
            ))}
          </div>
          {stuck ? (
            <div className="stuck-help" aria-live="polite">
              {context.map((key) => (
                <p key={key} className="stuck-context">
                  <span>{t.hints.yourStep(t.solving.fields[key])}</span> {note?.steps?.[key]}
                </p>
              ))}
              <ul className="bullets">
                {t.hints.stuckTips[stuck].map((tip) => (
                  <li key={tip}>{tip}</li>
                ))}
              </ul>
              {(stuck === 'examples' && onOpenBoard) || (stepLevel && used < stepLevel && onRevealTo) ? (
                <div className="btn-row">
                  {stuck === 'examples' && onOpenBoard && (
                    <button type="button" className="btn btn-small" onClick={onOpenBoard}>
                      {t.solving.board}
                    </button>
                  )}
                  {stepLevel && used < stepLevel && onRevealTo && (
                    <button type="button" className="btn btn-small" onClick={() => onRevealTo(stepLevel)}>
                      {t.hints.openForStep(stepLevel, levels[stepLevel - 1].title)}
                    </button>
                  )}
                </div>
              ) : null}
            </div>
          ) : (
            <p className="field-hint">{t.hints.stuckNote}</p>
          )}
        </div>

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
