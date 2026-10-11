import { isRouteErrorResponse, Link, useRouteError } from 'react-router';
import { syncStatusText } from '../components/AccountSection';
import { LanguageSwitch } from '../components/LanguageSwitch';
import { ThemeToggle } from '../components/ThemeToggle';
import { PageHead } from '../components/ui';
import { useI18n } from '../i18n';
import { useCloud } from '../store/cloud';
import { stashError } from '../store/reports';

const MORE_LINKS = [
  { to: '/sprint', key: 'sprint' },
  { to: '/stories', key: 'stories' },
  { to: '/cards', key: 'cards' },
  { to: '/board', key: 'board' },
  { to: '/progress', key: 'progress' },
  { to: '/patterns', key: 'patterns' },
  { to: '/phrases', key: 'phrases' },
  { to: '/settings', key: 'settings' },
  { to: '/feedback', key: 'feedback' },
] as const;

export function MorePage() {
  const { t } = useI18n();
  return (
    <div className="page">
      <PageHead title={t.more.title}>
        <div className="prefs" style={{ marginTop: 16 }}>
          <LanguageSwitch />
          <ThemeToggle />
        </div>
      </PageHead>
      <div className="stack" style={{ gap: 16 }}>
        <AccountCard />
        <nav className="sheet" aria-label={t.more.label}>
          <ul className="more-list">
            {MORE_LINKS.map((l) => (
              <li key={l.to}>
                <Link className="more-link" to={l.to}>
                  {t.nav[l.key]}
                  <span>{t.more[l.key]}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </div>
  );
}

/** 手機版沒有側邊欄，登入入口放在「更多」最上面 */
function AccountCard() {
  const { t, fmt } = useI18n();
  const cloud = useCloud();
  const { account } = cloud;
  if (account.kind === 'loading') return null;
  if (account.kind === 'signed-in') {
    return (
      <Link className="sheet more-account" to="/account" aria-label={t.more.accountLink(account.user.email)}>
        <span className="more-account-text">
          <span className="more-account-title">{account.user.email}</span>
          <span className="more-account-note">{syncStatusText(cloud, t, fmt)}</span>
        </span>
        <span className="more-account-go" aria-hidden>
          ›
        </span>
      </Link>
    );
  }
  return (
    <section className="sheet more-account" aria-labelledby="more-account-title">
      <span className="more-account-text">
        <span className="more-account-title" id="more-account-title">
          {t.more.accountTitle}
        </span>
        <span className="more-account-note">{account.kind === 'unavailable' ? t.account.unavailable : t.more.accountNote}</span>
      </span>
      {account.kind === 'signed-out' && (
        <Link className="btn btn-primary" to="/account">
          {t.nav.signIn}
        </Link>
      )}
    </section>
  );
}

export function NotFoundPage() {
  const { t } = useI18n();
  return (
    <div className="page">
      <PageHead title={t.notFound.title} lede={t.notFound.lede}>
        <div className="btn-row" style={{ marginTop: 16 }}>
          <Link className="btn btn-primary" to="/">
            {t.common.backToToday}
          </Link>
        </div>
      </PageHead>
    </div>
  );
}

export function ErrorPage() {
  const { t } = useI18n();
  const error = useRouteError();
  const message = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : error instanceof Error
      ? error.message
      : String(error);
  return (
    <div className="main">
      <div className="page">
        <PageHead title={t.errorPage.title} lede={t.errorPage.lede}>
          <pre className="code-block" style={{ marginTop: 16, whiteSpace: 'pre-wrap' }}>
            {message}
          </pre>
          <div className="btn-row" style={{ marginTop: 16 }}>
            <button className="btn btn-primary" onClick={() => window.location.reload()}>
              {t.errorPage.reload}
            </button>
            <a className="btn" href="#/">
              {t.common.backToToday}
            </a>
            <a className="btn btn-quiet" href="#/feedback" onClick={() => stashError(message)}>
              {t.errorPage.report}
            </a>
          </div>
        </PageHead>
      </div>
    </div>
  );
}
