const { test, expect } = require('@playwright/test');
const { openGuestInAppForm, openGuestPushForm } = require('./notificationGuestHelpers');

// These tests open the confirmation dialog and always press キャンセル.
// Nothing here presses 配信する, so nothing reaches the guest users.

const heading = 'この内容で通知を配信してもよろしいですか？';
const warning = '送信後の変更・取り消しはできません。ご注意ください。';

// Fills the guest in-app form and opens the confirmation dialog
async function openInAppDialog(page) {
  const form = await openGuestInAppForm(page);
  await form.title.fill('title');
  await form.preview.fill('preview');
  await form.body.fill('body');
  await form.nextButton.click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  return { form, dialog };
}

// Fills the guest push form and opens the confirmation dialog
async function openPushDialog(page) {
  const form = await openGuestPushForm(page);
  await form.title.fill('title');
  await form.message.fill('message');
  await form.sendButton.click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  return { form, dialog };
}

test('ADM_030.004 / ADM_030.005 / ADM_027.074 @critical - guest in-app: the confirmation dialog shows the guest count and the warning', async ({ page }) => {
  const { dialog } = await openInAppDialog(page);

  await expect(dialog).toContainText(heading);
  await expect(dialog).toContainText(/ゲストユーザー[\d,]+人にアプリ内通知が送信されます。/);
  await expect(dialog).toContainText('送信後の変更・取り消しはできません。');
  await expect(dialog).toContainText('ご注意ください。');
  await expect(dialog.getByRole('button', { name: 'キャンセル' })).toBeVisible();
  await expect(dialog.getByRole('button', { name: '配信する' })).toBeVisible();

  await dialog.getByRole('button', { name: 'キャンセル' }).click();
});

test('ADM_030 (extra) - guest push: the confirmation dialog shows the warning', async ({ page }) => {
  const { dialog } = await openPushDialog(page);

  await expect(dialog).toContainText(heading);
  await expect(dialog).toContainText(warning);
  await expect(dialog.getByRole('button', { name: 'キャンセル' })).toBeVisible();
  await expect(dialog.getByRole('button', { name: '配信する' })).toBeVisible();

  await dialog.getByRole('button', { name: 'キャンセル' }).click();
});

test('ADM_030.012 / ADM_027.076 - guest in-app: キャンセル closes the dialog and keeps the form', async ({ page }) => {
  const { form, dialog } = await openInAppDialog(page);

  await dialog.getByRole('button', { name: 'キャンセル' }).click();

  await expect(dialog).toBeHidden();
  await expect(page).toHaveURL(/add-new/);
  await expect(form.title).toHaveValue('title');
});

test('ADM_030.012 / ADM_027.076 - guest push: キャンセル closes the dialog and keeps the form', async ({ page }) => {
  const { form, dialog } = await openPushDialog(page);

  await dialog.getByRole('button', { name: 'キャンセル' }).click();

  await expect(dialog).toBeHidden();
  await expect(page).toHaveURL(/add-new/);
  await expect(form.title).toHaveValue('title');
});

// ---- Guest in-app body: 1 to 1,000 characters, line breaks allowed ----
const bodyRules = [
  { name: 'a 1,000-character body is accepted', body: 'a'.repeat(1000), ok: true },
  { name: 'a 1,001-character body is blocked with the length error', body: 'a'.repeat(1001), ok: false },
  { name: 'a body with line breaks is accepted', body: 'line1\nline2\nline3', ok: true },
];

for (const c of bodyRules) {
  test(`ADM_030.010 - guest in-app: ${c.name}`, async ({ page }) => {
    const { title, preview, body, nextButton } = await openGuestInAppForm(page);
    await title.fill('title');
    await preview.fill('preview');
    await body.fill(c.body);
    await body.press('Tab');

    if (c.ok) {
      await expect(nextButton).toBeEnabled();
    } else {
      await expect(page.getByText('1,000文字以内で入力してください', { exact: true })).toBeVisible();
      await expect(nextButton).toBeDisabled();
    }
  });
}