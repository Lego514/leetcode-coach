import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { getPattern } from '../data/patterns';
import type { Problem } from '../data/problems';
import { useI18n } from '../i18n';
import { diffDays, type Day } from '../lib/dates';
import { recallOn } from '../lib/srs';
import { needsRewrite } from '../lib/stats';
import { fadeOf, recallPercent } from '../lib/tree';
import type { ProgressRecord } from '../store/db';
import { DifficultyTag, LeetCodeLink, MasteryCell, stageLabel } from './ui';

interface ProblemRowProps {
  problem: Problem;
  progress: ProgressRecord | undefined;
  today: Day;
  /** 用螢光筆標出今天要做的題目 */
  marked?: boolean;
  showPattern?: boolean;
  companies?: string[];
  /** 這題為什麼出現，例如穿插或鞏固 */
  note?: string;
  actions?: ReactNode;
}

export function ProblemRow({ problem, progress, today, marked, showPattern, companies, note, actions }: ProblemRowProps) {
  const { t, fmt, locale } = useI18n();
  const overdue = progress && progress.due < today;
  // 到期而且上次靠提示或解答的題目，標成「重寫」
  const rewrite = progress && progress.due <= today && needsRewrite(progress);
  // 今天還記得的機率（FSRS）；舊版沒有穩定度的紀錄算不出來就不顯示
  const recall = recallOn(progress, today);
  const recallPct = recall === undefined ? undefined : recallPercent(recall);

  return (
    <div className="problem-row">
      <MasteryCell progress={progress} label={stageLabel(t, progress, today)} today={today} />
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
          {recallPct !== undefined && (
            <span className="chip chip-recall" data-fade={fadeOf(progress, today) || undefined} title={t.common.recallChance(recallPct)}>
              {t.row.recallTag(recallPct)}
            </span>
          )}
          {rewrite && <span className="chip chip-rewrite">{t.common.rewriteTag}</span>}
          {note && <span className="problem-note">{note}</span>}
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
