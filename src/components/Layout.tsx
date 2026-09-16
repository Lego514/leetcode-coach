import type { ReactNode } from 'react';
import { NavLink, Outlet, ScrollRestoration } from 'react-router';
import { useProgressMap, useToday } from '../store/queries';

interface NavItem {
  to: string;
  label: string;
  end?: boolean;
  badge?: 'due';
}

const NAV_GROUPS: NavItem[][] = [
  [
    { to: '/', label: '今天', end: true },
    { to: '/review', label: '複習', badge: 'due' },
    { to: '/mock', label: '模擬面試' },
  ],
  [
    { to: '/problems', label: '題庫' },
    { to: '/patterns', label: '模板卡' },
    { to: '/phrases', label: '英文句型' },
    { to: '/progress', label: '進度' },
  ],
  [{ to: '/settings', label: '設定' }],
];

function useDueCount(): number {
  const day = useToday();
  const { progress } = useProgressMap();
  let count = 0;
  for (const p of progress.values()) if (p.due <= day) count += 1;
  return count;
}

function Badge({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <span className="nav-count" aria-label={`${count} 題待複習`}>
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

export function Layout() {
  const due = useDueCount();

  return (
    <div className="app">
      <nav className="nav" aria-label="主要導覽">
        <NavLink to="/" className="wordmark" aria-label="刷題教練，回到今天">
          <span className="wordmark-glyph" aria-hidden>
            {Array.from({ length: 9 }, (_, i) => (
              <span key={i} />
            ))}
          </span>
          刷題教練
        </NavLink>
        <div className="nav-groups">
          {NAV_GROUPS.map((group, i) => (
            <ul key={i} className="nav-list">
              {group.map((item) => (
                <li key={item.to}>
                  <NavLink to={item.to} end={item.end} className="nav-link">
                    {item.label}
                    {item.badge === 'due' && <Badge count={due} />}
                  </NavLink>
                </li>
              ))}
            </ul>
          ))}
        </div>
        <p className="nav-foot">資料只存在這個瀏覽器裡，記得定期到設定匯出備份。</p>
      </nav>

      <main className="main" id="main">
        <Outlet />
      </main>

      <nav className="tabbar" aria-label="主要導覽">
        <NavLink to="/" end className="tab">
          <TabIcon>{Icons.today}</TabIcon>
          今天
        </NavLink>
        <NavLink to="/problems" className="tab">
          <TabIcon>{Icons.problems}</TabIcon>
          題庫
        </NavLink>
        <NavLink to="/review" className="tab">
          <TabIcon>{Icons.review}</TabIcon>
          複習
          <Badge count={due} />
        </NavLink>
        <NavLink to="/mock" className="tab">
          <TabIcon>{Icons.mock}</TabIcon>
          模擬
        </NavLink>
        <NavLink to="/more" className="tab">
          <TabIcon>{Icons.more}</TabIcon>
          更多
        </NavLink>
      </nav>
      <ScrollRestoration />
    </div>
  );
}
