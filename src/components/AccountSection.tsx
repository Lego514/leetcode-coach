import { useLiveQuery } from 'dexie-react-hooks';
import { useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { PASSWORD_MIN_LENGTH } from '../../shared/constants';
import { useI18n, type Messages } from '../i18n';
import type { Formatters } from '../i18n/format';
import { errorCode } from '../store/api';
import {
  deleteAccount,
  githubStartUrl,
  requestPasswordReset,
  retryConnection,
  signIn,
  signOut,
  syncNow,
  unlinkGithub,
  useCloud,
  type CloudState,
} from '../store/cloud';
import { db } from '../store/db';
import { useToast } from './toast';
import { SpotArt } from './SpotArt';
import { Dialog, Sheet } from './ui';

const GITHUB_ICON = (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden width="16" height="16">
    <path d="M12 .5a11.5 11.5 0 0 0-3.64 22.41c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.52-1.33-1.28-1.69-1.28-1.69-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.56-.29-5.25-1.28-5.25-5.68 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.78 0c2.2-1.49 3.16-1.18 3.16-1.18.63 1.59.24 2.76.12 3.05.74.81 1.19 1.83 1.19 3.09 0 4.41-2.7 5.38-5.26 5.67.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .5Z" />
  </svg>
);

export function syncStatusText(cloud: CloudState, t: Messages, fmt: Formatters): string {
  switch (cloud.phase) {
    case 'syncing':
      return t.sync.syncing;
    case 'offline':
      return t.sync.offline;
    case 'error':
      return t.sync.failed(t.errors.api[cloud.error ?? 'unknown']);
    case 'idle':
      return cloud.lastSyncedAt ? t.sync.synced(formatSyncTime(cloud.lastSyncedAt, fmt)) : t.sync.never;
  }
}

function formatSyncTime(ms: number, fmt: Formatters): string {
  const sameDay = new Date().toDateString() === new Date(ms).toDateString();
  return sameDay ? fmt.time(ms) : fmt.dateTime(new Date(ms).toISOString());
}

export function AccountSection() {
  const { t } = useI18n();
  const cloud = useCloud();
  const { account } = cloud;

  return (
    <Sheet title={t.account.title} id="account">
      <div className="sheet-body stack" style={{ gap: 16 }}>
        {account.kind === 'loading' && <p className="sheet-note">{t.account.checking}</p>}
        {account.kind === 'unavailable' && <Unavailable />}
        {account.kind === 'signed-out' && <SignInForm expiredEmail={account.expiredEmail} github={cloud.providers.github} />}
        {account.kind === 'signed-in' && <SignedIn email={account.user.email} cloud={cloud} />}
      </div>
    </Sheet>
  );
}

/** 設定頁上的帳號摘要；登入、登出等操作在帳號頁 */
export function AccountSummary() {
  const { t, fmt } = useI18n();
  const cloud = useCloud();
  const { account } = cloud;
  const signedIn = account.kind === 'signed-in';
  const summary =
    account.kind === 'loading' ? t.account.checking : account.kind === 'unavailable' ? t.account.unavailable : t.account.signedOutSummary;
  // 伺服器能用 GitHub 登入、或已經連結過時，才顯示 GitHub 這一項
  const showGithub = cloud.login && (cloud.providers.github || cloud.login.github);
  return (
    <Sheet
      title={t.account.title}
      id="account"
      actions={
        account.kind === 'loading' ? undefined : (
          <Link className={signedIn ? 'btn btn-small' : 'btn btn-small btn-primary'} to="/account">
            {signedIn ? t.account.manage : t.nav.signIn}
          </Link>
        )
      }
    >
      {account.kind === 'signed-in' ? (
        <dl className="facts sheet-body">
          <dt>{t.account.accountLabel}</dt>
          <dd>{account.user.email}</dd>
          <dt>{t.account.syncLabel}</dt>
          <dd className={cloud.phase === 'error' ? 'overdue' : undefined}>{syncStatusText(cloud, t, fmt)}</dd>
          {showGithub && (
            <>
              <dt>{t.account.github.label}</dt>
              <dd className="github-status" data-linked={cloud.login?.github ? true : undefined}>
                {GITHUB_ICON}
                {cloud.login?.github ? t.account.github.linkedAs(cloud.login.github) : t.account.github.notLinked}
              </dd>
            </>
          )}
        </dl>
      ) : (
        <p className="sheet-empty">{summary}</p>
      )}
    </Sheet>
  );
}

function Unavailable() {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  return (
    <>
      <p>{t.account.unavailable}</p>
      <div className="btn-row">
        <button
          className="btn"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            await retryConnection();
            setBusy(false);
          }}
        >
          {t.account.reconnect}
        </button>
      </div>
    </>
  );
}

interface PasswordInputProps {
  id: string;
  autoComplete: string;
  minLength?: number;
  value: string;
  onChange: (value: string) => void;
}

/** 密碼欄位加上顯示／隱藏切換，沒有「忘記密碼」之前，打錯字要看得出來 */
function PasswordInput({ id, autoComplete, minLength, value, onChange }: PasswordInputProps) {
  const { t } = useI18n();
  const [visible, setVisible] = useState(false);

  return (
    <div className="password-field">
      <input
        id={id}
        className="input"
        type={visible ? 'text' : 'password'}
        autoComplete={autoComplete}
        required
        minLength={minLength}
        maxLength={200}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <button type="button" className="password-toggle" aria-pressed={visible} onClick={() => setVisible((v) => !v)}>
        {visible ? t.account.hidePassword : t.account.showPassword}
      </button>
    </div>
  );
}

function SignInForm({ expiredEmail, github }: { expiredEmail?: string; github: boolean }) {
  const { t } = useI18n();
  const toast = useToast();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState(expiredEmail ?? '');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [forgot, setForgot] = useState(false);
  const localAttempts = useLiveQuery(() => db.attempts.count(), []) ?? 0;
  const owner = useLiveQuery(async () => (await db.syncState.get('state'))?.email, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await signIn(mode, email.trim(), password);
      setPassword('');
      toast(mode === 'register' ? t.account.registered : t.account.signedIn);
    } catch (err) {
      setError(t.errors.api[errorCode(err)]);
    } finally {
      setBusy(false);
    }
  }

  const isRegister = mode === 'register';
  const mergesOtherAccount = owner && owner !== email.trim().toLowerCase();

  return (
    <>
      {expiredEmail && <p className="form-error">{t.account.expired(expiredEmail)}</p>}
      <div className="account-intro">
        <SpotArt spot="sync" />
        <p>{t.account.intro}</p>
      </div>

      {github && (
        <>
          {/* 整頁轉到伺服器再轉到 GitHub，回來時已經登入 */}
          <a className="btn github-btn" href={githubStartUrl('signin')} style={{ alignSelf: 'flex-start' }}>
            {GITHUB_ICON}
            {t.account.github.continue}
          </a>
          <p className="or-divider">{t.account.github.or}</p>
        </>
      )}

      <div className="segmented" role="group" aria-label={t.account.modeLabel} style={{ alignSelf: 'flex-start' }}>
        <button type="button" aria-pressed={!isRegister} onClick={() => setMode('login')}>
          {t.account.signIn}
        </button>
        <button type="button" aria-pressed={isRegister} onClick={() => setMode('register')}>
          {t.account.register}
        </button>
      </div>

      <form className="stack" style={{ gap: 14 }} onSubmit={submit}>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <div className="form-grid">
          <label className="field">
            <span className="field-label">{t.account.email}</span>
            <input className="input" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <div className="field">
            <label className="field-label" htmlFor="account-password">
              {t.account.password}
            </label>
            <PasswordInput
              id="account-password"
              autoComplete={isRegister ? 'new-password' : 'current-password'}
              minLength={isRegister ? PASSWORD_MIN_LENGTH : undefined}
              value={password}
              onChange={setPassword}
            />
            {isRegister && <span className="field-hint">{t.account.passwordHint(PASSWORD_MIN_LENGTH)}</span>}
          </div>
        </div>
        {localAttempts > 0 && (
          <p className="field-hint">
            {mergesOtherAccount ? t.account.mergeOther(owner, localAttempts) : t.account.mergeLocal(localAttempts)}
          </p>
        )}
        <div className="btn-row">
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {isRegister ? t.account.createAccount : t.account.signIn}
          </button>
          {!isRegister && (
            <button type="button" className="btn btn-quiet" onClick={() => setForgot(true)}>
              {t.account.forgot}
            </button>
          )}
        </div>
      </form>
      <ForgotPasswordDialog key={forgot ? email : 'closed'} open={forgot} email={email} onClose={() => setForgot(false)} />
    </>
  );
}

function ForgotPasswordDialog({ open, email, onClose }: { open: boolean; email: string; onClose: () => void }) {
  const { t } = useI18n();
  const [value, setValue] = useState(email);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await requestPasswordReset(value.trim());
      setSent(true);
    } catch (err) {
      setError(t.errors.api[errorCode(err)]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={t.account.forgotTitle}
      subtitle={sent ? undefined : t.account.forgotIntro}
      footer={
        sent ? (
          <button className="btn btn-primary" onClick={onClose}>
            {t.common.close}
          </button>
        ) : undefined
      }
    >
      {sent ? (
        <p>{t.account.forgotSent(value.trim())}</p>
      ) : (
        <form className="stack" style={{ gap: 14 }} onSubmit={submit}>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <div className="field">
            <label className="field-label" htmlFor="forgot-email">
              {t.account.email}
            </label>
            <input
              id="forgot-email"
              className="input"
              type="email"
              autoComplete="email"
              required
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
          </div>
          <div className="btn-row" style={{ justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-quiet" onClick={onClose}>
              {t.common.cancel}
            </button>
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {t.account.forgotSend}
            </button>
          </div>
        </form>
      )}
    </Dialog>
  );
}

function SignedIn({ email, cloud }: { email: string; cloud: CloudState }) {
  const { t, fmt } = useI18n();
  const toast = useToast();
  const pending = useLiveQuery(() => db.outbox.count(), []) ?? 0;
  const [dialog, setDialog] = useState<'logout' | 'delete' | null>(null);
  const [password, setPassword] = useState('');
  const [confirmEmail, setConfirmEmail] = useState('');
  // 只用 GitHub 登入的帳號沒有密碼：刪除時改成輸入 email
  const hasPassword = cloud.login?.password ?? true;
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function logout(keepData: boolean) {
    setBusy(true);
    try {
      await signOut({ keepData });
      setDialog(null);
      toast(keepData ? t.account.signedOutKept : t.account.signedOutCleared);
    } finally {
      setBusy(false);
    }
  }

  async function removeAccount(e: FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await deleteAccount(hasPassword ? { password } : { confirmEmail });
      setDialog(null);
      toast(t.account.deleted);
    } catch (err) {
      setError(t.errors.api[errorCode(err)]);
    } finally {
      setBusy(false);
      setPassword('');
      setConfirmEmail('');
    }
  }

  async function disconnectGithub() {
    setBusy(true);
    try {
      await unlinkGithub();
      toast(t.account.github.disconnected);
    } catch (err) {
      toast(t.errors.api[errorCode(err)]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <dl className="facts">
        <dt>{t.account.accountLabel}</dt>
        <dd>{email}</dd>
        <dt>{t.account.syncLabel}</dt>
        <dd className={cloud.phase === 'error' ? 'overdue' : undefined} aria-live="polite">
          {syncStatusText(cloud, t, fmt)}
        </dd>
        <dt>{t.account.pendingLabel}</dt>
        <dd>{pending === 0 ? t.account.pendingNone : t.account.pendingCount(pending)}</dd>
        {cloud.login && (cloud.providers.github || cloud.login.github) && (
          <>
            <dt>{t.account.github.label}</dt>
            <dd className="github-row">
              <span>{cloud.login.github ? t.account.github.linkedAs(cloud.login.github) : t.account.github.notLinked}</span>
              {cloud.login.github
                ? cloud.login.password && (
                    <button className="btn btn-small btn-quiet" disabled={busy} onClick={() => void disconnectGithub()}>
                      {t.account.github.disconnect}
                    </button>
                  )
                : cloud.providers.github && (
                    <a className="btn btn-small" href={githubStartUrl('link')}>
                      {GITHUB_ICON}
                      {t.account.github.connect}
                    </a>
                  )}
            </dd>
          </>
        )}
      </dl>
      <div className="btn-row">
        <button className="btn" disabled={cloud.phase === 'syncing'} onClick={() => void syncNow()}>
          {t.account.syncNow}
        </button>
        <button className="btn" onClick={() => setDialog('logout')}>
          {t.account.signOut}
        </button>
        <button className="btn btn-danger" onClick={() => setDialog('delete')}>
          {t.account.deleteAccount}
        </button>
      </div>

      <Dialog
        open={dialog === 'logout'}
        onClose={() => setDialog(null)}
        title={t.account.signOutTitle}
        footer={
          <>
            <button className="btn btn-quiet" onClick={() => setDialog(null)}>
              {t.common.cancel}
            </button>
            <button className="btn" disabled={busy} onClick={() => void logout(true)}>
              {t.account.keepAndSignOut}
            </button>
            <button className="btn btn-danger" disabled={busy} onClick={() => void logout(false)}>
              {t.account.clearAndSignOut}
            </button>
          </>
        }
      >
        <p>{t.account.signOutQuestion}</p>
        {pending > 0 && <p className="form-error">{t.account.signOutPending(pending)}</p>}
        <p className="sheet-note">{t.account.signOutAudio}</p>
      </Dialog>

      <Dialog open={dialog === 'delete'} onClose={() => setDialog(null)} title={t.account.deleteTitle}>
        <form className="stack" style={{ gap: 14 }} onSubmit={removeAccount}>
          <p>{t.account.deleteBody}</p>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          {hasPassword ? (
            <div className="field">
              <label className="field-label" htmlFor="delete-password">
                {t.account.confirmPassword}
              </label>
              <PasswordInput id="delete-password" autoComplete="current-password" value={password} onChange={setPassword} />
            </div>
          ) : (
            <label className="field">
              <span className="field-label">{t.account.confirmEmail(email)}</span>
              <input className="input" type="email" autoComplete="off" value={confirmEmail} onChange={(e) => setConfirmEmail(e.target.value)} />
            </label>
          )}
          <div className="btn-row" style={{ justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-quiet" onClick={() => setDialog(null)}>
              {t.common.cancel}
            </button>
            <button
              type="submit"
              className="btn btn-danger"
              disabled={busy || (hasPassword ? !password : confirmEmail.trim().toLowerCase() !== email.toLowerCase())}
            >
              {t.account.deleteForever}
            </button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
