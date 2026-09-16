import { isRouteErrorResponse, Link, useRouteError } from 'react-router';
import { PageHead } from '../components/ui';

const MORE_LINKS = [
  { to: '/progress', label: '進度', detail: '各模式熟練度、每週練習次數' },
  { to: '/patterns', label: '模板卡', detail: '辨識訊號、常見錯誤與 Python 模板' },
  { to: '/phrases', label: '英文句型', detail: '面試各步驟常用的英文句子' },
  { to: '/settings', label: '設定', detail: '清單、每日題數、目標日期、備份' },
];

export function MorePage() {
  return (
    <div className="page">
      <PageHead title="更多" />
      <nav className="sheet" aria-label="更多頁面">
        <ul className="more-list">
          {MORE_LINKS.map((l) => (
            <li key={l.to}>
              <Link className="more-link" to={l.to}>
                {l.label}
                <span>{l.detail}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}

export function NotFoundPage() {
  return (
    <div className="page">
      <PageHead title="找不到這個頁面" lede="網址可能打錯了，或這個頁面已經不存在。">
        <div className="btn-row" style={{ marginTop: 16 }}>
          <Link className="btn btn-primary" to="/">
            回到今天
          </Link>
        </div>
      </PageHead>
    </div>
  );
}

export function ErrorPage() {
  const error = useRouteError();
  const message = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : error instanceof Error
      ? error.message
      : String(error);
  return (
    <div className="main">
      <div className="page">
        <PageHead title="畫面出了問題" lede="重新整理頁面通常就能恢復，你的資料不會因此消失。">
          <pre className="code-block" style={{ marginTop: 16, whiteSpace: 'pre-wrap' }}>
            {message}
          </pre>
          <div className="btn-row" style={{ marginTop: 16 }}>
            <button className="btn btn-primary" onClick={() => window.location.reload()}>
              重新整理
            </button>
            <a className="btn" href="#/">
              回到今天
            </a>
          </div>
        </PageHead>
      </div>
    </div>
  );
}
