import { test, expect } from '@playwright/test';
import { waitForHyperfixi } from './test-utils';

const BASE_URL = process.env.BASE_URL ?? 'http://127.0.0.1:3000';

// Headline regression: append/prepend must not destroy the target's existing DOM.
// The old `innerHTML +=` implementation re-created every child, losing input
// state, focus, and event listeners on elements it never touched.
test('append/prepend preserve live state of existing children', async ({ page }) => {
  await page.goto(BASE_URL);
  await page.setContent(`
<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<script src="/packages/core/dist/hyperfixi.js"></script>
</head><body>
  <ul id="list"><li><input id="typed"></li></ul>
  <button id="go" _="on click append '<li>Added</li>' to #list">go</button>
  <button id="pre" _="on click prepend '<li>First</li>' to #list">pre</button>
</body></html>`);
  await waitForHyperfixi(page);

  await page.fill('#typed', 'user typing');
  await page.focus('#typed');

  await page.click('#go');
  await page.click('#pre');
  await page.waitForTimeout(150);

  // The input survived both insertions, with its value AND its focus intact.
  expect(await page.inputValue('#typed')).toBe('user typing');
  expect(await page.evaluate(() => document.querySelector('#list')!.textContent)).toContain(
    'Added'
  );
  expect(
    await page.evaluate(() => document.querySelector('#list')!.firstElementChild!.textContent)
  ).toBe('First');
});
