import type { BoardDoc } from 'dsa-whiteboard';
import type { ReferenceBoards } from './index';
import { array, complexity, dict, note, table, trie, variable, walk } from './build';

// 參考板書：字典樹。版面橫著排，下面留給播放列；複雜度區塊和便利貼放右邊。

// ---------- 208. Implement Trie ----------

function implementTrie(): BoardDoc {
  const t = (at?: string) => trie('t', 0, 0, 'trie', ['apple'], at);
  return walk(208, {
    open: [t()],
    setup: [t(), variable('node', 260, 0, 'node', 'children + is_end')],
    result: [t('app'), variable('s', 260, 0, 'search("app")', 'False: no end mark'), variable('p', 260, 50, 'startsWith("app")', 'True')],
    cx: complexity('cx', 260, 110, 'L', 'one step per letter', 'total', 'one node per new letter'),
    edge: note('edge', 260, 250, 'A word that is a prefix of another just sets is_end partway.'),
  });
}

// ---------- 211. Add and Search Words ----------

function wordDictionary(): BoardDoc {
  const t = (at?: string) => trie('t', 0, 0, 'trie', ['bad', 'dad', 'mad'], at);
  return walk(211, {
    open: [t()],
    setup: [t(), variable('dot', 300, 0, '"."', 'try every child')],
    before: [{ caption: 'For ".ad", the dot tries b, d, and m; under b, a and d follow.', elements: [t('bad'), variable('dot', 300, 0, '"."', 'try every child')] }],
    result: [t('bad'), variable('q1', 300, 0, '".ad"', 'True'), variable('q2', 300, 50, '"b.."', 'True')],
    cx: complexity('cx', 300, 110, '26^L', 'dots branch; plain words are O(L)', 'total', 'trie nodes'),
    edge: note('edge', 300, 250, 'Ending on a node that isn’t a word end: False.'),
  });
}

// ---------- 212. Word Search II ----------

function wordSearchII(): BoardDoc {
  const letters = [
    ['o', 'a', 'a', 'n'],
    ['e', 't', 'a', 'e'],
    ['i', 'h', 'k', 'r'],
    ['i', 'f', 'l', 'v'],
  ];
  const rows = (path: [number, number][]) =>
    letters.map((row, r) =>
      array(
        `r${r}`,
        0,
        r * 90,
        `row ${r}`,
        row,
        row.map((_, c) => (path.some(([pr, pc]) => pr === r && pc === c) ? 'green' : null)),
      ),
    );
  const t = (at?: string) => trie('t', 220, 0, 'trie of words', ['oath', 'pea', 'eat', 'rain'], at);
  return walk(212, {
    open: [...rows([]), t()],
    setup: [...rows([[0, 0]]), t('o')],
    result: [
      ...rows([
        [0, 0],
        [0, 1],
        [1, 1],
        [2, 1],
      ]),
      t('oath'),
      variable('found', 0, 370, 'found', '["oath", "eat"]'),
    ],
    cx: complexity('cx', 560, 0, 'm·n·4^L', 'DFS from every cell', 'total', 'the trie of words'),
    edge: note('edge', 560, 130, 'Found a word: remove it from the trie so it isn’t found twice.'),
  });
}

// ---------- 336. Palindrome Pairs ----------

function palindromePairs(): BoardDoc {
  const words = () => table('w', 0, 0, 'words[0..4]', [['abcd', 'dcba', 'lls', 's', 'sssll']]);
  const rev = dict('rev', 0, 110, 'reversed → i', [
    ['dcba', '0'],
    ['abcd', '1'],
    ['sll', '2'],
    ['s', '3'],
    ['llsss', '4'],
  ]);
  return walk(336, {
    open: [words()],
    setup: [words(), rev],
    before: [
      {
        caption: '"abcd" split as "abcd" + "": its reverse "dcba" is word 1, and "" is a palindrome.',
        elements: [words(), rev, variable('pair', 160, 120, 'pairs', '[0, 1], [1, 0]')],
      },
    ],
    result: [words(), rev, variable('pair', 160, 120, 's + lls', '"slls": [3, 2]')],
    cx: complexity('cx', 440, 0, 'n·k²', 'k splits per word, k to check each', 'n·k', 'the reversed words'),
    edge: note('edge', 440, 130, '"" pairs with every word that is already a palindrome.'),
  });
}

// ---------- 588. Design In-Memory File System ----------

function fileSystem(): BoardDoc {
  const t = (at?: string) => trie('t', 0, 0, 'dirs', ['abc', 'ad'], at);
  return walk(588, {
    open: [t(), variable('p', 220, 0, 'paths', '/a/b/c, /a/d')],
    setup: [t(), variable('node', 220, 0, 'node', 'children, is_file, content')],
    result: [t('a'), variable('ls', 220, 0, 'ls("/a")', '["b", "d"]')],
    cx: complexity('cx', 220, 60, 'path', 'plus sorting names for ls', 'total', 'paths and file contents'),
    edge: note('edge', 220, 200, 'ls on a file: just that file’s name.'),
  });
}

export const BOARDS: ReferenceBoards = {
  208: implementTrie,
  211: wordDictionary,
  212: wordSearchII,
  336: palindromePairs,
  588: fileSystem,
};
