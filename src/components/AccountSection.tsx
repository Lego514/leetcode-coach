import { useLiveQuery } from 'dexie-react-hooks';
import { useState, type FormEvent } from 'react';
import { PASSWORD_MIN_LENGTH } from '../../shared/constants';
import { errorMessage } from '../store/api';
import { deleteAccount, retryConnection, signIn, signOut, syncNow, useCloud, type CloudState } from '../store/cloud';
import { db } from '../store/db';
import { useToast } from './toast';
import { Dialog, Sheet } from './ui';

export function syncStatusText(cloud: CloudState): string {
  switch (cloud.phase) {
    case 'syncing':
      return '同步中…';
    case 'offline':
      return '離線中，恢復連線後會自動同步';
    case 'error':
      return `同步失敗：${cloud.error ?? '未知錯誤'}`;
    case 'idle':
      return cloud.lastSyncedAt ? `已同步（${formatTime(cloud.lastSyncedAt)}）` : '尚未同步';
  }
}

function formatTime(ms: number): string {
  const date = new Date(ms);
  const time = date.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false });
  const today = new Date().toDateString() === date.toDateString();
  return today ? time : `${date.getMonth() + 1}/${date.getDate()} ${time}`;
}

export function AccountSection() {
  const cloud = useCloud();
  const { account } = cloud;

  return (
    <Sheet title="帳號與同步" id="account">
      <div className="sheet-body stack" style={{ gap: 16 }}>
        {account.kind === 'loading' && <p className="sheet-note">正在確認登入狀態…</p>}
        {account.kind === 'unavailable' && <Unavailable />}
        {account.kind === 'signed-out' && <SignInForm expiredEmail={account.expiredEmail} />}
        {account.kind === 'signed-in' && <SignedIn email={account.user.email} cloud={cloud} />}
      </div>
    </Sheet>
  );
}

function Unavailable() {
  const [busy, setBusy] = useState(false);
  return (
    <>
      <p>目前連不到同步伺服器，資料只會存在這個瀏覽器。</p>
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
          重新連線
        </button>
      </div>
    </>
  );
}

function SignInForm({ expiredEmail }: { expiredEmail?: string }) {
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
      toast(mode === 'register' ? '帳號建立好了，資料開始同步。' : '已登入，資料開始同步。');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  const isRegister = mode === 'register';
  const mergesOtherAccount = owner && owner !== email.trim().toLowerCase();

  return (
    <>
      {expiredEmail && <p className="form-error">{expiredEmail} 的登入已過期，請重新登入。這段期間的修改會在登入後上傳。</p>}
      <p>登入後，練習紀錄、筆記和設定會同步到雲端，換電腦或換瀏覽器都能接著用。不登入也能照常使用。</p>

      <div className="segmented" role="group" aria-label="登入或註冊" style={{ alignSelf: 'flex-start' }}>
        <button type="button" aria-pressed={!isRegister} onClick={() => setMode('login')}>
          登入
        </button>
        <button type="button" aria-pressed={isRegister} onClick={() => setMode('register')}>
          註冊
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
            <span className="field-label">Email</span>
            <input
              className="input"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label className="field">
            <span className="field-label">密碼</span>
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
            {isRegister && <span className="field-hint">至少 {PASSWORD_MIN_LENGTH} 個字元。目前還不能用 email 重設密碼，請記好。</span>}
          </label>
        </div>
        {localAttempts > 0 && (
          <p className="field-hint">
            {mergesOtherAccount
              ? `這個瀏覽器裡目前是 ${owner} 的資料（${localAttempts} 筆練習紀錄），用這個帳號登入會把它們合併過去。`
              : `登入後，這個瀏覽器裡的 ${localAttempts} 筆練習紀錄會合併到帳號裡。`}
          </p>
        )}
        <div className="btn-row">
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {isRegister ? '建立帳號' : '登入'}
          </button>
        </div>
      </form>
    </>
  );
}

function SignedIn({ email, cloud }: { email: string; cloud: CloudState }) {
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
      toast(keepData ? '已登出，資料留在這個瀏覽器。' : '已登出，並清除了這個瀏覽器的資料。');
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
      toast('帳號和雲端資料已刪除，這個瀏覽器裡的資料仍然保留。');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
      setPassword('');
    }
  }

  return (
    <>
      <dl className="facts">
        <dt>帳號</dt>
        <dd>{email}</dd>
        <dt>同步</dt>
        <dd className={cloud.phase === 'error' ? 'overdue' : undefined} aria-live="polite">
          {syncStatusText(cloud)}
        </dd>
        <dt>待上傳</dt>
        <dd>{pending === 0 ? '沒有' : `${pending} 筆`}</dd>
      </dl>
      <div className="btn-row">
        <button className="btn" disabled={cloud.phase === 'syncing'} onClick={() => void syncNow()}>
          立即同步
        </button>
        <button className="btn" onClick={() => setDialog('logout')}>
          登出
        </button>
        <button className="btn btn-danger" onClick={() => setDialog('delete')}>
          刪除帳號
        </button>
      </div>

      <Dialog
        open={dialog === 'logout'}
        onClose={() => setDialog(null)}
        title="登出"
        footer={
          <>
            <button className="btn btn-quiet" onClick={() => setDialog(null)}>
              取消
            </button>
            <button className="btn" disabled={busy} onClick={() => void logout(true)}>
              保留資料並登出
            </button>
            <button className="btn btn-danger" disabled={busy} onClick={() => void logout(false)}>
              清除資料並登出
            </button>
          </>
        }
      >
        <p>要把資料留在這個瀏覽器嗎？共用電腦請選「清除資料並登出」，雲端上的資料不受影響。</p>
        {pending > 0 && (
          <p className="form-error">還有 {pending} 筆變更沒有上傳。登出前會先試著同步；如果沒有成功，清除資料會讓這些變更遺失。</p>
        )}
        <p className="sheet-note">錄音只存在這個瀏覽器，清除資料時會一起刪除。</p>
      </Dialog>

      <Dialog open={dialog === 'delete'} onClose={() => setDialog(null)} title="刪除帳號？">
        <form className="stack" style={{ gap: 14 }} onSubmit={removeAccount}>
          <p>帳號和雲端上的所有資料會永久刪除，無法復原。這個瀏覽器裡的資料會保留，之後可以繼續在本機使用。</p>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <label className="field">
            <span className="field-label">輸入密碼確認</span>
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
              取消
            </button>
            <button type="submit" className="btn btn-danger" disabled={busy || !password}>
              永久刪除帳號
            </button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
