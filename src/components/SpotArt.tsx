import type { ReactNode } from 'react';
import { LeafIcon } from './TreeArt';

// 空白和做完的時候的小插畫，跟演算法樹同一套畫法：做到的東西上色（光從左上方來，左邊亮、右邊暗），
// 還沒有的是藍色虛線的藍圖。只放在「這裡還沒有東西」和「做完了」的地方，順便提示下一步；其他地方保持安靜

export type Spot = 'watering' | 'watered' | 'cards' | 'notebook' | 'easel' | 'lost' | 'sync';

/** 小星星：做完的時候閃一下 */
const STAR = 'M0 -4 L1 -1 L4 0 L1 1 L0 4 L-1 1 L-4 0 L-1 -1Z';
/** 水滴 */
const DROP = 'M0 -3.4 C2.2 -0.4 2.4 2.6 0 2.6 C-2.4 2.6 -2.2 -0.4 0 -3.4Z';
const SHOOT = 'M0 0 C-3.6 -3.5 -2.4 -8.5 0 -11 C2.4 -8.5 3.6 -3.5 0 0Z';

function Ground() {
  return <ellipse className="algo-ground" cx={60} cy={82} rx={52} ry={5} />;
}

/** 小芽：從一小堆土裡長出來，兩片葉子，頂端一顆新芽 */
function Sprout({ x }: { x: number }) {
  return (
    <g>
      <path className="spot-stem" d={`M${x} 82 Q${x + 2.5} 70 ${x} 58`} />
      <LeafIcon shade="fresh" transform={`translate(${x + 0.8} 71) rotate(200) scale(0.78)`} />
      <LeafIcon shade="good" transform={`translate(${x + 1} 64) rotate(-24) scale(0.78)`} />
      <path className="algo-shoot" d={SHOOT} transform={`translate(${x} 59) scale(0.8)`} />
      <path className="algo-soil" d={`M${x - 13} 84 C${x - 10} 76 ${x + 10} 76 ${x + 13} 84Z`} />
    </g>
  );
}

/** 澆水壺：原點在壺底中間；壺嘴朝右上 */
function Can({ transform }: { transform: string }) {
  return (
    <g transform={transform}>
      <path className="spot-can-handle" d="M-5 -26 C-5 -40 -27 -38 -17 -12" />
      <path className="spot-can-spout" d="M14 -9 L32 -25" />
      <ellipse className="spot-can" cx={33.5} cy={-26.5} rx={4.6} ry={2.6} transform="rotate(-42 33.5 -26.5)" />
      <path className="spot-can" d="M-17 -22 Q-17 -26 -13 -26 H13 Q17 -26 17 -22 L18 -3 Q18 0 15 0 H-15 Q-18 0 -18 -3Z" />
      <path className="spot-can-lit" d="M-17 -22 Q-17 -26 -13 -26 H-5 L-7 0 H-15 Q-18 0 -18 -3Z" />
    </g>
  );
}

/** 一張卡片：原點在卡片中間 */
function Card({ transform, done }: { transform: string; done?: boolean }) {
  return (
    <g transform={transform}>
      <rect className="spot-card" x={-21} y={-27} width={42} height={54} rx={4} />
      <path className="spot-line" d="M-13 -15 H13 M-13 -7 H8" />
      {done && <path className="spot-check" d="M-9 8 L-3 14 L10 0" />}
    </g>
  );
}

/** 小樹：樹幹和三個疊在一起的圓當樹冠，原點在樹底 */
function MiniTree({ transform }: { transform: string }) {
  return (
    <g transform={transform}>
      <path className="algo-trunk" d="M-2.4 0 Q-1.2 -4 -0.9 -11 L0.9 -11 Q1.2 -4 2.4 0Z" />
      {[
        [-4, -12, 4],
        [4, -13, 4],
        [0, -17, 4.6],
      ].map(([x, y, r]) => (
        <circle key={x} className="algo-crown-shade" cx={x + 0.8} cy={y + 0.8} r={r} />
      ))}
      {[
        [-4, -12, 4],
        [4, -13, 4],
        [0, -17, 4.6],
      ].map(([x, y, r]) => (
        <circle key={x} className="algo-crown" cx={x} cy={y} r={r} />
      ))}
    </g>
  );
}

const SPOTS: Record<Spot, () => ReactNode> = {
  // 沒有要複習的題目：澆水壺放在一旁，小芽好好的
  watering: () => (
    <>
      <Ground />
      <ellipse className="algo-grass" cx={40} cy={82} rx={20} ry={3} />
      <Can transform="translate(40 81)" />
      <Sprout x={92} />
    </>
  ),
  // 今天的複習做完了：澆水壺在幫小芽澆水
  watered: () => (
    <>
      <Ground />
      <Sprout x={94} />
      <Can transform="translate(38 58) rotate(30)" />
      {[
        [86, 58],
        [90, 66],
        [84, 68],
      ].map(([x, y]) => (
        <path key={`${x} ${y}`} className="spot-water" d={DROP} transform={`translate(${x} ${y})`} />
      ))}
      <path className="spot-star" d={STAR} transform="translate(108 44) scale(1.2)" />
      <path className="spot-star" d={STAR} transform="translate(78 30)" />
    </>
  ),
  // 微複習做完一回合：三張卡片，最上面那張打勾
  cards: () => (
    <>
      <ellipse className="spot-shadow" cx={60} cy={84} rx={34} ry={3.5} />
      <Card transform="translate(46 50) rotate(-14)" />
      <Card transform="translate(58 47) rotate(-3)" />
      <Card transform="translate(71 49) rotate(10)" done />
      <path className="spot-star" d={STAR} transform="translate(100 20) scale(1.3)" />
      <path className="spot-star" d={STAR} transform="translate(20 26)" />
    </>
  ),
  // 還沒有故事：攤開的筆記本、一枝鋼筆、一個說話的泡泡（故事要講出來）
  notebook: () => (
    <>
      <ellipse className="spot-shadow" cx={60} cy={83} rx={46} ry={3.5} />
      <path className="spot-card" d="M60 34 Q40 28 14 32 V78 Q40 74 60 80Z" />
      <path className="spot-card" d="M60 34 Q80 28 106 32 V78 Q80 74 60 80Z" />
      <path className="spot-line" d="M22 44 Q37 41 52 44 M22 52 Q37 49 52 52 M22 60 Q37 57 52 60 M22 68 Q31 66 40 67 M68 44 Q83 41 98 44 M68 52 Q78 50 86 51" />
      <g transform="translate(92 70) rotate(-38)">
        <rect className="spot-pen" x={-3} y={-24} width={6} height={22} rx={2} />
        <path className="spot-nib" d="M-3 -2 L0 5 L3 -2Z" />
      </g>
      <path className="spot-bubble" d="M72 4 H104 Q110 4 110 10 V20 Q110 26 104 26 H86 L78 32 L80 26 H72 Q66 26 66 20 V10 Q66 4 72 4Z" />
      {[79, 88, 97].map((x) => (
        <circle key={x} className="spot-bubble-dot" cx={x} cy={15} r={2.2} />
      ))}
    </>
  ),
  // 還沒有題目白板：畫架上的白板，畫著一個陣列和指標
  easel: () => (
    <>
      <ellipse className="spot-shadow" cx={60} cy={84} rx={36} ry={3.5} />
      <path className="spot-leg" d="M46 62 L32 84 M74 62 L88 84 M60 62 V84" />
      <rect className="spot-board" x={16} y={12} width={88} height={52} rx={3} />
      <rect className="spot-tray" x={20} y={63} width={80} height={4} rx={1.5} />
      {[28, 44, 60, 76].map((x, i) => (
        <rect key={x} className={i === 1 ? 'spot-cell spot-cell-on' : 'spot-cell'} x={x} y={24} width={14} height={14} rx={1.5} />
      ))}
      <path className="spot-arrow" d="M51 54 V44 M47 48 L51 44 L55 48" />
    </>
  ),
  // 找不到頁面：一棵還沒長出來的樹（藍圖），旁邊一個問號路標
  lost: () => (
    <>
      <Ground />
      <g className="spot-blueprint">
        <path d="M54 81 L57 50 M63 81 L60 50" />
        <path d="M30 46 C22 44 22 32 31 30 C30 19 43 13 51 19 C56 9 71 10 74 20 C85 17 93 28 87 37 C94 44 87 55 78 51 C73 59 61 58 57 52 C50 58 38 56 36 49 C33 49 31 48 30 46Z" />
      </g>
      {[
        [40, 38],
        [62, 28],
        [76, 42],
      ].map(([x, y]) => (
        <circle key={x} className="algo-bud" cx={x} cy={y} r={2.2} />
      ))}
      <path className="spot-post" d="M96 83 V52" />
      <rect className="spot-sign" x={82} y={42} width={28} height={17} rx={2.5} />
      <text className="spot-sign-text" x={96} y={55} textAnchor="middle">
        ?
      </text>
    </>
  ),
  // 登入同步：電腦和手機上都是同一棵樹
  sync: () => (
    <>
      <ellipse className="spot-shadow" cx={60} cy={84} rx={50} ry={3.5} />
      <rect className="spot-device" x={8} y={30} width={62} height={42} rx={3} />
      <rect className="spot-screen" x={12} y={34} width={54} height={34} rx={1.5} />
      <path className="spot-device" d="M2 72 H76 L72 78 H6Z" />
      <MiniTree transform="translate(39 64)" />
      <rect className="spot-device" x={86} y={34} width={26} height={46} rx={5} />
      <rect className="spot-screen" x={89} y={39} width={20} height={34} rx={2} />
      <MiniTree transform="translate(99 66) scale(0.8)" />
      {/* 兩邊都有箭頭：同步是雙向的 */}
      <path className="spot-sync" d="M56 24 Q78 6 99 28" />
      <path className="spot-sync" d="M93 27 L99 28 L99 22" />
      <path className="spot-sync" d="M56 30 L56 24 L62 22" />
    </>
  ),
};

/** 空白、做完的時候的小插畫；純裝飾，讀螢幕的人聽不到 */
export function SpotArt({ spot, className = 'spot-art' }: { spot: Spot; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 120 90" aria-hidden data-spot={spot}>
      {SPOTS[spot]()}
    </svg>
  );
}
