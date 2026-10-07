// 講解稿和「照步驟寫」對話框之間的轉換：講解稿一句一行，共五句。

export const SCRIPT_LINES = 5;

/** 把現有的講解稿拆成五句，好在對話框裡逐句修改；超過五句就不拆，讓使用者重寫 */
export function splitScript(text: string): string[] | null {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length > SCRIPT_LINES) return null;
  return Array.from({ length: SCRIPT_LINES }, (_, i) => lines[i] ?? '');
}

/** 把每一句接回講解稿，空的句子略過 */
export function joinScript(lines: readonly string[]): string {
  return lines
    .map((line) => line.trim())
    .filter(Boolean)
    .join('\n');
}
