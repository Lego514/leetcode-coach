import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { useI18n } from '../i18n';
import { detectIos, reminderStep, type ReminderStep } from '../lib/reminderSetup';
import { githubStartUrl, useCloud } from '../store/cloud';
import { useInstallPrompt } from '../store/install';
import { currentSubscription, enableReminder, fetchPushKey, pushSupport, savedReminderHour } from '../store/push';
import { useToast } from './toast';

const DISMISS_KEY = 'leetcode-coach:reminder-card-dismissed';

function readDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISS_KEY) === '1';
  } catch {
    return false;
  }
}

function standalone(): boolean {
  return window.matchMedia?.('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true;
}

/**
 * 今天頁要不要顯示每日提醒的引導卡、顯示哪一步。
 * 推播金鑰和這台裝置有沒有訂閱還沒查到之前先不顯示，免得卡片閃一下又消失
 */
export function useReminderSetup() {
  const cloud = useCloud();
  const [publicKey, setPublicKey] = useState<string | null | undefined>(undefined);
  const [subscribed, setSubscribed] = useState<boolean | undefined>(undefined);
  const [dismissed, setDismissed] = useState(readDismissed);

  useEffect(() => {
    let alive = true;
    void fetchPushKey().then((key) => alive && setPublicKey(key));
    void currentSubscription()
      .then((sub) => alive && setSubscribed(sub !== null))
      .catch(() => alive && setSubscribed(false));
    return () => {
      alive = false;
    };
  }, []);

  const { ios, iosSafari } = detectIos(navigator.userAgent, navigator.maxTouchPoints ?? 0);
  const step: ReminderStep =
    publicKey === undefined || subscribed === undefined
      ? 'none'
      : reminderStep({
          available: publicKey !== null,
          dismissed,
          ios,
          iosSafari,
          standalone: standalone(),
          pushReady: pushSupport() === 'ok',
          signedIn: cloud.account.kind === 'signed-in',
          subscribed,
        });

  const dismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, '1');
    } catch {
      // 存不了就只在這次隱藏
    }
  };

  return { step, publicKey: publicKey ?? null, dismiss, markSubscribed: () => setSubscribed(true) };
}

/** iPhone 分享按鈕的樣子（方框加往上的箭頭），讓人一眼找到要按哪裡 */
function ShareIcon() {
  return (
    <svg className="reminder-share-icon" viewBox="0 0 24 24" width="18" height="18" aria-hidden>
      <path d="M12 3v12M8 7l4-4 4 4M7 11H5v10h14V11h-2" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ReminderBanner({ setup }: { setup: ReturnType<typeof useReminderSetup> }) {
  const { t, locale } = useI18n();
  const r = t.reminderCard;
  const cloud = useCloud();
  const toast = useToast();
  const install = useInstallPrompt();
  const [busy, setBusy] = useState(false);
  const { step, publicKey, dismiss, markSubscribed } = setup;
  if (step === 'none') return null;

  const hour = savedReminderHour();
  const enable = async () => {
    if (!publicKey) return;
    setBusy(true);
    try {
      const result = await enableReminder(publicKey, hour, locale);
      if (result === 'on') {
        markSubscribed();
        toast(t.settings.reminder.saved(hour));
      } else {
        toast(result === 'denied' ? t.settings.reminder.denied : t.settings.reminder.failed);
      }
    } catch {
      toast(t.settings.reminder.failed);
    } finally {
      setBusy(false);
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.origin + window.location.pathname);
      toast(r.copied);
    } catch {
      toast(window.location.origin);
    }
  };

  const body =
    step === 'install-ios' ? (
      <>
        {r.installBefore}
        <ShareIcon />
        {r.installAfter}
      </>
    ) : (
      r.body[step]
    );

  return (
    <aside className="signin-banner reminder-banner" aria-labelledby="reminder-banner-title">
      <div className="signin-banner-text">
        <p className="signin-banner-title" id="reminder-banner-title">
          {r.title[step]}
        </p>
        <p className="signin-banner-body">{body}</p>
      </div>
      <div className="btn-row">
        {step === 'enable' && (
          <button type="button" className="btn btn-primary btn-small" disabled={busy} onClick={() => void enable()}>
            {r.enable(hour)}
          </button>
        )}
        {step === 'sign-in' &&
          (cloud.providers.github ? (
            <a className="btn btn-primary btn-small" href={githubStartUrl('signin')}>
              {r.github}
            </a>
          ) : (
            <Link className="btn btn-primary btn-small" to="/account">
              {t.nav.signIn}
            </Link>
          ))}
        {step === 'use-safari' && (
          <button type="button" className="btn btn-small" onClick={() => void copyLink()}>
            {r.copyLink}
          </button>
        )}
        {install && (step === 'enable' || step === 'sign-in') && (
          <button type="button" className="btn btn-small" onClick={() => void install()}>
            {r.install}
          </button>
        )}
        <button type="button" className="btn btn-quiet btn-small" onClick={dismiss}>
          {r.dismiss}
        </button>
      </div>
    </aside>
  );
}
