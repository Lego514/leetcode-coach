// 產生 PWA 圖示（3×3 熟練度方格），不需要額外的影像套件。
// 用法：node scripts/generate-icons.mjs
import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const PAPER = [0xf3, 0xf5, 0xf8];
const COLORS = {
  d: [0x23, 0x46, 0xa0],
  m: [0xa9, 0xbd, 0xee],
  l: [0xd9, 0xe2, 0xf6],
  y: [0xff, 0xe4, 0x5c],
};
const GRID = ['dml', 'ldd', 'lym'];

function crc32(buf) {
  let crc = ~0;
  for (const byte of buf) {
    crc ^= byte;
    for (let k = 0; k < 8; k += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return ~crc >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function insideRounded(x, y, left, top, size, radius) {
  const cx = Math.min(Math.max(x, left + radius), left + size - radius);
  const cy = Math.min(Math.max(y, top + radius), top + size - radius);
  return (x - cx) ** 2 + (y - cy) ** 2 <= radius ** 2;
}

/** padding 是方格區域外的留白比例；maskable 圖示需要較大的安全區 */
function render(size, padding) {
  const inner = size * (1 - 2 * padding);
  const gap = inner * 0.08;
  const cell = (inner - 2 * gap) / 3;
  const radius = cell * 0.16;
  const origin = size * padding;
  const rows = [];
  for (let y = 0; y < size; y += 1) {
    const row = Buffer.alloc(1 + size * 3);
    for (let x = 0; x < size; x += 1) {
      let color = PAPER;
      const col = Math.floor((x + 0.5 - origin) / (cell + gap));
      const line = Math.floor((y + 0.5 - origin) / (cell + gap));
      if (col >= 0 && col < 3 && line >= 0 && line < 3) {
        const left = origin + col * (cell + gap);
        const top = origin + line * (cell + gap);
        if (insideRounded(x + 0.5, y + 0.5, left, top, cell, radius)) color = COLORS[GRID[line][col]];
      }
      row.set(color, 1 + x * 3);
    }
    rows.push(row);
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8; // bit depth
  header[9] = 2; // RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(Buffer.concat(rows))),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const outputs = [
  ['public/pwa-192.png', 192, 0.16],
  ['public/pwa-512.png', 512, 0.16],
  ['public/pwa-512-maskable.png', 512, 0.24],
  ['public/apple-touch-icon.png', 180, 0.16],
];

for (const [file, size, padding] of outputs) {
  writeFileSync(file, render(size, padding));
  console.log(`wrote ${file}`);
}
