import type { ReactNode } from 'react';
import { useI18n } from '../../i18n';
import type { BoardStep } from '../../lib/board/model';

// 逐步播放：編輯時左上角記步驟的小面板，播放時下方的播放列。

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {children}
    </svg>
  );
}

const ICON_PREV = (
  <Icon>
    <path d="M15 6l-6 6 6 6" />
  </Icon>
);
const ICON_NEXT = (
  <Icon>
    <path d="M9 6l6 6-6 6" />
  </Icon>
);
const ICON_PLAY = (
  <Icon>
    <path d="M8 5.5v13l10.5-6.5z" fill="currentColor" />
  </Icon>
);
const ICON_PAUSE = (
  <Icon>
    <path d="M8 5.5v13M16 5.5v13" strokeWidth="3" />
  </Icon>
);

interface StepsWidgetProps {
  count: number;
  full: boolean;
  onCapture: () => void;
  onPlay: () => void;
}

/** 編輯時左上角：把目前的畫面記成一步、從頭播放 */
export function StepsWidget({ count, full, onCapture, onPlay }: StepsWidgetProps) {
  const { t } = useI18n();
  const s = t.board.steps;
  return (
    <div className="board-steps-widget" role="group" aria-label={s.label} data-ui>
      <button
        type="button"
        className="btn btn-small board-record"
        disabled={full}
        aria-label={full ? s.full : s.captureHint}
        title={full ? s.full : s.captureHint}
        onClick={onCapture}
      >
        <span className="board-record-dot" aria-hidden />
        <span className="board-steps-text">{s.capture}</span>
      </button>
      <button type="button" className="btn btn-small" disabled={count === 0} aria-label={s.playAll(count)} title={s.playAll(count)} onClick={onPlay}>
        <span className="board-steps-play" aria-hidden>
          {ICON_PLAY}
        </span>
        <span aria-live="polite">{s.count(count)}</span>
      </button>
    </div>
  );
}

interface PlaybackBarProps {
  steps: BoardStep[];
  index: number;
  autoPlay: boolean;
  onGo: (index: number) => void;
  onToggleAuto: () => void;
  onExit: () => void;
  onRestore: () => void;
  onDelete: () => void;
  onCaptionStart: () => void;
  onCaption: (caption: string) => void;
  onCaptionEnd: () => void;
}

/** 播放時下方的播放列：換步、自動播放、這一步的說明、從這步繼續編輯 */
export function PlaybackBar({
  steps,
  index,
  autoPlay,
  onGo,
  onToggleAuto,
  onExit,
  onRestore,
  onDelete,
  onCaptionStart,
  onCaption,
  onCaptionEnd,
}: PlaybackBarProps) {
  const { t } = useI18n();
  const s = t.board.steps;
  const last = index === steps.length - 1;
  return (
    <div className="board-playback" role="toolbar" aria-label={s.playbackLabel} data-ui>
      <div className="board-playback-row">
        <button type="button" className="board-tool" aria-label={s.prev} title={s.prev} disabled={index === 0} onClick={() => onGo(index - 1)}>
          {ICON_PREV}
        </button>
        <span className="board-playback-count" aria-live="polite">
          {s.position(index + 1, steps.length)}
        </span>
        <button type="button" className="board-tool" aria-label={s.next} title={s.next} disabled={last} onClick={() => onGo(index + 1)}>
          {ICON_NEXT}
        </button>
        <button
          type="button"
          className="board-tool"
          aria-label={autoPlay ? s.pause : s.play}
          title={autoPlay ? s.pause : s.play}
          aria-pressed={autoPlay}
          onClick={onToggleAuto}
        >
          {autoPlay ? ICON_PAUSE : ICON_PLAY}
        </button>
        <ol className="board-step-dots">
          {steps.map((step, i) => (
            <li key={step.id}>
              <button type="button" aria-label={s.goTo(i + 1)} aria-current={i === index ? 'step' : undefined} onClick={() => onGo(i)}>
                {i + 1}
              </button>
            </li>
          ))}
        </ol>
      </div>
      <input
        className="input board-playback-caption"
        value={steps[index].caption}
        placeholder={s.captionPlaceholder}
        aria-label={s.captionLabel(index + 1)}
        maxLength={200}
        onFocus={onCaptionStart}
        onBlur={onCaptionEnd}
        onChange={(e) => onCaption(e.target.value)}
        onKeyDown={(e) => {
          // 打字時不要觸發白板的快捷鍵；Enter 或 Esc 結束輸入
          e.stopPropagation();
          if (e.key === 'Enter' || e.key === 'Escape') e.currentTarget.blur();
        }}
      />
      <div className="board-playback-row board-playback-actions">
        <button type="button" className="btn btn-small" onClick={onRestore}>
          {s.restore}
        </button>
        <button type="button" className="btn btn-small btn-danger" onClick={onDelete}>
          {s.delete}
        </button>
        <button type="button" className="btn btn-small btn-primary" onClick={onExit}>
          {s.exit}
        </button>
      </div>
    </div>
  );
}
