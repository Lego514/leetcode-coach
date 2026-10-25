import type { ReactNode, SVGProps } from 'react';
import type { Problem } from '../data/problems';
import { GROUND, sproutHeight, taperedPath, TRUNK_X, type Point, type TreeStage, type TreeState } from '../lib/tree';

// 演算法樹的插畫零件：地面、橡實、發芽的小莖、樹幹、果實、花，和慶祝訊息旁邊的小圖。
// 做到的東西上色，光從左上方照過來，右半邊（右下）是陰影；還沒做到的是藍色虛線的藍圖。
// 顏色都是 CSS 變數（styles.css 的 --wood、--soil、--canopy…），深色模式跟著換

export const LEAF = 'M0 0 Q9 -6.5 18 0 Q9 6.5 0 0Z';
/** 葉脈：葉子中間一條淡淡的線 */
export const VEIN = 'M2.5 0 Q9 -0.9 15.5 0';
/** 小芽的兩片嫩葉：從小莖頂端往左上、右上長 */
const SEEDLING_LEFT = 'M0 -5.5 Q-3 -10 -7.5 -8.5 Q-4.5 -4.6 0 -5.5Z';
const SEEDLING_RIGHT = 'M0 -6.5 Q3.4 -11.6 8 -10.2 Q5 -6 0 -6.5Z';
/** 樹梢、莖的頂端還在長的新芽 */
const SHOOT = 'M0 0 C-3.6 -3.5 -2.4 -8.5 0 -11 C2.4 -8.5 3.6 -3.5 0 0Z';
/** 橡實的殼斗（帽子）和上面的鱗片紋路 */
const CAP = 'M-9.5 0 C-10 -8.5 10 -8.5 9.5 0 Q0 2.6 -9.5 0Z';
const CAP_DOTS: [number, number][] = [
  [-5, -4.4],
  [-1.7, -4.9],
  [1.7, -4.9],
  [5, -4.4],
  [-6.8, -1.4],
  [-3.4, -1.9],
  [0, -2],
  [3.4, -1.9],
  [6.8, -1.4],
];

const X = TRUNK_X;
const G = GROUND;

/** 地面：一片草地，兩邊幾叢小草；shadow 是樹底下那圈影子的半徑（0 就不畫） */
export function Ground({ width, shadow }: { width: number; shadow: number }) {
  // 畫面框得越大，小草就要畫得越大，螢幕上看起來才一樣大
  const s = width / 400;
  const rx = width * 0.47;
  const ry = width * 0.05;
  const cy = G + 14;
  return (
    <g>
      <ellipse className="algo-ground" cx={X} cy={cy} rx={rx} ry={ry} />
      {shadow > 0 && <ellipse className="algo-grass" cx={X} cy={G + 10} rx={shadow} ry={Math.max(2.5, shadow * 0.18)} />}
      {[-0.39, -0.27, 0.29, 0.4].map((f) => {
        const x = X + f * width;
        const y = cy - ry * Math.sqrt(1 - ((f * width) / rx) ** 2) + 2 * s;
        return (
          <path
            key={f}
            className="algo-tuft"
            strokeWidth={1.7 * s}
            d={`M${x - 4 * s} ${y} q${s} ${-4 * s} ${-s} ${-8 * s} M${x} ${y} q${-0.5 * s} ${-6 * s} ${1.5 * s} ${-11 * s} M${x + 4 * s} ${y} q${-0.5 * s} ${-4 * s} ${2.5 * s} ${-7 * s}`}
          />
        );
      })}
    </g>
  );
}

/**
 * 果實：征服的題目，從葉子底下垂下來，頂上一片小葉子；右下是陰影、左上有亮點。
 * stem 是接在葉子上的地方，at 是果實的中心；點擊的事件掛在果實本身（陰影、亮點不接滑鼠）
 */
export function Fruit({ stem, at, ...props }: { stem: Point; at: Point } & SVGProps<SVGCircleElement>) {
  const { x, y } = at;
  const r = 5.2;
  const d = r * Math.SQRT1_2;
  return (
    <>
      <line className="algo-stem" x1={stem.x} y1={stem.y} x2={x} y2={y - r + 0.6} />
      <circle className="algo-fruit" cx={x} cy={y} r={r} {...props} />
      <path className="algo-fruit-shade" d={`M${x + d} ${y - d} A${r} ${r} 0 0 1 ${x - d} ${y + d} Q${x + 1.7} ${y + 1.7} ${x + d} ${y - d}Z`} />
      <ellipse className="algo-fruit-hi" cx={x - 2} cy={y - 2.1} rx={1.6} ry={1} transform={`rotate(-40 ${x - 2} ${y - 2.1})`} />
      <path className="algo-fruit-leaf" d={LEAF} transform={`translate(${x + 0.2} ${y - r + 0.8}) rotate(-38) scale(0.34)`} />
    </>
  );
}

/** 花：精通的題型開在樹枝末端。五片花瓣，靠花心的地方深一點，花心有一點亮光 */
export function Flower({ x, y, scale = 1 }: { x: number; y: number; scale?: number }) {
  const petals = [0, 1, 2, 3, 4].map((i) => ({ angle: i * 72, rad: (i * 72 * Math.PI) / 180 }));
  return (
    <g transform={`translate(${x} ${y}) rotate(-18) scale(${scale})`}>
      {petals.map(({ angle, rad }) => {
        const [cx, cy] = [Math.cos(rad) * 4.4, Math.sin(rad) * 4.4];
        return <ellipse key={angle} className="algo-petal" cx={cx} cy={cy} rx={3.9} ry={2.7} transform={`rotate(${angle} ${cx} ${cy})`} />;
      })}
      {petals.map(({ angle, rad }) => {
        const [cx, cy] = [Math.cos(rad) * 2.5, Math.sin(rad) * 2.5];
        return <ellipse key={angle} className="algo-petal-in" cx={cx} cy={cy} rx={1.7} ry={1.1} transform={`rotate(${angle} ${cx} ${cy})`} />;
      })}
      <circle className="algo-flower" r={2.1} />
      <circle className="algo-flower-hi" cx={-0.7} cy={-0.7} r={0.7} />
    </g>
  );
}

/** 小芽：靠提示做出來的題目，一根小莖兩片嫩葉，重寫出來才長成葉子。原點是小莖的底 */
export function Seedling(props: SVGProps<SVGGElement>) {
  return (
    <g className="algo-sprout" {...props}>
      <path className="algo-sprout-stem" d="M0 0 Q0.8 -3 0 -6.5" />
      <path d={SEEDLING_LEFT} />
      <path d={SEEDLING_RIGHT} />
    </g>
  );
}

/** 土堆 */
function Mound() {
  return <path className="algo-soil" d={`M${X - 30} ${G + 11} C${X - 22} ${G - 5} ${X + 22} ${G - 5} ${X + 30} ${G + 11} Q${X} ${G + 15} ${X - 30} ${G + 11}Z`} />;
}

function Cap({ transform }: { transform?: string }) {
  return (
    <g transform={transform}>
      <path className="algo-cap" d={CAP} />
      {CAP_DOTS.map(([cx, cy]) => (
        <circle key={`${cx} ${cy}`} className="algo-cap-dot" cx={cx} cy={cy} r={0.8} />
      ))}
    </g>
  );
}

/** 橡實：帽子、果實、亮面、短柄；原點在帽子和果實的交界 */
function Acorn({ transform }: { transform?: string }) {
  return (
    <g transform={transform}>
      <path className="algo-stalk" d="M0.5 -6 Q1 -10 3.5 -11.5" />
      <path className="algo-nut" d="M-7.5 -1 C-7.8 7 -3.5 12.5 0 13.5 C3.5 12.5 7.8 7 7.5 -1Z" />
      <path className="algo-shine" d="M-4.4 2 C-4.6 4.8 -3.6 7.2 -2.2 8.6" />
      <Cap />
    </g>
  );
}

/** 播種：一顆橡實半埋在土裡 */
export function Seed() {
  return (
    <g>
      <Mound />
      <Acorn transform={`translate(${X} ${G - 7}) rotate(-14) scale(1.35)`} />
      {/* 前面的土蓋住橡實的下半 */}
      <path
        className="algo-soil"
        d={`M${X - 21} ${G + 12} C${X - 17} ${G + 4} ${X - 8} ${G + 3} ${X} ${G + 3} C${X + 8} ${G + 3} ${X + 17} ${G + 4} ${X + 21} ${G + 12}Z`}
      />
    </g>
  );
}

function cubic(t: number, a: Point, b: Point, c: Point, d: Point): Point {
  const u = 1 - t;
  return {
    x: u * u * u * a.x + 3 * u * u * t * b.x + 3 * u * t * t * c.x + t * t * t * d.x,
    y: u * u * u * a.y + 3 * u * u * t * b.y + 3 * u * t * t * c.y + t * t * t * d.y,
  };
}

/**
 * 發芽：土裡長出一根小莖，每做一題長一片葉子（顏色跟那一題在樹上的樣子一樣，征服的題目一樣結果實），
 * 頂端是還在長的新芽；橡實的帽子還留在土上
 */
export function Sprout({ seedlings, state }: { seedlings: readonly Problem[]; state: TreeState }) {
  const height = sproutHeight(seedlings.length);
  const top = G - height;
  // 莖：微微 S 形，底下粗、上面細
  const stem = Array.from({ length: 17 }, (_, i) =>
    cubic(i / 16, { x: X, y: G + 6 }, { x: X - 6, y: G - height * 0.4 }, { x: X + 6, y: top + height * 0.3 }, { x: X, y: top }),
  );
  const near = (y: number) => stem.reduce((best, p) => (Math.abs(p.y - y) < Math.abs(best.y - y) ? p : best));
  return (
    <g>
      <path className="algo-stem-sprout" d={taperedPath(stem, 4.6, 1.8)} />
      <path className="algo-shoot" d={SHOOT} transform={`translate(${X} ${top + 1})`} />
      {seedlings.map((p, i) => {
        const node = state.nodes.get(p.id);
        const at = near(G - 30 - i * 22);
        const angle = i % 2 === 0 ? 200 : -20;
        const transform = `translate(${at.x} ${at.y}) rotate(${angle}) scale(1.5)`;
        // 葉子中間（葉子長 18，放大 1.5 倍）往下垂一顆果實
        const mid = { x: at.x + Math.cos((angle * Math.PI) / 180) * 14, y: at.y + Math.sin((angle * Math.PI) / 180) * 14 };
        return node?.kind === 'leaf' ? (
          <g key={p.id}>
            <path className="algo-leaf" data-shade={node.shade} d={LEAF} transform={transform} />
            <path className="algo-vein" d={VEIN} transform={transform} />
            {node.fruit && <Fruit stem={{ x: mid.x, y: mid.y + 2 }} at={{ x: mid.x, y: mid.y + 12 }} />}
          </g>
        ) : (
          <path key={p.id} className="algo-sprout" d={LEAF} transform={transform} />
        );
      })}
      {/* 土堆畫在莖的後面，莖看起來是從土裡長出來的 */}
      <Mound />
      <Cap transform={`translate(${X + 13} ${G + 2}) rotate(18) scale(1.15)`} />
    </g>
  );
}

/** 樹幹：樹根往兩邊散開，右半邊是陰影，夠粗了才看得到樹皮的紋路；樹梢是一顆新芽。w 是樹根上面一半的寬 */
export function Trunk({ top, w }: { top: number; w: number }) {
  const base = G + 9;
  const h = G + 6 - top;
  const tip = 1.6;
  // 樹根接上樹幹的高度、樹根散開多寬
  const join = G - Math.min(16, h * 0.18);
  const spread = w * 1.7 + 3;
  const leftEdge = `C${X - w * 0.62} ${join - h * 0.3} ${X - tip * 1.6} ${top + h * 0.3} ${X - tip} ${top}`;
  const rightEdge = `C${X + tip * 1.6} ${top + h * 0.3} ${X + w * 0.62} ${join - h * 0.3} ${X + w * 0.9} ${join}`;
  const rightEdgeUp = `C${X + w * 0.62} ${join - h * 0.3} ${X + tip * 1.6} ${top + h * 0.3} ${X + tip} ${top}`;
  const body = [
    `M${X - spread} ${base} Q${X - w * 1.05} ${G + 4} ${X - w * 0.9} ${join}`,
    leftEdge,
    `L${X + tip} ${top}`,
    rightEdge,
    `Q${X + w * 1.05} ${G + 4} ${X + spread} ${base}`,
    `Q${X} ${base + 7} ${X - spread} ${base}Z`,
  ].join(' ');
  // 陰影：從樹梢沿著樹幹中間偏右往下，到底邊再沿著右邊的樹根、右邊的輪廓回到樹梢。
  // 底邊是二次曲線，取 x = X + 0.3w 那一點和那一段的控制點，陰影才剛好貼著樹幹的底
  const s = (1 - (w * 0.3) / spread) / 2;
  const shade = [
    `M${X + 0.4} ${top + 3} C${X + tip * 0.8} ${top + h * 0.35} ${X + w * 0.12} ${join - h * 0.2} ${X + w * 0.3} ${base + 14 * s * (1 - s)}`,
    `Q${X + spread * (1 - s)} ${base + 7 * s} ${X + spread} ${base}`,
    `Q${X + w * 1.05} ${G + 4} ${X + w * 0.9} ${join}`,
    rightEdgeUp,
    'Z',
  ].join(' ');
  const bark =
    w >= 9 && h >= 70
      ? [
          `M${X - w * 0.42} ${join - h * 0.04} Q${X - w * 0.52} ${join - h * 0.14} ${X - w * 0.36} ${join - h * 0.24}`,
          `M${X - w * 0.14} ${join - h * 0.32} Q${X - w * 0.24} ${join - h * 0.4} ${X - w * 0.12} ${join - h * 0.5}`,
        ]
      : [];
  return (
    <g>
      <path className="algo-trunk" d={body} />
      <path className="algo-trunk-shade" d={shade} />
      {bark.map((d) => (
        <path key={d} className="algo-bark" d={d} />
      ))}
      <path className="algo-shoot" d={SHOOT} transform={`translate(${X} ${top + 1})`} />
    </g>
  );
}

/** 葉子加葉脈，給圖例和慶祝訊息用 */
export function LeafIcon({ shade, transform }: { shade: 'fresh' | 'good' | 'fading' | 'faded'; transform?: string }) {
  return (
    <g transform={transform}>
      <path className="algo-leaf" data-shade={shade} d={LEAF} />
      <path className="algo-vein" d={VEIN} />
    </g>
  );
}

/** 樹的小圖示：樹冠是幾個疊在一起的圓，右下多一圈深綠當陰影；階段越後面樹冠越大，大樹結兩顆果實 */
const CROWNS: Record<'sapling' | 'young' | 'grown', { top: number; circles: [number, number, number][] }> = {
  sapling: {
    top: -13,
    circles: [
      [-4.5, -14, 4.6],
      [4.5, -15.5, 4.2],
    ],
  },
  young: {
    top: -16,
    circles: [
      [-5.5, -15, 5.2],
      [5.5, -16, 5.2],
      [0, -21, 5.6],
    ],
  },
  grown: {
    top: -20,
    circles: [
      [-7, -15, 5.6],
      [7, -16, 5.6],
      [-4, -22, 6],
      [4.5, -23, 6],
      [0, -28, 5.2],
    ],
  },
};

function TreeBadge({ stage }: { stage: keyof typeof CROWNS }) {
  const { top, circles } = CROWNS[stage];
  return (
    <>
      <ellipse className="algo-ground" cx={0} cy={1.5} rx={13} ry={2.4} />
      <path className="algo-trunk" d={`M-3.2 2 Q-1.6 -2 -1.2 ${top} L1.2 ${top} Q1.6 -2 3.2 2Z`} />
      <path className="algo-trunk-shade" d={`M0.3 ${top} L1.2 ${top} Q1.6 -2 3.2 2 L0.6 2Z`} />
      {circles.map(([x, y, r]) => (
        <circle key={x} className="algo-crown-shade" cx={x + 1} cy={y + 1} r={r} />
      ))}
      {circles.map(([x, y, r]) => (
        <circle key={x} className="algo-crown" cx={x} cy={y} r={r} />
      ))}
      {stage === 'grown' && (
        <>
          <circle className="algo-fruit" cx={-4} cy={-17} r={1.8} />
          <circle className="algo-fruit" cx={5} cy={-21} r={1.8} />
        </>
      )}
    </>
  );
}

export type Art = TreeStage | 'fruit' | 'flower' | 'leaf' | 'seedling' | 'bud';

/**
 * 跟樹上同一套的小圖：慶祝訊息旁邊（樹長到的階段、征服的果實、精通的花、會了的葉子），
 * 和題型地圖每一格的等級（還沒開始是藍圖的一個點、入門是小芽、會了是葉子、精通開花）
 */
export function ArtIcon({ art, className = 'win-icon' }: { art: Art; className?: string }) {
  let viewBox: string;
  let content: ReactNode;
  if (art === 'bud') {
    viewBox = '-10 -7 20 14';
    content = (
      <>
        <line className="algo-ghost" x1={-9} y1={4} x2={9} y2={-4} />
        <circle className="algo-bud" r={2.6} />
      </>
    );
  } else if (art === 'seedling') {
    viewBox = '-11 -16 22 18';
    content = <Seedling transform="translate(0 1) scale(1.3)" />;
  } else if (art === 'fruit') {
    viewBox = '-9 -10 18 18';
    content = <Fruit stem={{ x: 0, y: -10 }} at={{ x: 0, y: 1 }} />;
  } else if (art === 'flower') {
    viewBox = '-9.5 -9.5 19 19';
    content = <Flower x={0} y={0} />;
  } else if (art === 'leaf') {
    viewBox = '-1 -13 21 19';
    content = <LeafIcon shade="fresh" transform="translate(1.5 3) rotate(-38)" />;
  } else if (art === 'seed') {
    viewBox = '-15 -23 30 30';
    content = (
      <>
        <path className="algo-soil" d="M-13 5 C-9 -4 9 -4 13 5Z" />
        <Acorn transform="translate(0 -6) rotate(-14) scale(0.8)" />
        <path className="algo-soil" d="M-9 5 C-7 0 7 0 9 5Z" />
      </>
    );
  } else if (art === 'sprout') {
    viewBox = '-13 -27 26 31';
    content = (
      <>
        <ellipse className="algo-ground" cx={0} cy={2.5} rx={12} ry={2.2} />
        <path
          className="algo-stem-sprout"
          d={taperedPath(
            [
              { x: 0, y: 3 },
              { x: 0.8, y: -5 },
              { x: -0.6, y: -12 },
              { x: 0, y: -19 },
            ],
            3,
            1.3,
          )}
        />
        <LeafIcon shade="fresh" transform="translate(0 -7) rotate(200) scale(0.62)" />
        <LeafIcon shade="good" transform="translate(0 -13) rotate(-20) scale(0.62)" />
        <path className="algo-shoot" d={SHOOT} transform="translate(0 -18.5) scale(0.62)" />
        <path className="algo-soil" d="M-8 3.5 C-5.5 -2 5.5 -2 8 3.5 Q0 5.5 -8 3.5Z" />
      </>
    );
  } else {
    viewBox = '-14 -35 28 39';
    content = <TreeBadge stage={art} />;
  }
  return (
    <svg className={className} viewBox={viewBox} aria-hidden>
      {content}
    </svg>
  );
}
