import { Fragment, type ReactNode } from 'react';

type TagRenderer = (children: string) => ReactNode;

const TAG = /<(\w+)>(.*?)<\/\1>/gs;

/**
 * 把翻譯字串裡的 <tag>文字</tag> 換成元件，讓句子中間可以放連結或粗體，
 * 又不用把一句話拆成好幾個翻譯鍵。不支援巢狀標籤；沒有對應的標籤就原樣輸出文字。
 */
export function rich(template: string, tags: Record<string, TagRenderer>): ReactNode {
  const parts: ReactNode[] = [];
  let last = 0;
  for (const match of template.matchAll(TAG)) {
    const [whole, name, inner] = match;
    if (match.index > last) parts.push(template.slice(last, match.index));
    const render = tags[name];
    parts.push(render ? <Fragment key={match.index}>{render(inner)}</Fragment> : inner);
    last = match.index + whole.length;
  }
  if (last < template.length) parts.push(template.slice(last));
  return <>{parts}</>;
}

/** 最常見的用法：<b> 轉成粗體 */
export const bold: TagRenderer = (text) => <strong>{text}</strong>;
