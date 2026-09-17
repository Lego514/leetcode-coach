import { useLiveQuery } from 'dexie-react-hooks';
import { useState, type FormEvent } from 'react';
import { PASSWORD_MIN_LENGTH } from '../../shared/constants';
import { useI18n, type Messages } from '../i18n';
import type { Formatters } from '../i18n/format';
import { errorCode } from '../store/api';
import { deleteAccount, retryConnection, signIn, signOut, syncNow, useCloud, type CloudState } from '../store/cloud';
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

function SignInForm({ expiredEmail }: { expiredEmail?: string }) {
  const { t } = useI18n();
  const toast = useToast();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState(expiredEmail ?? '');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
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
          <label className="field">
            <span className="field-label">{t.account.password}</span>
            <input
              className="input"
              type="password"
              autoComplete={isRegister ? 'new-password' : 'current-password'}
              required
              minLength={isRegister ? PASSWORD_MIN_LENGTH : undefined}
              maxLength={200}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {isRegister && <span className="field-hint">{t.account.passwordHint(PASSWORD_MIN_LENGTH)}</span>}
          </label>
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
        </div>
      </form>
    </>
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
          <label className="field">
            <span className="field-label">{t.account.confirmPassword}</span>
            <input
              className="input"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
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
