import { useCallback } from 'react';
import { useBeforeUnload, useBlocker } from 'react-router';
import { useI18n } from '../i18n';
import { Dialog } from './ui';

interface LeaveGuardProps {
  title: string;
  message: string;
  leaveLabel: string;
  /** 使用者確定離開時呼叫，例如清掉暫存的進度 */
  onLeave?: () => void;
}

/** 掛載期間，切換頁面前先確認；關閉或重新整理分頁時交給瀏覽器詢問 */
export function LeaveGuard({ title, message, leaveLabel, onLeave }: LeaveGuardProps) {
  const { t } = useI18n();
  const blocker = useBlocker(({ currentLocation, nextLocation }) => currentLocation.pathname !== nextLocation.pathname);
  useBeforeUnload(
    useCallback((e: BeforeUnloadEvent) => {
      e.preventDefault();
    }, []),
  );

  return (
    <Dialog
      open={blocker.state === 'blocked'}
      onClose={() => blocker.reset?.()}
      title={title}
      footer={
        <>
          <button className="btn btn-quiet" onClick={() => blocker.reset?.()}>
            {t.leave.stay}
          </button>
          <button
            className="btn btn-danger"
            onClick={() => {
              onLeave?.();
              blocker.proceed?.();
            }}
          >
            {leaveLabel}
          </button>
        </>
      }
    >
      <p>{message}</p>
    </Dialog>
  );
}
