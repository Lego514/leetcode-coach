import { useEffect, useId, useState } from 'react';
import type { StepId as InterviewStepId } from '../data/interview';
import { STEP_NOTE_KEYS, type StepNoteKey } from '../../shared/constants';
import { INTERVIEW_STEPS, STEP_NOTE_FIELDS, type StepId } from '../data/interview';
import { useI18n } from '../i18n';
import { firstOpenStep } from '../lib/practice';
import { saveNote } from '../store/actions';
import type { StepNotes } from '../store/db';
import { useNote } from '../store/queries';
import { SaveStatus, useAutosave, type AutosaveStatus } from './autosave';
import { ScriptBuilder } from './ScriptBuilder';
import { useToast } from './toast';
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
  /** 目前的英文講解稿，照步驟寫講解稿時帶進去 */
  explanation: string;
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
    explanation: note?.explanation ?? '',
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
  /**
   * 練習頁：最下面放「寫成英文講解稿」。題目頁不放，因為那裡的筆記表單有自己的草稿，
   * 從這裡改講解稿會被它蓋掉；題目頁的按鈕放在講解稿欄位旁邊。
   */
  scriptButton?: boolean;
}

export function SolvingStepsSheet({ problemId, title, collapsible = false, onOpenBoard, scriptButton = false }: SolvingStepsSheetProps) {
  const { t, locale } = useI18n();
  const s = t.solving;
  const toast = useToast();
  const state = useStepNotes(problemId);
  const [expanded, setExpanded] = useState(false);
  const [writing, setWriting] = useState(false);
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
          {scriptButton && hasStepNotes(state.value) && (
            <div className="solving-foot">
              <button type="button" className="btn btn-small" onClick={() => setWriting(true)}>
                {s.writeScript}
              </button>
              <span className="sheet-note">{s.writeScriptHint}</span>
            </div>
          )}
        </>
      )}
      {scriptButton && (
        <ScriptBuilder
          open={writing}
          onClose={() => setWriting(false)}
          steps={state.value}
          current={state.explanation}
          onUse={(script) => {
            setWriting(false);
            saveNote(problemId, { explanation: script }).then(
              () => toast(t.script.saved),
              () => toast(t.errors.unknown),
            );
          }}
        />
      )}
    </Sheet>
  );
}

interface StepWizardProps {
  problemId: number;
  /** 練習頁的「我卡住了」要知道現在在哪一步 */
  onStepChange?: (step: InterviewStepId) => void;
  onOpenBoard?: () => void;
  /** 最後一步的「完成」：停止計時、開始記錄 */
  onFinish: () => void;
}

/**
 * 練習頁的解題步驟：一次只露出一步，寫一句就按下一步，想不出來可以直接跳過。
 * 跟題目頁的完整表單存在同一份筆記裡
 */
export function StepWizard({ problemId, onStepChange, onOpenBoard, onFinish }: StepWizardProps) {
  const { t, locale } = useI18n();
  const s = t.solving;
  const toast = useToast();
  const state = useStepNotes(problemId);
  const [index, setIndex] = useState<number | null>(null);
  const [writing, setWriting] = useState(false);
  // 讀到筆記時決定從哪一步開始（第一個還沒寫的），之後就不再跟著內容跳，不然寫完一格會自己換頁
  if (index === null && state.value !== undefined) setIndex(firstOpenStep(state.value));
  const current = index ?? 0;
  const step = INTERVIEW_STEPS[current];
  const last = current === INTERVIEW_STEPS.length - 1;
  const go = (i: number) => setIndex(i);
  // 讓練習頁知道現在在哪一步，「我卡住了」才帶得到
  useEffect(() => onStepChange?.(step.id), [step.id, onStepChange]);

  return (
    <Sheet title={s.title} id="solving-steps" actions={state.edited ? <SaveStatus status={state.status} /> : undefined}>
      <div className="sheet-body wizard">
        <ol className="wizard-nav" aria-label={s.stepsLabel}>
          {INTERVIEW_STEPS.map((item, i) => {
            const filled = STEP_NOTE_FIELDS[item.id].some((key) => state.value?.[key]?.trim());
            return (
              <li key={item.id}>
                <button
                  type="button"
                  className="wizard-dot"
                  data-filled={filled || undefined}
                  aria-current={i === current ? 'step' : undefined}
                  onClick={() => go(i)}
                >
                  <span aria-hidden>{i + 1}</span>
                  <span className="visually-hidden">{t.interview.steps[item.id].name}</span>
                </button>
              </li>
            );
          })}
        </ol>
        <div className="wizard-step">
          <p className="wizard-count">{s.stepCount(current + 1, INTERVIEW_STEPS.length)}</p>
          <h3 className="wizard-name">
            {t.interview.steps[step.id].name}
            {locale !== 'en' && <span lang="en">{step.english}</span>}
          </h3>
          <p className="sheet-note">{t.interview.steps[step.id].goal}</p>
          <StepFields key={step.id} step={step.id} state={state} />
          {step.id === 'examples' && onOpenBoard && (
            <button type="button" className="btn btn-quiet btn-small" onClick={onOpenBoard}>
              {s.board}
            </button>
          )}
        </div>
        <div className="btn-row wizard-buttons">
          {current > 0 && (
            <button type="button" className="btn" onClick={() => go(current - 1)}>
              {s.prev}
            </button>
          )}
          {last ? (
            <button type="button" className="btn btn-primary" onClick={onFinish}>
              {t.practice.finish}
            </button>
          ) : (
            <button type="button" className="btn btn-primary" onClick={() => go(current + 1)}>
              {s.next}
            </button>
          )}
          {hasStepNotes(state.value) && (
            <button type="button" className="btn btn-quiet" onClick={() => setWriting(true)}>
              {s.writeScript}
            </button>
          )}
        </div>
      </div>
      <ScriptBuilder
        open={writing}
        onClose={() => setWriting(false)}
        steps={state.value}
        current={state.explanation}
        onUse={(script) => {
          setWriting(false);
          saveNote(problemId, { explanation: script }).then(
            () => toast(t.script.saved),
            () => toast(t.errors.unknown),
          );
        }}
      />
    </Sheet>
  );
}
