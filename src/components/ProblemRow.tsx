import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { getPattern } from '../data/patterns';
import type { Problem } from '../data/problems';
import { formatDay, relativeDay, type Day } from '../lib/dates';
import { ratingLabel, stageOf, STAGE_LABELS } from '../lib/srs';
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
  const stage = stageOf(progress);
  const overdue = progress && progress.due < today;

  return (
    <div className="problem-row">
      <MasteryCell progress={progress} label={STAGE_LABELS[stage]} />
      <div className="problem-main">
        <div className="problem-title">
          <span className="problem-num">{problem.id}</span>
          <Link to={`/problems/${problem.id}`} className={marked ? 'marked' : undefined}>
            {problem.title}
          </Link>
        </div>
        <div className="problem-meta">
          <DifficultyTag difficulty={problem.difficulty} />
          {showPattern && <span>{getPattern(problem.pattern).name}</span>}
          {progress ? (
            <span className={overdue ? 'overdue' : undefined}>
              {progress.due <= today
                ? `該複習了${overdue ? `（${relativeDay(progress.due, today)}）` : ''}`
                : `下次複習 ${formatDay(progress.due, false)}`}
            </span>
          ) : null}
          {progress && <span>上次：{ratingLabel(progress.lastRating)}</span>}
          {problem.premium && <span>需要 Premium</span>}
          {problem.custom && <span>我新增的</span>}
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
