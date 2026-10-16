// 端對端測試用的假 GitHub：授權頁、換 token、讀帳號的 API。
// 測試先打開 /as?account=… 選要用哪個 GitHub 帳號（存在這個瀏覽器的 cookie），
// 授權頁就直接「按授權」，把帳號和 PKCE 的 challenge 編進授權碼；換 token 時檢查 verifier。
// 什麼狀態都不用記，同時跑的測試互不影響。
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';

const port = Number(process.env.FAKE_GITHUB_PORT ?? 4320);
const decode = (value) => JSON.parse(Buffer.from(value, 'base64url').toString('utf8'));

function json(res, status, body) {
  res.writeHead(status, { 'content-type': 'application/json' }).end(JSON.stringify(body));
}

createServer((req, res) => {
  const url = new URL(req.url ?? '/', `http://localhost:${port}`);
  if (url.pathname === '/health') return json(res, 200, { ok: true });

  if (url.pathname === '/as') {
    res.writeHead(200, { 'set-cookie': `fake_github_account=${url.searchParams.get('account')}; Path=/; SameSite=Lax`, 'content-type': 'text/plain' });
    return res.end('ok');
  }

  if (url.pathname === '/login/oauth/authorize') {
    const cookie = /(?:^|; )fake_github_account=([^;]+)/.exec(req.headers.cookie ?? '')?.[1];
    const redirectUri = url.searchParams.get('redirect_uri');
    if (!cookie || !redirectUri) return json(res, 400, { message: 'Pick an account with /as first' });
    const code = Buffer.from(
      JSON.stringify({ account: decode(cookie), challenge: url.searchParams.get('code_challenge'), redirectUri }),
    ).toString('base64url');
    const back = new URL(redirectUri);
    back.searchParams.set('code', code);
    back.searchParams.set('state', url.searchParams.get('state') ?? '');
    res.writeHead(302, { location: back.toString() });
    return res.end();
  }

  if (req.method === 'POST' && url.pathname === '/login/oauth/access_token') {
    let raw = '';
    req.on('data', (chunk) => (raw += chunk));
    req.on('end', () => {
      try {
        const body = JSON.parse(raw);
        const grant = decode(body.code);
        const challenge = createHash('sha256').update(body.code_verifier).digest('base64url');
        if (challenge !== grant.challenge || body.redirect_uri !== grant.redirectUri) {
          return json(res, 200, { error: 'bad_verification_code' });
        }
        json(res, 200, { access_token: Buffer.from(JSON.stringify(grant.account)).toString('base64url') });
      } catch {
        json(res, 200, { error: 'bad_verification_code' });
      }
    });
    return;
  }

  const token = (req.headers.authorization ?? '').replace('Bearer ', '');
  let account;
  try {
    account = decode(token);
  } catch {
    return json(res, 401, { message: 'Bad credentials' });
  }
  if (url.pathname === '/user') return json(res, 200, { id: account.id, login: account.login });
  if (url.pathname === '/user/emails') return json(res, 200, [{ email: account.email, primary: true, verified: true }]);
  json(res, 404, { message: 'Not Found' });
}).listen(port, '127.0.0.1');
