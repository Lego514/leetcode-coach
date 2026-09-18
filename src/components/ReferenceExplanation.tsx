import { useEffect, useState } from 'react';
import { useI18n } from '../i18n';

// 參考講法約 130 KB，第一次需要時才下載
let cache: Record<number, string> | null = null;
let pending: Promise<Record<number, string>> | null = null;

function loadExplanations(): Promise<Record<number, string>> {
  if (cache) return Promise.resolve(cache);
  pending ??= import('../data/explanations').then((m) => (cache = m.EXPLANATIONS_EN));
  return pending;
}

function useExplanation(problemId: number): string | null | undefined {
  // undefined：載入中；null：這題沒有參考講法（例如自己新增的題目）
  const [text, setText] = useState<string | null | undefined>(() => (cache ? (cache[problemId] ?? null) : undefined));

  useEffect(() => {
    let active = true;
    void loadExplanations().then((all) => {
      if (active) setText(all[problemId] ?? null);
    });
    return () => {
      active = false;
    };
  }, [problemId]);

  return text;
}

interface ReferenceExplanationProps {
  problemId: number;
  /** 講完之後直接展開；其他地方預設收起，先自己想 */
  open?: boolean;
}

/** 一題的英文參考講法，五句對應講解的五個重點 */
export function ReferenceExplanation({ problemId, open = false }: ReferenceExplanationProps) {
  const { t } = useI18n();
  const text = useExplanation(problemId);
  if (!text) return null;

  const body = (
    <p className="prose-block reference-explanation" lang="en">
      {text.split('\n').map((line) => (
        <span key={line} className="reference-line">
          {line}
        </span>
      ))}
    </p>
  );

  if (open) return body;
  return (
    <details className="reference-details">
      <summary>{t.reference.show}</summary>
      <p className="field-hint" style={{ margin: '8px 0' }}>
        {t.reference.hint}
      </p>
      {body}
    </details>
  );
}

/** 這題有沒有參考講法；沒有時整個區塊都不顯示 */
export function useHasExplanation(problemId: number): boolean {
  return Boolean(useExplanation(problemId));
}
