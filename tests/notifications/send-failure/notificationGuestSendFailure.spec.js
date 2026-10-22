const { test, expect } = require('@playwright/test');
const { openGuestInAppForm, openGuestPushForm } = require('../helpers/notificationGuestHelpers');

// A service worker could hide requests from page.route, so switch service workers off for this file
test.use({ serviceWorkers: 'block' });

// These are the only guest tests that press 配信する, which really sends to ALL guests.
// Each one first proves the safety net works, so the send request can never reach the server.

// Blocks every API call (fetch/xhr) with a 500 and proves it with a canary request.
// Returns a function that tells how many requests were blocked so far.
async function blockApiCalls(page) {
  let blocked = 0;
  await page.route('**/*', (route) => {
    if (!['fetch', 'xhr'].includes(route.request().resourceType())) return route.continue();
    blocked++;
    return route.fulfill({ status: 500 });
  });

  await page.evaluate(() => fetch('https://api.qa.lookmeal.com/canary').catch(() => {}));
  expect(blocked).toBeGreaterThanOrEqual(1); // the test stops here if the net does not work
  return () => blocked;
}

async function sendAndExpectError(page, blockedCount) {
  const before = blockedCount();

  await page.getByRole('dialog').getByRole('button', { name: '配信する' }).click();

  await expect(page.locator('.Toastify__toast--error').first()).toContainText('通知の送信に失敗しました。もう一度お試しください。');
  expect(blockedCount()).toBeGreaterThan(before); // the send request was blocked too
}

test('ADM_030.015 / ADM_027.119 / ADM_027.122 - guest push: a failed send shows an error message', async ({ page }) => {
  const { title, message, sendButton } = await openGuestPushForm(page);
  await title.fill('title');
  await message.fill('message');
  await sendButton.click();
  await expect(page.getByRole('dialog')).toBeVisible();

  const blockedCount = await blockApiCalls(page);

  await sendAndExpectError(page, blockedCount);
});

test('ADM_030.016 / ADM_027.119 / ADM_027.122 - guest in-app: a failed send shows an error message', async ({ page }) => {
  const { title, preview, body, nextButton } = await openGuestInAppForm(page);
  await title.fill('title');
  await preview.fill('preview');
  await body.fill('body');
  await nextButton.click();
  await expect(page.getByRole('dialog')).toBeVisible();

  const blockedCount = await blockApiCalls(page);

  await sendAndExpectError(page, blockedCount);
});