const { test, expect } = require('@playwright/test');
const { rowsOf, searchBox, openNotifications, openCreateForm } = require('../helpers/notificationHelpers');
const { registeredRadio, guestRadio, openGuestInAppForm, openGuestPushForm } = require('../helpers/notificationGuestHelpers');

// None of these tests presses 次へ or 送信する: nothing can reach the guest users.

for (const mode of [
  { tc: 'ADM_030.001', name: 'アプリ内通知' },
  { tc: 'ADM_030.002', name: 'プッシュ通知のみ' },
]) {
  test(`${mode.tc} @critical - 会員ユーザー and ゲストユーザー are offered under ${mode.name}`, async ({ page }) => {
    await openCreateForm(page);
    await page.getByRole('radio', { name: mode.name }).check();

    await expect(registeredRadio(page)).toBeVisible();
    await expect(guestRadio(page)).toBeVisible();
  });
}

test('ADM_030.003 - only one target user option can be selected at a time', async ({ page }) => {
  await openCreateForm(page);
  await registeredRadio(page).check();

  await guestRadio(page).check();

  await expect(guestRadio(page)).toBeChecked();
  await expect(registeredRadio(page)).not.toBeChecked();
});

// ---- Mandatory fields: leave one field empty at a time ----
const inAppFields = ['title', 'preview', 'body'];

for (const empty of inAppFields) {
  test(`ADM_030.008 - guest in-app: an empty ${empty} keeps 次へ disabled`, async ({ page }) => {
    const form = await openGuestInAppForm(page);
    for (const field of inAppFields.filter((f) => f !== empty)) {
      await form[field].fill('text');
    }

    await expect(form.nextButton).toBeDisabled();
  });
}

test('ADM_030.008 - guest in-app: 次へ is enabled once title, preview and body are filled', async ({ page }) => {
  const form = await openGuestInAppForm(page);
  for (const field of inAppFields) {
    await form[field].fill('text');
  }

  await expect(form.nextButton).toBeEnabled();
});

const pushFields = ['title', 'message'];

for (const empty of pushFields) {
  test(`ADM_030.009 - guest push: an empty ${empty} keeps 送信する disabled`, async ({ page }) => {
    const form = await openGuestPushForm(page);
    for (const field of pushFields.filter((f) => f !== empty)) {
      await form[field].fill('text');
    }

    await expect(form.sendButton).toBeDisabled();
  });
}

test('ADM_030.009 - guest push: 送信する is enabled once title and message are filled', async ({ page }) => {
  const form = await openGuestPushForm(page);
  for (const field of pushFields) {
    await form[field].fill('text');
  }

  await expect(form.sendButton).toBeEnabled();
});

// ---- Input rules, guest in-app: title 1-50, body preview 1-100 (the 1-1000 body rule is not covered yet) ----
const inAppRules = [
  { name: 'a 50-character title is accepted', title: 'a'.repeat(50), preview: 'p', ok: true },
  { name: 'a 51-character title is blocked with the length error', title: 'a'.repeat(51), preview: 'p', ok: false, error: '50文字以内で入力してください' },
  { name: 'a 100-character body preview is accepted', title: 't', preview: 'a'.repeat(100), ok: true },
  { name: 'a 101-character body preview is blocked with the length error', title: 't', preview: 'a'.repeat(101), ok: false, error: '100文字以内で入力してください' },
];

for (const c of inAppRules) {
  test(`ADM_030.010 - guest in-app: ${c.name}`, async ({ page }) => {
    const { title, preview, body, nextButton } = await openGuestInAppForm(page);
    await title.fill(c.title);
    await preview.fill(c.preview);
    await body.fill('body');
    await title.press('Tab');
    await preview.press('Tab');

    if (c.ok) {
      await expect(nextButton).toBeEnabled();
    } else {
      await expect(page.getByText(c.error, { exact: true })).toBeVisible();
      await expect(nextButton).toBeDisabled();
    }
  });
}

// ---- Input rules, guest push: title 1-20, message 1-120 ----
const pushRules = [
  { name: 'a blank title is blocked', title: '', message: 'm', ok: false },
  { name: 'a 1-character title is accepted', title: 'a', message: 'm', ok: true },
  { name: 'a 20-character title is accepted', title: 'a'.repeat(20), message: 'm', ok: true },
  { name: 'a 21-character title is blocked with the length error', title: 'a'.repeat(21), message: 'm', ok: false, error: '20文字以内で入力してください' },
  { name: 'a blank message is blocked', title: 't', message: '', ok: false },
  { name: 'a 1-character message is accepted', title: 't', message: 'a', ok: true },
  { name: 'a 120-character message is accepted', title: 't', message: 'a'.repeat(120), ok: true },
  { name: 'a 121-character message is blocked with the length error', title: 't', message: 'a'.repeat(121), ok: false, error: '120文字以内で入力してください' },
];

for (const c of pushRules) {
  test(`ADM_030.011 - guest push: ${c.name}`, async ({ page }) => {
    const { title, message, sendButton } = await openGuestPushForm(page);
    await title.fill(c.title);
    await message.fill(c.message);
    await title.press('Tab');
    await message.press('Tab');

    if (c.ok) {
      await expect(sendButton).toBeEnabled();
    } else {
      if (c.error) await expect(page.getByText(c.error, { exact: true })).toBeVisible();
      await expect(sendButton).toBeDisabled();
    }
  });
}

// ---- Keyword search on a guest notification that already exists in the list ----
test('ADM_030.020 - keyword search finds a guest notification by its title', async ({ page }) => {
  await openNotifications(page);
  const guestRows = rowsOf(page).filter({ has: page.locator('td:nth-child(4)', { hasText: 'ゲスト' }) });
  test.skip((await guestRows.count()) === 0, 'there is no guest notification on the first page of the list');

  const keyword = (await guestRows.first().locator('td:nth-child(3)').innerText()).trim();
  await searchBox(page).fill(keyword);

  await expect(rowsOf(page).filter({ hasNotText: keyword })).toHaveCount(0);
  await expect(guestRows.first()).toBeVisible();
});