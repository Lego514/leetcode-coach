import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { createElement, type FunctionComponent } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import type { Pattern } from '../../src/data/patterns';
import type { PythonTip } from '../../src/data/tips';
import type { Messages } from '../../src/i18n/messages/zh-TW';
import type { CompanionPose, CompanionStage, HeadItem } from '../../src/lib/companion';

// README 的卡皮巴拉動畫（docs/images/capybara-day-{light,dark}.svg）：今天卡上的卡皮巴拉一天裡的四個樣子輪流出現，
// 還沒練習在床上睡、打卡了在用電腦、做完了喝珍奶或泡溫泉。卡皮巴拉、對話框的話和小知識都直接拿 App 的元件和介面文字，
// 顏色從 styles.css 讀，所以 App 改了重跑一次就跟著變，不用另外維護一份圖。
// 用 Vite 載入元件，因為 Playwright 會把 JSX 換成自己的物件（見 AGENTS.md），所以不放在截圖的測試裡。
// 執行：npm run screenshots（最後一步），或 node scripts/screenshots/capybara.ts

const OUT = path.resolve('docs/images');
const WIDTH = 640;
const HEIGHT = 400;
/** 每個樣子停幾秒；換的時候先淡出再淡入（同時淡入淡出的話，兩段字會疊在一起） */
const SECONDS = 3;
const FADE = 0.3;

/** Capybara.tsx 的參數（這裡用到的） */
interface CapybaraProps {
  stage: CompanionStage;
  mood: 'sleepy' | 'happy';
  item: HeadItem | null;
  pose: CompanionPose;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Frame {
  pose: CompanionPose;
  mood: 'sleepy' | 'happy';
  checkedIn: boolean;
  newDone: number;
  say: string;
  tip: { topic: string; text: string };
}

// ---------- 顏色：從 styles.css 讀出卡皮巴拉的規則和這張圖用到的顏色變數 ----------
const css = readFileSync('src/styles.css', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
// 最裡層的「選擇器 { 宣告 }」；@media 裡面的規則也會被拆出來
const blocks = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(([, selector, body]) => ({ selector: selector.trim(), body: body.trim() }));
const USED = /^--(capy-[\w-]+|paper|sheet|sheet-2|rule|rule-strong|ink|ink-2|ink-3|pen|good|ground):/;

function tokens(selector: string): string {
  const block = blocks.find((b) => b.selector === selector);
  if (!block) throw new Error(`styles.css 裡沒有 ${selector}`);
  return block.body
    .split(';')
    .map((d) => d.trim())
    .filter((d) => USED.test(d))
    .join('; ');
}

const THEMES = { light: tokens(':root'), dark: tokens(":root[data-theme='dark']") };
// .capybara 本身的寬高不要：它放在這張圖裡面，大小由座標決定
const capyCss = blocks
  .filter((b) => /^\.(capy-|algo-ground)/.test(b.selector))
  .map((b) => `${b.selector} { ${b.body} }`)
  .join('\n');

// ---------- 文字 ----------
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** 照字數斷行，每行最多 max 個字 */
function greedy(text: string, max: number): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(' ')) {
    if (line && `${line} ${word}`.length > max) {
      lines.push(line);
      line = word;
    } else {
      line = line ? `${line} ${word}` : word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/**
 * SVG 的文字不會自己換行：照字數斷行（大約，留一點餘裕給不同的字型），
 * 行數一樣的話把每行排得平均一點，最後一行才不會只剩一個字
 */
function wrap(text: string, max: number): string[] {
  const lines = greedy(text, max);
  for (let limit = Math.ceil(text.length / lines.length); limit < max; limit++) {
    const balanced = greedy(text, limit);
    if (balanced.length === lines.length) return balanced;
  }
  return lines;
}

const vite = await createServer({ server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom', logLevel: 'error' });
try {
  const { Capybara } = (await vite.ssrLoadModule('/src/components/Capybara.tsx')) as { Capybara: FunctionComponent<CapybaraProps> };
  const m = ((await vite.ssrLoadModule('/src/i18n/messages/en.ts')) as { default: Messages }).default;
  const { PYTHON_TIPS } = (await vite.ssrLoadModule('/src/data/tips.ts')) as { PYTHON_TIPS: PythonTip[] };
  const { getPatterns } = (await vite.ssrLoadModule('/src/data/patterns.ts')) as { getPatterns: (locale: 'en') => Pattern[] };

  const python = (id: string) => {
    const tip = PYTHON_TIPS.find((t) => t.id === id);
    if (!tip) throw new Error(`沒有 ${id} 這則 Python 小知識`);
    return { topic: 'Python', text: tip.why.en };
  };
  const pattern = (id: string) => {
    const p = getPatterns('en').find((x) => x.id === id);
    if (!p) throw new Error(`沒有 ${id} 這個題型`);
    return { topic: p.name, text: p.summary };
  };

  // 一天的順序：還沒練習 → 做了 1 題（今天 3 題新題） → 做完了，喝珍奶或泡溫泉（App 裡一天一種，輪流）
  const frames: Frame[] = [
    { pose: 'bed', mood: 'sleepy', checkedIn: false, newDone: 0, say: m.companion.say.bed[0], tip: python('heap-min') },
    { pose: 'laptop', mood: 'happy', checkedIn: true, newDone: 1, say: m.companion.say.laptop(2), tip: pattern('binary-search') },
    { pose: 'boba', mood: 'happy', checkedIn: true, newDone: 3, say: m.companion.say.boba[0], tip: python('counter-missing') },
    { pose: 'onsen', mood: 'happy', checkedIn: true, newDone: 3, say: m.companion.say.onsen[0], tip: pattern('two-pointers') },
  ];
  const cycle = frames.length * SECONDS;
  const dotX = (i: number) => WIDTH / 2 + (i - (frames.length - 1) / 2) * 22;

  /** 一個樣子：上面的打卡和新題、對話框、卡皮巴拉、下面亮著的點 */
  function frame(f: Frame, i: number): string {
    // 今天卡上的兩個標籤（做完的有勾、綠色）
    const pills = [
      { text: f.checkedIn ? m.motivation.checkedIn : m.motivation.notCheckedIn, done: f.checkedIn },
      { text: m.motivation.newTasks(f.newDone, 3), done: f.newDone >= 3 },
    ];
    let x = 40;
    const pillSvg = pills
      .map(({ text, done }) => {
        const label = done ? `✓ ${text}` : text;
        const w = Math.round(label.length * 7.6 + 28);
        const svg = `<rect class="pill${done ? ' done' : ''}" x="${x + 0.5}" y="40.5" width="${w}" height="30" rx="15"/><text class="pill-text${done ? ' done' : ''}" x="${x + w / 2}" y="60" text-anchor="middle">${esc(label)}</text>`;
        x += w + 8;
        return svg;
      })
      .join('');

    // 對話框：一句話，下面一則小知識（標籤粗體）
    const say = wrap(f.say, 33);
    const label = m.companion.tipLabel(f.tip.topic).trim();
    const tip = wrap(`${label} ${f.tip.text}`, 42);
    const bubble = { x: 40.5, w: 340, pad: 18 };
    const height = bubble.pad + say.length * 24 + 8 + tip.length * 20 + bubble.pad - 4;
    const top = Math.round(200 - height / 2) + 0.5;
    const sayY = top + bubble.pad;
    const tipY = sayY + say.length * 24 + 8;
    const sayText = say.map((line, n) => `<tspan x="${bubble.x + bubble.pad}" y="${sayY + n * 24 + 17}">${esc(line)}</tspan>`).join('');
    const tipText = tip
      .map((line, n) => {
        const y = tipY + n * 20 + 14;
        return n === 0
          ? `<tspan x="${bubble.x + bubble.pad}" y="${y}"><tspan class="tip-label">${esc(label)}</tspan>${esc(line.slice(label.length))}</tspan>`
          : `<tspan x="${bubble.x + bubble.pad}" y="${y}">${esc(line)}</tspan>`;
      })
      .join('');
    // 尾巴指向右邊的卡皮巴拉：先蓋掉那一段框線，再畫兩邊
    const right = bubble.x + bubble.w;
    const mid = top + height / 2;
    const tail = `<path class="bubble-fill" d="M${right - 1} ${mid - 8} L${right + 9} ${mid} L${right - 1} ${mid + 8}Z"/><path class="bubble-edge" d="M${right} ${mid - 8} L${right + 9} ${mid} L${right} ${mid + 8}"/>`;

    // 同一張圖裡有四隻，clipPath 的 id 要分開
    const capybara = renderToStaticMarkup(
      createElement(Capybara, { stage: 'grown', mood: f.mood, item: 'gradcap', pose: f.pose, x: 412, y: 92, width: 190, height: 212 }),
      { identifierPrefix: `f${i}-` },
    );

    return [
      `<g class="frame f${i}">`,
      pillSvg,
      `<rect class="bubble" x="${bubble.x}" y="${top}" width="${bubble.w}" height="${height}" rx="16"/>`,
      tail,
      `<text class="say">${sayText}</text>`,
      `<text class="tip">${tipText}</text>`,
      capybara,
      `<circle class="dot-on" cx="${dotX(i)}" cy="356" r="5"/>`,
      '</g>',
    ].join('\n');
  }

  // 每個樣子占 1/4 的時間：開頭淡入，結尾淡出
  const fade = (FADE / cycle) * 100;
  const end = 100 / frames.length;
  const keyframes = `0% { opacity: 0; } ${fade.toFixed(2)}% { opacity: 1; } ${(end - fade).toFixed(2)}% { opacity: 1; } ${end.toFixed(2)}% { opacity: 0; } 100% { opacity: 0; }`;

  function image(theme: keyof typeof THEMES): string {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" role="img" aria-labelledby="title">
<title id="title">The capybara on the Today card naps until you practice, codes along until today’s goal is done, then drinks bubble tea or soaks in a hot spring.</title>
<style>
svg { ${THEMES[theme]} }
${capyCss}
text { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans', Helvetica, Arial, sans-serif; }
.bg { fill: var(--paper); }
.card { fill: var(--sheet); stroke: var(--rule); }
.pill { fill: none; stroke: var(--rule-strong); }
.pill.done { stroke: var(--good); }
.pill-text { font-size: 14px; fill: var(--ink-2); }
.pill-text.done { fill: var(--good); font-weight: 600; }
.bubble { fill: var(--sheet-2); stroke: var(--rule-strong); }
.bubble-fill { fill: var(--sheet-2); }
.bubble-edge { fill: none; stroke: var(--rule-strong); stroke-linejoin: round; }
.say { font-size: 17px; fill: var(--ink); }
.tip { font-size: 14px; fill: var(--ink-2); }
.tip-label { font-weight: 700; fill: var(--ink); }
.dot { fill: var(--rule-strong); }
.dot-on { fill: var(--pen); }
/* 沒有動畫的時候（不播動畫的地方、不要動畫的人）只看用電腦的那一張 */
.frame { opacity: 0; }
.f1 { opacity: 1; }
.frame { animation: show ${cycle}s infinite; }
/* 往前多播 FADE 秒：一打開第一張就已經看得到，不會先空白 */
${frames.map((_, i) => `.f${i} { animation-delay: ${(i * SECONDS - (i === 0 ? 0 : cycle) - FADE).toFixed(2)}s; }`).join('\n')}
@keyframes show { ${keyframes} }
@media (prefers-reduced-motion: reduce) { .frame { animation: none; } }
</style>
<rect class="bg" width="${WIDTH}" height="${HEIGHT}"/>
<rect class="card" x="16.5" y="16.5" width="${WIDTH - 33}" height="${HEIGHT - 33}" rx="14"/>
${frames.map((_, i) => `<circle class="dot" cx="${dotX(i)}" cy="356" r="5"/>`).join('')}
${frames.map(frame).join('\n')}
</svg>
`;
  }

  mkdirSync(OUT, { recursive: true });
  for (const theme of ['light', 'dark'] as const) {
    writeFileSync(path.join(OUT, `capybara-day-${theme}.svg`), image(theme));
  }
  console.log('docs/images/capybara-day-{light,dark}.svg');
} finally {
  await vite.close();
}
