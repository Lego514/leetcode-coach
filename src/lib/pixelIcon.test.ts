import { describe, expect, it } from 'vitest';
import { moonCells, PIXEL_GRID, pixelDots, sunCells } from './pixelIcon';

const key = (cell: { x: number; y: number }) => `${cell.x},${cell.y}`;

describe('pixel sun and moon', () => {
  it('draws both shapes inside the grid without repeating a cell', () => {
    for (const cells of [sunCells(), moonCells()]) {
      expect(cells.length).toBeGreaterThan(20);
      expect(new Set(cells.map(key)).size).toBe(cells.length);
      for (const { x, y } of cells) {
        expect(x).toBeGreaterThanOrEqual(0);
        expect(y).toBeGreaterThanOrEqual(0);
        expect(x).toBeLessThan(PIXEL_GRID);
        expect(y).toBeLessThan(PIXEL_GRID);
      }
    }
  });

  it('the sun is symmetric and the moon is not', () => {
    const sun = new Set(sunCells().map(key));
    for (const { x, y } of sunCells()) expect(sun.has(`${PIXEL_GRID - 1 - x},${y}`)).toBe(true);
    const moon = new Set(moonCells().map(key));
    expect(moonCells().every(({ x, y }) => moon.has(`${PIXEL_GRID - 1 - x},${y}`))).toBe(false);
  });

  it('pairs every cell of both shapes with a dot', () => {
    const dots = pixelDots();
    expect(dots).toHaveLength(Math.max(sunCells().length, moonCells().length));
    // 每個圖形的每一格都有一個看得見的點，不會缺角
    expect(new Set(dots.filter((dot) => dot.light.shown).map((dot) => key(dot.light)))).toEqual(new Set(sunCells().map(key)));
    expect(new Set(dots.filter((dot) => dot.dark.shown).map((dot) => key(dot.dark)))).toEqual(new Set(moonCells().map(key)));
    for (const dot of dots) {
      expect(dot.lag).toBeGreaterThanOrEqual(0);
      expect(dot.lag).toBeLessThan(1);
    }
  });

  it('pairs the same way every time', () => {
    expect(pixelDots()).toEqual(pixelDots());
    expect(pixelDots(1)).not.toEqual(pixelDots(2));
  });
});
