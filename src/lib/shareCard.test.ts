import { describe, expect, it } from 'vitest';
import { shareCardSvg, SHARE_SIZE } from './shareCard';

describe('share card', () => {
  const input = {
    tree: { markup: '<circle r="2" fill="#000"/>', viewBox: '10 84 400 436' },
    eyebrow: 'LeetCode Coach',
    title: 'My algorithm tree',
    subtitle: 'Oct 22',
    stats: [
      { value: '18', label: 'solvable now' },
      { value: '41', label: 'day streak' },
    ],
    lines: ['This week: 6 days & 3 conquered <wow>'],
    footer: 'example.com',
    colors: { background: '#fff', ink: '#111', muted: '#666', accent: '#24a', rule: '#ddd' },
    font: 'system-ui, sans-serif',
  };

  it('lays out the tree and the numbers on a portrait card', () => {
    const svg = shareCardSvg(input);
    expect(svg.startsWith(`<svg xmlns="http://www.w3.org/2000/svg" width="${SHARE_SIZE.width}" height="${SHARE_SIZE.height}"`)).toBe(true);
    expect(svg).toContain('viewBox="10 84 400 436"');
    expect(svg).toContain('<circle r="2" fill="#000"/>');
    expect(svg).toContain('>18</text>');
    expect(svg).toContain('>day streak</text>');
  });

  it('escapes text so it stays valid SVG', () => {
    const svg = shareCardSvg(input);
    expect(svg).toContain('6 days &amp; 3 conquered &lt;wow&gt;');
    expect(svg).not.toContain('<wow>');
  });
});
