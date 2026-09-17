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

const MESSAGES: Record<ClientErrorCode, string> = {
  invalid_request: '輸入的資料格式不正確。',
  unsupported_media_type: '請求格式不正確。',
  forbidden_origin: '這個網址不被允許使用同步功能。',
  email_taken: '這個 email 已經註冊過了，請直接登入。',
  invalid_credentials: 'Email 或密碼不正確。',
  unauthorized: '登入已過期，請重新登入。',
  rate_limited: '嘗試太多次了，請過幾分鐘再試。',
  payload_too_large: '資料太大，無法上傳。',
  not_found: '找不到同步伺服器。',
  server_error: '伺服器發生錯誤，請稍後再試。',
  network_error: '連不到伺服器，請確認網路連線。',
  unavailable: '目前連不到同步伺服器。',
};

export function errorMessage(err: unknown): string {
  if (err instanceof ApiError) return MESSAGES[err.code];
  return err instanceof Error ? err.message : String(err);
}
