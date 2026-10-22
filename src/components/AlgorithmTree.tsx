import { useMemo, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import { getPattern } from '../data/patterns';
import type { Problem } from '../data/problems';
import { useI18n } from '../i18n';
import type { Day } from '../lib/dates';
import { GROUND, grownBetween, pointOn, TREE_VIEW, treeLayout, treeState, TRUNK_X, type TreeNode, type TreeState } from '../lib/tree';
import type { AttemptRecord, ProgressRecord } from '../store/db';
import type { RecapNumbers } from './Motivation';
import { ShareTreeButton } from './ShareCard';
import { DifficultyTag, Sheet } from './ui';

// 演算法樹：今天頁的「今天的目標」卡放小的（components/Motivation.tsx），進度頁放完整的（題型名稱、點葉子看是哪一題、圖例）

export interface TreeProps {
  problems: readonly Problem[];
  progress: ReadonlyMap<number, ProgressRecord>;
  attempts: readonly AttemptRecord[];
  today: Day;
}

const LEAF = 'M0 0 Q9 -6.5 18 0 Q9 6.5 0 0Z';
const SPROUT = 'M0 0 Q5.5 -4 11 0 Q5.5 4 0 0Z';

export function useTree({ problems, progress, attempts, today }: TreeProps) {
  const branches = useMemo(() => treeLayout(problems), [problems]);
  const state = useMemo(() => treeState(problems, progress, attempts, today), [problems, progress, attempts, today]);
  return { branches, state };
}

/** 剛長出來的葉子和小芽，給一個生長動畫；第一次畫不算 */
function useGrown(state: TreeState): ReadonlySet<number> {
  const [previous, setPrevious] = useState(state.nodes);
  const [grown, setGrown] = useState<ReadonlySet<number>>(new Set());
  if (previous !== state.nodes) {
    setPrevious(state.nodes);
    setGrown(grownBetween(previous, state.nodes));
  }
  return grown;
}

export function TreeSvg({
  branches,
  state,
  labels,
  picked,
  onPick,
  ariaLabel,
}: ReturnType<typeof useTree> & { labels: boolean; picked?: number | null; onPick?: (id: number) => void; ariaLabel: string }) {
  const { locale } = useI18n();
  const grown = useGrown(state);
  // 樹幹：會的題目越多越粗
  const w = 7 + Math.min(14, state.ready * 0.35);
  const top = Math.min(...branches.map((b) => b.start.y)) - 20;
  const pick = onPick
    ? (id: number) => ({
        onClick: () => onPick(id),
        'data-picked': picked === id || undefined,
      })
    : () => ({});

  return (
    <svg
      className="algo-tree"
      viewBox={`${TREE_VIEW.x} ${TREE_VIEW.y} ${TREE_VIEW.width} ${TREE_VIEW.height}`}
      role="img"
      aria-label={ariaLabel}
      data-interactive={onPick ? true : undefined}
    >
      <ellipse className="algo-ground" cx={TRUNK_X} cy={GROUND + 14} rx={190} ry={20} />
      <path
        className="algo-trunk"
        d={`M${TRUNK_X - w} ${GROUND + 6} C${TRUNK_X - w * 0.6} ${GROUND - 120}, ${TRUNK_X - 3} ${top + 80}, ${TRUNK_X - 1.5} ${top} L${TRUNK_X + 1.5} ${top} C${TRUNK_X + 3} ${top + 80}, ${TRUNK_X + w * 0.6} ${GROUND - 120}, ${TRUNK_X + w} ${GROUND + 6} Z`}
      />
      {branches.map((b) => {
        const level = state.levels.get(b.pattern) ?? 0;
        const d = `M${b.start.x} ${b.start.y} Q${b.control.x} ${b.control.y} ${b.end.x} ${b.end.y}`;
        return level === 0 ? (
          <path key={b.pattern} className="algo-ghost" d={d} />
        ) : (
          <path key={b.pattern} className="algo-wood" d={d} strokeWidth={2 + level * 1.1} />
        );
      })}
      {branches.map((b) =>
        b.problems.map((p, k) => {
          const node = state.nodes.get(p.id) ?? { kind: 'bud' as const };
          const pos = pointOn(b, 0.22 + (0.74 * (k + 0.5)) / b.problems.length);
          const flip = k % 2 === 0 ? 1 : -1;
          const x = pos.x + Math.cos(pos.angle + (flip * Math.PI) / 2) * 7.5;
          const y = pos.y + Math.sin(pos.angle + (flip * Math.PI) / 2) * 7.5;
          const rotate = (pos.angle * 180) / Math.PI - flip * 38;
          const className = grown.has(p.id) ? 'algo-grown' : undefined;
          if (node.kind === 'bud') return <circle key={p.id} className="algo-bud" cx={pos.x} cy={pos.y} r={2.6} {...pick(p.id)} />;
          if (node.kind === 'sprout')
            return (
              <g key={p.id} className={className}>
                <path className="algo-sprout" d={SPROUT} transform={`translate(${x} ${y}) rotate(${rotate})`} {...pick(p.id)} />
              </g>
            );
          const fx = pos.x + flip * 2;
          const fy = pos.y + 9;
          return (
            <g key={p.id} className={className}>
              <path className="algo-leaf" data-shade={node.shade} d={LEAF} transform={`translate(${x} ${y}) rotate(${rotate})`} {...pick(p.id)} />
              {node.fruit && (
                <>
                  <line className="algo-stem" x1={pos.x} y1={pos.y + 1} x2={fx} y2={fy - 4} />
                  <circle className="algo-fruit" cx={fx} cy={fy} r={5} {...pick(p.id)} />
                  <circle className="algo-fruit-hi" cx={fx - 1.3} cy={fy - 1.4} r={1.2} />
                </>
              )}
            </g>
          );
        }),
      )}
      {branches.map((b) =>
        state.levels.get(b.pattern) === 3 ? (
          <g key={b.pattern} transform={`translate(${b.end.x} ${b.end.y})`}>
            {[0, 1, 2, 3, 4].map((a) => {
              const r = (a * 72 * Math.PI) / 180;
              const cx = Math.cos(r) * 4.2;
              const cy = Math.sin(r) * 4.2;
              return <ellipse key={a} className="algo-petal" cx={cx} cy={cy} rx={3.6} ry={2.4} transform={`rotate(${a * 72} ${cx} ${cy})`} />;
            })}
            <circle className="algo-flower" r={2.2} />
          </g>
        ) : null,
      )}
      {labels &&
        branches.map((b) => {
          const level = state.levels.get(b.pattern) ?? 0;
          return (
            <text
              key={b.pattern}
              className="algo-label"
              data-ghost={level === 0 || undefined}
              x={b.end.x + b.side * (level === 3 ? 10 : 4)}
              y={b.end.y - 4}
              textAnchor={b.side < 0 ? 'end' : 'start'}
            >
              {getPattern(b.pattern, locale).name}
            </text>
          );
        })}
    </svg>
  );
}

/** 進度頁：完整的樹，有題型名稱，點一片葉子看是哪一題 */
export function AlgorithmTree({ share, ...props }: TreeProps & { share?: { streak: number; recap: RecapNumbers } }) {
  const { t, locale, fmt } = useI18n();
  const tree = useTree(props);
  const [picked, setPicked] = useState<number | null>(null);
  const body = useRef<HTMLDivElement>(null);
  const { ready, fading, fruits, blooms } = tree.state;
  const problem = picked === null ? undefined : props.problems.find((p) => p.id === picked);
  const node = picked === null ? undefined : tree.state.nodes.get(picked);

  return (
    <Sheet
      title={t.tree.title}
      id="algorithm-tree"
      note={t.tree.note}
      actions={
        share && (
          <ShareTreeButton
            getTree={() => body.current?.querySelector('svg.algo-tree') ?? null}
            fileName={`algorithm-tree-${props.today}.png`}
            content={{
              eyebrow: t.app.name,
              title: t.share.cardTitle,
              subtitle: fmt.fullDay(props.today),
              stats: [
                { value: String(ready), label: t.share.statReady(props.problems.length) },
                { value: String(share.streak), label: t.share.statStreak },
                { value: String(fruits), label: t.share.statFruits },
              ],
              lines: [
                t.share.weekLine(share.recap.current.days, share.recap.current.sessions, share.recap.current.conquered),
                t.share.readinessLine(share.recap.from, share.recap.now),
              ],
              footer: window.location.host,
            }}
          />
        )
      }
    >
      <div className="algo-stats">
        <Stat value={ready} label={t.tree.stats.ready(props.problems.length)} />
        <Stat value={fading.length} label={t.tree.stats.fading} />
        <Stat value={fruits} label={t.tree.stats.fruits} />
        <Stat value={blooms} label={t.tree.stats.blooms} />
      </div>
      <div className="sheet-body algo-full" ref={body}>
        <TreeSvg {...tree} labels picked={picked} onPick={setPicked} ariaLabel={t.tree.label(ready, props.problems.length)} />
        <div className="algo-info" aria-live="polite">
          {problem && node ? (
            <>
              <p className="algo-info-title">
                <Link to={`/problems/${problem.id}`}>
                  {problem.id}. {problem.title}
                </Link>
                <DifficultyTag difficulty={problem.difficulty} />
                <span>{getPattern(problem.pattern, locale).name}</span>
              </p>
              <p>{describe(t.tree.nodes, node)}</p>
            </>
          ) : (
            <p>{t.tree.hint}</p>
          )}
        </div>
        {fading.length > 0 && (
          <div className="btn-row">
            <Link className="btn btn-small btn-primary" to="/review">
              {t.tree.review(fading.length)}
            </Link>
          </div>
        )}
        <ul className="algo-legend" aria-label={t.tree.legendLabel}>
          <LegendItem shape={<path className="algo-leaf" data-shade="fresh" d="M2 7 Q11 -1 20 7 Q11 15 2 7Z" />} text={t.tree.legend.leaf} />
          <LegendItem shape={<path className="algo-leaf" data-shade="fading" d="M2 7 Q11 -1 20 7 Q11 15 2 7Z" />} text={t.tree.legend.fading} />
          <LegendItem shape={<path className="algo-leaf" data-shade="faded" d="M2 7 Q11 -1 20 7 Q11 15 2 7Z" />} text={t.tree.legend.faded} />
          <LegendItem shape={<path className="algo-sprout" d="M6 7 Q11 2 16 7 Q11 12 6 7Z" />} text={t.tree.legend.sprout} />
          <LegendItem
            shape={
              <>
                <circle className="algo-fruit" cx="11" cy="8" r="5" />
                <circle className="algo-fruit-hi" cx="9.4" cy="6.4" r="1.4" />
              </>
            }
            text={t.tree.legend.fruit}
          />
          <LegendItem
            shape={
              <>
                <line className="algo-ghost" x1="2" y1="7" x2="20" y2="7" />
                <circle className="algo-bud" cx="11" cy="7" r="2.4" />
              </>
            }
            text={t.tree.legend.bud}
          />
        </ul>
      </div>
    </Sheet>
  );
}

function describe(nodes: ReturnType<typeof useI18n>['t']['tree']['nodes'], node: TreeNode): string {
  if (node.kind === 'bud') return nodes.bud;
  if (node.kind === 'sprout') return nodes.sprout;
  const pct = Math.round(node.recall * 100);
  const text = node.shade === 'faded' ? nodes.faded(pct) : node.shade === 'fading' ? nodes.fading(pct) : nodes.leaf(pct);
  return node.fruit ? `${text}${nodes.fruit}` : text;
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <p className="algo-stat">
      <strong>{value}</strong>
      <span>{label}</span>
    </p>
  );
}

function LegendItem({ shape, text }: { shape: ReactNode; text: string }) {
  return (
    <li>
      <svg width="22" height="14" viewBox="0 0 22 14" aria-hidden="true">
        {shape}
      </svg>
      {text}
    </li>
  );
}
