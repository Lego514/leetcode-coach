import { useCallback, useEffect, useRef, useState } from 'react';
import { joinSegments } from './transcript';

// Web Speech API 還沒進 TypeScript 的 DOM 型別，這裡只宣告用得到的部分
interface RecognitionAlternative {
  transcript: string;
}
interface RecognitionResult {
  readonly isFinal: boolean;
  readonly length: number;
  [index: number]: RecognitionAlternative;
}
interface RecognitionEvent {
  readonly resultIndex: number;
  readonly results: { readonly length: number; [index: number]: RecognitionResult };
}
interface RecognitionErrorEvent {
  readonly error: string;
}
interface Recognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: RecognitionEvent) => void) | null;
  onerror: ((event: RecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
type RecognitionConstructor = new () => Recognition;

function recognitionConstructor(): RecognitionConstructor | undefined {
  if (typeof window === 'undefined') return undefined;
  const w = window as unknown as { SpeechRecognition?: RecognitionConstructor; webkitSpeechRecognition?: RecognitionConstructor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}

/** 瀏覽器是否支援語音辨識（Chrome、Edge、Safari） */
export function speechSupported(): boolean {
  return recognitionConstructor() !== undefined;
}

export type SpeechState = 'idle' | 'listening' | 'paused';

/** 逐字稿無法產生的原因；文字在 i18n 字典的 errors.speech */
export type SpeechError = 'unsupported' | 'denied' | 'noDevice' | 'network' | 'failed';

function describeSpeechError(code: string): SpeechError | null {
  switch (code) {
    // 一段時間沒講話、或是我們自己停止，都不算錯誤
    case 'no-speech':
    case 'aborted':
      return null;
    case 'not-allowed':
    case 'service-not-allowed':
      return 'denied';
    case 'audio-capture':
      return 'noDevice';
    case 'network':
      return 'network';
    default:
      return 'failed';
  }
}

/** 短時間內重新啟動太多次就放棄，避免在錯誤狀態下無限重試 */
const MAX_QUICK_RESTARTS = 5;
const QUICK_RESTART_MS = 1000;

/**
 * 用瀏覽器的語音辨識產生英文逐字稿。
 * Chrome 沉默一陣子就會自動結束辨識，想繼續聽時要重新啟動。
 */
export function useSpeechTranscript(lang = 'en-US') {
  const [state, setState] = useState<SpeechState>('idle');
  const [error, setError] = useState<SpeechError | null>(null);
  const [finalText, setFinalText] = useState('');
  const [interim, setInterim] = useState('');
  const recognition = useRef<Recognition | null>(null);
  const segments = useRef<string[]>([]);
  const pending = useRef('');
  const wanted = useRef(false);
  const running = useRef(false);
  const onStopped = useRef<(() => void) | null>(null);
  const restarts = useRef<number[]>([]);

  const flushPending = useCallback(() => {
    // 停止時還沒確定的片段也收進來，免得最後一句不見
    if (pending.current.trim()) segments.current.push(pending.current);
    pending.current = '';
    setInterim('');
    setFinalText(joinSegments(segments.current));
  }, []);

  const launch = useCallback((rec: Recognition): boolean => {
    try {
      rec.start();
      running.current = true;
      return true;
    } catch {
      return false;
    }
  }, []);

  const ensureRecognition = useCallback((): Recognition | null => {
    if (recognition.current) return recognition.current;
    const Ctor = recognitionConstructor();
    if (!Ctor) return null;
    const rec = new Ctor();
    rec.lang = lang;
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = (event) => {
      let unsettled = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const text = result[0]?.transcript ?? '';
        if (result.isFinal) segments.current.push(text);
        else unsettled += text;
      }
      pending.current = unsettled;
      setInterim(unsettled.trim());
      setFinalText(joinSegments(segments.current));
    };
    rec.onerror = (event) => {
      const code = describeSpeechError(event.error);
      if (!code) return;
      wanted.current = false;
      setError(code);
    };
    rec.onend = () => {
      running.current = false;
      if (wanted.current) {
        const now = Date.now();
        restarts.current = [...restarts.current.filter((t) => now - t < QUICK_RESTART_MS), now];
        if (restarts.current.length <= MAX_QUICK_RESTARTS && launch(rec)) return;
        wanted.current = false;
        setError('failed');
      }
      flushPending();
      if (onStopped.current) {
        onStopped.current();
        onStopped.current = null;
      } else {
        setState((s) => (s === 'listening' ? 'idle' : s));
      }
    };
    recognition.current = rec;
    return rec;
  }, [lang, launch, flushPending]);

  useEffect(
    () => () => {
      // 離開頁面時關掉麥克風
      wanted.current = false;
      const rec = recognition.current;
      if (rec) {
        rec.onend = null;
        rec.onresult = null;
        rec.onerror = null;
        rec.abort();
      }
      recognition.current = null;
    },
    [],
  );

  const start = useCallback((): boolean => {
    setError(null);
    const rec = ensureRecognition();
    if (!rec) {
      setError('unsupported');
      return false;
    }
    if (running.current) return true;
    wanted.current = true;
    if (!launch(rec)) {
      wanted.current = false;
      setError('failed');
      return false;
    }
    setState('listening');
    return true;
  }, [ensureRecognition, launch]);

  const pause = useCallback(() => {
    if (!wanted.current) return;
    wanted.current = false;
    setState('paused');
    recognition.current?.stop();
  }, []);

  const resume = useCallback(() => {
    if (state !== 'paused') return;
    const rec = recognition.current;
    if (!rec) return;
    wanted.current = true;
    // 還沒真正停下來時，等 onend 觸發後由重新啟動的邏輯接手
    if (running.current || launch(rec)) setState('listening');
    else {
      wanted.current = false;
      setError('failed');
    }
  }, [state, launch]);

  /** 停止辨識，等最後的結果回來後回傳完整逐字稿 */
  const stop = useCallback((): Promise<string> => {
    wanted.current = false;
    const rec = recognition.current;
    if (!rec || !running.current) {
      flushPending();
      setState('idle');
      return Promise.resolve(joinSegments(segments.current));
    }
    return new Promise((resolve) => {
      const finish = () => {
        window.clearTimeout(timeout);
        setState('idle');
        resolve(joinSegments(segments.current));
      };
      // 有些瀏覽器不一定會觸發 onend，最多等 2 秒
      const timeout = window.setTimeout(() => {
        onStopped.current = null;
        flushPending();
        finish();
      }, 2000);
      onStopped.current = finish;
      rec.stop();
    });
  }, [flushPending]);

  return { state, error, finalText, interim, start, pause, resume, stop };
}
