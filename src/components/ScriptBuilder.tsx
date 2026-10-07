import { useState } from 'react';
import { EXPLAIN_POINTS } from '../../shared/constants';
import { EXPLANATION_SCAFFOLD, SCRIPT_SOURCES } from '../data/interview';
import { useI18n } from '../i18n';
import { joinScript, splitScript } from '../lib/script';
import type { StepNotes } from '../store/db';
import { Dialog } from './ui';

// 照解題步驟寫講解稿：講解稿的五句各列出相關步驟寫過的內容，自己用英文寫成一句。
// 不用 AI 代寫，因為把想法講成英文正是要練的部分。

const SCAFFOLD = EXPLANATION_SCAFFOLD.split('\n');

interface ScriptBuilderProps {
  open: boolean;
  onClose: () => void;
  steps: StepNotes | undefined;
  /** 目前的講解稿；五句以內會帶進來逐句修改 */
  current: string;
  onUse: (script: string) => void;
}

export function ScriptBuilder({ open, onClose, steps, current, onUse }: ScriptBuilderProps) {
  const { t } = useI18n();
  return (
    <Dialog open={open} onClose={onClose} title={t.script.title} subtitle={t.script.lede}>
      <ScriptForm steps={steps} current={current} onUse={onUse} onClose={onClose} />
    </Dialog>
  );
}

function ScriptForm({ steps, current, onUse, onClose }: Omit<ScriptBuilderProps, 'open'>) {
  const { t } = useI18n();
  const [lines, setLines] = useState(() => splitScript(current) ?? SCAFFOLD.map(() => ''));
  const empty = lines.every((line) => !line.trim());

  return (
    <>
      {EXPLAIN_POINTS.map((point, i) => {
        const refs = SCRIPT_SOURCES[point].filter((key) => steps?.[key]?.trim());
        const id = `script-${point}`;
        return (
          <div key={point} className="field script-line">
            <label className="field-label" htmlFor={id}>
              {i + 1}. {t.interview.explainChecks[point]}
            </label>
            {refs.length > 0 ? (
              <ul className="script-refs">
                {refs.map((key) => (
                  <li key={key}>
                    <span className="script-ref-label">{t.solving.fields[key]}</span> {steps?.[key]}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="field-hint">{t.script.noSteps}</p>
            )}
            <textarea
              id={id}
              className="textarea"
              rows={2}
              lang="en"
              maxLength={1000}
              value={lines[i]}
              placeholder={SCAFFOLD[i]}
              onChange={(e) => setLines((prev) => prev.map((line, j) => (j === i ? e.target.value : line)))}
            />
          </div>
        );
      })}
      {current.trim() && <p className="field-hint">{t.script.replaces}</p>}
      <div className="btn-row" style={{ justifyContent: 'flex-end' }}>
        <button type="button" className="btn btn-quiet" onClick={onClose}>
          {t.common.cancel}
        </button>
        <button type="button" className="btn btn-primary" disabled={empty} onClick={() => onUse(joinScript(lines))}>
          {t.script.use}
        </button>
      </div>
    </>
  );
}
