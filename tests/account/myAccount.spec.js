const { test, expect } = require('@playwright/test');
const { forceApiFailure } = require('../auth/loginHelpers');
const { openMyAccount, roleEmail } = require('./myAccountHelpers');

test('ADM_008.001 / ADM_009.001 - popup shows current details, Save is disabled until edited, Cancel discards', async ({ page }, testInfo) => {
  const { dialog, nameInput, emailInput, saveButton, cancelButton } = await openMyAccount(page);

  await expect(nameInput).not.toHaveValue('');
  await expect(emailInput).toHaveValue(roleEmail(testInfo));
  await expect(saveButton).toBeDisabled();

  const originalName = await nameInput.inputValue();
  await nameInput.fill('Tmp name');
  await expect(saveButton).toBeEnabled();

  await cancelButton.click();
  await expect(dialog).toBeHidden();

  // Nothing was saved: reopen and the original name is back
  const again = await openMyAccount(page);
  await expect(again.nameInput).toHaveValue(originalName);
});

test('ADM_008.001 / ADM_009.001 - the X icon closes the popup', async ({ page }) => {
  const { dialog } = await openMyAccount(page);

  await dialog.locator('h2 svg').click(); // the X is an icon inside the popup title
  await expect(dialog).toBeHidden();
});

test('ADM_008.002 / ADM_009.002 - a 13-character name shows the length error and blocks saving', async ({ page }) => {
  const { dialog, nameInput, saveButton } = await openMyAccount(page);

  await nameInput.fill('abcdefghijklm'); // 13 characters
  await nameInput.press('Tab');

  await expect(dialog.getByText('12文字以内で入力してください')).toBeVisible();
  await expect(saveButton).toBeDisabled();
});

test('ADM_008.002 / ADM_009.002 - a 12-character name is accepted (boundary)', async ({ page }) => {
  const { dialog, nameInput, saveButton } = await openMyAccount(page);

  await nameInput.fill('abcdefghijkl'); // 12 characters
  await nameInput.press('Tab');

  await expect(dialog.getByText('12文字以内で入力してください')).toHaveCount(0);
  await expect(saveButton).toBeEnabled();
});

test('ADM_008.007 / ADM_009.003 - an invalid email shows the format error and blocks saving', async ({ page }) => {
  const { dialog, emailInput, saveButton } = await openMyAccount(page);

  await emailInput.fill('invalidemail.com');
  await emailInput.press('Tab');

  await expect(dialog.getByText('有効なメールアドレスを入力してください')).toBeVisible();
  await expect(saveButton).toBeDisabled();
});

test('ADM_008.007 / ADM_009.007 - invalid name and email together show both errors', async ({ page }) => {
  const { dialog, nameInput, emailInput } = await openMyAccount(page);

  await nameInput.fill('Super_Admin_LookMeal'); // 20 characters
  await nameInput.press('Tab');
  await emailInput.fill('adminadmin.com');
  await emailInput.press('Tab');

  await expect(dialog.getByText('12文字以内で入力してください')).toBeVisible();
  await expect(dialog.getByText('有効なメールアドレスを入力してください')).toBeVisible();
});

test('ADM_008.004 / ADM_009.006 - a failed save shows an error toast and keeps the popup open', async ({ page }) => {
  await forceApiFailure(page, /\/admins\/sub-admins\/update/); // the request never reaches the server
  const { dialog, nameInput, saveButton } = await openMyAccount(page);

  await nameInput.fill('Tmp name');
  await saveButton.click();

    await expect(page.locator('.Toastify__toast--error').first())
    .toContainText('変更内容の保存に失敗しました。もう一度お試しください。');
  await expect(dialog).toBeVisible();
});