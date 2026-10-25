import { useId, type ReactNode } from 'react';
import type { CompanionPose, CompanionStage, HeadItem } from '../lib/companion';

// 陪刷題的卡皮巴拉（正面）：頭和身體是同一塊、沒有脖子，粗的深色外框；臉頰和身體兩邊有幾撮毛。
// 鼻子是臉中間那一大塊（裡面有兩個鼻孔和微笑），兩隻小手抱在肚子前面。
// 還沒練習的日子在打瞌睡（閉眼、旁邊有 z），練習了就很開心（瞇眼笑）。
// 寶寶、小時候、長大是同一個畫法，越小縮得越小。
// 頭上可以戴收集到的道具。身體的顏色是 CSS 變數（--capy-*），道具的顏色是固定的。

export type CompanionMood = 'sleepy' | 'happy';

/** 輪廓：頭頂圓圓的，臉頰最寬、有兩撮毛，腰稍微收一點，身體兩邊各一撮毛 */
const BODY =
  'M60 26 C82 26 97 38 101 54 L106 57 L102 60 L107 64 L102 67 C104 74 101 79 97 82 L101 86 L98 88 ' +
  'C101 96 102 103 100 108 C97 113 88 115 76 115 H44 C32 115 23 113 20 108 C18 103 19 96 22 88 ' +
  'L19 86 L23 82 C19 79 16 74 18 67 L13 64 L18 60 L14 57 L19 54 C23 38 38 26 60 26Z';

/** 各階段縮多小（以腳底為中心） */
const SCALE: Record<CompanionStage, number> = { baby: 0.8, young: 0.9, grown: 1 };
const FEET = 115;

function Body({ mood, clip }: { mood: CompanionMood; clip: string }) {
  return (
    <>
      {/* 耳朵在頭的後面：外圈是毛的顏色，裡面一圈粉粉的，再裡面是耳洞 */}
      {[31, 89].map((x) => (
        <g key={x}>
          <circle className="capy-ear capy-ol" cx={x} cy={29} r={10} />
          <circle className="capy-ear-in" cx={x + (x < 60 ? 0.8 : -0.8)} cy={27.5} r={6} />
          <circle className="capy-ear-hole" cx={x + (x < 60 ? 1.6 : -1.6)} cy={28} r={2.6} />
        </g>
      ))}
      <clipPath id={clip}>
        <path d={BODY} />
      </clipPath>
      <path className="capy-fur" d={BODY} />
      <g clipPath={`url(#${clip})`}>
        <path className="capy-shade" d="M106 50 C104 84 96 106 66 118 H112 V50Z" />
        <path className="capy-light" d="M24 54 C27 40 40 31 56 30 C43 35 33 43 29 56Z" />
      </g>
      <path className="capy-ol" fill="none" d={BODY} />
      <path
        className="capy-ln"
        strokeWidth={3.4}
        d={mood === 'happy' ? 'M38 58 Q43.5 52.5 49 58 M71 58 Q76.5 52.5 82 58' : 'M38 56 Q43.5 60 49 56 M71 56 Q76.5 60 82 56'}
      />
      <ellipse className="capy-blush" cx={29} cy={70} rx={7} ry={4.5} />
      <ellipse className="capy-blush" cx={91} cy={70} rx={7} ry={4.5} />
      {/* 鼻子那一大塊：兩個鼻孔、一個微笑 */}
      <rect className="capy-snout" x={42} y={60} width={36} height={30} rx={14} />
      <ellipse className="capy-nostril" cx={53} cy={68} rx={2.8} ry={2.2} />
      <ellipse className="capy-nostril" cx={67} cy={68} rx={2.8} ry={2.2} />
      <path className="capy-ln" strokeWidth={2.8} d="M54 77 Q60 83 66 77" />
      {/* 兩隻小手抱在肚子前面 */}
      <path className="capy-ln" strokeWidth={2.6} d="M33 90 Q41 99 48 98 M87 90 Q79 99 72 98" />
      <ellipse className="capy-fur capy-ol" strokeWidth={2.4} cx={51} cy={97} rx={6} ry={4.6} />
      <ellipse className="capy-fur capy-ol" strokeWidth={2.4} cx={69} cy={97} rx={6} ry={4.6} />
      <path className="capy-ln" strokeWidth={1.6} d="M50 94.5 V97.5 M53 94.5 V97.5 M67 94.5 V97.5 M70 94.5 V97.5" />
      {/* 腳，上面有腳趾的線 */}
      <ellipse className="capy-snout capy-ol" cx={44} cy={112} rx={10} ry={6.5} />
      <ellipse className="capy-snout capy-ol" cx={76} cy={112} rx={10} ry={6.5} />
      <path className="capy-ln" strokeWidth={1.8} d="M41 109.5 V113.5 M46 109.5 V113.5 M74 109.5 V113.5 M79 109.5 V113.5" />
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

/**
 * 今天卡上的樣子（座標跟身體一樣，跟著階段一起縮放）：
 * 躺在床上、用電腦、喝珍奶、泡溫泉。back 畫在身體後面，front 畫在前面
 */
const POSE_ART: Record<CompanionPose, { back?: () => ReactNode; front: (item: HeadItem | null) => ReactNode }> = {
  bed: {
    // 枕頭墊在頭後面，四個角翹起來
    back: () => (
      <>
        <path className="capy-ol" d="M8 6 Q60 14 112 6 Q105 40 112 74 Q60 67 8 74 Q15 40 8 6Z" fill="#fbf6ee" />
        <path className="capy-ln" d="M15 12 Q19 15 20 21 M105 12 Q101 15 100 21" stroke="#d9cfc0" strokeWidth={2} />
      </>
    ),
    front: () => (
      <>
        {/* 被子，上緣反摺一段白色的被單 */}
        <path className="capy-ol" d="M2 84 C30 78 90 78 118 84 V112 Q118 117 113 117 H7 Q2 117 2 112Z" fill="#c9d6f5" />
        <path className="capy-ol" d="M2 84 C30 78 90 78 118 84 V93 C90 87 30 87 2 93Z" fill="#fbf6ee" />
        {[22, 44, 66, 88].map((x) => (
          <circle key={x} cx={x + 6} cy={105} r={2.2} fill="#9fb2dc" />
        ))}
        {/* 兩隻手抓著被子 */}
        <ellipse className="capy-fur capy-ol" strokeWidth={2.4} cx={44} cy={83} rx={6} ry={4.6} />
        <ellipse className="capy-fur capy-ol" strokeWidth={2.4} cx={76} cy={83} rx={6} ry={4.6} />
      </>
    ),
  },
  laptop: {
    front: () => (
      <>
        {/* 筆電的背面朝外，上面是小芽的 logo */}
        <rect className="capy-ol" x={24} y={76} width={72} height={38} rx={5} fill="#2346a0" />
        <rect x={28} y={80} width={8} height={30} rx={3} fill="#4466c2" />
        <path className="capy-ln" d="M60 101 Q60.6 97 60 93" stroke="#a6d156" strokeWidth={2} />
        <path d="M60 95 Q55 89 50 92 Q54 96 60 95Z" fill="#63c46a" />
        <path d="M60 93 Q65 86 70 89 Q66 94 60 93Z" fill="#a6d156" />
        <rect className="capy-ol" x={18} y={112} width={84} height={5} rx={2.5} fill="#c7cfdc" />
        {/* 兩隻手放在螢幕上緣 */}
        <ellipse className="capy-fur capy-ol" strokeWidth={2.4} cx={34} cy={76} rx={6} ry={4.6} />
        <ellipse className="capy-fur capy-ol" strokeWidth={2.4} cx={86} cy={76} rx={6} ry={4.6} />
      </>
    ),
  },
  boba: {
    front: () => (
      <>
        {/* 吸管一路通到嘴巴 */}
        <path className="capy-ln" d="M63 87 L61 79" stroke="#f29bb2" strokeWidth={4} />
        <path className="capy-ol" d="M48 89 H72 L69 113 Q60 116 51 113Z" fill="#d9b48a" />
        <path d="M49 94 H71 L70.4 99 H49.6Z" fill="#e8cfae" />
        {[
          [54, 108],
          [59, 110],
          [64, 108.5],
          [56.5, 104],
          [62, 104.5],
          [67, 104],
        ].map(([x, y]) => (
          <circle key={`${x} ${y}`} cx={x} cy={y} r={2.2} fill="#3d2414" />
        ))}
        <rect className="capy-ol" strokeWidth={2.4} x={46} y={85} width={28} height={6} rx={3} fill="#f7f2ea" />
        {/* 兩隻手捧著杯子 */}
        <ellipse className="capy-fur capy-ol" strokeWidth={2.4} cx={46} cy={102} rx={6} ry={4.8} />
        <ellipse className="capy-fur capy-ol" strokeWidth={2.4} cx={74} cy={102} rx={6} ry={4.8} />
      </>
    ),
  },
  onsen: {
    // 頭兩邊冒著熱氣
    back: () => (
      <path
        className="capy-ln"
        d="M12 44 q-5 -6 0 -12 q5 -6 0 -12 M108 44 q5 -6 0 -12 q-5 -6 0 -12"
        stroke="#c9d1dc"
        strokeWidth={3}
      />
    ),
    front: (item) => (
      <>
        <ellipse cx={60} cy={94} rx={57} ry={9} fill="#9ecbe8" />
        <path className="capy-ln" d="M20 92 Q30 90 40 92 M78 95 Q88 93 98 95" stroke="#d6ecf9" strokeWidth={2.4} />
        {/* 水上漂著一顆柚子 */}
        <circle className="capy-ol" strokeWidth={2.4} cx={94} cy={92} r={6} fill="#f5b02e" />
        <path className="capy-ol" strokeWidth={2} d="M94 86 Q97 81 101 83 Q98 87 94 86Z" fill="#3d9a4f" />
        {/* 木桶 */}
        <path className="capy-ol" d="M3 94 Q60 106 117 94 V113 Q60 126 3 113Z" fill="#c48d57" />
        <path className="capy-ln" d="M22 99 V117 M41 102 V120 M60 103 V121 M79 102 V120 M98 99 V117" stroke="#8a5a30" strokeWidth={2} />
        <path className="capy-ln" d="M4 104 Q60 117 116 104" stroke="#7a5434" strokeWidth={3} />
        {/* 沒戴東西的時候頭上放一條小毛巾 */}
        {!item && <rect className="capy-ol" strokeWidth={2.4} x={45} y={20} width={30} height={9} rx={3} fill="#f7f2ea" />}
      </>
    ),
  },
};

interface CapybaraProps {
  stage: CompanionStage;
  mood: CompanionMood;
  item: HeadItem | null;
  /** 今天卡上的樣子；沒給就是坐著 */
  pose?: CompanionPose;
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
export function Capybara({ stage, mood, item, pose, className = 'capybara', ground = true, ...place }: CapybaraProps) {
  // 同一頁可能有好幾隻（今天卡、進度頁），clipPath 的 id 不能重複
  const clip = useId().replace(/[^\w-]/g, '');
  const scale = SCALE[stage];
  // 縮小之後頭頂的高度：道具放在那裡，打瞌睡的 z 放在頭頂右邊
  const top = FEET - (FEET - 28) * scale;
  return (
    <svg
      className={className}
      viewBox="0 -14 120 134"
      aria-hidden
      data-stage={stage}
      data-mood={mood}
      data-item={item ?? undefined}
      data-pose={pose}
      {...place}
    >
      {ground && <ellipse className="algo-ground" cx={60} cy={114} rx={40 + 8 * scale} ry={5} />}
      <g transform={scale === 1 ? undefined : `translate(60 ${FEET}) scale(${scale}) translate(-60 -${FEET})`}>
        {pose && POSE_ART[pose].back?.()}
        <Body mood={mood} clip={`capy-${clip}`} />
        {pose && POSE_ART[pose].front(item)}
      </g>
      {item && <g transform={`translate(${item === 'bird' ? 64 : 60} ${top})`}>{ITEMS[item]()}</g>}
      {mood === 'sleepy' && <path className="capy-z" d={`M98 ${top - 12} H106 L98 ${top - 4} H106`} />}
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
