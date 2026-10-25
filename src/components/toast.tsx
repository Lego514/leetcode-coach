import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

interface ToastItem {
  id: number;
  message: string;
  tone?: ToastTone;
  /** 訊息左邊的小圖（例如征服時的果實） */
  art?: ReactNode;
}

/** win：征服一題、題型升級這類值得慶祝的事，顯示久一點、比較醒目 */
export type ToastTone = 'win';

const ToastContext = createContext<(message: string, tone?: ToastTone, art?: ReactNode) => void>(() => {});

let nextId = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const show = useCallback((message: string, tone?: ToastTone, art?: ReactNode) => {
    const id = nextId++;
    setItems((prev) => [...prev.slice(-2), { id, message, tone, art }]);
    window.setTimeout(() => setItems((prev) => prev.filter((t) => t.id !== id)), tone === 'win' ? 6000 : 3600);
  }, []);

  const value = useMemo(() => show, [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-region" role="status" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className={['toast', t.tone === 'win' && 'toast-win', t.art && 'toast-with-art'].filter(Boolean).join(' ')}>
            {t.art}
            {t.art ? <span>{t.message}</span> : t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
