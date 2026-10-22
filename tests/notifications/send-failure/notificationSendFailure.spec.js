const { test, expect } = require('@playwright/test');
const { openPushForm } = require('../helpers/notificationHelpers');

// A service worker could hide requests from page.route, so switch service workers off for this file
test.use({ serviceWorkers: 'block' });

test('ADM_022.035 / ADM_027.119 / ADM_027.122 - push to registered users: a failed send shows an error message', async ({ page }) => {
  const { title, message, sendButton } = await openPushForm(page);
  await title.fill('title');
  await message.fill('message');
  await sendButton.click();

  // Safety net: from now on every API call (fetch/xhr) is answered with a 500 and never reaches the server
  let blocked = 0;
  await page.route('**/*', (route) => {
    if (!['fetch', 'xhr'].includes(route.request().resourceType())) return route.continue();
    blocked++;
    return route.fulfill({ status: 500 });
  });

  // Prove the net works BEFORE pressing the real send button (the test stops here if it does not)
  await page.evaluate(() => fetch('https://api.qa.lookmeal.com/canary').catch(() => {}));
  expect(blocked).toBeGreaterThanOrEqual(1);
  const blockedBefore = blocked;

  await page.getByRole('dialog').getByRole('button', { name: '配信する' }).click();

  await expect(page.locator('.Toastify__toast--error').first()).toBeVisible();
  expect(blocked).toBeGreaterThan(blockedBefore); // the send request was blocked too
});


