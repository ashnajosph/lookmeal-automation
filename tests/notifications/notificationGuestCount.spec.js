const { test, expect } = require('@playwright/test');
const { openGuestInAppForm } = require('./notificationGuestHelpers');
const { downloadTable, activeGuests } = require('./dbReportHelpers');

// Nothing is sent: the dialog is opened only to read the guest count, then cancelled.
test('ADM_030.021 - the guest count in the send dialog equals the guests with a device token in the guest_user log', async ({ page }) => {
  const { title, preview, body, nextButton } = await openGuestInAppForm(page);
  await title.fill('title');
  await preview.fill('preview');
  await body.fill('body');
  await nextButton.click();

  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText(/ゲストユーザー[1-9][\d,]*人/); // the dialog first shows 0人 while the count loads
  const dialogCount = Number((await dialog.innerText()).match(/ゲストユーザー\s*([\d,]+)人/)[1].replace(/,/g, ''));
  await dialog.getByRole('button', { name: 'キャンセル' }).click();

  const guests = await downloadTable(page, 'guest_user');

  expect(activeGuests(guests)).toBe(dialogCount);
});