import { useEffect, useState } from 'react';
import { useI18n } from '../i18n';
import { useCloud } from '../store/cloud';
import { currentSubscription, disableReminder, enableReminder, fetchPushKey, pushSupport, savedReminderHour } from '../store/push';
import { useToast } from './toast';
import { Sheet } from './ui';

const HOURS = Array.from({ length: 18 }, (_, i) => i + 6);

/**
 * 設定頁的「每日提醒」：選幾點，當天還沒練習時手機或電腦跳一則通知。
 * 提醒由伺服器寄，所以要登入；伺服器沒設定推播金鑰時整區不顯示
 */
export function ReminderSettings() {
  const { t, locale } = useI18n();
  const r = t.settings.reminder;
  const cloud = useCloud();
  const toast = useToast();
  const signedIn = cloud.account.kind === 'signed-in';
  const support = pushSupport();
  const [publicKey, setPublicKey] = useState<string | null | undefined>(undefined);
  const [on, setOn] = useState(false);
  const [hour, setHour] = useState(savedReminderHour);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    void fetchPushKey().then((key) => alive && setPublicKey(key));
    void currentSubscription().then((sub) => alive && setOn(sub !== null));
    return () => {
      alive = false;
    };
  }, []);

  if (!publicKey) return null;

  const apply = async (next: boolean, nextHour: number) => {
    setBusy(true);
    try {
      if (!next) {
        await disableReminder();
        setOn(false);
        return;
      }
      const result = await enableReminder(publicKey, nextHour, locale);
      if (result === 'on') {
        setOn(true);
        setHour(nextHour);
        toast(r.saved(nextHour));
      } else {
        toast(result === 'denied' ? r.denied : r.failed);
      }
    } catch {
      toast(r.failed);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet title={r.title} id="reminder">
      <div className="sheet-body stack" style={{ gap: 12 }}>
        {!signedIn ? (
          <p className="field-hint">{r.signIn}</p>
        ) : support !== 'ok' ? (
          <p className="field-hint">{support === 'install-first' ? r.installFirst : r.unsupported}</p>
        ) : (
          <>
            <label className="check">
              <input type="checkbox" checked={on} disabled={busy} onChange={(e) => void apply(e.target.checked, hour)} />
              {r.toggle}
            </label>
            <label className="field" style={{ maxWidth: 240 }}>
              <span className="field-label">{r.time}</span>
              <select
                className="input"
                value={hour}
                disabled={busy}
                onChange={(e) => {
                  const next = Number(e.target.value);
                  setHour(next);
                  if (on) void apply(true, next);
                }}
              >
                {HOURS.map((h) => (
                  <option key={h} value={h}>
                    {r.hour(h)}
                  </option>
                ))}
              </select>
            </label>
            <span className="field-hint">{r.hint}</span>
          </>
        )}
      </div>
    </Sheet>
  );
}
