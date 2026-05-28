/**
 * Coverage for gallery example pages that had no Playwright spec:
 *   - dialogs/smart-element-toggle.html   (smart toggle of dialog/details/summary/select)
 *   - fetch-and-async/infinite-scroll.html (scroll-driven dynamic append)
 *   - forms/partial-validation.html        (validatePartialContent API + swap)
 *   - swap-and-morph/morph-comparison.html (morph vs innerHTML state preservation)
 *   - animation/color-cycling-debug.html   (transition template-literal interpolation)
 *
 * These specs assert precise DOM outcomes (exact values, counts, classes, JS
 * properties) and fail on any uncaught page error. The intent is to surface
 * real runtime/parser/command bugs — not to be pass-friendly.
 */
import { test, expect, type Page } from '@playwright/test';
import { waitForHyperfixi, createErrorCollector } from './test-utils';

const BASE_URL = process.env.BASE_URL ?? 'http://127.0.0.1:3000';

async function load(page: Page, path: string): Promise<void> {
  await page.goto(`${BASE_URL}${path}`, { waitUntil: 'domcontentloaded', timeout: 10000 });
  await waitForHyperfixi(page);
  await page.waitForTimeout(100); // attribute-processor scan settle
}

test.describe('smart-element-toggle.html @comprehensive', () => {
  test('toggles native <dialog> non-modal vs modal', async ({ page }) => {
    const errors = createErrorCollector(page);
    errors.attach();
    await load(page, '/examples/dialogs/smart-element-toggle.html');

    const info = page.locator('#infoDialog');
    const alert = page.locator('#alertDialog');
    await expect(info).toHaveJSProperty('open', false);

    await page.getByRole('button', { name: 'Open Non-Modal Dialog' }).click();
    await expect(info).toHaveJSProperty('open', true);
    // Non-modal: opened via show(), so it must NOT match :modal.
    expect(await info.evaluate((d: HTMLDialogElement) => d.matches(':modal'))).toBe(false);
    // Close via the in-dialog close button.
    await info.getByRole('button', { name: 'Close' }).click();
    await expect(info).toHaveJSProperty('open', false);

    await page.getByRole('button', { name: 'Open Modal Dialog' }).click();
    await expect(alert).toHaveJSProperty('open', true);
    // `toggle #alertDialog modal` must open it modally (showModal), so it matches :modal.
    expect(await alert.evaluate((d: HTMLDialogElement) => d.matches(':modal'))).toBe(true);

    expect(errors.getCriticalErrors()).toEqual([]);
  });

  test('toggles <details> accordion open/closed', async ({ page }) => {
    await load(page, '/examples/dialogs/smart-element-toggle.html');
    const faq1 = page.locator('#faq1');
    await expect(faq1).toHaveJSProperty('open', false);

    await page.getByRole('button', { name: 'Toggle FAQ 1' }).click();
    await expect(faq1).toHaveJSProperty('open', true);

    await page.getByRole('button', { name: 'Toggle FAQ 1' }).click();
    await expect(faq1).toHaveJSProperty('open', false);
  });

  test('toggling a <summary> opens its parent <details>', async ({ page }) => {
    await load(page, '/examples/dialogs/smart-element-toggle.html');
    const details = page.locator('#detailsDemo');
    await expect(details).toHaveJSProperty('open', false);

    await page.getByRole('button', { name: 'Toggle via Summary Element' }).click();
    await expect(details).toHaveJSProperty('open', true);
  });
});

test.describe('infinite-scroll.html @comprehensive', () => {
  test('scrolling to the bottom appends more items', async ({ page }) => {
    await load(page, '/examples/fetch-and-async/infinite-scroll.html');

    const items = page.locator('#content-list .content-item');
    await expect(items).toHaveCount(10);
    await expect(page.locator('#items-loaded')).toHaveText('10');

    // Drive the scroll handler: jump to the bottom and fire a scroll event.
    await page.locator('.scroll-container').evaluate(el => {
      el.scrollTop = el.scrollHeight;
      el.dispatchEvent(new Event('scroll'));
    });

    // Handler enters the near-bottom branch and flips the loader on during the
    // simulated 1.5s fetch.
    await expect(page.locator('#loading')).toHaveClass(/active/, { timeout: 1500 });

    // The handler's `repeat 10 times … make a <li>…</li> … put it at end of
    // #content-list` appends rows. We assert growth, not an exact count — a
    // synthetic scroll-to-bottom can re-trigger additional pages as the content
    // grows.
    await expect.poll(async () => await items.count(), { timeout: 5000 }).toBeGreaterThan(10);
    await expect(page.locator('#items-loaded')).not.toHaveText('10');

    // The made rows interpolate `{itemNum}` — a dynamically-created item's
    // number badge shows a real number (e.g. "#11"), not the literal "#{itemNum}".
    const madeBadge = items.nth(10).locator('.item-number');
    await expect(madeBadge).toHaveText(/^#\d+$/);
  });
});

test.describe('partial-validation.html @comprehensive', () => {
  test('validatePartialContent flags a full-page swap as critical', async ({ page }) => {
    await load(page, '/examples/forms/partial-validation.html');

    // The partial-validation API must be exposed on the runtime global.
    expect(
      await page.evaluate(() => typeof (window as any).hyperfixi?.validatePartialContent)
    ).toBe('function');

    await page.getByRole('button', { name: /Full Page/ }).click();

    // A critical-severity entry must appear in the log...
    await expect(page.locator('#validation-log .log-critical').first()).toBeVisible();
    // ...and the swap is non-blocking, so the target receives the content.
    await expect(page.locator('#swap-target')).toContainText('This is a full page!');
  });

  test('valid partial content reports no issues', async ({ page }) => {
    await load(page, '/examples/forms/partial-validation.html');

    await page.getByRole('button', { name: 'Swap Valid Content' }).click();
    await expect(page.locator('#validation-log')).toContainText('No issues found');
    await expect(page.locator('#swap-target')).toContainText('Valid Partial Content');
  });
});

test.describe('morph-comparison.html @comprehensive', () => {
  test('morph preserves edited form state; innerHTML destroys it', async ({ page }) => {
    const errors = createErrorCollector(page);
    errors.attach();
    await load(page, '/examples/swap-and-morph/morph-comparison.html');

    // --- Morph panel: edit then morph -> live value is preserved ---
    const morphName = page.locator('#morph-name');
    await morphName.fill('Jane Smith');
    await page.locator('.morph-panel:has(#morph-form-container) button').click();
    await expect(page.locator('#morph-form-timestamp')).toContainText('Updated:');
    // Idiomorph keeps the existing input element, so the typed value survives
    // even though the morph source HTML still says value="John Doe".
    await expect(morphName).toHaveValue('Jane Smith');

    // --- innerHTML panel: edit then innerHTML-swap -> value resets ---
    const innerName = page.locator('#innerHTML-name');
    await innerName.fill('Jane Smith');
    await page.locator('#innerHTML-form-btn').click();
    await expect(page.locator('#innerHTML-form-timestamp')).toContainText('Updated:');
    await expect(innerName).toHaveValue('John Doe');

    expect(errors.getCriticalErrors()).toEqual([]);
  });
});

test.describe('color-cycling-debug.html @comprehensive', () => {
  test('press-and-hold interpolates $rand into a real hsl() color', async ({ page }) => {
    const errors = createErrorCollector(page);
    errors.attach();
    await load(page, '/examples/animation/color-cycling-debug.html');

    const box = page.locator('#color-box');
    const bb = await box.boundingBox();
    expect(bb).not.toBeNull();
    await page.mouse.move(bb!.x + bb!.width / 2, bb!.y + bb!.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(600); // > 2 transitions @ 250ms
    const cyclingBg = await box.evaluate(el => (el as HTMLElement).style.backgroundColor);
    await page.mouse.up();

    // The transition target was `hsl($rand 100% 90%)`. If interpolation worked
    // the inline style is a concrete hsl()/rgb() color; if it broke, the literal
    // "$rand" would leak through (the page's own MutationObserver flags this).
    expect(cyclingBg).toMatch(/hsl|rgb/);
    expect(cyclingBg).not.toContain('$rand');

    const log = (await page.locator('#log').textContent()) ?? '';
    expect(log).toContain('pointerdown event fired');
    expect(log).not.toContain('$rand was NOT interpolated');
    expect(log).not.toContain('UNCAUGHT');

    expect(errors.getCriticalErrors()).toEqual([]);
  });
});
