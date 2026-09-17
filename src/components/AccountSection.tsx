import { useLiveQuery } from 'dexie-react-hooks';
import { useState, type FormEvent } from 'react';
import { PASSWORD_MIN_LENGTH } from '../../shared/constants';
import { useI18n, type Messages } from '../i18n';
import type { Formatters } from '../i18n/format';
import { errorCode } from '../store/api';
import {
  deleteAccount,
  requestPasswordReset,
  retryConnection,
  signIn,
  signOut,
  syncNow,
  useCloud,
  type CloudState,
} from '../store/cloud';
import { db } from '../store/db';
import { useToast } from './toast';
import { Dialog, Sheet } from './ui';

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
        {account.kind === 'signed-out' && <SignInForm expiredEmail={account.expiredEmail} />}
        {account.kind === 'signed-in' && <SignedIn email={account.user.email} cloud={cloud} />}
      </div>
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

function SignInForm({ expiredEmail }: { expiredEmail?: string }) {
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
      <p>{t.account.intro}</p>

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
      await deleteAccount(password);
      setDialog(null);
      toast(t.account.deleted);
    } catch (err) {
      setError(t.errors.api[errorCode(err)]);
    } finally {
      setBusy(false);
      setPassword('');
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
          <div className="field">
            <label className="field-label" htmlFor="delete-password">
              {t.account.confirmPassword}
            </label>
            <PasswordInput id="delete-password" autoComplete="current-password" value={password} onChange={setPassword} />
          </div>
          <div className="btn-row" style={{ justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-quiet" onClick={() => setDialog(null)}>
              {t.common.cancel}
            </button>
            <button type="submit" className="btn btn-danger" disabled={busy || !password}>
              {t.account.deleteForever}
            </button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
