// 逐字稿的統計：講了多少字、語速，以及常見的贅詞

/** 講解時常出現、聽起來不夠俐落的詞；語音辨識通常會濾掉 um、uh，但片語會留下來 */
const FILLERS = ['um', 'uh', 'erm', 'hmm', 'basically', 'actually', 'literally', 'you know', 'kind of', 'sort of', 'i mean'];

const FILLER_PATTERN = new RegExp(`\\b(${FILLERS.map((f) => f.replace(' ', '\\s+')).join('|')})\\b`, 'gi');

export interface TranscriptStats {
  words: number;
  /** 每分鐘字數；時間太短時為 null */
  wpm: number | null;
  /** 出現過的贅詞與次數，由多到少 */
  fillers: { word: string; count: number }[];
}

/** 把辨識出來的片段接成一段文字 */
export function joinSegments(segments: readonly string[]): string {
  return segments
    .map((s) => s.trim())
    .filter(Boolean)
    .join(' ');
}

export function countWords(text: string): number {
  const matches = text.match(/[A-Za-z0-9]+(?:['’][A-Za-z]+)*/g);
  return matches ? matches.length : 0;
}

export function transcriptStats(text: string, seconds: number): TranscriptStats {
  const words = countWords(text);
  const counts = new Map<string, number>();
  for (const match of text.matchAll(FILLER_PATTERN)) {
    const word = match[1].toLowerCase().replace(/\s+/g, ' ');
    counts.set(word, (counts.get(word) ?? 0) + 1);
  }
  return {
    words,
    wpm: seconds >= 10 && words > 0 ? Math.round((words / seconds) * 60) : null,
    fillers: [...counts.entries()]
      .map(([word, count]) => ({ word, count }))
      .sort((a, b) => b.count - a.count || a.word.localeCompare(b.word)),
  };
}
