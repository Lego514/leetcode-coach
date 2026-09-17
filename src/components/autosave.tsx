import { useEffect, useRef, useState } from 'react';
import { useI18n } from '../i18n';

export interface AutosaveStatus {
  pending: boolean;
  savedAt: Date | null;
}

/**
 * 內容停止變動 delay 毫秒後自動儲存，離開頁面時把還沒存的內容存掉。
 * 第一次渲染的內容視為已儲存，不會觸發寫入。
 */
export function useAutosave<T>(value: T, save: (value: T) => Promise<void>, delay = 800): AutosaveStatus {
  const serialized = JSON.stringify(value);
  const [saved, setSaved] = useState(serialized);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const savedRef = useRef(serialized);
  const latest = useRef({ value, save, serialized });

  useEffect(() => {
    latest.current = { value, save, serialized };
  });

  useEffect(() => {
    if (serialized === savedRef.current) return;
    const timer = window.setTimeout(async () => {
      const current = latest.current;
      savedRef.current = current.serialized;
      await current.save(current.value);
      setSaved(current.serialized);
      setSavedAt(new Date());
    }, delay);
    return () => window.clearTimeout(timer);
  }, [serialized, delay]);

  useEffect(
    () => () => {
      const current = latest.current;
      if (current.serialized !== savedRef.current) void current.save(current.value);
    },
    [],
  );

  return { pending: serialized !== saved, savedAt };
}

export function SaveStatus({ status }: { status: AutosaveStatus }) {
  const { t, fmt } = useI18n();
  const text = status.pending
    ? t.autosave.saving
    : status.savedAt
      ? t.autosave.saved(fmt.time(status.savedAt.getTime()))
      : t.autosave.idle;
  return (
    <span className="saved-note" aria-live="polite">
      {text}
    </span>
  );
}
