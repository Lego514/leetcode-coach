import { useEffect, useRef } from 'react';

/** 播放存在 IndexedDB 的錄音；網址在元件卸載時釋放 */
export function BlobAudio({ blob, autoPlay = false }: { blob: Blob; autoPlay?: boolean }) {
  const ref = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const audio = ref.current;
    if (!audio) return;
    const url = URL.createObjectURL(blob);
    audio.src = url;
    if (autoPlay) audio.play().catch(() => {});
    return () => {
      audio.pause();
      audio.removeAttribute('src');
      URL.revokeObjectURL(url);
    };
  }, [blob, autoPlay]);

  return <audio ref={ref} controls preload="metadata" aria-label="錄音" />;
}
