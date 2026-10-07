import { useId, useState, type FormEvent } from 'react';
import { REPORT_MAX_LENGTH, type ReportKind } from '../../shared/constants';
import type { ReportContext } from '../../shared/protocol';
import { useI18n, type Messages } from '../i18n';
import { errorCode } from '../store/api';
import { useCloud } from '../store/cloud';
import { reportEnvironment, sendReport } from '../store/reports';

// 回報表單：「回報問題」頁和微複習的「回報這張卡」共用。
// 草稿放在上一層，對話框不小心關掉再打開，寫到一半的字還在。

export interface ReportDraft {
  kind: ReportKind;
  message: string;
  contact: string;
}

export function emptyDraft(kind: ReportKind): ReportDraft {
  return { kind, message: '', contact: '' };
}

interface ReportFormProps {
  kinds: readonly ReportKind[];
  draft: ReportDraft;
  onDraft: (draft: ReportDraft) => void;
  /** 頁面、卡片或錯誤訊息；版本和瀏覽器由表單自己加上 */
  context: ReportContext;
  onSent: () => void;
  onCancel?: () => void;
}

export function ReportForm({ kinds, draft, onDraft, context, onSent, onCancel }: ReportFormProps) {
  const { t, locale } = useI18n();
  const r = t.report;
  const { account } = useCloud();
  const id = useId();
  const [environment] = useState(() => reportEnvironment(locale));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const email = account.kind === 'signed-in' ? account.user.email : undefined;
  const full: ReportContext = { ...context, ...environment };

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await sendReport({
        kind: draft.kind,
        message: draft.message.trim(),
        contact: email ? undefined : draft.contact.trim() || undefined,
        context: full,
      });
      onSent();
    } catch (err) {
      setError(t.errors.api[errorCode(err)]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="report-form" onSubmit={submit}>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <div className="field">
        <span className="field-label" id={`${id}-kind`}>
          {r.kindLabel}
        </span>
        <div className="report-kinds" role="group" aria-labelledby={`${id}-kind`}>
          {kinds.map((kind) => (
            <button key={kind} type="button" aria-pressed={draft.kind === kind} onClick={() => onDraft({ ...draft, kind })}>
              {r.kinds[kind]}
            </button>
          ))}
        </div>
      </div>
      <div className="field">
        <label className="field-label" htmlFor={`${id}-message`}>
          {r.messageLabel}
        </label>
        <textarea
          id={`${id}-message`}
          className="textarea"
          rows={5}
          required
          maxLength={REPORT_MAX_LENGTH}
          placeholder={r.placeholders[draft.kind]}
          value={draft.message}
          onChange={(e) => onDraft({ ...draft, message: e.target.value })}
        />
      </div>
      {email ? (
        <p className="field-hint">{r.signedInAs(email)}</p>
      ) : (
        <div className="field">
          <label className="field-label" htmlFor={`${id}-contact`}>
            {r.contactLabel}
          </label>
          <input
            id={`${id}-contact`}
            className="input"
            type="text"
            inputMode="email"
            autoComplete="email"
            maxLength={200}
            value={draft.contact}
            onChange={(e) => onDraft({ ...draft, contact: e.target.value })}
          />
          <span className="field-hint">{r.contactHint}</span>
        </div>
      )}
      <AttachedInfo context={full} r={r} />
      <div className="btn-row report-actions">
        {onCancel && (
          <button type="button" className="btn btn-quiet" onClick={onCancel}>
            {t.common.cancel}
          </button>
        )}
        <button type="submit" className="btn btn-primary" disabled={busy || !draft.message.trim()}>
          {busy ? r.sending : r.send}
        </button>
      </div>
    </form>
  );
}

/** 列出會一起送出的資訊，讓人知道送了什麼 */
function AttachedInfo({ context, r }: { context: ReportContext; r: Messages['report'] }) {
  const rows: [string, string | undefined][] = [
    [r.attached.page, context.page],
    [r.attached.card, context.card?.question],
    [r.attached.answer, context.card?.answer],
    [r.attached.picked, context.card?.picked],
    [r.attached.error, context.error],
    [r.attached.version, context.version],
    [r.attached.userAgent, context.userAgent],
    [r.attached.screen, context.screen],
  ];
  return (
    <details className="report-attached">
      <summary>{r.attachedLabel}</summary>
      <dl className="facts">
        {rows
          .filter((row): row is [string, string] => Boolean(row[1]))
          .map(([label, value]) => (
            <div key={label} className="report-fact">
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
      </dl>
    </details>
  );
}
