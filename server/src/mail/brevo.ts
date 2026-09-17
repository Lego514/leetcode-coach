export interface MailMessage {
  to: string;
  subject: string;
  text: string;
}

/** 寄信；沒有設定寄信服務時整個功能會停用，不會呼叫這個函式 */
export type Mailer = (message: MailMessage) => Promise<void>;

export class MailError extends Error {}

export interface BrevoOptions {
  apiKey: string;
  /** 寄件地址，要先在 Brevo 驗證過 */
  fromEmail: string;
  fromName: string;
  fetchImpl?: typeof fetch;
}

/** 用 Brevo 的 HTTP API 寄信，免費方案每天約 300 封 */
export function createBrevoMailer({ apiKey, fromEmail, fromName, fetchImpl = fetch }: BrevoOptions): Mailer {
  return async ({ to, subject, text }) => {
    let response: Response;
    try {
      response = await fetchImpl('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: { 'api-key': apiKey, 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({ sender: { email: fromEmail, name: fromName }, to: [{ email: to }], subject, textContent: text }),
        signal: AbortSignal.timeout(15_000),
      });
    } catch (err) {
      throw new MailError(`Could not reach the mail service: ${String(err)}`);
    }
    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new MailError(`Mail service responded with ${response.status}: ${body.slice(0, 200)}`);
    }
  };
}

export interface ResetMailOptions {
  appUrl: string;
  token: string;
  minutes: number;
}

/** 重設密碼的信件內容；兩種語言都放進同一封，不用猜使用者的語言 */
export function resetPasswordMail(to: string, { appUrl, token, minutes }: ResetMailOptions): MailMessage {
  const link = `${appUrl.replace(/\/+$/, '')}/#/reset?token=${encodeURIComponent(token)}`;
  return {
    to,
    subject: 'Reset your LeetCode Coach password / 重設刷題教練的密碼',
    text: [
      'Open this link to set a new password:',
      link,
      '',
      `The link works once and expires in ${minutes} minutes. If you didn't ask for it, you can ignore this email — your password stays the same.`,
      '',
      '---',
      '',
      '開啟以下連結設定新密碼：',
      link,
      '',
      `連結只能使用一次，${minutes} 分鐘後失效。如果不是你要求的，可以直接忽略這封信，密碼不會變更。`,
    ].join('\n'),
  };
}
