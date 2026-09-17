import { isRouteErrorResponse, Link, useRouteError } from 'react-router';
import { LanguageSwitch } from '../components/LanguageSwitch';
import { PageHead } from '../components/ui';
import { useI18n } from '../i18n';

const MORE_LINKS = [
  { to: '/progress', key: 'progress' },
  { to: '/patterns', key: 'patterns' },
  { to: '/phrases', key: 'phrases' },
  { to: '/settings', key: 'settings' },
] as const;

export function MorePage() {
  const { t } = useI18n();
  return (
    <div className="page">
      <PageHead title={t.more.title}>
        <div style={{ marginTop: 16 }}>
          <LanguageSwitch />
        </div>
      </PageHead>
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
          </div>
        </PageHead>
      </div>
    </div>
  );
}
