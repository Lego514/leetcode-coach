import { afterEach, describe, expect, it } from 'vitest';
import type { MailOptions } from '../src/auth/routes';
import { RESET_TTL_MS } from '../src/auth/reset';
import { createBrevoMailer, MailError, resetPasswordMail, type MailMessage } from '../src/mail/brevo';
import { startTestServer, TestClient, type TestServer } from './helpers';

const APP_URL = 'https://coach.example.com';
const EMAIL = 'ray@example.com';
const OLD_PASSWORD = 'correct horse battery';
const NEW_PASSWORD = 'a brand new password';

let server: TestServer | undefined;

afterEach(async () => {
  await server?.close();
  server = undefined;
});

function mailbox() {
  const sent: MailMessage[] = [];
  const mail: MailOptions = { appUrl: APP_URL, send: async (message) => void sent.push(message) };
  return { sent, mail };
}

/** 從信件內容取出重設連結裡的 token */
function tokenFrom(message: MailMessage): string {
  const match = message.text.match(/#\/reset\?token=([\w-]+)/);
  if (!match) throw new Error(`No reset link in: ${message.text}`);
  return decodeURIComponent(match[1]);
}

async function withAccount(mail?: MailOptions) {
  server = await startTestServer({ mail });
  const client = new TestClient(server.app);
  expect((await client.register(EMAIL, OLD_PASSWORD)).status).toBe(201);
  return client;
}

describe('password reset', () => {
  it('emails a link that sets a new password, signs in, and logs out other devices', async () => {
    const { sent, mail } = mailbox();
    const laptop = await withAccount(mail);
    const phone = new TestClient(server!.app);
    expect((await phone.login(EMAIL, OLD_PASSWORD)).status).toBe(200);

    expect((await laptop.request('POST', '/api/auth/forgot-password', { email: ' RAY@Example.com ' })).status).toBe(204);
    expect(sent).toHaveLength(1);
    expect(sent[0].to).toBe(EMAIL);
    expect(sent[0].text).toContain(`${APP_URL}/#/reset?token=`);

    const fresh = new TestClient(server!.app);
    const res = await fresh.request('POST', '/api/auth/reset-password', { token: tokenFrom(sent[0]), password: NEW_PASSWORD });
    expect(res.status).toBe(200);
    expect((await res.json()).user.email).toBe(EMAIL);
    // 重設後直接登入
    expect((await fresh.whoami())?.email).toBe(EMAIL);
    // 其他裝置的登入失效
    expect(await phone.whoami()).toBeNull();

    const check = new TestClient(server!.app);
    expect((await check.login(EMAIL, OLD_PASSWORD)).status).toBe(401);
    expect((await check.login(EMAIL, NEW_PASSWORD)).status).toBe(200);
  });

  it('rejects a reused, expired, or unknown token', async () => {
    const { sent, mail } = mailbox();
    const client = await withAccount(mail);

    await client.request('POST', '/api/auth/forgot-password', { email: EMAIL });
    const token = tokenFrom(sent[0]);
    expect((await client.request('POST', '/api/auth/reset-password', { token, password: NEW_PASSWORD })).status).toBe(200);

    const reused = await client.request('POST', '/api/auth/reset-password', { token, password: 'another password' });
    expect(reused.status).toBe(400);
    expect((await reused.json()).error.code).toBe('invalid_token');

    await client.request('POST', '/api/auth/forgot-password', { email: EMAIL });
    server!.clock.now = new Date(server!.clock.now.getTime() + RESET_TTL_MS + 1000);
    const expired = await client.request('POST', '/api/auth/reset-password', { token: tokenFrom(sent[1]), password: 'third password' });
    expect(expired.status).toBe(400);

    const unknown = await client.request('POST', '/api/auth/reset-password', { token: 'not-a-real-token', password: 'fourth password' });
    expect(unknown.status).toBe(400);
  });

  it('only keeps the newest link for an account', async () => {
    const { sent, mail } = mailbox();
    const client = await withAccount(mail);
    await client.request('POST', '/api/auth/forgot-password', { email: EMAIL });
    await client.request('POST', '/api/auth/forgot-password', { email: EMAIL });

    expect((await client.request('POST', '/api/auth/reset-password', { token: tokenFrom(sent[0]), password: NEW_PASSWORD })).status).toBe(400);
    expect((await client.request('POST', '/api/auth/reset-password', { token: tokenFrom(sent[1]), password: NEW_PASSWORD })).status).toBe(200);
  });

  it('says nothing about whether an email is registered', async () => {
    const { sent, mail } = mailbox();
    const client = await withAccount(mail);
    const res = await client.request('POST', '/api/auth/forgot-password', { email: 'nobody@example.com' });
    expect(res.status).toBe(204);
    expect(sent).toHaveLength(0);
  });

  it('limits how many emails one address can trigger', async () => {
    const { sent, mail } = mailbox();
    const client = await withAccount(mail);
    for (let i = 0; i < 3; i++) {
      expect((await client.request('POST', '/api/auth/forgot-password', { email: EMAIL })).status).toBe(204);
    }
    const blocked = await client.request('POST', '/api/auth/forgot-password', { email: EMAIL });
    expect(blocked.status).toBe(429);
    expect(sent).toHaveLength(3);
  });

  it('is off when no mail service is configured', async () => {
    const client = await withAccount();
    const res = await client.request('POST', '/api/auth/forgot-password', { email: EMAIL });
    expect(res.status).toBe(503);
    expect((await res.json()).error.code).toBe('mail_unavailable');
  });

  it('reports a mail service failure without leaving a usable link', async () => {
    server = await startTestServer({
      mail: {
        appUrl: APP_URL,
        send: async () => {
          throw new MailError('nope');
        },
      },
    });
    const client = new TestClient(server.app);
    await client.register(EMAIL, OLD_PASSWORD);
    const res = await client.request('POST', '/api/auth/forgot-password', { email: EMAIL });
    expect(res.status).toBe(502);
    expect((await res.json()).error.code).toBe('mail_unavailable');
  });
});

describe('Brevo mailer', () => {
  const message = resetPasswordMail(EMAIL, { appUrl: APP_URL, token: 'abc', minutes: 60 });

  it('posts the message to the Brevo API', async () => {
    let request: { url: string; init: RequestInit } | undefined;
    const send = createBrevoMailer({
      apiKey: 'key-123',
      fromEmail: 'coach@example.com',
      fromName: 'Coach',
      fetchImpl: async (url, init) => {
        request = { url: String(url), init: init! };
        return new Response('{}', { status: 201 });
      },
    });

    await send(message);
    expect(request?.url).toBe('https://api.brevo.com/v3/smtp/email');
    expect((request?.init.headers as Record<string, string>)['api-key']).toBe('key-123');
    expect(JSON.parse(String(request?.init.body))).toMatchObject({
      sender: { email: 'coach@example.com', name: 'Coach' },
      to: [{ email: EMAIL }],
      textContent: message.text,
    });
  });

  it('turns an error response into a MailError', async () => {
    const send = createBrevoMailer({
      apiKey: 'key-123',
      fromEmail: 'coach@example.com',
      fromName: 'Coach',
      fetchImpl: async () => new Response('{"message":"sender not valid"}', { status: 400 }),
    });
    await expect(send(message)).rejects.toBeInstanceOf(MailError);
  });

  it('includes a one-time link and both languages', () => {
    expect(message.text).toContain(`${APP_URL}/#/reset?token=abc`);
    expect(message.text).toContain('expires in 60 minutes');
    expect(message.text).toContain('60 分鐘後失效');
  });
});
