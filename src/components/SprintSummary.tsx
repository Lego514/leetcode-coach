import { Link } from 'react-router';
import { useI18n } from '../i18n';
import type { Day } from '../lib/dates';
import { useMocks, useRehearsals } from '../store/queries';
import type { SprintState } from '../store/sprint';

/** 今天頁最上面：面試倒數、今天大概要花多久，以及今天要做的模擬面試和行為面試 */
export function SprintSummary({ state, day }: { state: SprintState; day: Day }) {
  const { t } = useI18n();
  const s = t.today.sprint;
  const mocks = useMocks();
  const rehearsals = useRehearsals();
  const { sprint, daysLeft, plan } = state;

  if (daysLeft <= 0) {
    return (
      <div className="sprint-summary">
        <p className="sprint-countdown">{daysLeft === 0 ? s.interviewToday(sprint.company) : s.after(sprint.company)}</p>
        <p className="today-plan">{daysLeft === 0 ? s.interviewTodayNote : s.afterNote}</p>
        <div className="btn-row">
          {daysLeft === 0 && (
            <>
              <Link className="btn btn-small" to="/stories">
                {s.stories}
              </Link>
              <Link className="btn btn-small" to="/phrases">
                {s.phrases}
              </Link>
            </>
          )}
          <Link className="btn btn-small btn-primary" to="/sprint">
            {daysLeft === 0 ? s.open : s.wrapUp}
          </Link>
        </div>
      </div>
    );
  }

  const today = plan.days[0];
  const mockDone = (mocks ?? []).some((m) => m.day === day && m.kind === 'full');
  const storyDone = (rehearsals ?? []).some((r) => r.day === day);
  const todos = [
    today.mock && { key: 'mock', to: '/mock', label: s.mock, done: mockDone },
    today.story && { key: 'story', to: '/stories/practice', label: s.story, done: storyDone },
  ].filter((todo) => !!todo);

  return (
    <div className="sprint-summary">
      <p className="sprint-countdown">{s.countdown(sprint.company, daysLeft)}</p>
      <p className="today-plan">
        {today.phase === 'review' ? s.reviewPhase : s.learnPhase} {s.todayMinutes(today.minutes)}
      </p>
      {todos.length > 0 && (
        <ul className="sprint-todos">
          {todos.map((todo) => (
            <li key={todo.key} data-done={todo.done || undefined}>
              <span className="sprint-todo-check" aria-hidden>
                {todo.done ? '✓' : ''}
              </span>
              <Link to={todo.to}>{todo.label}</Link>
              {todo.done && <span className="visually-hidden">{s.done}</span>}
            </li>
          ))}
        </ul>
      )}
      <div className="btn-row">
        <Link className="btn btn-small" to="/sprint">
          {s.open}
        </Link>
      </div>
    </div>
  );
}
