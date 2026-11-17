// 網頁放在 Cloudflare（不會睡），/api 轉給 Render 上的伺服器。
// 伺服器睡著時網頁照樣秒開；只有登入、同步、AI 這些要連伺服器的才等它醒來（同步本來就會離線重試）。
// 這個檔案只有轉送的邏輯，不碰 Cloudflare 的型別，單元測試直接跑。

/** 轉給伺服器的請求：路徑和查詢參數照舊，換成伺服器的網址 */
export function toApiRequest(request: Request, apiOrigin: string, clientIp: string | null): Request {
  const url = new URL(request.url);
  const target = new URL(url.pathname + url.search, apiOrigin);
  const headers = new Headers(request.headers);
  // Host 由 fetch 依目標網址設定；使用者的 IP 給伺服器限流用（server/src/http.ts 的 clientIp 讀第一個）
  headers.delete('host');
  if (clientIp) headers.set('x-forwarded-for', clientIp);
  else headers.delete('x-forwarded-for');
  headers.set('x-forwarded-host', url.host);
  headers.set('x-forwarded-proto', url.protocol.replace(':', ''));
  const hasBody = request.method !== 'GET' && request.method !== 'HEAD';
  return new Request(target, {
    method: request.method,
    headers,
    body: hasBody ? request.body : undefined,
    // 轉址（例如 GitHub 登入的 302）原樣交給瀏覽器，不在這裡跟著走
    redirect: 'manual',
    ...(hasBody ? { duplex: 'half' } : {}),
  } as RequestInit);
}

/** 伺服器連不上（例如正在部署）：回一個 API 格式的錯誤，前端照一般的離線處理 */
export function unavailable(): Response {
  return new Response(JSON.stringify({ error: { code: 'unavailable', message: 'The server is waking up or unavailable' } }), {
    status: 503,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store', 'retry-after': '30' },
  });
}

export async function proxyApi(request: Request, apiOrigin: string, clientIp: string | null, fetcher: typeof fetch = fetch): Promise<Response> {
  try {
    return await fetcher(toApiRequest(request, apiOrigin, clientIp));
  } catch {
    return unavailable();
  }
}
