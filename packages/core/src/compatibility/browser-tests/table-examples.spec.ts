/**
 * The two table examples, on the bundle each page loads by default
 * (hyperfixi-hs.js). No other browser test opens them.
 */
import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:3000';

test.describe('Table Examples @comprehensive', () => {
  test('filterable table: filter by name, by stock, and reset', async ({ page }) => {
    await page.goto(`${BASE_URL}/examples/tables-and-data/filterable-table.html`);
    const rows = page.locator('#products tbody tr');
    const visible = page.locator('#products tbody tr:not([hidden])');
    await expect(rows).toHaveCount(5);
    await expect(visible).toHaveCount(5);

    const name = ((await rows.first().locator('td').first().textContent()) ?? '').trim();
    await page.fill('#search', name.slice(0, 4));
    await expect(visible).toHaveCount(1);

    await page.fill('#search', '');
    await page.check('#stock-only');
    const inStock = await rows.evaluateAll(
      trs => trs.filter(tr => Number(tr.getAttribute('data-stock')) > 0).length
    );
    expect(inStock).toBeLessThan(5);
    await expect(visible).toHaveCount(inStock);

    await page.locator('button', { hasText: 'Reset filters' }).click();
    await expect(visible).toHaveCount(5);
  });

  test('sortable table: a header sorts descending, then ascending, by number', async ({ page }) => {
    await page.goto(`${BASE_URL}/examples/tables-and-data/sortable-table.html`);
    const prices = () =>
      page
        .locator('#product-rows tr')
        .evaluateAll(trs => trs.map(tr => Number(tr.getAttribute('data-price'))));
    const price = page.locator('#products th').nth(1);

    await price.click();
    await expect(price).toHaveAttribute('aria-sort', 'descending');
    // The rows move inside a view transition, a frame after the attribute is set.
    await expect.poll(prices).toEqual([100, 45, 30, 21, 9]);

    // The second click is the one that used to do nothing on the engine: the first
    // click's view transition never finished.
    await price.click();
    await expect(price).toHaveAttribute('aria-sort', 'ascending');
    await expect.poll(prices).toEqual([9, 21, 30, 45, 100]);
  });
});
