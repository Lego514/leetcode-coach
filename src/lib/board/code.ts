// 白板上的程式碼框：Python 的語法上色，和打字時的縮排規則（Tab、Enter、Backspace）。
// 都是純函式：上色給畫面和匯出共用，縮排規則回傳要怎麼改文字，由輸入框套用。

export type TokenKind = 'plain' | 'keyword' | 'control' | 'function' | 'type' | 'string' | 'number' | 'comment' | 'self' | 'decorator';

export interface Token {
  text: string;
  kind: TokenKind;
}

/** 顏色跟 VS Code（LeetCode 的編輯器也是同一套）一樣分：一般關鍵字、流程控制、函式、型別 */
const KEYWORDS = new Set(['def', 'class', 'lambda', 'None', 'True', 'False', 'and', 'or', 'not', 'in', 'is', 'global', 'nonlocal', 'del', 'assert', 'async', 'await']);
const CONTROL = new Set(['if', 'elif', 'else', 'for', 'while', 'return', 'break', 'continue', 'pass', 'import', 'from', 'as', 'try', 'except', 'finally', 'raise', 'with', 'yield']);
const TYPES = new Set([
  'int',
  'str',
  'float',
  'bool',
  'list',
  'dict',
  'set',
  'tuple',
  'object',
  'List',
  'Dict',
  'Set',
  'Tuple',
  'Optional',
  'deque',
  'defaultdict',
  'Counter',
  'OrderedDict',
  'ListNode',
  'TreeNode',
  'heapq',
  'collections',
  'math',
  'bisect',
]);

// 註解、字串（可以有 r/b/f 前綴，三引號也算）、裝飾器、數字、名稱、空白，其他都是符號
const TOKEN =
  /(#.*)|([rRbBuUfF]{0,2}(?:"""[\s\S]*?(?:"""|$)|'''[\s\S]*?(?:'''|$)|"(?:[^"\\]|\\.)*"?|'(?:[^'\\]|\\.)*'?))|(@[A-Za-z_][\w.]*)|(\b(?:0[xXoObB][\da-fA-F_]+|\d[\d_]*(?:\.\d*)?(?:[eE][+-]?\d+)?)\b)|([A-Za-z_]\w*)|(\s+)|([^\s\w#'"@]+|.)/y;

/** 把一行 Python 切成上色用的片段；相鄰的一般文字併在一起 */
export function highlightPython(line: string): Token[] {
  const out: Token[] = [];
  const push = (text: string, kind: TokenKind) => {
    const last = out[out.length - 1];
    if (last && last.kind === kind && kind === 'plain') last.text += text;
    else out.push({ text, kind });
  };
  let previous = '';
  TOKEN.lastIndex = 0;
  while (TOKEN.lastIndex < line.length) {
    const match = TOKEN.exec(line);
    if (!match) break;
    const [text, comment, string, decorator, number, name] = match;
    if (comment) push(text, 'comment');
    else if (string) push(text, 'string');
    else if (decorator) push(text, 'decorator');
    else if (number) push(text, 'number');
    else if (name) {
      const call = /^\s*\(/.test(line.slice(TOKEN.lastIndex));
      let kind: TokenKind = 'plain';
      if (previous === 'def') kind = 'function';
      else if (previous === 'class') kind = 'type';
      else if (name === 'self' || name === 'cls') kind = 'self';
      else if (KEYWORDS.has(name)) kind = 'keyword';
      else if (CONTROL.has(name)) kind = 'control';
      else if (TYPES.has(name)) kind = 'type';
      else if (call) kind = 'function';
      push(text, kind);
    } else push(text, 'plain');
    if (!/^\s+$/.test(text)) previous = name ?? '';
  }
  return out;
}

// ---------- 縮排 ----------

export const INDENT = '    ';

/** 一次修改：把 [from, to) 換成 insert，之後選取 [selStart, selEnd) */
export interface CodeEdit {
  from: number;
  to: number;
  insert: string;
  selStart: number;
  selEnd: number;
}

function lineStart(value: string, at: number): number {
  return value.lastIndexOf('\n', at - 1) + 1;
}

/**
 * Tab：沒選文字時補空白到下一個 4 的倍數；選了好幾行就整段往右縮 4 格。
 * Shift+Tab：每一行最多往左退 4 格（或一個 tab）。
 */
export function indentEdit(value: string, start: number, end: number, outdent: boolean): CodeEdit | null {
  if (!outdent && start === end) {
    const column = start - lineStart(value, start);
    const insert = ' '.repeat(4 - (column % 4));
    return { from: start, to: end, insert, selStart: start + insert.length, selEnd: start + insert.length };
  }
  const from = lineStart(value, start);
  // 選到下一行開頭時，那一行不算
  const last = end > start && value[end - 1] === '\n' ? end - 1 : end;
  const lineEnd = value.indexOf('\n', last);
  const to = lineEnd === -1 ? value.length : lineEnd;
  const lines = value.slice(from, to).split('\n');
  const removed: number[] = [];
  const next = lines.map((line) => {
    if (!outdent) return INDENT + line;
    const cut = line.startsWith('\t') ? 1 : (/^ {0,4}/.exec(line)?.[0].length ?? 0);
    removed.push(cut);
    return line.slice(cut);
  });
  const insert = next.join('\n');
  if (insert === value.slice(from, to)) return null;
  const firstShift = outdent ? -Math.min(removed[0], start - from) : INDENT.length;
  const totalShift = insert.length - (to - from);
  return { from, to, insert, selStart: Math.max(from, start + firstShift), selEnd: Math.max(from, end + totalShift) };
}

/** Enter：換行後沿用這一行的縮排；這一行以冒號結尾（for、if、def…）就再多縮一層 */
export function newlineEdit(value: string, start: number, end: number): CodeEdit {
  const before = value.slice(lineStart(value, start), start);
  const indent = /^[ \t]*/.exec(before)?.[0] ?? '';
  const insert = `\n${indent}${before.trimEnd().endsWith(':') ? INDENT : ''}`;
  return { from: start, to: end, insert, selStart: start + insert.length, selEnd: start + insert.length };
}

/** Backspace：游標前面只有空白時，一次退一層縮排（退到上一個 4 的倍數）；其他情況照一般的刪除 */
export function backspaceEdit(value: string, start: number, end: number): CodeEdit | null {
  if (start !== end) return null;
  const before = value.slice(lineStart(value, start), start);
  if (!before || !/^ +$/.test(before)) return null;
  const cut = before.length % 4 || 4;
  return { from: start - cut, to: start, insert: '', selStart: start - cut, selEnd: start - cut };
}
