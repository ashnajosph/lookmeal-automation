const { test, expect } = require('@playwright/test');
const { rowsOf, rowDates, openNotifications } = require('../helpers/notificationHelpers');

test.beforeEach(async ({ page }) => {
  await openNotifications(page);
});

test('ADM_022.002 / ADM_022.006 / ADM_027.005 / ADM_027.021 @critical - the list shows the newest first with the arrow pointing down', async ({ page }) => {
  await expect(page.getByRole('button', { name: /No\./ })).toContainText('sorted descending');

  const dates = await rowDates(page);
  expect(dates).toEqual([...dates].sort((a, b) => b - a)); // already newest to oldest
});

test('ADM_022.005 - an arrow icon sits next to No.', async ({ page }) => {
  await expect(page.getByRole('button', { name: /No\./ }).locator('svg')).toBeVisible();
});

test('ADM_022.007 - clicking the arrow shows the oldest first', async ({ page }) => {
  const sortArrow = page.getByRole('button', { name: /No\./ });
  await sortArrow.click();

  await expect(sortArrow).toContainText('sorted ascending');
  await expect.poll(async () => {
    const dates = await rowDates(page);
    return dates.length > 0 && dates.every((date, i) => i === 0 || date >= dates[i - 1]);
  }).toBe(true); // keeps checking until the list has re-sorted oldest to newest
});

test('ADM_022.017 - the create button is shown on the list', async ({ page }) => {
  await expect(page.getByRole('button', { name: '新規作成' })).toBeVisible();
});

test('ADM_022.003 / ADM_027.004 - the delivery date and time are shown in the format the app uses', async ({ page }) => {
  const dates = await rowsOf(page).locator('td:nth-child(2)').allInnerTexts();

  expect(dates.length).toBeGreaterThan(0);
  for (const date of dates) {
    expect(date.trim()).toMatch(/^\d{4}年\s*\d{1,2}月\s*\d{1,2}日\s+\d{1,2}:\d{2}$/); // e.g. 2026年 10月 06日   11:36
  }
});

test('ADM_022.004 - the message title is shown in bold', async ({ page }) => {
  await expect(rowsOf(page).first().locator('td:nth-child(3) > span')).toHaveCSS('font-weight', '700');
});