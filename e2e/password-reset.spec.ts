import { expect, test } from '@playwright/test';

// 測試伺服器沒有設定寄信服務，所以攔下 API，只驗證畫面流程
test('asks for a reset link without saying whether the email exists', async ({ page }) => {
  let sentTo: string | undefined;
  await page.route('**/api/auth/forgot-password', async (route) => {
    sentTo = route.request().postDataJSON().email;
    await route.fulfill({ status: 204, body: '' });
  });

  await page.goto('/#/settings');
  const account = page.getByRole('region', { name: 'Account & sync' });
  await account.getByLabel('Email', { exact: true }).fill('ray@example.com');
  await account.getByRole('button', { name: 'Forgot password?' }).click();

  const dialog = page.getByRole('dialog', { name: 'Reset your password' });
  await expect(dialog.getByLabel('Email')).toHaveValue('ray@example.com');
  await dialog.getByRole('button', { name: 'Send reset link' }).click();
  await expect(dialog).toContainText('If ray@example.com has an account, the reset link is on its way.');
  expect(sentTo).toBe('ray@example.com');
  await dialog.getByRole('button', { name: 'Close' }).click();
  await expect(dialog).toBeHidden();
});

test('says when password reset email is off on this server', async ({ page }) => {
  await page.goto('/#/settings');
  const account = page.getByRole('region', { name: 'Account & sync' });
  await account.getByLabel('Email', { exact: true }).fill('ray@example.com');
  await account.getByRole('button', { name: 'Forgot password?' }).click();
  const dialog = page.getByRole('dialog', { name: 'Reset your password' });
  await dialog.getByRole('button', { name: 'Send reset link' }).click();
  await expect(dialog.getByRole('alert')).toContainText('isn’t turned on for this server');
});

test('sets a new password from the emailed link', async ({ page }) => {
  let body: Record<string, unknown> | undefined;
  await page.route('**/api/auth/reset-password', async (route) => {
    body = route.request().postDataJSON();
    await route.fulfill({ json: { user: { id: 'u1', email: 'ray@example.com', createdAt: '2026-09-18T00:00:00.000Z' } } });
  });

  await page.goto('/#/reset?token=abc123');
  const field = page.getByLabel('Password', { exact: true });
  await field.fill('a brand new password');
  await expect(field).toHaveAttribute('type', 'password');
  await page.getByRole('button', { name: 'Show' }).click();
  await expect(field).toHaveAttribute('type', 'text');

  await page.getByRole('button', { name: 'Set new password' }).click();
  await expect(page.getByRole('status')).toContainText('Password updated. You’re signed in.');
  await expect(page.getByRole('heading', { level: 1, name: 'Settings' })).toBeVisible();
  expect(body).toEqual({ token: 'abc123', password: 'a brand new password' });
});

test('explains a link that lost its token', async ({ page }) => {
  await page.goto('/#/reset');
  await expect(page.getByText('This link is missing its reset code')).toBeVisible();
  await page.getByRole('link', { name: 'Back to settings' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Settings' })).toBeVisible();
});
