const { test, expect } = require('@playwright/test');
const { openGuestInAppForm } = require('../helpers/notificationGuestHelpers');
const { downloadTable } = require('../helpers/dbReportHelpers');

// WARNING: this test really sends one in-app notification to ALL guest users.
// It is skipped unless you switch it on:  ALLOW_GUEST_SEND=1 npx playwright test ...
test.skip(process.env.ALLOW_GUEST_SEND !== '1', 'real guest sends are off (set ALLOW_GUEST_SEND=1 to run them)');

test('ADM_030.023 / ADM_030.024 (before opening) / ADM_027.127 / ADM_027.128 / ADM_027.129 - a guest in-app send is recorded in in_app_notifications and user_notification_status', async ({ page }) => {
  test.setTimeout(120000); // three CSV downloads
  const title = `automated GI-DB ${Date.now() % 1e6}`; // GI-DB = guest in-app, database check

  // Send one in-app notification to the guests and remember how many guests the dialog showed
  const form = await openGuestInAppForm(page);
  await form.title.fill(title);
  await form.preview.fill('automated test');
  await form.body.fill('automated test');
  await form.nextButton.click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText(/ゲストユーザー[1-9][\d,]*人/); // the dialog first shows 0人 while the count loads
  const guestCount = Number((await dialog.innerText()).match(/ゲストユーザー\s*([\d,]+)人/)[1].replace(/,/g, ''));
  await dialog.getByRole('button', { name: '配信する' }).click();
  await expect(page.locator('.Toastify__toast--success').first()).toBeVisible();

  // ADM_030.023: the notification log row (found by its unique title; the log can take a moment to appear)
  let log;
  let inAppRows;
  await expect.poll(async () => {
    inAppRows = await downloadTable(page, 'in_app_notifications');
    log = inAppRows.find((row) => row.title === title);
    return Boolean(log);
  }, { timeout: 45000, intervals: [3000] }).toBe(true);

  expect(Object.keys(inAppRows[0]).sort()).toEqual(['id', 'admin_id', 'title', 'message', 'in_app_message', 'message_id', 'target_user_type', 'target_count', 'createdAt', 'updatedAt', 'createdAtJST', 'opened_count'].sort()); // ADM_027.128
  expect(log).toMatchObject({
    message: '<p>automated test</p>',
    in_app_message: 'automated test',
    target_user_type: 'in_app_guest',
    target_count: String(guestCount),
    opened_count: '0',
  });
  for (const column of ['id', 'admin_id', 'message_id', 'createdAt', 'updatedAt', 'createdAtJST']) {
    expect(log[column], `${column} is filled`).not.toBe('');
  }

  // ADM_030.024 (before opening): one unopened record per targeted guest
  const statusRows = await downloadTable(page, 'user_notification_status');
  expect(Object.keys(statusRows[0]).sort()).toEqual(['id', 'user_id', 'guest_uuid', 'notification_id', 'is_open', 'opened_time', 'createdAt', 'updatedAt', 'createdAtJST'].sort()); // ADM_027.129
  const statuses = statusRows.filter((row) => row.notification_id === log.id);
  expect(statuses).toHaveLength(guestCount);
  expect(new Set(statuses.map((row) => row.guest_uuid)).size).toBe(guestCount); // no guest twice
  for (const row of statuses) {
    expect(row.guest_uuid).not.toBe('');
    expect(row.user_id).toBe('');
    expect(row.is_open).toBe('false');
    expect(row.opened_time).toBe('');
    for (const column of ['id', 'createdAt', 'updatedAt', 'createdAtJST']) expect(row[column], `${column} is filled`).not.toBe('');
  }
});