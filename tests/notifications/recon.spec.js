const { test } = require('@playwright/test');
const { openCreateForm } = require('./notificationHelpers');

// Throwaway recon: opens the user selection screen and prints every failed network call.
// Selects nothing and sends nothing. Delete this file after the run.
test('recon - what fails on the user selection screen', async ({ page }) => {
  page.on('response', (response) => {
    if (response.status() >= 400) {
      console.log(`FAILED CALL ${response.status()} ${response.request().method()} ${response.url()}`);
    }
  });
  page.on('framenavigated', (frame) => {
    if (frame === page.mainFrame()) console.log(`NAVIGATED ${frame.url()}`);
  });

  await openCreateForm(page);
  await page.locator('#title').fill('title');
  await page.locator('#description').fill('preview');
  await page.locator('.ql-editor').fill('body');
  await page.getByRole('button', { name: '次へ' }).click();

  await page.waitForTimeout(8000);
  console.log(`END URL ${page.url()}`);
});