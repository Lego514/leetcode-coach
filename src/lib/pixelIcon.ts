// 深色模式開關上的點點圖示：太陽和月亮都畫在同一張 11×11 的方格上，
// 切換時每一個點從一個圖形飛到另一個圖形的某一格，看起來像散開再聚成另一個形狀。
// 純計算，不含 React：哪些格子亮、點怎麼配對都在這裡，畫面只管照著位置畫。

export const PIXEL_GRID = 11;

export interface Cell {
  x: number;
  y: number;
}

const CENTER = (PIXEL_GRID - 1) / 2;

/** 太陽：中間一個圓，上下左右和四個斜角各一道光芒，光芒和圓之間空一格 */
export function sunCells(): Cell[] {
  const cells: Cell[] = [];
  for (let y = 0; y < PIXEL_GRID; y += 1) {
    for (let x = 0; x < PIXEL_GRID; x += 1) {
      const dx = x - CENTER;
      const dy = y - CENTER;
      const disc = dx * dx + dy * dy <= 5;
      const straight = (dx === 0 || dy === 0) && Math.abs(dx + dy) >= 4;
      const diagonal = Math.abs(dx) === Math.abs(dy) && Math.abs(dx) >= 3 && Math.abs(dx) <= 4;
      if (disc || straight || diagonal) cells.push({ x, y });
    }
  }
  return cells;
}

/** 月亮：大圓挖掉右上角的一個圓成為彎月，右上角留一顆小星星 */
export function moonCells(): Cell[] {
  const cells: Cell[] = [];
  for (let y = 0; y < PIXEL_GRID; y += 1) {
    for (let x = 0; x < PIXEL_GRID; x += 1) {
      const inMoon = (x - 5) ** 2 + (y - 5) ** 2 <= 19;
      const bite = (x - 7.5) ** 2 + (y - 3.2) ** 2 <= 13;
      if (inMoon && !bite) cells.push({ x, y });
    }
  }
  // 小星星：十字形的四個點加中心
  for (const [x, y] of [
    [9, 0],
    [8, 1],
    [9, 1],
    [10, 1],
    [9, 2],
  ]) {
    if (!cells.some((cell) => cell.x === x && cell.y === y)) cells.push({ x, y });
  }
  return cells;
}

/** 固定的亂數（mulberry32）：每次打開 App 點的配對都一樣，畫面才不會每次不同 */
function seeded(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffled<T>(items: readonly T[], random: () => number): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/** 一個點在兩個圖形裡的位置；`shown` 是 false 的那邊，點疊在某一格上、透明 */
export interface PixelDot {
  light: Cell & { shown: boolean };
  dark: Cell & { shown: boolean };
  /** 0 到 1：這個點晚多久出發，點才不會一起移動 */
  lag: number;
}

/**
 * 把太陽的格子和月亮的格子兩兩配對。格子比較少的那個圖形，多出來的點疊在它自己的格子上、淡出，
 * 所以點的數量不會變，切換時只有移動和淡入淡出。配對打亂過，點會交錯飛，像散開再聚起來
 */
export function pixelDots(seed = 7): PixelDot[] {
  const random = seeded(seed);
  const sun = sunCells();
  const moon = shuffled(moonCells(), random);
  const count = Math.max(sun.length, moon.length);
  return Array.from({ length: count }, (_, i) => ({
    light: { ...sun[i % sun.length], shown: i < sun.length },
    dark: { ...moon[i % moon.length], shown: i < moon.length },
    lag: random(),
  }));
}
