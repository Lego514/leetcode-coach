import { useId, useState } from 'react';
import { STEP_NOTE_KEYS, type StepNoteKey } from '../../shared/constants';
import { INTERVIEW_STEPS, STEP_NOTE_FIELDS, type StepId } from '../data/interview';
import { useI18n } from '../i18n';
import { saveNote } from '../store/actions';
import type { StepNotes } from '../store/db';
import { useNote } from '../store/queries';
import { SaveStatus, useAutosave, type AutosaveStatus } from './autosave';
import { Sheet } from './ui';

// 解題步驟：練習頁、模擬面試和題目頁共用同一套步驟（模擬面試的七步）。
// 每一步寫一句話，存在題目筆記的 steps 裡，複習時回來看就想得起思路。

const MAX_LENGTH = 1000;

/** 只留有寫字的欄位；清空的欄位從筆記拿掉 */
export function cleanSteps(steps: StepNotes): StepNotes {
  const out: StepNotes = {};
  for (const key of STEP_NOTE_KEYS) {
    const text = steps[key];
    if (text?.trim()) out[key] = text;
  }
  return out;
}

export function hasStepNotes(steps: StepNotes | undefined): boolean {
  return !!steps && STEP_NOTE_KEYS.some((key) => steps[key]?.trim());
}

export interface StepNotesState {
  /** 還在讀取時是 undefined */
  value: StepNotes | undefined;
  /** 這次有沒有改過 */
  edited: boolean;
  set: (key: StepNoteKey, text: string) => void;
  status: AutosaveStatus;
}

/**
 * 讀出這題的步驟筆記，改了就自動存。
 * 還沒改之前直接顯示資料庫裡的內容，其他裝置同步過來也會跟著更新。
 * 呼叫的元件要以題號當 key，換題時才不會帶著上一題的草稿。
 */
export function useStepNotes(problemId: number): StepNotesState {
  const note = useNote(problemId);
  const [draft, setDraft] = useState<StepNotes | null>(null);
  const stored = note === undefined ? undefined : (note?.steps ?? {});
  const status = useAutosave(draft, (value) => (value ? saveNote(problemId, { steps: cleanSteps(value) }) : Promise.resolve()));
  return {
    value: draft ?? stored,
    edited: draft !== null,
    set: (key, text) => setDraft((prev) => ({ ...(prev ?? stored ?? {}), [key]: text })),
    status,
  };
}

/** 一個步驟要寫的欄位；只有一格時標籤藏起來，畫面上看步驟名稱就夠了 */
export function StepFields({ step, state }: { step: StepId; state: StepNotesState }) {
  const { t } = useI18n();
  const s = t.solving;
  const id = useId();
  const keys = STEP_NOTE_FIELDS[step];
  return (
    <div className="step-fields">
      {keys.map((key) => {
        const fieldId = `${id}-${key}`;
        return (
          <div key={key} className="step-field">
            <label className={keys.length > 1 ? 'step-field-label' : 'visually-hidden'} htmlFor={fieldId}>
              {s.fields[key]}
            </label>
            <textarea
              id={fieldId}
              className="textarea step-input"
              rows={2}
              maxLength={MAX_LENGTH}
              disabled={state.value === undefined}
              value={state.value?.[key] ?? ''}
              placeholder={s.placeholders[key]}
              onChange={(e) => state.set(key, e.target.value)}
            />
          </div>
        );
      })}
    </div>
  );
}

interface SolvingStepsSheetProps {
  problemId: number;
  title: string;
  /** 題目頁：還沒寫過時先收起來，只放一個「寫下思路」按鈕 */
  collapsible?: boolean;
  /** 練習頁：舉例那一步旁邊放「用白板走一遍」 */
  onOpenBoard?: () => void;
}

export function SolvingStepsSheet({ problemId, title, collapsible = false, onOpenBoard }: SolvingStepsSheetProps) {
  const { t, locale } = useI18n();
  const s = t.solving;
  const state = useStepNotes(problemId);
  const [expanded, setExpanded] = useState(false);
  const open = !collapsible || expanded || state.edited || hasStepNotes(state.value);

  return (
    <Sheet title={title} id="solving-steps" actions={state.edited ? <SaveStatus status={state.status} /> : undefined}>
      {!open ? (
        <div className="sheet-empty">
          <p>{s.empty}</p>
          <div className="btn-row">
            <button type="button" className="btn btn-small" onClick={() => setExpanded(true)}>
              {s.start}
            </button>
          </div>
        </div>
      ) : (
        <>
          <p className="sheet-note solving-lede">{s.lede}</p>
          <ol className="steps solving-steps">
            {INTERVIEW_STEPS.map((step, i) => {
              const filled = STEP_NOTE_FIELDS[step.id].some((key) => state.value?.[key]?.trim());
              return (
                <li key={step.id} className="step" data-filled={filled ? '' : undefined}>
                  <span className="step-index" aria-hidden>
                    {i + 1}
                  </span>
                  <div className="step-head">
                    <span className="step-name">
                      {t.interview.steps[step.id].name}
                      {locale !== 'en' && <span lang="en">{step.english}</span>}
                    </span>
                    {step.id === 'examples' && onOpenBoard && (
                      <button type="button" className="btn btn-quiet btn-small" onClick={onOpenBoard}>
                        {s.board}
                      </button>
                    )}
                  </div>
                  <div className="step-body">
                    <StepFields step={step.id} state={state} />
                  </div>
                </li>
              );
            })}
          </ol>
        </>
      )}
    </Sheet>
  );
}
