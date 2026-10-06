import { useCallback, useEffect, useRef, useState } from 'react';
import { loadRestSeconds, saveRestSeconds } from './cardPrefs';

// 組間休息的倒數計時。用結束時間點計算剩餘秒數，切到別的 App 再回來也準。
// 時間到時發出三聲提示音、支援的手機會震動；倒數期間請瀏覽器不要讓螢幕自動關掉，
// 不然 iPhone 鎖定後就聽不到提示音了。

export interface RestTimer {
  /** 設定的休息秒數 */
  seconds: number;
  setSeconds: (seconds: number) => void;
  /** 剩下幾秒；沒有在倒數時是 null */
  remaining: number | null;
  /** 時間到了、使用者還沒關掉提醒 */
  done: boolean;
  start: () => void;
  stop: () => void;
  dismiss: () => void;
}

/** 剩下幾秒，無條件進位，倒數到 0 才算結束 */
export function secondsLeft(endsAt: number, now: number): number {
  return Math.max(0, Math.ceil((endsAt - now) / 1000));
}

function beep(context: AudioContext) {
  const start = context.currentTime + 0.05;
  for (let i = 0; i < 3; i += 1) {
    const at = start + i * 0.35;
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = 'sine';
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(0.4, at + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.25);
    osc.connect(gain).connect(context.destination);
    osc.start(at);
    osc.stop(at + 0.3);
  }
}

export function useRestTimer(): RestTimer {
  const [seconds, setSecondsState] = useState(loadRestSeconds);
  const [endsAt, setEndsAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [done, setDone] = useState(false);
  const audio = useRef<AudioContext | null>(null);
  const lock = useRef<WakeLockSentinel | null>(null);

  const releaseLock = useCallback(() => {
    void lock.current?.release().catch(() => {});
    lock.current = null;
  }, []);

  const requestLock = useCallback(async () => {
    if (lock.current || !('wakeLock' in navigator)) return;
    try {
      lock.current = await navigator.wakeLock.request('screen');
      lock.current.addEventListener('release', () => {
        lock.current = null;
      });
    } catch {
      // 省電模式或瀏覽器不允許時就算了，計時照常
    }
  }, []);

  useEffect(() => {
    if (endsAt === null) return;
    const tick = () => {
      const time = Date.now();
      setNow(time);
      if (time < endsAt) {
        // 切回這個頁面時，螢幕常亮會被瀏覽器收回，要重新申請
        if (document.visibilityState === 'visible') void requestLock();
        return;
      }
      setEndsAt(null);
      setDone(true);
      releaseLock();
      if (audio.current) beep(audio.current);
      navigator.vibrate?.([200, 100, 200, 100, 200]);
    };
    const id = window.setInterval(tick, 250);
    document.addEventListener('visibilitychange', tick);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [endsAt, releaseLock, requestLock]);

  useEffect(
    () => () => {
      releaseLock();
      void audio.current?.close().catch(() => {});
    },
    [releaseLock],
  );

  const start = useCallback(() => {
    // iPhone 只允許在點擊時啟動聲音，所以在按下開始時就準備好
    try {
      audio.current ??= new AudioContext();
      void audio.current.resume().catch(() => {});
    } catch {
      audio.current = null;
    }
    const time = Date.now();
    setNow(time);
    setEndsAt(time + seconds * 1000);
    setDone(false);
    void requestLock();
  }, [seconds, requestLock]);

  const stop = useCallback(() => {
    setEndsAt(null);
    releaseLock();
  }, [releaseLock]);

  const setSeconds = useCallback((value: number) => {
    setSecondsState(value);
    saveRestSeconds(value);
  }, []);

  return {
    seconds,
    setSeconds,
    remaining: endsAt === null ? null : secondsLeft(endsAt, now),
    done,
    start,
    stop,
    dismiss: () => setDone(false),
  };
}
