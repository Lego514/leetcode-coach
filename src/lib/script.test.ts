import { describe, expect, it } from 'vitest';
import { joinScript, splitScript } from './script';

describe('explanation script lines', () => {
  it('splits an existing script into five sentences', () => {
    expect(splitScript('')).toEqual(['', '', '', '', '']);
    expect(splitScript('The key insight is X.\n\nSo I use a map.\r\n')).toEqual(['The key insight is X.', 'So I use a map.', '', '', '']);
  });

  it('gives up on scripts longer than five lines', () => {
    expect(splitScript('1\n2\n3\n4\n5\n6')).toBeNull();
  });

  it('joins the sentences back, skipping empty ones', () => {
    expect(joinScript(['  The key insight is X. ', '', 'This takes O(n) time.', '', ''])).toBe('The key insight is X.\nThis takes O(n) time.');
  });
});
