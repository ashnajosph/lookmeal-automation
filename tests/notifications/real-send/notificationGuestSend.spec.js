const { test, expect } = require('@playwright/test');
const { rowsOf, searchBox } = require('../helpers/notificationHelpers');
const { openGuestInAppForm, openGuestPushForm } = require('../helpers/notificationGuestHelpers');

// WARNING: these tests really press 配信する, which sends to ALL guest users on the QA environment.
// They are skipped unless you switch them on:  ALLOW_GUEST_SEND=1 npx playwright test ...
test.skip(process.env.ALLOW_GUEST_SEND !== '1', 'real guest sends are off (set ALLOW_GUEST_SEND=1 to run them)');

// Presses 配信する in the open dialog, then checks the success toast, the redirect and the new list row.
// Only the in-app dialog shows the guest count (showsCount), so only there is it compared with 配信数.
async function confirmAndCheck(page, { title, method, showsCount, toast, emptyCounts }) {
  const dialog = page.getByRole('dialog');

  let guestCount;
  if (showsCount) {
    await expect(dialog).toContainText(/ゲストユーザー[1-9][\d,]*人/); // the dialog first shows 0人 while the count loads
    guestCount = (await dialog.innerText()).match(/ゲストユーザー\s*([\d,]+)人/)[1];
  }

  await dialog.getByRole('button', { name: '配信する' }).click();

  await expect(page.locator('.Toastify__toast--success').first()).toContainText(toast);
  await expect(page).not.toHaveURL(/add-new/);
  await expect(page).toHaveURL(/push-notification/);

  await searchBox(page).fill(title);
  const row = rowsOf(page).filter({ hasText: title }).first();
  await expect(row).toBeVisible();
  await expect(row.locator('td:nth-child(4)')).toHaveText(method);
  if (showsCount) {
    await expect(row.locator('td:nth-child(5)')).toContainText(`${guestCount}人`, { timeout: 30000 }); // 配信数 can fill in a little later
  }
  if (emptyCounts) {
    await expect(row.locator('td:nth-child(5)')).toHaveText(''); // push notifications record no delivery count...
    await expect(row.locator('td:nth-child(6)')).toHaveText(''); // ...and no open count
  }
}

test('ADM_030.006 / ADM_030.013 / ADM_027.037 / ADM_027.075 / ADM_027.077 / ADM_027.078 / ADM_027.079 / ADM_027.108 / ADM_027.111 / ADM_027.120 - guest in-app: sending shows the success message, returns to the list and adds the notification', async ({ page }) => {
  const title = `automated GI ${Date.now() % 1e6}`; // GI = guest in-app
  const { title: titleBox, preview, body, nextButton } = await openGuestInAppForm(page);
  await titleBox.fill(title);
  await preview.fill('automated test');
  await body.fill('automated test');
  await nextButton.click();
  await expect(page.getByRole('dialog')).toBeVisible();

  await confirmAndCheck(page, { title, method: 'アプリ内 - ゲスト', showsCount: true, toast: 'アプリ内通知を配信しました' });
});

test('ADM_030.007 / ADM_030.014 / ADM_027.080 / ADM_027.116 / ADM_027.120 / ADM_027.121 / ADM_027.133 / ADM_027.134 - guest push: sending shows the success message, returns to the list and adds the notification', async ({ page }) => {
  const title = `automated GP ${Date.now() % 1e6}`; // GP = guest push; push titles are limited to 20 characters
  const { title: titleBox, message, sendButton } = await openGuestPushForm(page);
  await titleBox.fill(title);
  await message.fill('automated test');
  await sendButton.click();
  await expect(page.getByRole('dialog')).toBeVisible();

  await confirmAndCheck(page, { title, method: 'プッシュ - ゲスト', showsCount: false, toast: 'プッシュ通知を配信しました', emptyCounts: true });
});

// ---- Clicking 配信する twice must create only one notification ----
// Once a double click created two notifications (seen once, then fixed or no longer reproducible), so this stays as a regression check.
// Case 1 clicks at automation speed, case 2 about as fast as a person (150 ms apart).
const doubleClicks = [
  { tc: 'ADM_030.026 / ADM_027.109', marker: 'GI-2X', speed: 'instantly (automation speed)', gapMs: 0 },
  { tc: 'ADM_030.026 / ADM_027.109 (human speed)', marker: 'GI-2H', speed: '150 ms apart (human speed)', gapMs: 150 },
];

for (const c of doubleClicks) {
  test(`${c.tc} - clicking 配信する twice ${c.speed} creates only one notification`, async ({ page }) => {
    const title = `automated ${c.marker} ${Date.now() % 1e6}`; // GI-2X instant, GI-2H human speed
    const { title: titleBox, preview, body, nextButton } = await openGuestInAppForm(page);
    await titleBox.fill(title);
    await preview.fill('automated test');
    await body.fill('automated test');
    await nextButton.click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    const send = dialog.getByRole('button', { name: '配信する' });
    if (c.gapMs === 0) {
      await send.dblclick();
    } else {
      await send.click();
      await page.waitForTimeout(c.gapMs);
      await send.click({ timeout: 1000 }).catch(() => {}); // the button may already be gone, which is fine
    }

    await expect(page.locator('.Toastify__toast--success').first()).toBeVisible();
    await expect(page).not.toHaveURL(/add-new/);
    await page.waitForLoadState('networkidle'); // let a possible second send finish before counting

    await searchBox(page).fill(title);
    await expect(rowsOf(page).filter({ hasText: title }).first()).toBeVisible();
    await expect(rowsOf(page).filter({ hasText: title })).toHaveCount(1);
  });
}