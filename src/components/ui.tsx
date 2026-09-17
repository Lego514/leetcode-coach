import { useEffect, useRef, type ReactNode } from 'react';
import type { Difficulty } from '../data/problems';
import { masteryOf } from '../lib/srs';
import type { ProgressRecord } from '../store/db';

const DIFFICULTY_LABELS: Record<Difficulty, string> = { Easy: 'Easy', Medium: 'Medium', Hard: 'Hard' };

export function DifficultyTag({ difficulty }: { difficulty: Difficulty }) {
  return (
    <span className="difficulty" data-level={difficulty}>
      {DIFFICULTY_LABELS[difficulty]}
    </span>
  );
}

export function masteryLevel(progress: ProgressRecord | undefined | null): 0 | 1 | 2 | 3 | 4 {
  if (!progress) return 0;
  const m = masteryOf(progress);
  if (m < 0.35) return 1;
  if (m < 0.6) return 2;
  if (m < 0.85) return 3;
  return 4;
}

export function MasteryCell({ progress, label }: { progress: ProgressRecord | undefined | null; label?: string }) {
  const lapsed = progress?.lastRating === 'fail' || progress?.lastRating === 'solution';
  return (
    <span
      className="cell"
      data-level={masteryLevel(progress)}
      data-lapsed={lapsed}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      title={label}
    />
  );
}

export function MasteryLegend() {
  return (
    <div className="legend" aria-label="方格說明">
      <span className="legend-item">
        <span className="cell" data-level={0} aria-hidden /> 還沒做
      </span>
      <span className="legend-item">
        <span className="cell" data-level={1} aria-hidden />
        <span className="cell" data-level={2} aria-hidden />
        <span className="cell" data-level={3} aria-hidden />
        <span className="cell" data-level={4} aria-hidden /> 越深越熟
      </span>
      <span className="legend-item">
        <span className="cell" data-level={1} data-lapsed="true" aria-hidden /> 上次沒解出來
      </span>
    </div>
  );
}

export function ExternalIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <path d="M9 3h4v4M13 3 7.5 8.5M11 9.5V13H3V5h3.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function LeetCodeLink({
  slug,
  children = 'LeetCode',
  className = 'icon-link',
}: {
  slug: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <a className={className} href={`https://leetcode.com/problems/${slug}/`} target="_blank" rel="noreferrer">
      {children}
      <ExternalIcon />
      <span className="visually-hidden">（在新分頁開啟）</span>
    </a>
  );
}

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}

/** 使用原生 <dialog>，Esc 關閉與焦點鎖定由瀏覽器處理 */
export function Dialog({ open, onClose, title, subtitle, children, footer }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="dialog"
      aria-labelledby="dialog-title"
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {open && (
        <>
          <div className="dialog-head">
            <h2 className="dialog-title" id="dialog-title">
              {title}
            </h2>
            {subtitle && <p className="dialog-sub">{subtitle}</p>}
          </div>
          <div className="dialog-body">{children}</div>
          {footer && <div className="dialog-foot">{footer}</div>}
        </>
      )}
    </dialog>
  );
}

export function Sheet({
  title,
  count,
  note,
  actions,
  children,
  id,
}: {
  title: ReactNode;
  count?: number;
  note?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  id?: string;
}) {
  return (
    <section className="sheet" aria-labelledby={id}>
      <div className="sheet-head">
        <h2 className="sheet-title" id={id}>
          {title}
          {count !== undefined && <span className="count">{count}</span>}
        </h2>
        {note && <p className="sheet-note">{note}</p>}
        {actions}
      </div>
      {children}
    </section>
  );
}

export function PageHead({ title, lede, children }: { title: ReactNode; lede?: ReactNode; children?: ReactNode }) {
  return (
    <header className="page-head">
      <h1 className="page-title">{title}</h1>
      {lede && <p className="page-lede">{lede}</p>}
      {children}
    </header>
  );
}
