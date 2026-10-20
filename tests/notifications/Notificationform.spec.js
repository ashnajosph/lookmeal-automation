const { test, expect } = require('@playwright/test');
const { openPushForm } = require('./notificationHelpers');

// Every case: fill the title and message, then check whether 送信する can be pressed
const sendButtonCases = [
  { tc: 'ADM_022.022 / ADM_027.059', name: 'a 1-character title is accepted', title: 'a', message: 'message', enabled: true },
  { tc: 'ADM_022.023 / ADM_027.059', name: 'a 20-character title is accepted', title: 'a'.repeat(20), message: 'message', enabled: true },
  { tc: 'ADM_022.025', name: 'a blank title keeps the send button disabled', title: '', message: 'message', enabled: false },
  { tc: 'ADM_022.026', name: 'spaces between words are accepted in the title', title: 'two words', message: 'message', enabled: true },
  { tc: 'ADM_022.027 / ADM_027.061', name: 'a 1-character message is accepted', title: 'title', message: 'a', enabled: true },
  { tc: 'ADM_022.029 / ADM_027.061', name: 'a 120-character message is accepted', title: 'title', message: 'a'.repeat(120), enabled: true },
  { tc: 'ADM_022.031', name: 'spaces are accepted in the message', title: 'title', message: 'a message with spaces', enabled: true },
  { tc: 'ADM_022.032', name: 'a blank message keeps the send button disabled', title: 'title', message: '', enabled: false },
];

for (const c of sendButtonCases) {
  test(`${c.tc} - ${c.name}`, async ({ page }) => {
    const { title, message, sendButton } = await openPushForm(page);

    await title.fill(c.title);
    await message.fill(c.message);

    await expect(sendButton).toBeEnabled({ enabled: c.enabled });
  });
}

test('ADM_022.019 @critical - 送信する stays disabled until both the title and the message are entered', async ({ page }) => {
  const { title, message, sendButton } = await openPushForm(page);
  await expect(sendButton).toBeDisabled();

  await title.fill('title');
  await expect(sendButton).toBeDisabled();

  await message.fill('message');
  await expect(sendButton).toBeEnabled();
});

// Fills a valid title and message, presses 送信する and returns the confirmation pop-up.
// We only ever press キャンセル in it, never 配信する, because that really sends the notification.
async function openConfirmPopup(page) {
  const { title, message, sendButton } = await openPushForm(page);
  await title.fill('title');
  await message.fill('message');
  await sendButton.click();
  return { title, dialog: page.getByRole('dialog') };
}

test('ADM_022.033 / ADM_027.074 / ADM_027.113 / ADM_027.114 / ADM_027.130 @critical - 送信する shows the confirmation pop-up', async ({ page }) => {
  const { dialog } = await openConfirmPopup(page);

  await expect(dialog).toContainText('この内容で通知を配信してもよろしいですか');
  await expect(dialog).toContainText('送信後の変更・取り消しはできません');
  await expect(dialog.getByRole('button', { name: 'キャンセル' })).toBeVisible();
  await expect(dialog.getByRole('button', { name: '配信する' })).toBeVisible();
});

test('ADM_022.034 / ADM_027.076 / ADM_027.115 - キャンセル in the pop-up closes it and keeps the form', async ({ page }) => {
  const { title, dialog } = await openConfirmPopup(page);

  await dialog.getByRole('button', { name: 'キャンセル' }).click();

  await expect(dialog).toBeHidden();
  await expect(page).toHaveURL(/add-new/);
  await expect(title).toHaveValue('title');
});

test('ADM_022.024 / ADM_027.060 - a 21-character title shows the length error and blocks sending', async ({ page }) => {
  const { title, message, sendButton } = await openPushForm(page);

  await message.fill('message');
  await title.fill('a'.repeat(21));
  await title.press('Tab');

  await expect(page.getByText('20文字以内で入力してください', { exact: true })).toBeVisible();
  await expect(sendButton).toBeDisabled();
});

test('ADM_022.028 / ADM_022.030 / ADM_027.062 - a 121-character message shows the length error and blocks sending', async ({ page }) => {
  const { title, message, sendButton } = await openPushForm(page);

  await title.fill('title');
  await message.fill('a'.repeat(121));
  await message.press('Tab');

  await expect(page.getByText('120文字以内で入力してください', { exact: true })).toBeVisible();
  await expect(sendButton).toBeDisabled();
});