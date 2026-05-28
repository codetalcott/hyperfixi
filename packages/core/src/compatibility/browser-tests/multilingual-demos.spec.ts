/**
 * Coverage for the multilingual feature-demo pages and the gallery hub that
 * had no Playwright spec:
 *   - multilingual/multilingual-sync.html  (shared counter/toggle, local hyperscript)
 *   - multilingual/adaptive-rtl-ltr.html    (counter/toggle + RTL/LTR language switch)
 *   - multilingual/dynamic-injection.html   (snippet selection; injection via CDN)
 *   - index.html                            (gallery hub navigation)
 *
 * The i18n translate paths on these pages come from the unpkg CDN, so the
 * strict assertions target only the locally-served runtime behavior. Page
 * errors are captured; net:: (CDN) failures are filtered by createErrorCollector.
 */
import { test, expect, type Page } from '@playwright/test';
import { waitForHyperfixi, createErrorCollector } from './test-utils';

const BASE_URL = process.env.BASE_URL ?? 'http://127.0.0.1:3000';

async function load(page: Page, path: string): Promise<void> {
  await page.goto(`${BASE_URL}${path}`, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await waitForHyperfixi(page);
  await page.waitForTimeout(150);
}

async function readInt(page: Page, selector: string): Promise<number> {
  return parseInt((await page.locator(selector).textContent()) ?? '0', 10);
}

test.describe('multilingual/multilingual-sync.html @comprehensive', () => {
  test('shared counter increments/decrements and box toggles', async ({ page }) => {
    const errors = createErrorCollector(page);
    errors.attach();
    await load(page, '/examples/multilingual/multilingual-sync.html');

    const start = await readInt(page, '#shared-count');
    await page.locator('.shared-btn.inc').click();
    await expect(page.locator('#shared-count')).toHaveText(String(start + 1));
    await page.locator('.shared-btn.dec').click();
    await expect(page.locator('#shared-count')).toHaveText(String(start));

    const box = page.locator('#shared-box');
    await expect(box).not.toHaveClass(/active/);
    await box.click();
    await expect(box).toHaveClass(/active/);

    expect(errors.getCriticalErrors()).toEqual([]);
  });
});

test.describe('multilingual/adaptive-rtl-ltr.html @comprehensive', () => {
  test('local counter + toggle work', async ({ page }) => {
    const errors = createErrorCollector(page);
    errors.attach();
    await load(page, '/examples/multilingual/adaptive-rtl-ltr.html');

    const start = await readInt(page, '#counter');
    await page.locator('.counter-btn.inc').click();
    await expect(page.locator('#counter')).toHaveText(String(start + 1));
    await page.locator('.counter-btn.dec').click();
    await expect(page.locator('#counter')).toHaveText(String(start));

    const box = page.locator('#toggle-box');
    await box.click();
    await expect(box).toHaveClass(/active/);

    expect(errors.getCriticalErrors()).toEqual([]);
  });

  test('switching to an RTL language applies rtl direction and active state', async ({ page }) => {
    await load(page, '/examples/multilingual/adaptive-rtl-ltr.html');

    // English is the initial active button; #code-content is LTR.
    await expect(page.locator('.lang-btn[data-lang="en"]')).toHaveClass(/active/);
    await expect(page.locator('#code-content')).not.toHaveClass(/rtl/);

    await page.locator('.lang-btn[data-lang="ar"]').click();
    await expect(page.locator('.lang-btn[data-lang="ar"]')).toHaveClass(/active/);
    await expect(page.locator('.lang-btn[data-lang="en"]')).not.toHaveClass(/active/);
    await expect(page.locator('#code-content')).toHaveClass(/rtl/);
  });
});

test.describe('multilingual/dynamic-injection.html @comprehensive', () => {
  test('snippet cards render and selection updates the active card', async ({ page }) => {
    const errors = createErrorCollector(page);
    errors.attach();
    await load(page, '/examples/multilingual/dynamic-injection.html');

    const cards = page.locator('#snippets .snippet-card');
    await expect(cards.first()).toBeVisible();
    const count = await cards.count();
    expect(count).toBeGreaterThan(1);

    // Selecting the second card makes it the active one.
    await cards.nth(1).click();
    await expect(cards.nth(1)).toHaveClass(/active/);

    expect(errors.getCriticalErrors()).toEqual([]);
  });
});

test.describe('index.html — gallery hub @comprehensive', () => {
  test('hub lists example links and navigates to one', async ({ page }) => {
    const errors = createErrorCollector(page);
    errors.attach();
    await page.goto(`${BASE_URL}/examples/index.html`, { waitUntil: 'domcontentloaded' });

    // The hub should link to the example pages.
    const links = page.locator('a[href$=".html"]');
    expect(await links.count()).toBeGreaterThan(15);
    await expect(page.locator('a[href="forms/partial-validation.html"]')).toHaveCount(1);

    // Following a link reaches a real example page.
    await page.locator('a[href="toggle-and-state/toggle-class.html"]').first().click();
    await expect(page).toHaveURL(/toggle-and-state\/toggle-class\.html$/);

    expect(errors.getCriticalErrors()).toEqual([]);
  });
});
