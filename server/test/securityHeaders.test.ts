import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { PAGE_SECURITY_HEADERS } from '../../shared/securityHeaders';
import { startTestServer, type TestServer } from './helpers';

const HEADERS_FILE = path.resolve(__dirname, '../../public/_headers');

/** public/_headers 裡某個網址規則底下的標頭 */
async function cloudflareHeaders(rule: string): Promise<Record<string, string>> {
  const lines = (await readFile(HEADERS_FILE, 'utf8')).split('\n');
  const start = lines.indexOf(rule);
  expect(start).toBeGreaterThanOrEqual(0);
  const headers: Record<string, string> = {};
  for (const line of lines.slice(start + 1)) {
    if (!/^\s+\S/.test(line)) break;
    const [name, ...value] = line.trim().split(': ');
    headers[name] = value.join(': ');
  }
  return headers;
}

describe('page security headers', () => {
  let server: TestServer;
  let staticDir: string;

  beforeEach(async () => {
    staticDir = await mkdtemp(path.join(os.tmpdir(), 'coach-static-'));
    await writeFile(path.join(staticDir, 'index.html'), '<!doctype html><title>coach</title>');
    server = await startTestServer({ staticDir });
  });

  afterEach(async () => {
    await server.close();
    await rm(staticDir, { recursive: true, force: true });
  });

  it('Cloudflare sends the same headers as the Node server', async () => {
    const headers = await cloudflareHeaders('/*');
    for (const [name, value] of Object.entries(PAGE_SECURITY_HEADERS)) expect(headers[name], name).toBe(value);
  });

  it('the Node server sends them on the page and on unknown paths', async () => {
    for (const url of ['/', '/index.html', '/some/deep/link']) {
      const res = await server.app.request(`http://localhost${url}`);
      expect(res.status, url).toBe(200);
      for (const [name, value] of Object.entries(PAGE_SECURITY_HEADERS)) expect(res.headers.get(name), `${url} ${name}`).toBe(value);
    }
  });

  it('API responses keep their own headers', async () => {
    const res = await server.app.request('http://localhost/api/health');
    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
    expect(res.headers.get('cache-control')).toBe('no-store');
  });
});
