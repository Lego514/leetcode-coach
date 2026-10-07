import type { ReportContext, ReportItem, ReportRequest, ReportsResponse } from '../../shared/protocol';
import { apiRequest, type FetchLike } from './api';

const fetchImpl: FetchLike = (input, init) => fetch(input, init);

/** 送出回報；沒登入也可以 */
export function sendReport(body: ReportRequest): Promise<{ id: string }> {
  return apiRequest<{ id: string }>(fetchImpl, '/api/reports', { method: 'POST', body });
}

/** 管理者拿到所有回報，其他人拿到自己送過的 */
export function fetchReports(): Promise<ReportsResponse> {
  return apiRequest<ReportsResponse>(fetchImpl, '/api/reports');
}

export async function resolveReport(id: string, resolved: boolean): Promise<ReportItem> {
  const { report } = await apiRequest<{ report: ReportItem }>(fetchImpl, `/api/reports/${id}/resolve`, {
    method: 'POST',
    body: { resolved },
  });
  return report;
}

/** 回報時自動附上的版本、瀏覽器與畫面大小，方便重現問題 */
export function reportEnvironment(language: string): Pick<ReportContext, 'version' | 'userAgent' | 'language' | 'screen'> {
  return {
    version: __APP_VERSION__,
    userAgent: navigator.userAgent.slice(0, 400),
    language,
    screen: `${window.innerWidth}×${window.innerHeight}`,
  };
}

// 從錯誤畫面按「回報」時，把錯誤訊息暫存起來，回報頁會一起附上
const ERROR_KEY = 'coach:report-error';

export function stashError(message: string): void {
  try {
    sessionStorage.setItem(ERROR_KEY, message.slice(0, 2000));
  } catch {
    // 無痕模式等情況存不了就算了，回報時不附錯誤訊息
  }
}

export function readStashedError(): string | undefined {
  try {
    return sessionStorage.getItem(ERROR_KEY) ?? undefined;
  } catch {
    return undefined;
  }
}

export function clearStashedError(): void {
  try {
    sessionStorage.removeItem(ERROR_KEY);
  } catch {
    // 同上
  }
}

// 回報頁附上「從哪個頁面來的」：Layout 每次換頁時記下來
let lastPage: string | undefined;

export function rememberPage(pathname: string): void {
  if (!pathname.startsWith('/feedback')) lastPage = pathname;
}

export function lastVisitedPage(): string | undefined {
  return lastPage;
}
