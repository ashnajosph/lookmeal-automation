const { test, expect } = require('@playwright/test');
const { rowsOf, searchBox, noDataMessage, openNotifications } = require('./notificationHelpers');

test.beforeEach(async ({ page }) => {
  await openNotifications(page);
});

test('ADM_022.036 / ADM_027.027 - the notification list has a search box', async ({ page }) => {
  await expect(searchBox(page)).toBeVisible();
  await expect(searchBox(page)).toHaveAttribute('placeholder', 'キーワードで検索');
});

test('ADM_022.037 / ADM_022.038 / ADM_027.028 / ADM_027.030 @critical - searching a keyword narrows the list to matching notifications', async ({ page }) => {
  const rows = rowsOf(page);

  // use the longest message title on the page, so the search really narrows the list
  const titles = (await rows.locator('td:nth-child(3)').allInnerTexts()).map((title) => title.trim());
  const keyword = titles.sort((a, b) => b.length - a.length)[0];

  await searchBox(page).fill(keyword);

  await expect(rows.first()).toBeVisible();
  await expect(rows.filter({ hasNotText: keyword })).toHaveCount(0);
});

test('ADM_022.040 / ADM_027.033 - a keyword with no match shows the empty state', async ({ page }) => {
  await searchBox(page).fill('zzzz-no-match');

  await expect(noDataMessage(page)).toBeVisible();
  await expect(rowsOf(page)).toHaveCount(0);
});

test('ADM_022.041 / ADM_027.034 - clearing the search brings the full list back', async ({ page }) => {
  const rowCount = await rowsOf(page).count();

  await searchBox(page).fill('zzzz-no-match');
  await expect(noDataMessage(page)).toBeVisible();

  await searchBox(page).clear();
  await expect(rowsOf(page)).toHaveCount(rowCount);
  await expect(noDataMessage(page)).toBeHidden();
});

test('ADM_022.039 - the list shows a loading state while a search is loading, then the results', async ({ page }) => {
  const keyword = (await rowsOf(page).first().locator('td:nth-child(3)').innerText()).trim();

  // Hold every API call for 3 seconds, so the (normally very fast) loading state can be seen
  await page.route('**/*', async (route) => {
    if (['fetch', 'xhr'].includes(route.request().resourceType())) {
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
    await route.continue();
  });

  await searchBox(page).fill(keyword);

  await expect(rowsOf(page)).toHaveCount(0); // loading: the old rows are gone...
  await expect(noDataMessage(page)).toBeHidden(); // ...but it is not the no-data state
  await expect(rowsOf(page).first()).toBeVisible({ timeout: 10000 }); // then the results appear
});