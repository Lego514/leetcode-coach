import { useMemo, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import { getPattern } from '../data/patterns';
import type { Problem } from '../data/problems';
import { useI18n } from '../i18n';
import type { CompanionStage, HeadItem } from '../lib/companion';
import type { Day } from '../lib/dates';
import {
  branchOutline,
  canopyBlobs,
  GROUND,
  grownBetween,
  nextStage,
  pointOn,
  stageView,
  treeLayout,
  treeStage,
  treeState,
  TRUNK_X,
  visibleProblems,
  type TreeNode,
  type TreeState,
} from '../lib/tree';
import type { AttemptRecord, ProgressRecord } from '../store/db';
import type { RecapNumbers } from './Motivation';
import { ShareTreeButton } from './ShareCard';
import { Capybara, type CompanionMood } from './Capybara';
import { Flower, Fruit, Ground, LEAF, LeafIcon, Seed, Seedling, Sprout, Trunk, VEIN } from './TreeArt';
import { DifficultyTag, Sheet } from './ui';

// 演算法樹：今天頁的「今天的目標」卡放小的（components/Motivation.tsx），進度頁放完整的（題型名稱、點葉子看是哪一題、圖例）

export interface TreeProps {
  problems: readonly Problem[];
  progress: ReadonlyMap<number, ProgressRecord>;
  attempts: readonly AttemptRecord[];
  today: Day;
}

export function useTree({ problems, progress, attempts, today }: TreeProps) {
  const state = useMemo(() => treeState(problems, progress, attempts, today), [problems, progress, attempts, today]);
  // 從種子開始長：還小的時候只畫做過的題型，再加上接下來幾根
  const stage = treeStage(state.started);
  const visible = useMemo(() => visibleProblems(problems, state.levels, stage), [problems, state.levels, stage]);
  const branches = useMemo(() => treeLayout(visible), [visible]);
  // 發芽階段的嫩葉：做過的題目照清單順序
  const seedlings = useMemo(() => problems.filter((p) => state.nodes.get(p.id)?.kind !== 'bud').slice(0, 4), [problems, state.nodes]);
  return { branches, state, stage, seedlings };
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
  stage,
  seedlings,
  labels,
  picked,
  onPick,
  ariaLabel,
  companion,
}: ReturnType<typeof useTree> & {
  labels: boolean;
  picked?: number | null;
  onPick?: (id: number) => void;
  ariaLabel: string;
  /** 坐在樹右下角的卡皮巴拉（今天卡用） */
  companion?: { stage: CompanionStage; mood: CompanionMood; item: HeadItem | null };
}) {
  const { locale } = useI18n();
  const grown = useGrown(state);
  const view = stageView(stage, branches, labels, seedlings.length);
  // 樹幹：會的題目越多越粗；長到最高那根做過的題型再高一點，再上面還沒做的題型只畫藍色虛線
  const w = 7 + Math.min(14, state.ready * 0.35);
  const top = Math.min(...branches.map((b) => b.start.y)) - 20;
  const grownStarts = branches.filter((b) => (state.levels.get(b.pattern) ?? 0) > 0).map((b) => b.start.y);
  const grownTop = grownStarts.length > 0 ? Math.min(...grownStarts) - 20 : top;
  const pick = onPick
    ? (id: number) => ({
        onClick: () => onPick(id),
        'data-picked': picked === id || undefined,
      })
    : () => ({});

  return (
    <svg
      className="algo-tree"
      viewBox={`${view.x} ${view.y} ${view.width} ${view.height}`}
      role="img"
      aria-label={ariaLabel}
      data-interactive={onPick ? true : undefined}
      data-stage={stage}
    >
      <Ground width={view.width} shadow={stage === 'seed' || stage === 'sprout' ? 0 : w * 2.4 + 6} />
      {stage === 'seed' && <Seed />}
      {stage === 'sprout' && <Sprout seedlings={seedlings} state={state} />}
      {stage !== 'seed' && stage !== 'sprout' && (
        <g>
          {canopyBlobs(branches, state.nodes).map((c, i) => (
            <circle key={i} className="algo-canopy" cx={c.x} cy={c.y} r={c.r} />
          ))}
          {top < grownTop && <path className="algo-ghost" d={`M${TRUNK_X} ${grownTop - 12} L${TRUNK_X} ${top}`} />}
          <Trunk top={grownTop} w={w} />
          {branches.map((b) => {
            const level = state.levels.get(b.pattern) ?? 0;
            return level === 0 ? (
              <path key={b.pattern} className="algo-ghost" d={`M${b.start.x} ${b.start.y} Q${b.control.x} ${b.control.y} ${b.end.x} ${b.end.y}`} />
            ) : (
              <path key={b.pattern} className="algo-branch" d={branchOutline(b, 4 + level * 1.4)} />
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
              // 小芽站在樹枝上，左右輪流歪一點
              if (node.kind === 'sprout')
                return (
                  <g key={p.id} className={className}>
                    <Seedling transform={`translate(${pos.x} ${pos.y}) rotate(${flip * 14})`} {...pick(p.id)} />
                  </g>
                );
              const fx = pos.x + flip * 2;
              const fy = pos.y + 9;
              const transform = `translate(${x} ${y}) rotate(${rotate})`;
              return (
                <g key={p.id} className={className}>
                  <path className="algo-leaf" data-shade={node.shade} d={LEAF} transform={transform} {...pick(p.id)} />
                  <path className="algo-vein" d={VEIN} transform={transform} />
                  {node.fruit && <Fruit stem={{ x: pos.x, y: pos.y + 1 }} at={{ x: fx, y: fy }} {...pick(p.id)} />}
                </g>
              );
            }),
          )}
          {branches.map((b) => (state.levels.get(b.pattern) === 3 ? <Flower key={b.pattern} x={b.end.x} y={b.end.y} /> : null))}
        </g>
      )}
      {companion && <TreeCompanion view={view} {...companion} />}
      {labels &&
        branches.map((b) => {
          const level = state.levels.get(b.pattern) ?? 0;
          const end = b.end;
          return (
            <text
              key={b.pattern}
              className="algo-label"
              data-ghost={level === 0 || undefined}
              x={end.x + b.side * (level === 3 ? 10 : 4)}
              y={end.y - 4}
              textAnchor={b.side < 0 ? 'end' : 'start'}
            >
              {getPattern(b.pattern, locale).name}
            </text>
          );
        })}
    </svg>
  );
}

/** 樹右下角的卡皮巴拉：站在樹的地面上；樹還小的時候畫面框得小，卡皮巴拉也跟著小 */
function TreeCompanion({ view, ...look }: { view: { x: number; y: number; width: number; height: number }; stage: CompanionStage; mood: CompanionMood; item: HeadItem | null }) {
  const width = Math.min(Math.max(view.width * 0.3, 34), 96);
  const height = (width * 134) / 120;
  // 卡皮巴拉的腳底在它自己畫面高度的 97% 的地方
  return <Capybara {...look} ground={false} x={view.x + view.width * 0.97 - width} y={GROUND + 12 - height * 0.97} width={width} height={height} />;
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
        <p className="algo-stage">
          <strong>{t.tree.stages[tree.stage]}</strong>
          {nextStage(tree.state.started) && (
            <span>{t.tree.nextStage(nextStage(tree.state.started)!.needed, t.tree.stageGoals[nextStage(tree.state.started)!.stage])}</span>
          )}
        </p>
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
              <p>{describeNode(t.tree.nodes, node)}</p>
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
          {/* 圖例用的是樹上同一套圖 */}
          <LegendItem shape={<LeafIcon shade="fresh" transform="translate(2 7)" />} text={t.tree.legend.leaf} />
          <LegendItem shape={<LeafIcon shade="fading" transform="translate(2 7)" />} text={t.tree.legend.fading} />
          <LegendItem shape={<LeafIcon shade="faded" transform="translate(2 7)" />} text={t.tree.legend.faded} />
          <LegendItem shape={<Seedling transform="translate(11 13.5) scale(1.1)" />} text={t.tree.legend.sprout} />
          <LegendItem shape={<Fruit stem={{ x: 11, y: -2 }} at={{ x: 11, y: 8 }} />} text={t.tree.legend.fruit} />
          <LegendItem shape={<Flower x={11} y={7} scale={0.78} />} text={t.tree.legend.flower} />
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

export function describeNode(nodes: ReturnType<typeof useI18n>['t']['tree']['nodes'], node: TreeNode): string {
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
