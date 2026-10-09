import {
  arrowPoints,
  rangeRect,
  CELL,
  contentBounds,
  CYCLE_H,
  INDEX_H,
  isIndexed,
  LABEL_H,
  LINK_GAP,
  linksOf,
  pointsDown,
  TREE_D,
  treeLayout,
  treeParent,
  LIST_NODE_H,
  LIST_NODE_W,
  NODE_D,
  pointerPosition,
  pointerTone,
  POINTER_H,
  POINTER_W,
  ROW_INDEX_W,
  WIDE_CELL,
  type BoardColor,
  type BoardDoc,
  type CellColor,
  type ElementOf,
  type Placed,
  type PointerTone,
  type Sizes,
} from './model';

// 把白板畫成一張 SVG，再由畫面轉成 PNG 下載。
// 不截圖畫面，而是照著資料重畫：版面和畫面上一樣，背景一律是白底淺色，貼到哪裡都清楚。

/** 量文字寬度；瀏覽器裡用 canvas 量，測試裡用估計值 */
export type Measure = (text: string, font: string) => number;

export interface ExportOptions {
  measure: Measure;
  /** 佇列頭尾的文字，跟著介面語言 */
  front: string;
  back: string;
  padding?: number;
}

const INK = '#16233a';
const INK_2 = '#47556d';
const INK_3 = '#6f7c91';
const SHEET = '#ffffff';
const SHEET_2 = '#f3f5f8';
const RULE = '#d6dde7';
const MARKER = '#ffe45c';
const GOOD = '#1d7350';

const STROKE_COLORS: Record<BoardColor, string> = {
  ink: INK,
  red: '#c62828',
  blue: '#1d4ed8',
  green: '#15803d',
  orange: '#c2410c',
};

const CELL_FILLS: Record<CellColor, string> = {
  yellow: '#fff1a8',
  green: '#cdeedb',
  blue: '#d6e3ff',
  red: '#fcdcd8',
  purple: '#e8dcfb',
  gray: '#e3e7ed',
};

const POINTER_COLORS: Record<PointerTone, [string, string]> = {
  blue: ['#1d4ed8', '#d6e3ff'],
  orange: ['#c2410c', '#ffe4d1'],
  green: ['#15803d', '#cdeedb'],
  purple: ['#7c3aed', '#e8dcfb'],
};

const SANS = "system-ui, -apple-system, 'Segoe UI', 'PingFang TC', 'Microsoft JhengHei', sans-serif";
const MONO = "ui-monospace, 'Cascadia Code', Consolas, monospace";

export function escapeXml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

interface TextStyle {
  size: number;
  mono?: boolean;
  bold?: boolean;
  color?: string;
  anchor?: 'start' | 'middle';
}

function text(x: number, y: number, value: string, style: TextStyle): string {
  const family = style.mono ? MONO : SANS;
  return `<text x="${x}" y="${y}" font-family="${escapeXml(family)}" font-size="${style.size}"${style.bold ? ' font-weight="700"' : ''} fill="${style.color ?? INK}"${
    style.anchor === 'middle' ? ' text-anchor="middle"' : ''
  } dominant-baseline="middle">${escapeXml(value)}</text>`;
}

function rect(x: number, y: number, w: number, h: number, fill: string, stroke?: string, extra = ''): string {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}"${stroke ? ` stroke="${stroke}"` : ''}${extra}/>`;
}

/** 格子裡放不下時截斷，跟畫面上的省略號一樣 */
function fit(value: string, width: number, font: string, measure: Measure): string {
  if (measure(value, font) <= width) return value;
  let cut = value;
  while (cut.length > 1 && measure(`${cut}…`, font) > width) cut = cut.slice(0, -1);
  return `${cut}…`;
}

/** 依寬度換行：英文以單字為單位；比一行還寬的單字和中文逐字換行 */
export function wrapText(value: string, width: number, font: string, measure: Measure): string[] {
  const lines: string[] = [];
  for (const paragraph of value.split('\n')) {
    let line = '';
    const push = () => {
      lines.push(line.trimEnd());
      line = '';
    };
    for (const token of paragraph.match(/\S+\s*|\s+/g) ?? []) {
      if (measure(line + token, font) <= width) {
        line += token;
      } else if (line.trim() && measure(token.trimEnd(), font) <= width) {
        push();
        line = token;
      } else {
        for (const ch of token) {
          if (line && measure(line + ch, font) > width) push();
          line += ch;
        }
      }
    }
    lines.push(line.trimEnd());
  }
  return lines;
}

function cellText(value: string, cx: number, cy: number, width: number, measure: Measure): string {
  const font = `15px ${MONO}`;
  return text(cx, cy, fit(value, width - 6, font, measure), { size: 15, mono: true, anchor: 'middle' });
}

function label(value: string, x: number, y: number): string {
  return value ? text(x, y + LABEL_H / 2, value, { size: 13, mono: true, bold: true, color: INK_2 }) : '';
}

/** 鏈結串列：節點之間依方向畫箭頭，斷開的畫 ×，尾巴接 null 或接回某個節點 */
function drawLinked(el: ElementOf<'list'>, options: ExportOptions): string {
  const parts = [label(el.label, el.x, el.y)];
  const n = el.items.length;
  const links = linksOf(el);
  const step = CELL + LINK_GAP;
  const top = el.y + LABEL_H;
  const mid = top + CELL / 2;
  const line = (d: string) => `<path d="${d}" fill="none" stroke="${INK_2}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`;
  const arrow = (x0: number, x1: number) => {
    const dir = Math.sign(x1 - x0);
    return line(`M${x0} ${mid}H${x1}M${x1 - dir * 6} ${mid - 5}L${x1} ${mid}L${x1 - dir * 6} ${mid + 5}`);
  };
  el.items.forEach((value, i) => {
    const x = el.x + i * step;
    const fill = el.colors?.[i] ? CELL_FILLS[el.colors[i]!] : SHEET;
    parts.push(rect(x, top, CELL, CELL, fill, INK_2, ' stroke-width="2" rx="8"'), cellText(value, x + CELL / 2, mid, CELL, options.measure));
    if (i === n - 1) return;
    const gapStart = x + CELL;
    if (links[i] === 'next') parts.push(arrow(gapStart + 3, gapStart + LINK_GAP - 3));
    else if (links[i] === 'prev') parts.push(arrow(gapStart + LINK_GAP - 3, gapStart + 3));
    else {
      const cx = gapStart + LINK_GAP / 2;
      parts.push(`<path d="M${cx - 4} ${mid - 4}l8 8m0-8l-8 8" stroke="${STROKE_COLORS.red}" stroke-width="2" stroke-linecap="round"/>`);
    }
  });
  const tailX = el.x + (n - 1) * step + CELL;
  if (el.cycle === undefined) {
    if (n === 1 || links[n - 2] !== 'prev') {
      parts.push(arrow(tailX + 3, tailX + LINK_GAP - 3), text(tailX + LINK_GAP + 2, mid, 'null', { size: 13, mono: true, color: INK_3 }));
    }
  } else {
    const bottom = top + CELL + CYCLE_H - 6;
    const self = el.cycle === n - 1 ? 8 : 0;
    const from = el.x + (n - 1) * step + CELL / 2 + self;
    const to = el.x + el.cycle * step + CELL / 2 - self;
    parts.push(line(`M${from} ${top + CELL + 1}V${bottom}H${to}V${top + CELL + 3}M${to - 5} ${top + CELL + 8}L${to} ${top + CELL + 2}L${to + 5} ${top + CELL + 8}`));
  }
  return parts.join('');
}

/** 二元樹：先畫連線，再畫圓形的節點 */
function drawTree(el: ElementOf<'tree'>, options: ExportOptions): string {
  const parts = [label(el.label, el.x, el.y)];
  const { centers } = treeLayout(el);
  const r = TREE_D / 2;
  for (const [i, c] of centers) {
    const p = centers.get(treeParent(i));
    if (!p) continue;
    const d = Math.hypot(c.x - p.x, c.y - p.y) || 1;
    const ux = (c.x - p.x) / d;
    const uy = (c.y - p.y) / d;
    parts.push(
      `<line x1="${el.x + p.x + ux * r}" y1="${el.y + p.y + uy * r}" x2="${el.x + c.x - ux * r}" y2="${el.y + c.y - uy * r}" stroke="${INK_2}" stroke-width="2"/>`,
    );
  }
  for (const [i, c] of centers) {
    const fill = el.colors?.[i] ? CELL_FILLS[el.colors[i]!] : SHEET;
    parts.push(
      `<circle cx="${el.x + c.x}" cy="${el.y + c.y}" r="${r - 1}" fill="${fill}" stroke="${INK_2}" stroke-width="2"/>`,
      cellText(el.nodes[i] ?? '', el.x + c.x, el.y + c.y, TREE_D, options.measure),
    );
  }
  return parts.join('');
}

function drawList(el: ElementOf<'list'>, options: ExportOptions): string {
  if (el.variant === 'linked') return drawLinked(el, options);
  const parts = [label(el.label, el.x, el.y)];
  const n = el.items.length;
  const fill = (i: number) => (el.colors?.[i] ? CELL_FILLS[el.colors[i]!] : SHEET);
  if (el.variant === 'stack') {
    // 最上面是最後放進去的，最下面加粗當底座
    el.items.forEach((value, i) => {
      const y = el.y + LABEL_H + (n - 1 - i) * CELL;
      parts.push(rect(el.x, y, CELL, CELL, fill(i), INK_3), cellText(value, el.x + CELL / 2, y + CELL / 2, CELL, options.measure));
    });
    const base = el.y + LABEL_H + n * CELL;
    parts.push(`<line x1="${el.x}" y1="${base}" x2="${el.x + CELL}" y2="${base}" stroke="${INK_2}" stroke-width="3"/>`);
    return parts.join('');
  }
  el.items.forEach((value, i) => {
    const x = el.x + i * CELL;
    const y = el.y + LABEL_H;
    const box =
      el.variant === 'set'
        ? rect(x + 3, y + 3, CELL - 6, CELL - 6, fill(i), INK_3, ` rx="${(CELL - 6) / 2}"`)
        : rect(x, y, CELL, CELL, fill(i), INK_3);
    parts.push(box, cellText(value, x + CELL / 2, y + CELL / 2, CELL, options.measure));
    if (isIndexed(el)) {
      const index = el.variant === 'queue' ? (i === 0 ? options.front : i === n - 1 ? options.back : '') : String(i);
      parts.push(text(x + CELL / 2, y + CELL + INDEX_H / 2, index, { size: 11, mono: true, color: INK_3, anchor: 'middle' }));
    }
  });
  return parts.join('');
}

function drawTable(el: ElementOf<'table'>, options: ExportOptions): string {
  const parts = [label(el.label, el.x, el.y)];
  const cols = Math.max(1, ...el.rows.map((r) => r.length));
  const grid = el.variant === 'grid';
  const cellW = grid ? CELL : WIDE_CELL;
  const left = el.x + (grid ? ROW_INDEX_W : 0);
  const top = el.y + LABEL_H + (grid ? INDEX_H : 0);
  if (grid) {
    for (let c = 0; c < cols; c += 1) {
      parts.push(text(left + c * cellW + cellW / 2, el.y + LABEL_H + INDEX_H / 2, String(c), { size: 11, mono: true, color: INK_3, anchor: 'middle' }));
    }
  }
  el.rows.forEach((row, r) => {
    const y = top + r * CELL;
    if (grid) parts.push(text(el.x + ROW_INDEX_W / 2, y + CELL / 2, String(r), { size: 11, mono: true, color: INK_3, anchor: 'middle' }));
    for (let c = 0; c < cols; c += 1) {
      const header = (el.variant === 'table' && r === 0) || (el.variant === 'dict' && c === 0);
      const x = left + c * cellW;
      parts.push(rect(x, y, cellW, CELL, header ? SHEET_2 : SHEET, INK_3), cellText(row[c] ?? '', x + cellW / 2, y + CELL / 2, cellW, options.measure));
    }
  });
  return parts.join('');
}

function drawNode(el: ElementOf<'node'>, options: ExportOptions): string {
  if (el.variant === 'list') {
    const valueW = LIST_NODE_W - 24;
    return [
      rect(el.x, el.y, valueW, LIST_NODE_H, SHEET, INK_2, ' stroke-width="2" rx="4"'),
      rect(el.x + valueW, el.y, 24, LIST_NODE_H, SHEET_2, INK_2, ' stroke-width="2" rx="4"'),
      `<circle cx="${el.x + valueW + 12}" cy="${el.y + LIST_NODE_H / 2}" r="3" fill="${INK_2}"/>`,
      cellText(el.value, el.x + valueW / 2, el.y + LIST_NODE_H / 2, valueW, options.measure),
    ].join('');
  }
  const r = NODE_D / 2;
  return [
    `<circle cx="${el.x + r}" cy="${el.y + r}" r="${r - 1}" fill="${SHEET}" stroke="${el.variant === 'graph' ? GOOD : INK_2}" stroke-width="2"/>`,
    cellText(el.value, el.x + r, el.y + r, NODE_D, options.measure),
  ].join('');
}

function drawPointer(doc: BoardDoc, el: ElementOf<'pointer'>, options: ExportOptions): string {
  const { x, y } = pointerPosition(doc, el);
  const [strong, soft] = POINTER_COLORS[pointerTone(el.name)];
  const font = `bold 13px ${MONO}`;
  const w = Math.max(30, options.measure(el.name, font) + 16);
  const cx = x + POINTER_W / 2;
  if (pointsDown(doc, el)) {
    // 二元樹上的指標：名牌在上、箭頭朝下指著節點
    const tip = y + POINTER_H - 0.5;
    return [
      rect(cx - w / 2, y, w, 22, soft, strong, ' stroke-width="1.5" rx="11"'),
      text(cx, y + 11, el.name, { size: 13, mono: true, bold: true, color: strong, anchor: 'middle' }),
      `<path d="M${cx} ${tip}L${cx + 4.5} ${tip - 5.5}H${cx + 1.25}V${tip - 11.5}H${cx - 1.25}V${tip - 5.5}H${cx - 4.5}Z" fill="${strong}"/>`,
    ].join('');
  }
  return [
    `<path d="M${cx} ${y + 0.5}L${cx + 4.5} ${y + 6}H${cx + 1.25}V${y + 12}H${cx - 1.25}V${y + 6}H${cx - 4.5}Z" fill="${strong}"/>`,
    rect(cx - w / 2, y + 12, w, 22, soft, strong, ' stroke-width="1.5" rx="11"'),
    text(cx, y + 23, el.name, { size: 13, mono: true, bold: true, color: strong, anchor: 'middle' }),
  ].join('');
}

function drawVar(el: ElementOf<'var'>, sizes: Sizes | undefined, options: ExportOptions): string {
  const font = `15px ${MONO}`;
  const content = `${el.name} = ${el.value}`;
  const w = sizes?.get(el.id)?.w ?? options.measure(content, font) + 24;
  return [rect(el.x, el.y, w, 36, SHEET, INK_3, ' rx="18"'), text(el.x + 12, el.y + 18, content, { size: 15, mono: true })].join('');
}

const TEXT_STYLES: Record<ElementOf<'text'>['variant'], { size: number; line: number; pad: number; mono?: boolean; bold?: boolean }> = {
  heading: { size: 22, line: 1.3, pad: 0, bold: true },
  text: { size: 15, line: 1.5, pad: 0 },
  code: { size: 13, line: 1.55, pad: 12, mono: true },
  sticky: { size: 15, line: 1.5, pad: 12 },
};

function drawText(el: ElementOf<'text'>, sizes: Sizes | undefined, options: ExportOptions): string {
  const style = TEXT_STYLES[el.variant];
  const font = `${style.bold ? 'bold ' : ''}${style.size}px ${style.mono ? MONO : SANS}`;
  const lines = wrapText(el.text, el.w - style.pad * 2, font, options.measure);
  const lineH = style.size * style.line;
  const h = Math.max(sizes?.get(el.id)?.h ?? 0, lines.length * lineH + style.pad * 2);
  const parts: string[] = [];
  if (el.variant === 'sticky') parts.push(rect(el.x, el.y, el.w, h, MARKER));
  if (el.variant === 'code') parts.push(rect(el.x, el.y, el.w, h, SHEET_2, RULE, ' rx="4"'));
  lines.forEach((line, i) => {
    parts.push(text(el.x + style.pad, el.y + style.pad + lineH * i + lineH / 2, line, { size: style.size, mono: style.mono, bold: style.bold }));
  });
  return parts.join('');
}

function drawShape(el: ElementOf<'shape'>): string {
  const stroke = STROKE_COLORS[el.color];
  if (el.variant === 'rect') return rect(el.x + 1, el.y + 1, el.w - 2, el.h - 2, 'none', stroke, ' stroke-width="2.5" rx="8"');
  return `<ellipse cx="${el.x + el.w / 2}" cy="${el.y + el.h / 2}" rx="${el.w / 2 - 1}" ry="${el.h / 2 - 1}" fill="none" stroke="${stroke}" stroke-width="2.5"/>`;
}

function drawPlaced(doc: BoardDoc, el: Placed, sizes: Sizes | undefined, options: ExportOptions): string {
  switch (el.type) {
    case 'list':
      return drawList(el, options);
    case 'table':
      return drawTable(el, options);
    case 'node':
      return drawNode(el, options);
    case 'tree':
      return drawTree(el, options);
    case 'pointer':
      return drawPointer(doc, el, options);
    case 'var':
      return drawVar(el, sizes, options);
    case 'text':
      return drawText(el, sizes, options);
    case 'shape':
      return drawShape(el);
  }
}

export interface ExportedSvg {
  svg: string;
  width: number;
  height: number;
}

/** 整張白板（或播放中的那一步）畫成 SVG；白板是空的時回傳 null */
export function boardToSvg(doc: BoardDoc, sizes: Sizes | undefined, options: ExportOptions): ExportedSvg | null {
  const bounds = contentBounds(doc, sizes);
  if (!bounds) return null;
  const pad = options.padding ?? 32;
  const width = Math.ceil(bounds.w + pad * 2);
  const height = Math.ceil(bounds.h + pad * 2);
  const markers = (Object.keys(STROKE_COLORS) as BoardColor[])
    .map(
      (c) =>
        `<marker id="head-${c}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="${STROKE_COLORS[c]}"/></marker>`,
    )
    .join('');

  const body: string[] = [];
  // 跟畫面一樣：元件在下、框框在上，箭頭和筆跡最上面
  const placed = doc.elements.filter((el): el is Placed => el.type !== 'arrow' && el.type !== 'stroke');
  for (const el of [...placed.filter((p) => p.type !== 'shape'), ...placed.filter((p) => p.type === 'shape')]) {
    body.push(drawPlaced(doc, el, sizes, options));
  }
  for (const el of doc.elements) {
    if (el.type === 'stroke') {
      const pts = el.points;
      let d = `M${pts[0]} ${pts[1]}`;
      for (let i = 2; i + 1 < pts.length; i += 2) d += `L${pts[i]} ${pts[i + 1]}`;
      body.push(`<path d="${d}" fill="none" stroke="${STROKE_COLORS[el.color]}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>`);
    } else if (el.type === 'range') {
      const r = rangeRect(doc, el);
      if (r) body.push(rect(r.x, r.y, r.w, r.h, 'none', STROKE_COLORS[el.color], ' stroke-width="2.5" rx="8"'));
    } else if (el.type === 'arrow') {
      const ends = arrowPoints(doc, el, sizes);
      if (!ends) continue;
      const head = el.head === 'none' ? '' : ` marker-end="url(#head-${el.color})"`;
      body.push(`<line x1="${ends[0].x}" y1="${ends[0].y}" x2="${ends[1].x}" y2="${ends[1].y}" stroke="${STROKE_COLORS[el.color]}" stroke-width="2"${head}/>`);
    }
  }

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${bounds.x - pad} ${bounds.y - pad} ${width} ${height}">` +
    `<defs>${markers}</defs>` +
    rect(bounds.x - pad, bounds.y - pad, width, height, SHEET) +
    body.join('') +
    `</svg>`;
  return { svg, width, height };
}

/** 估計文字寬度：中日韓字元算一個字高，其他算 0.6 個；測試和量不到時用 */
export const estimateWidth: Measure = (value, font) => {
  const size = Number(/(\d+(?:\.\d+)?)px/.exec(font)?.[1] ?? 15);
  let width = 0;
  for (const ch of value) width += ch.charCodeAt(0) > 0x2e80 ? size : size * 0.6;
  return width;
};

