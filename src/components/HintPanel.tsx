import type { ReactNode } from 'react';
import { hintFor } from '../data/hints';
import { getPattern } from '../data/patterns';
import type { Problem } from '../data/problems';
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
  const note = useNote(problem.id);
  const patternNote = usePatternNote(problem.pattern);
  const pattern = getPattern(problem.pattern);
  const keyHint = hintFor(problem.id);
  const template = patternNote?.template ?? pattern.template;
  const myIdea = note?.idea?.trim();

  const levels: { title: string; body: ReactNode }[] = [
    {
      title: '往哪個方向想',
      body: (
        <>
          <p>
            這題可以用<strong>{pattern.name}</strong>
            <span lang="en">（{pattern.english}）</span>。這個模式常見的線索：
          </p>
          <ul className="bullets" style={{ marginTop: 6 }}>
            {pattern.signals.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </>
      ),
    },
    {
      title: '關鍵觀察',
      body: keyHint ? (
        <p>{keyHint}</p>
      ) : myIdea ? (
        <p>你之前的筆記：{myIdea}</p>
      ) : (
        <p>這題是你新增的，沒有內建的關鍵提示。可以直接看下一層的模板。</p>
      ),
    },
    {
      title: '套用模板',
      body: (
        <>
          {keyHint && myIdea && <p style={{ marginBottom: 8 }}>你之前的筆記：{myIdea}</p>}
          <p className="sheet-note" style={{ marginBottom: 6 }}>
            {pattern.name}的模板{patternNote?.template !== undefined ? '（你的版本）' : ''}，挑跟這題相關的部分改寫：
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
    <Sheet
      title="提示"
      id="hints"
      note={used === 0 ? '卡住再打開，提示會一層一層給' : `已打開 ${used} / ${HINT_LEVELS} 層`}
    >
      <div className="sheet-body stack" style={{ gap: 14 }}>
        {used > 0 && (
          <ol className="hint-list">
            {levels.slice(0, used).map((level, i) => (
              <li key={level.title} className="hint">
                <p className="hint-title">
                  提示 {i + 1}：{level.title}
                </p>
                <div className="hint-body">{level.body}</div>
              </li>
            ))}
          </ol>
        )}

        <div className="btn-row">
          {remaining > 0 && (
            <button type="button" className="btn" onClick={onReveal}>
              {used === 0 ? '給我一點提示' : '再給一個提示'}
              <span className="sheet-note">（還有 {remaining} 層）</span>
            </button>
          )}
          <a
            className={remaining > 0 ? 'icon-link' : 'btn'}
            href={solutionsUrl(problem.slug)}
            target="_blank"
            rel="noreferrer"
            onClick={onSolution}
          >
            {sawSolution ? '再打開 LeetCode 解答' : remaining > 0 ? '直接看解答' : '還是想不出來，看 LeetCode 解答'}
            <ExternalIcon />
            <span className="visually-hidden">（在新分頁開啟）</span>
          </a>
        </div>
        {used > 0 && !sawSolution && (
          <p className="field-hint">用過提示的題目，記錄時會建議選「看了提示」，讓它早點回來複習。</p>
        )}
      </div>
    </Sheet>
  );
}
