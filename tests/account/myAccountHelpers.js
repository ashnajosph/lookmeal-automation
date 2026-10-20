const { expect } = require('@playwright/test');
const { openProfileMenu } = require('../auth/loginHelpers');

// Opens the profile menu -> マイアカウント, and returns handles to the popup parts
async function openMyAccount(page) {
  await page.goto('/');
  await openProfileMenu(page);
  await expect(page.getByRole('menuitem', { name: 'ログアウト' })).toBeVisible();
  await page.getByRole('menuitem', { name: 'マイアカウント' }).click();

  const dialog = page.getByRole('dialog');
  await expect(dialog.getByText('マイアカウント', { exact: true })).toBeVisible();

  return {
    dialog,
    nameInput: dialog.getByRole('textbox').nth(0),   // 氏名 is the first field
    emailInput: dialog.getByRole('textbox').nth(1),  // メールアドレス is the second
    saveButton: dialog.getByRole('button', { name: '保存する' }),
    cancelButton: dialog.getByRole('button', { name: 'キャンセル' }),
  };
}

// The email of whichever role the current project is logged in as
function roleEmail(testInfo) {
  return testInfo.project.name === 'chromium-general-admin'
    ? process.env.GENERAL_ADMIN_EMAIL
    : process.env.SUPER_ADMIN_EMAIL;
}

module.exports = { openMyAccount, roleEmail };