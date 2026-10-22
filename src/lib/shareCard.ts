// 分享卡片：把演算法樹和這週的數字排成一張 1080×1350 的圖（Instagram、LinkedIn 直式貼文的比例）。
// 這裡只組 SVG 字串，轉成 PNG 在 components/ShareCard.tsx

export const SHARE_SIZE = { width: 1080, height: 1350 };

export interface ShareColors {
  background: string;
  ink: string;
  muted: string;
  accent: string;
  rule: string;
}

export interface ShareCardInput {
  /** 樹的 SVG 內容（不含外層 <svg>）和它的 viewBox */
  tree: { markup: string; viewBox: string };
  eyebrow: string;
  title: string;
  subtitle: string;
  stats: { value: string; label: string }[];
  lines: string[];
  footer: string;
  colors: ShareColors;
  font: string;
}

const escapeXml = (text: string) =>
  text.replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[ch]!);

export function shareCardSvg(input: ShareCardInput): string {
  const { width, height } = SHARE_SIZE;
  const { colors: c } = input;
  const pad = 80;
  const text = (x: number, y: number, size: number, fill: string, body: string, weight = 400, anchor = 'start') =>
    `<text x="${x}" y="${y}" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}">${escapeXml(body)}</text>`;
  const statWidth = (width - pad * 2) / Math.max(1, input.stats.length);
  const stats = input.stats
    .map((s, i) => {
      const x = pad + statWidth * i;
      return text(x, 1010, 76, c.ink, s.value, 700) + text(x, 1056, 28, c.muted, s.label);
    })
    .join('');
  const lines = input.lines.map((line, i) => text(pad, 1140 + i * 46, 32, c.ink, line)).join('');
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" font-family="${escapeXml(input.font)}">`,
    `<rect width="${width}" height="${height}" fill="${c.background}"/>`,
    text(pad, 120, 30, c.accent, input.eyebrow, 700),
    text(pad, 196, 64, c.ink, input.title, 700),
    text(pad, 250, 30, c.muted, input.subtitle),
    `<svg x="${pad}" y="280" width="${width - pad * 2}" height="620" viewBox="${input.tree.viewBox}" preserveAspectRatio="xMidYMid meet">${input.tree.markup}</svg>`,
    `<line x1="${pad}" y1="930" x2="${width - pad}" y2="930" stroke="${c.rule}" stroke-width="2"/>`,
    stats,
    lines,
    text(pad, height - 64, 26, c.muted, input.footer),
    '</svg>',
  ].join('');
}
