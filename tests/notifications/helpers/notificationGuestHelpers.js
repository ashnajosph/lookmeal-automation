const { openCreateForm } = require('./notificationHelpers');

const registeredRadio = (page) => page.getByRole('radio', { name: '会員ユーザー' });
const guestRadio = (page) => page.getByRole('radio', { name: 'ゲストユーザー' });

// アプリ内通知 form (the default) with ゲストユーザー selected
async function openGuestInAppForm(page) {
  await openCreateForm(page);
  await guestRadio(page).check();
  return {
    title: page.locator('#title'),
    preview: page.locator('#description'),
    body: page.locator('.ql-editor'),
    nextButton: page.getByRole('button', { name: '次へ' }),
  };
}

// プッシュ通知のみ form with ゲストユーザー selected
async function openGuestPushForm(page) {
  await openCreateForm(page);
  await page.getByRole('radio', { name: 'プッシュ通知のみ' }).check();
  await guestRadio(page).check();
  return {
    title: page.locator('#title'),
    message: page.locator('#message'),
    sendButton: page.getByRole('button', { name: '送信する' }),
  };
}

module.exports = { registeredRadio, guestRadio, openGuestInAppForm, openGuestPushForm };