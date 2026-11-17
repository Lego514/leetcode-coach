import { proxyApi } from './proxy';

// Cloudflare Worker：/api/* 先到這裡（wrangler.jsonc 的 run_worker_first），其他網址直接回 dist/ 裡的靜態檔。

interface Env {
  ASSETS: { fetch: (request: Request) => Promise<Response> };
  /** Render 上的伺服器，例如 https://leetcode-coach-f6q7.onrender.com */
  API_ORIGIN: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === '/api' || url.pathname.startsWith('/api/')) {
      return proxyApi(request, env.API_ORIGIN, request.headers.get('cf-connecting-ip'));
    }
    return env.ASSETS.fetch(request);
  },
};
