import { createHashRouter, RouterProvider } from 'react-router';
import { Layout } from './components/Layout';
import { ToastProvider } from './components/toast';
import { ErrorPage, MorePage, NotFoundPage } from './pages/MiscPages';
import { ProblemsPage } from './pages/ProblemsPage';
import { ReviewPage } from './pages/ReviewPage';
import { TodayPage } from './pages/TodayPage';

// 每天會用到的頁面直接打包；其他頁面第一次打開時才載入
const router = createHashRouter([
  {
    element: <Layout />,
    errorElement: <ErrorPage />,
    hydrateFallbackElement: <div className="main" aria-busy="true" />,
    children: [
      { index: true, element: <TodayPage /> },
      { path: 'problems', element: <ProblemsPage /> },
      { path: 'review', element: <ReviewPage /> },
      { path: 'more', element: <MorePage /> },
      {
        path: 'problems/:id',
        lazy: async () => ({ Component: (await import('./pages/ProblemDetailPage')).ProblemDetailPage }),
      },
      {
        path: 'practice/:id',
        lazy: async () => ({ Component: (await import('./pages/PracticePage')).PracticePage }),
      },
      {
        path: 'mock',
        lazy: async () => ({ Component: (await import('./pages/MockPage')).MockPage }),
      },
      {
        path: 'patterns',
        lazy: async () => ({ Component: (await import('./pages/PatternsPage')).PatternsPage }),
      },
      {
        path: 'patterns/:id',
        lazy: async () => ({ Component: (await import('./pages/PatternsPage')).PatternDetailPage }),
      },
      {
        path: 'phrases',
        lazy: async () => ({ Component: (await import('./pages/PhrasesPage')).PhrasesPage }),
      },
      {
        path: 'progress',
        lazy: async () => ({ Component: (await import('./pages/ProgressPage')).ProgressPage }),
      },
      {
        path: 'settings',
        lazy: async () => ({ Component: (await import('./pages/SettingsPage')).SettingsPage }),
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);

export function App() {
  return (
    <ToastProvider>
      <RouterProvider router={router} />
    </ToastProvider>
  );
}
