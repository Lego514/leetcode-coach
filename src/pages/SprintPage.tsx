import { useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { useToast } from '../components/toast';
import { Dialog, PageHead, Sheet } from '../components/ui';
import { useI18n } from '../i18n';
import { parseProblemList } from '../lib/catalog';
import { addDays, isDay, type Day } from '../lib/dates';
import {
  DEFAULT_SPRINT,
  MOCK_MINUTES,
  NEW_MINUTES,
  REVIEW_MINUTES,
  SPRINT_MINUTE_OPTIONS,
  SPRINT_REVIEW_DAY_OPTIONS,
  STORY_MINUTES,
  type SprintDay,
  type SprintSettings,
} from '../lib/sprint';
import { tagProblems, updateSettings } from '../store/actions';
import { useCatalog, useCompanies, useToday } from '../store/queries';
import { useSprint, type SprintState } from '../store/sprint';

/** 一開始只列兩週，比較長的衝刺可以展開 */
const SHOWN_DAYS = 14;
const SHOWN_UNSCHEDULED = 8;

/** 面試衝刺：設定面試日和每天的時間，看到面試前每天的計畫 */
export function SprintPage() {
  const { t } = useI18n();
  const state = useSprint();
  const [editing, setEditing] = useState(false);
  const s = t.sprint;

  return (
    <div className="page">
      <PageHead title={s.title} lede={s.lede} />
      {!state || editing ? (
        <SprintForm key={state ? 'edit' : 'new'} initial={state?.sprint} onDone={() => setEditing(false)} onCancel={state ? () => setEditing(false) : undefined} />
      ) : (
        <SprintOverview state={state} onEdit={() => setEditing(true)} />
      )}
    </div>
  );
}

function SprintForm({ initial, onDone, onCancel }: { initial?: SprintSettings; onDone: () => void; onCancel?: () => void }) {
  const { t } = useI18n();
  const s = t.sprint;
  const day = useToday();
  const toast = useToast();
  const companies = useCompanies();
  const [date, setDate] = useState<Day>(initial?.date ?? addDays(day, 14));
  const [company, setCompany] = useState(initial?.company ?? '');
  const [weekdayMinutes, setWeekday] = useState(initial?.weekdayMinutes ?? DEFAULT_SPRINT.weekdayMinutes);
  const [weekendMinutes, setWeekend] = useState(initial?.weekendMinutes ?? DEFAULT_SPRINT.weekendMinutes);
  const [reviewDays, setReviewDays] = useState(initial?.reviewDays ?? DEFAULT_SPRINT.reviewDays);
  const valid = isDay(date) && date > day;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!valid) return;
    const sprint: SprintSettings = { date, weekdayMinutes, weekendMinutes, reviewDays };
    if (company.trim()) sprint.company = company.trim().replace(/\s+/g, ' ');
    await updateSettings({ sprint });
    toast(s.saved);
    onDone();
  }

  const minuteOptions = (value: number) => {
    const options: number[] = [...SPRINT_MINUTE_OPTIONS];
    if (!options.includes(value)) options.push(value);
    return options
      .sort((a, b) => a - b)
      .map((m) => (
        <option key={m} value={m}>
          {s.minutes(m)}
        </option>
      ));
  };

  return (
    <Sheet title={initial ? s.editTitle : s.setupTitle} id="sprint-setup">
      <form className="sheet-body stack sprint-form" style={{ gap: 16 }} onSubmit={(e) => void submit(e)}>
        <label className="field">
          <span className="field-label">{s.dateLabel}</span>
          <input className="input" type="date" min={addDays(day, 1)} value={date} required onChange={(e) => setDate(e.target.value)} />
          {!valid && <span className="form-error">{s.dateInvalid}</span>}
        </label>
        <label className="field">
          <span className="field-label">{s.companyLabel}</span>
          <input className="input" value={company} maxLength={60} list="sprint-companies" placeholder="Google" onChange={(e) => setCompany(e.target.value)} />
          <datalist id="sprint-companies">
            {companies.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
          <span className="field-hint">{s.companyHint}</span>
        </label>
        <div className="sprint-form-row">
          <label className="field">
            <span className="field-label">{s.weekdayLabel}</span>
            <select className="input" value={weekdayMinutes} onChange={(e) => setWeekday(Number(e.target.value))}>
              {minuteOptions(weekdayMinutes)}
            </select>
          </label>
          <label className="field">
            <span className="field-label">{s.weekendLabel}</span>
            <select className="input" value={weekendMinutes} onChange={(e) => setWeekend(Number(e.target.value))}>
              {minuteOptions(weekendMinutes)}
            </select>
          </label>
          <label className="field">
            <span className="field-label">{s.reviewDaysLabel}</span>
            <select className="input" value={reviewDays} onChange={(e) => setReviewDays(Number(e.target.value))}>
              {SPRINT_REVIEW_DAY_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {s.reviewDays(n)}
                </option>
              ))}
            </select>
          </label>
        </div>
        <p className="field-hint">{s.estimateNote(NEW_MINUTES.Easy, NEW_MINUTES.Medium, NEW_MINUTES.Hard, REVIEW_MINUTES, MOCK_MINUTES, STORY_MINUTES)}</p>
        <div className="btn-row">
          <button type="submit" className="btn btn-primary" disabled={!valid}>
            {initial ? s.save : s.start}
          </button>
          {onCancel && (
            <button type="button" className="btn btn-quiet" onClick={onCancel}>
              {t.common.cancel}
            </button>
          )}
        </div>
      </form>
    </Sheet>
  );
}

function SprintOverview({ state, onEdit }: { state: SprintState; onEdit: () => void }) {
  const { t, fmt } = useI18n();
  const s = t.sprint;
  const toast = useToast();
  const { sprint, plan, daysLeft } = state;
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const days = (n: number) => (n === 1 ? t.today.plan.unitDay : t.today.plan.unitDays);
  const problems = (n: number) => (n === 1 ? t.today.plan.unitProblem : t.today.plan.unitProblems);
  const learnDays = plan.days.filter((d) => d.phase === 'learn').length;
  const shown = showAll ? plan.days : plan.days.slice(0, SHOWN_DAYS);

  const end = async () => {
    setConfirmEnd(false);
    await updateSettings({ sprint: undefined });
    toast(s.ended);
  };

  return (
    <div className="stack">
      <Sheet
        title={s.countdownTitle(sprint.company, fmt.day(sprint.date, true))}
        id="sprint-summary"
        actions={
          <button type="button" className="btn btn-small" onClick={onEdit}>
            {s.edit}
          </button>
        }
      >
        <div className="sheet-body">
          {daysLeft > 0 ? (
            <>
              <dl className="plan-stats" style={{ marginTop: 0 }}>
                <Stat label={s.daysLeft} value={String(daysLeft)} unit={days(daysLeft)} />
                {plan.company && (
                  <Stat label={s.companyProblems} value={`${plan.company.started + plan.company.planned} / ${plan.company.total}`} unit={problems(plan.company.total)} />
                )}
                <Stat label={s.patternsCovered} value={`${plan.patterns.planned} / ${plan.patterns.total}`} />
                <Stat label={s.notFitting} value={String(plan.unscheduled.length)} unit={problems(plan.unscheduled.length)} />
              </dl>
              <p className="sheet-note sprint-phase">{learnDays > 0 ? s.phaseLearn(learnDays, plan.days.length - learnDays) : s.phaseReview}</p>
            </>
          ) : (
            <p>{daysLeft === 0 ? s.interviewToday : s.afterNote}</p>
          )}
        </div>
      </Sheet>

      {daysLeft > 0 && (
        <Sheet title={s.daysTitle} id="sprint-days" note={s.daysNote}>
          <ol className="sheet-body sprint-days">
            {shown.map((d, i) => (
              <SprintDayRow key={d.day} day={d} today={i === 0} />
            ))}
          </ol>
          {!showAll && plan.days.length > SHOWN_DAYS && (
            <div className="sheet-body" style={{ paddingTop: 0 }}>
              <button type="button" className="btn btn-small btn-quiet" onClick={() => setShowAll(true)}>
                {s.showAll(plan.days.length)}
              </button>
            </div>
          )}
        </Sheet>
      )}

      {sprint.company && <TagCompany company={sprint.company} after={daysLeft < 0} />}

      {daysLeft > 0 && plan.unscheduled.length > 0 && (
        <Sheet title={s.unscheduledTitle} count={plan.unscheduled.length} id="sprint-unscheduled" note={s.unscheduledNote(plan.unscheduled.length)}>
          <ul className="sheet-body sprint-picks">
            {plan.unscheduled.slice(0, SHOWN_UNSCHEDULED).map((pick) => (
              <li key={pick.problem.id}>
                <Link to={`/problems/${pick.problem.id}`}>
                  {pick.problem.id}. {pick.problem.title}
                </Link>
                <span className="chip">{s.reasons[pick.reason]}</span>
              </li>
            ))}
            {plan.unscheduled.length > SHOWN_UNSCHEDULED && <li className="sheet-note">{s.more(plan.unscheduled.length - SHOWN_UNSCHEDULED)}</li>}
          </ul>
        </Sheet>
      )}

      <div className="btn-row">
        <button type="button" className="btn btn-danger" onClick={() => setConfirmEnd(true)}>
          {s.end}
        </button>
      </div>

      <Dialog
        open={confirmEnd}
        onClose={() => setConfirmEnd(false)}
        title={s.endTitle}
        footer={
          <>
            <button className="btn btn-quiet" onClick={() => setConfirmEnd(false)}>
              {t.common.cancel}
            </button>
            <button className="btn btn-danger" onClick={() => void end()}>
              {s.end}
            </button>
          </>
        }
      >
        <p>{s.endBody}</p>
      </Dialog>
    </div>
  );
}

function Stat({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="plan-stat">
      <dt>{label}</dt>
      <dd>
        {value}
        {unit && (
          <>
            {' '}
            <span className="plan-stat-unit">{unit}</span>
          </>
        )}
      </dd>
    </div>
  );
}

/** 一天的計畫：日期、要做的事、時間條（新題、複習、模擬和行為面試各一段） */
function SprintDayRow({ day, today }: { day: SprintDay; today: boolean }) {
  const { t, fmt } = useI18n();
  const s = t.sprint;
  const fresh = day.newProblems.reduce((sum, p) => sum + NEW_MINUTES[p.problem.difficulty], 0);
  const review = (day.reviews + day.pulled.length) * REVIEW_MINUTES;
  const other = (day.mock ? MOCK_MINUTES : 0) + (day.story ? STORY_MINUTES : 0);
  const scale = Math.max(day.budget, day.minutes, 1);
  const parts = [
    day.newProblems.length > 0 && s.newCount(day.newProblems.length),
    day.reviews + day.pulled.length > 0 && s.reviewCount(day.reviews + day.pulled.length),
    day.mock && s.mock,
    day.story && s.story,
  ].filter(Boolean);
  return (
    <li className="sprint-day" data-phase={day.phase} aria-current={today ? 'date' : undefined}>
      <span className="sprint-day-date">
        {fmt.day(day.day, true)}
        {today && <span className="chip">{s.todayTag}</span>}
      </span>
      <span className="sprint-day-tasks">{parts.length > 0 ? parts.join(' · ') : s.rest}</span>
      <span className="sprint-day-bar" aria-hidden>
        <span className="sprint-bar-new" style={{ width: `${(fresh / scale) * 100}%` }} />
        <span className="sprint-bar-review" style={{ width: `${(review / scale) * 100}%` }} />
        <span className="sprint-bar-other" style={{ width: `${(other / scale) * 100}%` }} />
      </span>
      <span className="sprint-day-minutes" data-over={day.minutes > day.budget || undefined}>
        {s.minutesOf(day.minutes, day.budget)}
      </span>
    </li>
  );
}

/** 一次貼上很多題，標上這家公司；面試完也用這個記下考了哪些題 */
function TagCompany({ company, after }: { company: string; after: boolean }) {
  const { t } = useI18n();
  const s = t.sprint;
  const catalog = useCatalog();
  const [text, setText] = useState('');
  const [result, setResult] = useState<{ tagged: number; unknown: string[] } | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const { found, unknown } = parseProblemList(catalog, text);
    await tagProblems(
      found.map((p) => p.id),
      company,
    );
    setResult({ tagged: found.length, unknown });
    if (unknown.length === 0) setText('');
  }

  return (
    <Sheet title={after ? s.afterTitle(company) : s.tagTitle(company)} id="sprint-tag" note={after ? s.afterTagNote : s.tagNote}>
      <form className="sheet-body stack" style={{ gap: 10 }} onSubmit={(e) => void submit(e)}>
        <label className="visually-hidden" htmlFor="sprint-tag-input">
          {s.tagLabel(company)}
        </label>
        <textarea
          id="sprint-tag-input"
          className="textarea"
          rows={3}
          value={text}
          placeholder={s.tagPlaceholder}
          onChange={(e) => {
            setText(e.target.value);
            setResult(null);
          }}
        />
        <div className="btn-row">
          <button type="submit" className="btn btn-small" disabled={!text.trim()}>
            {s.tagButton(company)}
          </button>
          {result && (
            <span className="sheet-note" aria-live="polite">
              {s.tagged(result.tagged, company)}
              {result.unknown.length > 0 && ` ${s.notFound(result.unknown.join(', '))}`}
            </span>
          )}
        </div>
      </form>
    </Sheet>
  );
}
