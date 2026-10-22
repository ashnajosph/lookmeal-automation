const { test, expect } = require('@playwright/test');
const { forceApiFailure } = require('../auth/loginHelpers');
test('ADM_017.002 - Cancel closes the resend gift URL popup', async ({ page }) => {
  await page.goto('/winners');
  await page.getByRole('button', { name: /ギフトURLを再送信/ }).first().click();

  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();

  await dialog.getByRole('button', { name: 'キャンセル' }).click();
  await expect(dialog).toBeHidden();
});
test('ADM_017.001 - the resend popup shows the winner email with Cancel and Resend buttons', async ({ page }) => {
  await page.goto('/winners');

  const row = page.locator('tr').filter({ has: page.getByRole('button', { name: /ギフトURLを再送信/ }) }).first();
  const email = (await row.innerText()).match(/\S+@\S+/)[0]; // read the real email from the row
  await row.getByRole('button', { name: /ギフトURLを再送信/ }).click();

  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText('該当の当選者にギフトURLを再送信してもよろしいですか？');
  await expect(dialog).toContainText(email);
  await expect(dialog.getByRole('button', { name: 'キャンセル' })).toBeVisible();
  await expect(dialog.getByRole('button', { name: '再送信する' })).toBeVisible();
});
test('ADM_017.005 - a failed resend shows an error toast', async ({ page }) => {
  await forceApiFailure(page, /\/admins\/gift-url\/resend\//); // request never reaches the server, so no email is sent
  await page.goto('/winners');
  await page.getByRole('button', { name: /ギフトURLを再送信/ }).first().click();
  await page.getByRole('dialog').getByRole('button', { name: '再送信する' }).click();

  await expect(page.locator('.Toastify__toast--error').first())
    .toContainText('ギフトURLの発行・送信に失敗しました。もう一度お試しください。');
});
test('ADM_017.004 - resend shows the success toast @sendsEmail', async ({ page }) => {
  await page.goto('/winners');

  // only my own mailbox row, so no colleague is emailed
  const row = page.locator('tr').filter({ hasText: 'ashnajosph@gmail.com' }).first();
  await row.getByRole('button', { name: /ギフトURLを再送信/ }).click();

  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText('ashnajosph@gmail.com'); // safety check before sending
  await dialog.getByRole('button', { name: '再送信する' }).click();

  await expect(page.locator('.Toastify__toast--success').first())
    .toContainText('ギフトURLを再送信しました', { timeout: 20000 });
});