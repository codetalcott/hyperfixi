/**
 * Element-scoped `:name` variables + numeric `increment @attr` — shipped full
 * bundle (`dist/hyperfixi.js`).
 *
 * Regression guard for the hyperfixi.org `/try/` counter:
 *   on click increment :count then put 'Clicks: ' + :count into me
 * `:name` must persist per-element across event firings (so the counter counts
 * 1, 2, 3…), stay isolated per element, and never leak to `window`. And
 * `increment @data-n` must coerce numerically (1, 2, 3), not concatenate.
 */
import { test, expect } from '@playwright/test';

test.describe('Shipped bundle — element-scoped `:name` @quick', () => {
  // compatibility-test.html already loads dist/hyperfixi.js via <script src>.
  // Do NOT inject a second copy (addScriptTag) — a second bundle instance brings
  // its own attribute-processor + MutationObserver, double-binding every handler.
  test.beforeEach(async ({ page, baseURL }) => {
    await page.goto(`${baseURL}/packages/core/compatibility-test.html`);
    await page.waitForFunction(() => (window as any).hyperfixi !== undefined, { timeout: 5000 });
  });

  test('the /try/ counter counts 1, 2, 3 across clicks', async ({ page }) => {
    await page.evaluate(async () => {
      const w = window as any;
      const btn = document.createElement('button');
      btn.id = 'counter';
      btn.setAttribute('_', "on click increment :count then put 'Clicks: ' + :count into me");
      btn.textContent = 'Clicks: 0';
      document.body.appendChild(btn);
      await w.hyperfixi.process(btn);
    });

    const btn = page.locator('#counter');
    await btn.click();
    await expect(btn).toHaveText('Clicks: 1');
    await btn.click();
    await expect(btn).toHaveText('Clicks: 2');
    await btn.click();
    await expect(btn).toHaveText('Clicks: 3');
  });

  test('two elements with the same :count do NOT share state', async ({ page }) => {
    await page.evaluate(async () => {
      const w = window as any;
      for (const id of ['a', 'b']) {
        const btn = document.createElement('button');
        btn.id = id;
        btn.setAttribute('_', 'on click increment :count then put :count into me');
        btn.textContent = '0';
        document.body.appendChild(btn);
        await w.hyperfixi.process(btn);
      }
    });

    await page.locator('#a').click();
    await page.locator('#a').click();
    await page.locator('#b').click();

    await expect(page.locator('#a')).toHaveText('2');
    await expect(page.locator('#b')).toHaveText('1');
  });

  test('`:count` does not leak to window', async ({ page }) => {
    await page.evaluate(async () => {
      const w = window as any;
      const btn = document.createElement('button');
      btn.id = 'leak-btn';
      btn.setAttribute('_', 'on click increment :count');
      document.body.appendChild(btn);
      await w.hyperfixi.process(btn);
    });

    await page.locator('#leak-btn').click();
    const leaked = await page.evaluate(() => 'count' in window);
    expect(leaked).toBe(false);
  });

  test('increment @data-n coerces numerically (1, 2, 3)', async ({ page }) => {
    await page.evaluate(async () => {
      const w = window as any;
      const btn = document.createElement('button');
      btn.id = 'attr-btn';
      btn.setAttribute('_', 'on click increment @data-n then put @data-n into me');
      btn.textContent = '-';
      document.body.appendChild(btn);
      await w.hyperfixi.process(btn);
    });

    const btn = page.locator('#attr-btn');
    await btn.click();
    await expect(btn).toHaveText('1');
    await btn.click();
    await expect(btn).toHaveText('2');
    await btn.click();
    await expect(btn).toHaveText('3');
  });
});
