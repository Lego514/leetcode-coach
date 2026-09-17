import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { Link, NavLink, Outlet, ScrollRestoration, useLocation } from 'react-router';
import { useI18n, type Messages } from '../i18n';
import { applyUpdate, canReloadNow, useUpdateReady } from '../lib/appUpdate';
import { rich } from '../i18n/rich';
import { useCloud } from '../store/cloud';
import { useProgressMap, useToday } from '../store/queries';
import { syncStatusText } from './AccountSection';
import { LanguageSwitch } from './LanguageSwitch';

type NavKey = keyof Pick<Messages['nav'], 'today' | 'review' | 'mock' | 'problems' | 'patterns' | 'phrases' | 'progress' | 'settings'>;

interface NavItem {
  to: string;
  key: NavKey;
  end?: boolean;
  badge?: 'due';
}

const NAV_GROUPS: NavItem[][] = [
  [
    { to: '/', key: 'today', end: true },
    { to: '/review', key: 'review', badge: 'due' },
    { to: '/mock', key: 'mock' },
  ],
  [
    { to: '/problems', key: 'problems' },
    { to: '/patterns', key: 'patterns' },
    { to: '/phrases', key: 'phrases' },
    { to: '/progress', key: 'progress' },
  ],
  [{ to: '/settings', key: 'settings' }],
];

function useDueCount(): number {
  const day = useToday();
  const { progress } = useProgressMap();
  let count = 0;
  for (const p of progress.values()) if (p.due <= day) count += 1;
  return count;
}

/** 練習或模擬面試進行中時，讓使用者自己決定何時更新 */
function UpdateNotice() {
  const { t } = useI18n();
  return (
    <p className="nav-foot">
      {t.app.updateReady}{' '}
      <button type="button" className="link-button" onClick={() => void applyUpdate()}>
        {t.app.updateNow}
      </button>
    </p>
  );
}

function Badge({ count }: { count: number }) {
  const { t } = useI18n();
  if (count === 0) return null;
  return (
    <span className="nav-count" aria-label={t.nav.dueBadge(count)}>
      {count > 99 ? '99+' : count}
    </span>
  );
}

const Icons = {
  today: (
    <path d="M4 6.5h16M8 3v4M16 3v4M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Zm4 9 2 2 4-4" />
  ),
  problems: <path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" />,
  review: <path d="M20 12a8 8 0 1 1-2.34-5.66M20 4v4h-4" />,
  mock: <path d="M12 8v4l2.5 2.5M12 21a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM10 2h4" />,
  more: <path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z" />,
};

function TabIcon({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {children}
    </svg>
  );
}

function SyncFootnote() {
  const { t, fmt } = useI18n();
  const cloud = useCloud();
  const { account } = cloud;
  if (account.kind === 'loading') return null;
  if (account.kind === 'signed-in') {
    return (
      <p className="nav-foot">
        <Link to="/settings" className="nav-foot-link">
          {account.user.email}
        </Link>
        <br />
        <span className={cloud.phase === 'error' ? 'overdue' : undefined}>{syncStatusText(cloud, t, fmt)}</span>
      </p>
    );
  }
  return (
    <p className="nav-foot">
      {t.nav.localOnly}
      {account.kind === 'signed-out' && (
        <>
          {' '}
          {rich(t.nav.signInToSync, {
            link: (text) => (
              <Link to="/settings" className="nav-foot-link">
                {text}
              </Link>
            ),
          })}
        </>
      )}
    </p>
  );
}

export function Layout() {
  const { t } = useI18n();
  const due = useDueCount();
  const updateReady = useUpdateReady();
  const { pathname } = useLocation();
  const safeToReload = canReloadNow(pathname);

  // 有新版時自動重新載入；計時中的頁面等離開後再套用
  useEffect(() => {
    if (updateReady && safeToReload) void applyUpdate();
  }, [updateReady, safeToReload]);

  return (
    <div className="app">
      <nav className="nav" aria-label={t.nav.main}>
        <NavLink to="/" className="wordmark" aria-label={t.app.homeLabel}>
          <span className="wordmark-glyph" aria-hidden>
            {Array.from({ length: 9 }, (_, i) => (
              <span key={i} />
            ))}
          </span>
          {t.app.name}
        </NavLink>
        <div className="nav-groups">
          {NAV_GROUPS.map((group, i) => (
            <ul key={i} className="nav-list">
              {group.map((item) => (
                <li key={item.to}>
                  <NavLink to={item.to} end={item.end} className="nav-link">
                    {t.nav[item.key]}
                    {item.badge === 'due' && <Badge count={due} />}
                  </NavLink>
                </li>
              ))}
            </ul>
          ))}
        </div>
        <div className="nav-bottom">
          {updateReady && !safeToReload && <UpdateNotice />}
          <LanguageSwitch compact />
          <SyncFootnote />
        </div>
      </nav>

      <main className="main" id="main">
        <Outlet />
      </main>

      <nav className="tabbar" aria-label={t.nav.main}>
        <NavLink to="/" end className="tab">
          <TabIcon>{Icons.today}</TabIcon>
          {t.nav.today}
        </NavLink>
        <NavLink to="/problems" className="tab">
          <TabIcon>{Icons.problems}</TabIcon>
          {t.nav.problems}
        </NavLink>
        <NavLink to="/review" className="tab">
          <TabIcon>{Icons.review}</TabIcon>
          {t.nav.review}
          <Badge count={due} />
        </NavLink>
        <NavLink to="/mock" className="tab">
          <TabIcon>{Icons.mock}</TabIcon>
          {t.nav.mockShort}
        </NavLink>
        <NavLink to="/more" className="tab">
          <TabIcon>{Icons.more}</TabIcon>
          {t.nav.more}
        </NavLink>
      </nav>
      <ScrollRestoration />
    </div>
  );
}
