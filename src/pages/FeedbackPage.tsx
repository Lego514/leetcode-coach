import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import type { ReportContext, ReportItem, ReportsResponse } from '../../shared/protocol';
import { emptyDraft, ReportForm } from '../components/ReportForm';
import { useToast } from '../components/toast';
import { PageHead, Sheet } from '../components/ui';
import { useI18n, type Messages } from '../i18n';
import type { Formatters } from '../i18n/format';
import { rich } from '../i18n/rich';
import { errorCode, type ClientErrorCode } from '../store/api';
import { useCloud } from '../store/cloud';
import { clearStashedError, fetchReports, lastVisitedPage, readStashedError, resolveReport } from '../store/reports';

const PAGE_KINDS = ['bug', 'wrong', 'idea', 'other'] as const;

type Filter = 'open' | 'resolved' | 'all';
const FILTERS: Filter[] = ['open', 'resolved', 'all'];

interface ReportsState {
  userId?: string;
  data?: ReportsResponse;
  error?: ClientErrorCode | 'unknown';
}

/** 登入時向伺服器讀回報；換帳號或 reload() 時重讀 */
function useReports(userId: string | undefined) {
  const [state, setState] = useState<ReportsState>({});
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    fetchReports().then(
      (data) => !cancelled && setState({ userId, data }),
      (err) => !cancelled && setState({ userId, error: errorCode(err) }),
    );
    return () => {
      cancelled = true;
    };
  }, [userId, version]);

  // 換帳號時不要先顯示上一個帳號的資料
  const current = userId && state.userId === userId ? state : {};
  return {
    ...current,
    reload: () => setVersion((v) => v + 1),
    replace: (report: ReportItem) =>
      setState((prev) =>
        prev.data
          ? { ...prev, data: { ...prev.data, reports: prev.data.reports.map((x) => (x.id === report.id ? { ...x, ...report, from: x.from } : x)) } }
          : prev,
      ),
  };
}

export function FeedbackPage() {
  const { t } = useI18n();
  const r = t.report;
  const toast = useToast();
  const { account } = useCloud();
  const userId = account.kind === 'signed-in' ? account.user.id : undefined;
  const reports = useReports(userId);
  const [draft, setDraft] = useState(() => emptyDraft('bug'));
  // 從哪個頁面過來的；從錯誤畫面來的話附上錯誤訊息
  const [context, setContext] = useState<ReportContext>(() => {
    const error = readStashedError();
    return { page: lastVisitedPage(), ...(error ? { error } : {}) };
  });

  const sent = () => {
    toast(r.sent);
    setDraft(emptyDraft(draft.kind));
    clearStashedError();
    setContext((prev) => ({ page: prev.page }));
    reports.reload();
  };

  return (
    <div className="page">
      <PageHead title={r.title} lede={r.lede} />
      <div className="stack">
        <Sheet title={r.formTitle} id="report-form">
          <div className="sheet-body stack" style={{ gap: 12 }}>
            {context.error && <p className="field-hint">{r.fromError}</p>}
            <ReportForm kinds={PAGE_KINDS} draft={draft} onDraft={setDraft} context={context} onSent={sent} />
          </div>
        </Sheet>

        {account.kind === 'signed-out' && (
          <Sheet title={r.mineTitle} id="my-reports">
            <p className="sheet-empty">{rich(r.mineSignedOut, { link: (text) => <Link to="/account">{text}</Link> })}</p>
          </Sheet>
        )}
        {userId && reports.data?.admin && (
          <Sheet
            title={r.inboxTitle}
            id="inbox"
            actions={
              <Link className="btn btn-small btn-primary" to="/feedback/inbox">
                {r.openInbox}
              </Link>
            }
          >
            <p className="sheet-empty">{r.inboxSummary(reports.data.reports.filter((x) => !x.resolvedAt).length)}</p>
          </Sheet>
        )}
        {userId && !reports.data?.admin && (
          <Sheet title={r.mineTitle} id="my-reports" count={reports.data?.reports.length}>
            {reports.error ? (
              <p className="sheet-empty">{r.loadFailed(t.errors.api[reports.error])}</p>
            ) : !reports.data ? (
              <p className="sheet-empty" aria-busy="true">
                {t.common.loading}
              </p>
            ) : reports.data.reports.length === 0 ? (
              <p className="sheet-empty">{r.mineEmpty}</p>
            ) : (
              <ul className="rows">
                {reports.data.reports.map((report) => (
                  <li key={report.id}>
                    <ReportCard report={report} />
                  </li>
                ))}
              </ul>
            )}
          </Sheet>
        )}
      </div>
    </div>
  );
}

/** 管理者的收件匣：看所有人的回報，處理好標成已處理 */
export function InboxPage() {
  const { t } = useI18n();
  const r = t.report;
  const toast = useToast();
  const { account } = useCloud();
  const userId = account.kind === 'signed-in' ? account.user.id : undefined;
  const reports = useReports(userId);
  const [filter, setFilter] = useState<Filter>('open');
  const [busy, setBusy] = useState<string | null>(null);

  const all = reports.data?.reports ?? [];
  const counts: Record<Filter, number> = {
    open: all.filter((x) => !x.resolvedAt).length,
    resolved: all.filter((x) => x.resolvedAt).length,
    all: all.length,
  };
  const shown = all.filter((x) => (filter === 'all' ? true : filter === 'open' ? !x.resolvedAt : Boolean(x.resolvedAt)));

  const toggle = async (report: ReportItem) => {
    setBusy(report.id);
    try {
      reports.replace(await resolveReport(report.id, !report.resolvedAt));
    } catch (err) {
      toast(t.errors.api[errorCode(err)]);
    } finally {
      setBusy(null);
    }
  };

  let body;
  if (account.kind === 'loading' || (userId && !reports.data && !reports.error)) {
    body = (
      <p className="sheet-empty" aria-busy="true">
        {t.common.loading}
      </p>
    );
  } else if (!userId) {
    body = <p className="sheet-empty">{rich(r.inboxSignIn, { link: (text) => <Link to="/account">{text}</Link> })}</p>;
  } else if (reports.error) {
    body = <p className="sheet-empty">{r.loadFailed(t.errors.api[reports.error])}</p>;
  } else if (!reports.data?.admin) {
    body = <p className="sheet-empty">{r.inboxDenied}</p>;
  } else if (shown.length === 0) {
    body = <p className="sheet-empty">{r.inboxEmpty}</p>;
  } else {
    body = (
      <ul className="rows">
        {shown.map((report) => (
          <li key={report.id}>
            <ReportCard report={report} admin>
              <button type="button" className="btn btn-small" disabled={busy === report.id} onClick={() => void toggle(report)}>
                {report.resolvedAt ? r.reopen : r.resolve}
              </button>
            </ReportCard>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="page">
      <Link className="back-link" to="/feedback">
        {r.backToFeedback}
      </Link>
      <PageHead title={r.inboxTitle} lede={r.inboxLede} />
      <Sheet
        title={r.filters[filter]}
        id="inbox-list"
        actions={
          reports.data?.admin ? (
            <div className="segmented segmented-compact" role="group" aria-label={r.filterLabel}>
              {FILTERS.map((f) => (
                <button key={f} type="button" aria-pressed={filter === f} onClick={() => setFilter(f)}>
                  {r.filters[f]} {counts[f]}
                </button>
              ))}
            </div>
          ) : undefined
        }
      >
        {body}
      </Sheet>
    </div>
  );
}

function ReportCard({ report, admin, children }: { report: ReportItem; admin?: boolean; children?: ReactNode }) {
  const { t, fmt } = useI18n();
  const r = t.report;
  return (
    <article className="report-item" data-resolved={report.resolvedAt ? '' : undefined}>
      <header className="report-head">
        <span className="chip">{r.kinds[report.kind]}</span>
        <span className="report-status">{report.resolvedAt ? r.status.resolved : r.status.open}</span>
        <time className="report-time" dateTime={report.createdAt}>
          {fmt.dateTime(report.createdAt)}
        </time>
        {admin && <span className="report-from">{report.from ?? r.anonymous}</span>}
      </header>
      <p className="report-message">{report.message}</p>
      {admin && <ContextFacts report={report} r={r} fmt={fmt} />}
      {children && <div className="btn-row">{children}</div>}
    </article>
  );
}

function ContextFacts({ report, r, fmt }: { report: ReportItem; r: Messages['report']; fmt: Formatters }) {
  const { context } = report;
  const rows: [string, string | undefined][] = [
    [r.attached.page, context.page],
    [r.attached.card, context.card && `${context.card.question} (${context.card.id})`],
    [r.attached.answer, context.card?.answer],
    [r.attached.picked, context.card?.picked],
    [r.attached.error, context.error],
    [r.attached.version, context.version],
    [r.attached.language, context.language],
    [r.attached.screen, context.screen],
    [r.attached.userAgent, context.userAgent],
    [r.attached.resolvedAt, report.resolvedAt ? fmt.dateTime(report.resolvedAt) : undefined],
  ];
  return (
    <dl className="facts report-facts">
      {rows
        .filter((row): row is [string, string] => Boolean(row[1]))
        .map(([label, value]) => (
          <div key={label} className="report-fact">
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
    </dl>
  );
}
