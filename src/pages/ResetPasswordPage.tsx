import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { PASSWORD_MIN_LENGTH } from '../../shared/constants';
import { useToast } from '../components/toast';
import { PageHead, Sheet } from '../components/ui';
import { useI18n } from '../i18n';
import { errorCode } from '../store/api';
import { resetPassword } from '../store/cloud';

/** 信件裡的連結會帶著 token 打開這一頁 */
export function ResetPasswordPage() {
  const { t } = useI18n();
  const toast = useToast();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const [password, setPassword] = useState('');
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await resetPassword(token, password);
      toast(t.account.resetDone);
      navigate('/settings', { replace: true });
    } catch (err) {
      setError(t.errors.api[errorCode(err)]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page">
      <PageHead title={t.account.resetTitle} lede={t.account.resetIntro} />
      <Sheet title={t.account.resetTitle} id="reset">
        <div className="sheet-body">
          {!token ? (
            <>
              <p className="sheet-note">{t.account.resetNoToken}</p>
              <div className="btn-row" style={{ marginTop: 12 }}>
                <Link className="btn" to="/settings">
                  {t.account.resetBackToSettings}
                </Link>
              </div>
            </>
          ) : (
            <form className="stack" style={{ gap: 14 }} onSubmit={submit}>
              {error && (
                <p className="form-error" role="alert">
                  {error}
                </p>
              )}
              <div className="field">
                <label className="field-label" htmlFor="new-password">
                  {t.account.password}
                </label>
                <div className="password-field">
                  <input
                    id="new-password"
                    className="input"
                    type={visible ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    autoFocus
                    minLength={PASSWORD_MIN_LENGTH}
                    maxLength={200}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    aria-pressed={visible}
                    onClick={() => setVisible((v) => !v)}
                  >
                    {visible ? t.account.hidePassword : t.account.showPassword}
                  </button>
                </div>
                <span className="field-hint">{t.account.passwordHint(PASSWORD_MIN_LENGTH)}</span>
              </div>
              <div className="btn-row">
                <button type="submit" className="btn btn-primary" disabled={busy}>
                  {t.account.resetSubmit}
                </button>
              </div>
            </form>
          )}
        </div>
      </Sheet>
    </div>
  );
}
