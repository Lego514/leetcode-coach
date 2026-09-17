import type { ApiErrorBody, ApiErrorCode } from '../../shared/protocol';

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export type ClientErrorCode = ApiErrorCode | 'network_error' | 'unavailable';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: ClientErrorCode,
    message: string,
  ) {
    super(message);
  }
}

/** 呼叫同網域的 /api；錯誤一律轉成 ApiError */
export async function apiRequest<T>(
  fetchImpl: FetchLike,
  path: string,
  { method = 'GET', body }: { method?: 'GET' | 'POST'; body?: unknown } = {},
): Promise<T> {
  let res: Response;
  try {
    res = await fetchImpl(path, {
      method,
      credentials: 'same-origin',
      headers: { accept: 'application/json', ...(method === 'GET' ? {} : { 'content-type': 'application/json' }) },
      body: method === 'GET' ? undefined : JSON.stringify(body ?? {}),
    });
  } catch {
    throw new ApiError(0, 'network_error', 'Network request failed');
  }

  if (res.status === 204) return undefined as T;

  const isJson = res.headers.get('content-type')?.includes('application/json');
  const payload: unknown = isJson ? await res.json().catch(() => null) : null;
  if (res.ok && isJson) return payload as T;

  const error = (payload as ApiErrorBody | null)?.error;
  if (error?.code) throw new ApiError(res.status, error.code, error.message);
  // 沒有後端的靜態網站會回 HTML 或 404；開發時後端沒開則是 5xx
  throw new ApiError(res.status, 'unavailable', `Server responded with ${res.status}`);
}

/** 畫面依這個代碼顯示對應語言的訊息（i18n 字典的 errors.api） */
export function errorCode(err: unknown): ClientErrorCode | 'unknown' {
  return err instanceof ApiError ? err.code : 'unknown';
}
