import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { getPattern } from '../data/patterns';
import type { Problem } from '../data/problems';
import { useI18n } from '../i18n';
import { diffDays, type Day } from '../lib/dates';
import { stageOf } from '../lib/srs';
import type { ProgressRecord } from '../store/db';
import { DifficultyTag, LeetCodeLink, MasteryCell } from './ui';

interface ProblemRowProps {
  problem: Problem;
  progress: ProgressRecord | undefined;
  today: Day;
  /** 用螢光筆標出今天要做的題目 */
  marked?: boolean;
  showPattern?: boolean;
  companies?: string[];
  actions?: ReactNode;
}

export function ProblemRow({ problem, progress, today, marked, showPattern, companies, actions }: ProblemRowProps) {
  const { t, fmt, locale } = useI18n();
  const stage = stageOf(progress);
  const overdue = progress && progress.due < today;

  return (
    <div className="problem-row">
      <MasteryCell progress={progress} label={t.stages[stage]} />
      <div className="problem-main">
        <div className="problem-title">
          <span className="problem-num">{problem.id}</span>
          <Link to={`/problems/${problem.id}`} className={marked ? 'marked' : undefined}>
            {problem.title}
          </Link>
        </div>
        <div className="problem-meta">
          <DifficultyTag difficulty={problem.difficulty} />
          {showPattern && <span>{getPattern(problem.pattern, locale).name}</span>}
          {progress ? (
            <span className={overdue ? 'overdue' : undefined}>
              {progress.due > today
                ? t.row.nextReview(fmt.day(progress.due, false))
                : overdue
                  ? t.row.dueOverdue(t.date.relative(diffDays(today, progress.due)))
                  : t.row.dueNow}
            </span>
          ) : null}
          {progress && <span>{t.common.lastResult(t.ratings[progress.lastRating].label)}</span>}
          {problem.premium && <span>{t.common.premium}</span>}
          {problem.custom && <span>{t.common.customTag}</span>}
          {companies?.map((c) => (
            <span key={c} className="chip">
              {c}
            </span>
          ))}
        </div>
      </div>
      <div className="problem-actions">
        <LeetCodeLink slug={problem.slug} />
        {actions}
      </div>
    </div>
  );
}
