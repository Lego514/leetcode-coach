import { useEffect } from 'react';
import { Link, NavLink, Outlet, ScrollRestoration, useLocation } from 'react-router';
import { useI18n, type Messages } from '../i18n';
import { applyUpdate, canReloadNow, useUpdateReady } from '../lib/appUpdate';
import { LOGO_URLS, useLogo } from '../lib/logo';
import { useCloud } from '../store/cloud';
import { clearDemoData, useDemo } from '../store/demo';
import { rememberPage } from '../store/reports';
import { reviewsDoneOn } from '../lib/stats';
import { useAttempts, useProgressMap, useSettings, useToday } from '../store/queries';
import { syncStatusText } from './AccountSection';
import { LanguageSwitch } from './LanguageSwitch';
import { NavIcon } from './NavIcon';
import { WinWatcher } from './Motivation';
import { ThemeToggle } from './ThemeToggle';

type NavKey = keyof Pick<
  Messages['nav'],
  'today' | 'sprint' | 'review' | 'cards' | 'mock' | 'stories' | 'problems' | 'patterns' | 'phrases' | 'board' | 'progress' | 'settings' | 'feedback'
>;

interface NavItem {
  to: string;
  key: NavKey;
  end?: boolean;
  badge?: 'due';
}

// 側邊欄依用途分組：每天都會用的、面試練習、查資料和工具、其他。
// 面試衝刺只有排了面試的那幾週才用，而且衝刺時今天頁就會顯示計畫，所以放在面試練習的最後
const NAV_GROUPS: NavItem[][] = [
  [
    { to: '/', key: 'today', end: true },
    { to: '/review', key: 'review', badge: 'due' },
    { to: '/cards', key: 'cards' },
    { to: '/progress', key: 'progress' },
  ],
  [
    { to: '/mock', key: 'mock' },
    { to: '/stories', key: 'stories' },
    { to: '/sprint', key: 'sprint' },
  ],
  [
    { to: '/problems', key: 'problems' },
    { to: '/patterns', key: 'patterns' },
    { to: '/phrases', key: 'phrases' },
    { to: '/board', key: 'board' },
  ],
  [
    { to: '/settings', key: 'settings' },
    { to: '/feedback', key: 'feedback' },
  ],
];

function useDueCount(): number {
  const day = useToday();
  const { progress } = useProgressMap();
  const settings = useSettings();
  const attempts = useAttempts();
  let count = 0;
  for (const p of progress.values()) if (p.due <= day) count += 1;
  // 設了每天最多複習幾題時，只數今天要做的
  if (settings.maxReviews === undefined) return count;
  return Math.min(count, Math.max(0, settings.maxReviews - reviewsDoneOn(attempts ?? [], day)));
}

/** 練習或模擬面試進行中時，讓使用者自己決定何時更新 */
/** 看示範資料時，每一頁上面都提醒一下，可以一鍵清掉 */
function DemoBanner() {
  const { t } = useI18n();
  const demo = useDemo();
  if (!demo) return null;
  return (
    <div className="demo-banner" role="status">
      <span>{t.demo.banner}</span>
      <button type="button" className="btn btn-small" onClick={() => void clearDemoData()}>
        {t.demo.clear}
      </button>
    </div>
  );
}

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

function SyncFootnote() {
  const { t, fmt } = useI18n();
  const cloud = useCloud();
  const { account } = cloud;
  if (account.kind === 'loading') return null;
  if (account.kind === 'signed-in') {
    return (
      <p className="nav-foot">
        <Link to="/account" className="nav-foot-link">
          {account.user.email}
        </Link>
        <br />
        <span className={cloud.phase === 'error' ? 'overdue' : undefined}>{syncStatusText(cloud, t, fmt)}</span>
      </p>
    );
  }
  return (
    <>
      <p className="nav-foot">{t.nav.localOnly}</p>
      {/* 沒登入時放一個明顯的按鈕，不用到設定頁裡找 */}
      {account.kind === 'signed-out' && (
        <Link to="/account" className="btn btn-primary btn-small nav-signin">
          {t.nav.signIn}
        </Link>
      )}
    </>
  );
}

export function Layout() {
  const { t } = useI18n();
  const due = useDueCount();
  const updateReady = useUpdateReady();
  const { pathname } = useLocation();
  const safeToReload = canReloadNow(pathname);

  const [logo] = useLogo();
  // 回報問題時附上是從哪個頁面來的
  useEffect(() => rememberPage(pathname), [pathname]);

  // 有新版時自動重新載入；計時中的頁面等離開後再套用
  useEffect(() => {
    if (updateReady && safeToReload) void applyUpdate();
  }, [updateReady, safeToReload]);

  return (
    <div className="app">
      <nav className="nav" aria-label={t.nav.main}>
        <NavLink to="/" className="wordmark" aria-label={t.app.homeLabel}>
          {/* 圖示可以在設定裡換；方格是原本的，跟著深色模式換顏色 */}
          {logo === 'grid' ? (
            <span className="wordmark-glyph" aria-hidden>
              {Array.from({ length: 9 }, (_, i) => (
                <span key={i} />
              ))}
            </span>
          ) : (
            <img className="wordmark-logo" src={LOGO_URLS[logo]} alt="" data-logo={logo} />
          )}
          {t.app.name}
        </NavLink>
        <div className="nav-groups">
          {NAV_GROUPS.map((group, i) => (
            <ul key={i} className="nav-list">
              {group.map((item) => (
                <li key={item.to}>
                  <NavLink to={item.to} end={item.end} className="nav-link">
                    <span className="nav-label">
                      <NavIcon name={item.key} />
                      {t.nav[item.key]}
                    </span>
                    {item.badge === 'due' && <Badge count={due} />}
                  </NavLink>
                </li>
              ))}
            </ul>
          ))}
        </div>
        <div className="nav-bottom">
          {updateReady && !safeToReload && <UpdateNotice />}
          <div className="prefs">
            <LanguageSwitch compact />
            <ThemeToggle compact />
          </div>
          <SyncFootnote />
        </div>
      </nav>

      <main className="main" id="main">
        <DemoBanner />
        <Outlet />
        <WinWatcher />
      </main>

      <nav className="tabbar" aria-label={t.nav.main}>
        <NavLink to="/" end className="tab">
          <NavIcon name="today" />
          {t.nav.today}
        </NavLink>
        <NavLink to="/review" className="tab">
          <NavIcon name="review" />
          {t.nav.review}
          <Badge count={due} />
        </NavLink>
        <NavLink to="/progress" className="tab">
          <NavIcon name="progress" />
          {t.nav.progress}
        </NavLink>
        <NavLink to="/problems" className="tab">
          <NavIcon name="problems" />
          {t.nav.problems}
        </NavLink>
        <NavLink to="/more" className="tab">
          <NavIcon name="more" />
          {t.nav.more}
        </NavLink>
      </nav>
      <ScrollRestoration />
    </div>
  );
}
