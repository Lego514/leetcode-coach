import { useId, type ReactNode } from 'react';
import type { CompanionStage, HeadItem } from '../lib/companion';

// 陪刷題的卡皮巴拉（正面）：頭和身體是同一塊、沒有脖子，粗的深色外框；鼻子是臉中間下面那一大塊。
// 還沒練習的日子在打瞌睡（閉眼、旁邊有 z），練習了就很開心（瞇眼笑）。
// 頭上可以戴收集到的道具。身體的顏色是 CSS 變數（--capy-*），道具的顏色是固定的。

export type CompanionMood = 'sleepy' | 'happy';

const GROWN = 'M60 25 C87 25 103 41 103 66 V92 C103 106 91 113 73 113 H47 C29 113 17 106 17 92 V66 C17 41 33 25 60 25Z';
const BABY = 'M60 44 C83 44 96 57 96 76 V95 C96 107 86 113 71 113 H49 C34 113 24 107 24 95 V76 C24 57 37 44 60 44Z';

/** 道具放在頭頂的哪裡（各階段的頭頂不一樣高） */
const ITEM_AT: Record<CompanionStage, number> = { baby: 48, young: 41, grown: 29 };

function Grown({ mood, clip }: { mood: CompanionMood; clip: string }) {
  return (
    <>
      <circle className="capy-ear capy-ol" cx={31} cy={33} r={7.5} />
      <circle className="capy-ear-in" cx={31} cy={33} r={3.4} />
      <circle className="capy-ear capy-ol" cx={89} cy={33} r={7.5} />
      <circle className="capy-ear-in" cx={89} cy={33} r={3.4} />
      <clipPath id={clip}>
        <path d={GROWN} />
      </clipPath>
      <path className="capy-fur" d={GROWN} />
      <g clipPath={`url(#${clip})`}>
        <path className="capy-shade" d="M104 44 C100 82 88 104 58 116 H110 V44Z" />
        <path className="capy-light" d="M24 52 C28 37 42 29 58 28 C44 34 34 42 29 56Z" />
      </g>
      <path className="capy-ol" fill="none" d={GROWN} />
      <rect className="capy-snout" x={35} y={57} width={50} height={33} rx={16.5} />
      <path className="capy-ln" strokeWidth={2.8} d="M52 64 L49 70 M68 64 L71 70" />
      <path className="capy-ln" strokeWidth={2.6} d="M53 80 Q56.5 83.5 60 80 Q63.5 83.5 67 80" />
      <path className="capy-ln" strokeWidth={3.8} d={mood === 'happy' ? 'M36 50 Q40.5 44.5 45 50 M75 50 Q79.5 44.5 84 50' : 'M36 47 Q40.5 51.5 45 47 M75 47 Q79.5 51.5 84 47'} />
      <ellipse className="capy-blush" cx={27} cy={72} rx={5.5} ry={3.4} />
      <ellipse className="capy-blush" cx={93} cy={72} rx={5.5} ry={3.4} />
      <ellipse className="capy-foot capy-ol" cx={45} cy={111} rx={8.5} ry={5.5} />
      <ellipse className="capy-foot-back capy-ol" cx={75} cy={111} rx={8.5} ry={5.5} />
    </>
  );
}

function Baby({ mood, clip }: { mood: CompanionMood; clip: string }) {
  return (
    <>
      <circle className="capy-ear capy-ol" cx={36} cy={51} r={6.5} />
      <circle className="capy-ear-in" cx={36} cy={51} r={3} />
      <circle className="capy-ear capy-ol" cx={84} cy={51} r={6.5} />
      <circle className="capy-ear-in" cx={84} cy={51} r={3} />
      <clipPath id={clip}>
        <path d={BABY} />
      </clipPath>
      <path className="capy-fur" d={BABY} />
      <g clipPath={`url(#${clip})`}>
        <path className="capy-shade" d="M97 62 C94 90 84 106 58 116 H104 V62Z" />
        <path className="capy-light" d="M30 68 C34 56 45 49 58 48 C46 53 37 60 33 71Z" />
      </g>
      <path className="capy-ol" fill="none" d={BABY} />
      <rect className="capy-snout" x={40} y={76} width={40} height={27} rx={13.5} />
      <path className="capy-ln" strokeWidth={2.6} d="M54 82 L52 87 M66 82 L68 87" />
      <path className="capy-ln" strokeWidth={2.4} d="M55 95 Q57.5 97.5 60 95 Q62.5 97.5 65 95" />
      <path className="capy-ln" strokeWidth={3.6} d={mood === 'happy' ? 'M38 69 Q42.5 63.5 47 69 M73 69 Q77.5 63.5 82 69' : 'M38 67 Q42.5 71 47 67 M73 67 Q77.5 71 82 67'} />
      <ellipse className="capy-blush" cx={33} cy={86} rx={5} ry={3} />
      <ellipse className="capy-blush" cx={87} cy={86} rx={5} ry={3} />
      <ellipse className="capy-foot capy-ol" cx={48} cy={111} rx={7.5} ry={5} />
      <ellipse className="capy-foot-back capy-ol" cx={72} cy={111} rx={7.5} ry={5} />
    </>
  );
}

/** 頭上的道具：原點在道具底部的中間 */
const ITEMS: Record<HeadItem, () => ReactNode> = {
  yuzu: () => (
    <>
      <circle className="capy-ol" cx={0} cy={-11} r={12} fill="#f5b02e" />
      <path className="capy-ln" d="M-9 -17 C-6 -21 -1 -22 3 -21" stroke="#ffd77a" strokeWidth={3} />
      <path className="capy-ol" strokeWidth={2.6} d="M1 -23 C3 -31 12 -32 15 -27 C11 -23 6 -22 1 -23Z" fill="#3d9a4f" />
    </>
  ),
  sprout: () => (
    <>
      <path className="capy-ln" d="M0 0 Q1.5 -8 0 -15" stroke="#3d9a4f" strokeWidth={3.4} />
      <path className="capy-ol" strokeWidth={2.6} d="M0 -12 Q-9 -24 -18 -17 Q-10 -9 0 -12Z" fill="#63c46a" />
      <path className="capy-ol" strokeWidth={2.6} d="M0 -15 Q9 -28 19 -21 Q11 -12 0 -15Z" fill="#84b83a" />
    </>
  ),
  acorn: () => (
    <g transform="translate(0 -12) rotate(-12)">
      <path className="capy-ol" strokeWidth={2.6} d="M-8 -1 C-8.3 7 -3.7 12.5 0 13.5 C3.7 12.5 8.3 7 8 -1Z" fill="#d8a56d" />
      <path className="capy-ol" strokeWidth={2.6} d="M-10 0 C-10.5 -9 10.5 -9 10 0 Q0 2.6 -10 0Z" fill="#7a5434" />
      <path className="capy-ln" strokeWidth={2.4} d="M0.5 -6.5 Q1 -10 3.5 -12" />
      <circle cx={-4} cy={-3.2} r={0.9} fill="#b88a5e" />
      <circle cx={0} cy={-4} r={0.9} fill="#b88a5e" />
      <circle cx={4} cy={-3.2} r={0.9} fill="#b88a5e" />
    </g>
  ),
  beanie: () => (
    <>
      <path className="capy-ol" d="M-21 0 C-21 -22 21 -22 21 0Z" fill="#2346a0" />
      <path d="M-17 -6 C-15 -15 -6 -19 2 -18 C-8 -15 -13 -10 -14 -4Z" fill="#4466c2" />
      <rect className="capy-ol" strokeWidth={2.6} x={-23} y={-6} width={46} height={8} rx={4} fill="#ffe45c" />
      <circle className="capy-ol" strokeWidth={2.6} cx={0} cy={-21} r={5} fill="#ffe45c" />
    </>
  ),
  fruit: () => (
    <>
      <circle className="capy-ol" cx={0} cy={-10} r={10} fill="#d8452a" />
      <path d="M7 -17 A10 10 0 0 1 -7 -3 Q3 -6 7 -17Z" fill="#a8321d" />
      <ellipse cx={-3.6} cy={-13.6} rx={2.6} ry={1.6} fill="#ffb4a0" transform="rotate(-40 -3.6 -13.6)" />
      <path className="capy-ol" strokeWidth={2.4} d="M0 -20 Q5 -28 12 -24 Q7 -18 0 -20Z" fill="#3d9a4f" />
    </>
  ),
  bird: () => (
    <>
      <ellipse className="capy-ol" cx={0} cy={-10} rx={13} ry={10} fill="#6fa8dc" />
      <path d="M2 -12 C8 -14 13 -10 12 -4 C8 -6 4 -8 2 -12Z" fill="#4d86bd" />
      <path className="capy-ol" strokeWidth={2} d="M-13 -12 L-20 -10 L-13 -8Z" fill="#f5b02e" />
      <circle cx={-6} cy={-13} r={1.9} fill="#24160e" />
      <ellipse cx={-4} cy={-6} rx={3} ry={1.8} fill="#f29bb2" opacity={0.7} />
    </>
  ),
  flower: () => (
    <g transform="translate(0 -12)">
      {[0, 72, 144, 216, 288].map((angle) => (
        <ellipse key={angle} className="capy-ol" strokeWidth={2.4} cx={0} cy={-7} rx={5} ry={7} fill="#f2a2bd" transform={`rotate(${angle})`} />
      ))}
      <circle className="capy-ol" strokeWidth={2.4} r={4.6} fill="#ffe45c" />
    </g>
  ),
  headphones: () => (
    <>
      <path className="capy-ln" d="M-27 -2 C-27 -34 27 -34 27 -2" stroke="#2346a0" strokeWidth={6} />
      <path className="capy-ln" d="M-27 -2 C-27 -34 27 -34 27 -2" stroke="#4466c2" strokeWidth={2.4} />
      <rect className="capy-ol" x={-33} y={-10} width={11} height={17} rx={5} fill="#2346a0" />
      <rect className="capy-ol" x={22} y={-10} width={11} height={17} rx={5} fill="#2346a0" />
    </>
  ),
  gradcap: () => (
    <>
      <path className="capy-ol" d="M-12 -9 V0 H12 V-9Z" fill="#26385a" />
      <path className="capy-ol" d="M-24 -13 L0 -22 L24 -13 L0 -4Z" fill="#16233a" />
      <path className="capy-ln" d="M0 -13 L16 -10 V0" stroke="#f5b02e" strokeWidth={2.4} />
      <circle className="capy-ol" strokeWidth={2} cx={16} cy={1} r={2.8} fill="#f5b02e" />
    </>
  ),
  crown: () => (
    <>
      <path className="capy-ol" d="M-19 0 L-21 -18 L-10 -9 L0 -22 L10 -9 L21 -18 L19 0Z" fill="#f5c542" />
      <path d="M-16 -4 L-17 -13 L-10 -7Z" fill="#ffe08a" />
      <circle className="capy-ol" strokeWidth={2} cx={0} cy={-6} r={3} fill="#d8452a" />
      <circle className="capy-ol" strokeWidth={1.8} cx={-10} cy={-4} r={2.2} fill="#4466c2" />
      <circle className="capy-ol" strokeWidth={1.8} cx={10} cy={-4} r={2.2} fill="#3d9a4f" />
    </>
  ),
};

interface CapybaraProps {
  stage: CompanionStage;
  mood: CompanionMood;
  item: HeadItem | null;
  className?: string;
  /** 放在演算法樹裡時用樹的地面，不畫自己的 */
  ground?: boolean;
  /** 放在別的 SVG 裡面（例如演算法樹）時的位置和大小 */
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}

/** 整隻卡皮巴拉；裝飾用，說明文字放在旁邊 */
export function Capybara({ stage, mood, item, className = 'capybara', ground = true, ...place }: CapybaraProps) {
  // 同一頁可能有好幾隻（今天卡、進度頁），clipPath 的 id 不能重複
  const clip = useId().replace(/[^\w-]/g, '');
  const itemY = ITEM_AT[stage];
  return (
    <svg className={className} viewBox="0 -14 120 134" aria-hidden data-stage={stage} data-mood={mood} data-item={item ?? undefined} {...place}>
      {ground && <ellipse className="algo-ground" cx={60} cy={114} rx={stage === 'baby' ? 36 : 46} ry={5} />}
      {stage === 'baby' ? (
        <Baby mood={mood} clip={`capy-${clip}`} />
      ) : (
        <g transform={stage === 'young' ? 'translate(60 113) scale(0.86) translate(-60 -113)' : undefined}>
          <Grown mood={mood} clip={`capy-${clip}`} />
        </g>
      )}
      {item && <g transform={`translate(${item === 'bird' ? 64 : 60} ${itemY})`}>{ITEMS[item]()}</g>}
      {mood === 'sleepy' && <path className="capy-z" d={stage === 'baby' ? 'M98 36 H106 L98 44 H106' : 'M98 16 H106 L98 24 H106'} />}
    </svg>
  );
}

/** 一個頭上的道具（收藏冊、慶祝訊息用）；還沒收集到的畫成藍圖的剪影 */
export function HeadItemIcon({ item, locked = false, className = 'head-item' }: { item: HeadItem; locked?: boolean; className?: string }) {
  const filter = `blueprint-${useId().replace(/[^\w-]/g, '')}`;
  return (
    <svg className={className} viewBox="-34 -36 68 46" aria-hidden data-item={item} data-locked={locked || undefined}>
      {locked && (
        <filter id={filter}>
          <feColorMatrix type="matrix" values="0 0 0 0 0.62  0 0 0 0 0.70  0 0 0 0 0.86  0 0 0 0.55 0" />
        </filter>
      )}
      <g filter={locked ? `url(#${filter})` : undefined}>{ITEMS[item]()}</g>
    </svg>
  );
}
