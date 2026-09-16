import { useCallback, useEffect, useRef, useState } from 'react';

export interface StopwatchState {
  bankedMs: number;
  /** 計時中時為開始的時間（epoch 毫秒），暫停時為 null */
  runningSince: number | null;
}

/**
 * 用實際時間差計算，不會因為分頁在背景而變慢。
 * 傳入 initial 可以接續之前的計時（例如重新整理頁面後）。
 */
export function useStopwatch(initial?: StopwatchState) {
  const [running, setRunning] = useState(initial?.runningSince != null);
  const [elapsedMs, setElapsedMs] = useState(initial?.bankedMs ?? 0);
  const startedAt = useRef<number | null>(initial?.runningSince ?? null);
  const banked = useRef(initial?.bankedMs ?? 0);

  useEffect(() => {
    if (!running) return;
    const tick = () => setElapsedMs(banked.current + Date.now() - (startedAt.current ?? Date.now()));
    const first = window.setTimeout(tick, 0);
    const timer = window.setInterval(tick, 250);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(timer);
    };
  }, [running]);

  const start = useCallback(() => {
    if (startedAt.current !== null) return;
    startedAt.current = Date.now();
    setRunning(true);
  }, []);

  const snapshot = useCallback((): StopwatchState => ({ bankedMs: banked.current, runningSince: startedAt.current }), []);

  const pause = useCallback(() => {
    if (startedAt.current === null) return banked.current;
    banked.current += Date.now() - startedAt.current;
    startedAt.current = null;
    setRunning(false);
    setElapsedMs(banked.current);
    return banked.current;
  }, []);

  return { elapsedSec: Math.floor(elapsedMs / 1000), running, start, pause, snapshot };
}

export type RecorderState = 'idle' | 'recording' | 'paused';

function describeMediaError(err: unknown): string {
  const name = err instanceof DOMException ? err.name : '';
  if (name === 'NotAllowedError') return '瀏覽器沒有允許使用麥克風。可以在網址列旁的網站設定開啟，或這次先不錄音。';
  if (name === 'NotFoundError') return '找不到麥克風。接上麥克風後再試一次，或這次先不錄音。';
  return `無法開始錄音：${err instanceof Error ? err.message : String(err)}`;
}

export function useRecorder() {
  const [state, setState] = useState<RecorderState>('idle');
  const [error, setError] = useState<string | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const chunks = useRef<Blob[]>([]);
  const starting = useRef(false);
  const disposed = useRef(false);

  const release = useCallback(() => {
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    recorder.current = null;
  }, []);

  useEffect(() => {
    disposed.current = false;
    return () => {
      // 離開頁面時關掉麥克風；開發模式的 StrictMode 會先卸載再掛載一次
      disposed.current = true;
      if (recorder.current && recorder.current.state !== 'inactive') recorder.current.stop();
      release();
    };
  }, [release]);

  const start = useCallback(async (): Promise<boolean> => {
    if (starting.current || recorder.current) return false;
    setError(null);
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setError('這個瀏覽器不支援錄音，這次先不錄音。');
      return false;
    }
    starting.current = true;
    try {
      const media = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (disposed.current) {
        media.getTracks().forEach((t) => t.stop());
        return false;
      }
      const rec = new MediaRecorder(media);
      chunks.current = [];
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.current.push(e.data);
      };
      rec.start(1000);
      stream.current = media;
      recorder.current = rec;
      setState('recording');
      return true;
    } catch (err) {
      setError(describeMediaError(err));
      return false;
    } finally {
      starting.current = false;
    }
  }, []);

  const pause = useCallback(() => {
    if (recorder.current?.state === 'recording') {
      recorder.current.pause();
      setState('paused');
    }
  }, []);

  const resume = useCallback(() => {
    if (recorder.current?.state === 'paused') {
      recorder.current.resume();
      setState('recording');
    }
  }, []);

  const stop = useCallback((): Promise<Blob | null> => {
    const rec = recorder.current;
    if (!rec || rec.state === 'inactive') {
      release();
      setState('idle');
      return Promise.resolve(null);
    }
    return new Promise((resolve) => {
      rec.onstop = () => {
        const blob = new Blob(chunks.current, { type: rec.mimeType || 'audio/webm' });
        release();
        setState('idle');
        resolve(blob.size > 0 ? blob : null);
      };
      rec.stop();
    });
  }, [release]);

  return { state, error, start, pause, resume, stop };
}
