import { describe, expect, it } from 'vitest';
import { backspaceEdit, highlightPython, indentEdit, newlineEdit, type CodeEdit } from './code';

const kinds = (line: string) => highlightPython(line).map((token) => [token.kind, token.text]);

function run(value: string, edit: CodeEdit | null): string {
  return edit ? value.slice(0, edit.from) + edit.insert + value.slice(edit.to) : value;
}

describe('Python highlighting', () => {
  it('colors a LeetCode signature like the editor does', () => {
    expect(kinds('    def solve(self, nums: List[int]) -> int:')).toEqual([
      ['plain', '    '],
      ['keyword', 'def'],
      ['plain', ' '],
      ['function', 'solve'],
      ['plain', '('],
      ['self', 'self'],
      ['plain', ', nums: '],
      ['type', 'List'],
      ['plain', '['],
      ['type', 'int'],
      ['plain', ']) -> '],
      ['type', 'int'],
      ['plain', ':'],
    ]);
  });

  it('tells control flow, calls, numbers, constants, and decorators apart', () => {
    expect(kinds('for i in range(10):')).toEqual([
      ['control', 'for'],
      ['plain', ' i '],
      ['keyword', 'in'],
      ['plain', ' '],
      ['function', 'range'],
      ['plain', '('],
      ['number', '10'],
      ['plain', '):'],
    ]);
    expect(kinds('return None if x else 1e9')).toEqual([
      ['control', 'return'],
      ['plain', ' '],
      ['keyword', 'None'],
      ['plain', ' '],
      ['control', 'if'],
      ['plain', ' x '],
      ['control', 'else'],
      ['plain', ' '],
      ['number', '1e9'],
    ]);
    expect(kinds('@cache')).toEqual([['decorator', '@cache']]);
    expect(kinds('class Solution:')).toEqual([
      ['keyword', 'class'],
      ['plain', ' '],
      ['type', 'Solution'],
      ['plain', ':'],
    ]);
  });

  it('keeps # inside strings, handles escapes and prefixes, and colors comments', () => {
    expect(kinds('x = "a#b\\"c"  # note')).toEqual([
      ['plain', 'x = '],
      ['string', '"a#b\\"c"'],
      ['plain', '  '],
      ['comment', '# note'],
    ]);
    expect(kinds("print(f'{x}', r'\\d')")).toEqual([
      ['function', 'print'],
      ['plain', '('],
      ['string', "f'{x}'"],
      ['plain', ', '],
      ['string', "r'\\d'"],
      ['plain', ')'],
    ]);
    // 中文註解也照樣上色
    expect(kinds('# 先排序')).toEqual([['comment', '# 先排序']]);
  });
});

describe('typing code', () => {
  it('Tab fills to the next indent stop, or indents every selected line', () => {
    const one = indentEdit('abc', 1, 1, false)!;
    expect([run('abc', one), one.selStart]).toEqual(['a   bc', 4]);
    const block = indentEdit('a\nb\nc', 0, 3, false)!;
    expect(run('a\nb\nc', block)).toBe('    a\n    b\nc');
    expect([block.selStart, block.selEnd]).toEqual([4, 11]);
    // 選到下一行開頭時，那一行不縮
    expect(run('a\nb', indentEdit('a\nb', 0, 2, false))).toBe('    a\nb');
  });

  it('Shift+Tab outdents up to one level, and does nothing without indentation', () => {
    const value = '    a\n  b';
    const edit = indentEdit(value, 8, 8, true)!;
    expect([run(value, edit), edit.selStart]).toEqual(['    a\nb', 6]);
    expect(run(value, indentEdit(value, 0, value.length, true))).toBe('a\nb');
    expect(indentEdit('a', 0, 0, true)).toBeNull();
  });

  it('Enter keeps the indentation, adding a level after a colon', () => {
    expect(newlineEdit('    for x in a:', 15, 15).insert).toBe('\n        ');
    expect(newlineEdit('    x = 1', 9, 9).insert).toBe('\n    ');
    // 選了文字時，換掉選到的部分
    expect(run('ab', newlineEdit('ab', 1, 2))).toBe('a\n');
  });

  it('Backspace in the indentation removes a level at a time', () => {
    expect(run('        ', backspaceEdit('        ', 8, 8))).toBe('    ');
    expect(run('      ', backspaceEdit('      ', 6, 6))).toBe('    ');
    expect(backspaceEdit('  x', 3, 3)).toBeNull();
    expect(backspaceEdit('', 0, 0)).toBeNull();
    expect(backspaceEdit('    ', 0, 4)).toBeNull();
  });
});
