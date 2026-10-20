const { expect } = require('@playwright/test');
const { rowsOf } = require('./notificationHelpers');

const deliveryCell = 'td:nth-child(4)'; // the 配信方法 cell of a list row
const titleCell = 'td:nth-child(3)'; // the bold message title of a list row

// Opens the filter (it shows the current choice, すべて at first) and picks one option.
// .first() because the same text can also appear in the table below the filter.
async function chooseFilter(page, option, current = 'すべて') {
  await page.getByText(current, { exact: true }).first().click();
  await page.getByRole('menuitem', { name: option }).click();
}

// Waits until no row with another delivery method is left, then checks rows are really there
async function expectOnlyMethod(page, option) {
  await expect(rowsOf(page).filter({ has: page.locator(deliveryCell, { hasNotText: option }) })).toHaveCount(0);
  await expect(rowsOf(page).first()).toBeVisible();
}

// The title of the first row on the page
const firstTitle = async (page) => (await rowsOf(page).first().locator(titleCell).innerText()).trim();

module.exports = { deliveryCell, titleCell, chooseFilter, expectOnlyMethod, firstTitle };