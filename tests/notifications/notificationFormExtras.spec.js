const { test, expect } = require('@playwright/test');
const { openCreateForm, openPushForm } = require('./notificationHelpers');

// Registered-user (会員ユーザー comes selected) in-app form. Nothing here presses 次へ or 送信する.
async function openRegisteredInAppForm(page) {
  await openCreateForm(page);
  return {
    title: page.locator('#title'),
    preview: page.locator('#description'),
    body: page.locator('.ql-editor'),
    nextButton: page.getByRole('button', { name: '次へ' }),
  };
}

test('ADM_027.049 / ADM_027.050 - the creation screen opens with アプリ内通知 selected', async ({ page }) => {
  await openCreateForm(page);

  await expect(page.getByRole('radio', { name: 'アプリ内通知' })).toBeChecked();
  await expect(page.getByRole('radio', { name: 'プッシュ通知のみ' })).not.toBeChecked();
});

test('ADM_027.051 / ADM_027.052 - both delivery methods can be selected', async ({ page }) => {
  await openCreateForm(page);

  await page.getByRole('radio', { name: 'プッシュ通知のみ' }).check();
  await expect(page.getByRole('radio', { name: 'プッシュ通知のみ' })).toBeChecked();

  await page.getByRole('radio', { name: 'アプリ内通知' }).check();
  await expect(page.getByRole('radio', { name: 'アプリ内通知' })).toBeChecked();
});

// ---- In-app title 1-50 and body 1-1,000 with line breaks, for registered users ----
const inAppRules = [
  { tc: 'ADM_027.053', name: 'a 50-character title is accepted', title: 'a'.repeat(50), body: 'body', ok: true },
  { tc: 'ADM_027.054', name: 'a 51-character title is blocked with the length error', title: 'a'.repeat(51), body: 'body', ok: false, error: '50文字以内で入力してください' },
  { tc: 'ADM_027.055 / ADM_027.063', name: 'a 1,000-character body is accepted', title: 't', body: 'a'.repeat(1000), ok: true },
  { tc: 'ADM_027.057', name: 'a 1,001-character body is blocked with the length error', title: 't', body: 'a'.repeat(1001), ok: false, error: '1,000文字以内で入力してください' },
  { tc: 'ADM_027.058', name: 'a body with line breaks is accepted', title: 't', body: 'line1\nline2\nline3', ok: true },
];

for (const c of inAppRules) {
  test(`${c.tc} - in-app: ${c.name}`, async ({ page }) => {
    const { title, preview, body, nextButton } = await openRegisteredInAppForm(page);
    await title.fill(c.title);
    await preview.fill('preview');
    await body.fill(c.body);
    await title.press('Tab');
    await body.press('Tab');

    if (c.ok) {
      await expect(nextButton).toBeEnabled();
    } else {
      await expect(page.getByText(c.error, { exact: true })).toBeVisible();
      await expect(nextButton).toBeDisabled();
    }
  });
}

test('ADM_027.056 - in-app: an empty body keeps 次へ disabled', async ({ page }) => {
  const { title, preview, nextButton } = await openRegisteredInAppForm(page);
  await title.fill('title');
  await preview.fill('preview');

  await expect(nextButton).toBeDisabled();
});

// ---- Error messages while typing ----
test('ADM_027.064 / ADM_027.069 - in-app: a too-long title shows the error straight away, without leaving the field', async ({ page }) => {
  const { title } = await openRegisteredInAppForm(page);

  await title.fill('a'.repeat(51));

  await expect(page.getByText('50文字以内で入力してください', { exact: true })).toBeVisible();
});

test('ADM_027.064 / ADM_027.069 - push: a too-long message shows the error straight away, without leaving the field', async ({ page }) => {
  const { message } = await openPushForm(page);

  await message.fill('a'.repeat(121));

  await expect(page.getByText('120文字以内で入力してください', { exact: true })).toBeVisible();
});

test('ADM_027.066 / ADM_027.067 - in-app: the title stays editable with the error shown, and the error goes once it is short enough', async ({ page }) => {
  const { title } = await openRegisteredInAppForm(page);
  const error = page.getByText('50文字以内で入力してください', { exact: true });
  await title.fill('a'.repeat(51));
  await expect(error).toBeVisible();

  await title.press('End');
  await title.pressSequentially('b');
  await expect(title).toHaveValue(`${'a'.repeat(51)}b`);

  await title.fill('a'.repeat(10));
  await expect(error).toBeHidden();
});