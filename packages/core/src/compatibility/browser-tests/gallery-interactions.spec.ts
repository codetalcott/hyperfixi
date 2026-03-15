/**
 * Gallery Interaction Tests
 *
 * Tests every interactive element in the gallery examples.
 * Unlike gallery-examples.spec.ts (smoke/load-only), these tests
 * click buttons, type input, and verify observable DOM changes.
 *
 * Motivated by the toggle *display bug — runtime errors that only
 * fire on user interaction were invisible to load-only tests.
 */
import { test, expect, Page } from '@playwright/test';
import { createErrorCollector, expectNoCriticalErrors, ErrorCollector } from './test-utils';

const BASE = 'http://127.0.0.1:3000';

/** Navigate and set up error collection */
async function setup(page: Page, path: string): Promise<ErrorCollector> {
  const collector = createErrorCollector(page);
  collector.attach();
  await page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(500); // let hyperscript init
  return collector;
}

// ============================================================
// BASICS
// ============================================================

test.describe('Basics @gallery @interaction', () => {
  test('01-hello-world: click puts text into output @quick', async ({ page }) => {
    const collector = await setup(page, '/examples/basics/01-hello-world.html');
    await page.locator('button').first().click();
    await expect(page.locator('#output')).toHaveText('Hello, LokaScript');
    expectNoCriticalErrors(collector);
  });

  test('02-toggle-class: click toggles .active on #box @quick', async ({ page }) => {
    const collector = await setup(page, '/examples/basics/02-toggle-class.html');
    const box = page.locator('#box');
    const btn = page.locator('button').first();

    await btn.click();
    await expect(box).toHaveClass(/active/);

    await btn.click();
    await expect(box).not.toHaveClass(/active/);

    expectNoCriticalErrors(collector);
  });

  test('03-show-hide: show and hide commands @quick', async ({ page }) => {
    const collector = await setup(page, '/examples/basics/03-show-hide.html');
    const content = page.locator('#content1');

    // Content starts visible
    await expect(content).toBeVisible();

    // Hide
    await page.locator('button.secondary').first().click();
    await page.waitForTimeout(200);
    await expect(content).toBeHidden();

    // Show
    await page.locator('button').first().click();
    await page.waitForTimeout(200);
    await expect(content).toBeVisible();

    expectNoCriticalErrors(collector);
  });

  test('03-show-hide: toggle *display from initial state @quick', async ({ page }) => {
    const collector = await setup(page, '/examples/basics/03-show-hide.html');
    const content = page.locator('#content1');
    const toggleBtn = page.locator('button.success').first();

    // Content starts visible — toggle should hide
    await toggleBtn.click();
    await page.waitForTimeout(300);
    await expect(content).toBeHidden();

    // Toggle again — should show
    await toggleBtn.click();
    await page.waitForTimeout(300);
    await expect(content).toBeVisible();

    expectNoCriticalErrors(collector);
  });

  test('03-show-hide: class-based toggle @quick', async ({ page }) => {
    const collector = await setup(page, '/examples/basics/03-show-hide.html');
    const content = page.locator('#content2');

    // Hide (add .hidden)
    await page.locator('button.secondary').nth(1).click();
    await expect(content).toHaveClass(/hidden/);

    // Show (remove .hidden)
    await page.locator('button').nth(3).click();
    await expect(content).not.toHaveClass(/hidden/);

    // Toggle
    await page.locator('button.success').nth(1).click();
    await expect(content).toHaveClass(/hidden/);

    expectNoCriticalErrors(collector);
  });

  test('04-input-mirror: typing mirrors to output @quick', async ({ page }) => {
    const collector = await setup(page, '/examples/basics/04-input-mirror.html');

    await page.locator('input').first().fill('Hello World');
    await expect(page.locator('#name-mirror')).toHaveText('Hello World');

    expectNoCriticalErrors(collector);
  });

  test('04-input-mirror: textarea mirrors with char count @quick', async ({ page }) => {
    const collector = await setup(page, '/examples/basics/04-input-mirror.html');

    const textarea = page.locator('textarea').first();
    await textarea.fill('Test message');
    await expect(page.locator('#bio-mirror')).toHaveText('Test message');
    await expect(page.locator('#char-count')).toHaveText('12');

    expectNoCriticalErrors(collector);
  });

  test('05-counter: increment, decrement, reset @quick', async ({ page }) => {
    const collector = await setup(page, '/examples/basics/05-counter.html');
    const count = page.locator('#count');

    await page.locator('button:has-text("Increase")').click();
    await expect(count).toHaveText('1');

    await page.locator('button:has-text("Increase")').click();
    await expect(count).toHaveText('2');

    await page.locator('button:has-text("Decrease")').click();
    await expect(count).toHaveText('1');

    await page.locator('button:has-text("Reset")').click();
    await expect(count).toHaveText('0');

    expectNoCriticalErrors(collector);
  });
});

// ============================================================
// INTERMEDIATE
// ============================================================

test.describe('Intermediate @gallery @interaction', () => {
  test('01-form-validation: email validation', async ({ page }) => {
    const collector = await setup(page, '/examples/intermediate/01-form-validation.html');

    // Invalid email
    await page.locator('#email').fill('invalid');
    await expect(page.locator('#email')).toHaveClass(/error/);
    await expect(page.locator('#email-error')).toBeVisible();

    // Valid email
    await page.locator('#email').fill('user@example.com');
    await expect(page.locator('#email')).toHaveClass(/valid/);
    await expect(page.locator('#email-error')).toBeHidden();

    expectNoCriticalErrors(collector);
  });

  test('01-form-validation: password validation', async ({ page }) => {
    const collector = await setup(page, '/examples/intermediate/01-form-validation.html');

    // Short password
    await page.locator('#password').fill('abc');
    await expect(page.locator('#password')).toHaveClass(/error/);
    await expect(page.locator('#password-error')).toBeVisible();

    // Valid password
    await page.locator('#password').fill('password123');
    await expect(page.locator('#password')).toHaveClass(/valid/);
    await expect(page.locator('#password-error')).toBeHidden();

    expectNoCriticalErrors(collector);
  });

  test('01-form-validation: confirm password mismatch', async ({ page }) => {
    const collector = await setup(page, '/examples/intermediate/01-form-validation.html');

    await page.locator('#password').fill('password123');
    await page.locator('#confirm').fill('different');
    await expect(page.locator('#confirm')).toHaveClass(/error/);
    await expect(page.locator('#confirm-error')).toBeVisible();

    await page.locator('#confirm').fill('password123');
    await expect(page.locator('#confirm')).toHaveClass(/valid/);
    await expect(page.locator('#confirm-error')).toBeHidden();

    expectNoCriticalErrors(collector);
  });

  test('02-fetch-data: load user @network', async ({ page }) => {
    const collector = await setup(page, '/examples/intermediate/02-fetch-data.html');

    await page.locator('button:has-text("Load User")').click();
    // Wait for fetch to complete and content to appear
    await expect(page.locator('#user-data')).toBeVisible({ timeout: 10000 });
    const text = await page.locator('#user-data').textContent();
    expect(text).toBeTruthy();
    expect(text!.length).toBeGreaterThan(10);

    expectNoCriticalErrors(collector);
  });

  test('03-fade-effects: toggle fade class', async ({ page }) => {
    const collector = await setup(page, '/examples/intermediate/03-fade-effects.html');
    const box = page.locator('#fade-box1');

    await page.locator('button:has-text("Fade In/Out")').click();
    await expect(box).toHaveClass(/fade-out/);

    await page.locator('button:has-text("Fade In/Out")').click();
    await expect(box).not.toHaveClass(/fade-out/);

    expectNoCriticalErrors(collector);
  });

  test('03-fade-effects: slide toggle', async ({ page }) => {
    const collector = await setup(page, '/examples/intermediate/03-fade-effects.html');
    const box = page.locator('#slide-box');

    await page.locator('button:has-text("Slide Toggle")').click();
    await expect(box).toHaveClass(/slide-out/);

    await page.locator('button:has-text("Slide Toggle")').click();
    await expect(box).not.toHaveClass(/slide-out/);

    expectNoCriticalErrors(collector);
  });

  test('04-tabs: switching tabs shows correct content', async ({ page }) => {
    const collector = await setup(page, '/examples/intermediate/04-tabs.html');

    // Click Features tab
    await page.locator('.tab:has-text("Features")').click();
    await expect(page.locator('#features')).toHaveClass(/active/);
    await expect(page.locator('#overview')).not.toHaveClass(/active/);

    // Click Pricing tab
    await page.locator('.tab:has-text("Pricing")').click();
    await expect(page.locator('#pricing')).toHaveClass(/active/);
    await expect(page.locator('#features')).not.toHaveClass(/active/);

    expectNoCriticalErrors(collector);
  });

  test('05-modal: open and close info modal', async ({ page }) => {
    const collector = await setup(page, '/examples/intermediate/05-modal.html');

    await page.locator('button:has-text("Open Info Modal")').click();
    await expect(page.locator('#info-modal')).toBeVisible();

    // Close via close button inside the modal
    await page.locator('#info-modal button:has-text("Close")').click();
    await expect(page.locator('#info-modal')).toBeHidden();

    expectNoCriticalErrors(collector);
  });

  test('05-modal: escape key closes modal', async ({ page }) => {
    const collector = await setup(page, '/examples/intermediate/05-modal.html');

    await page.locator('button:has-text("Open Info Modal")').click();
    await expect(page.locator('#info-modal')).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(page.locator('#info-modal')).toBeHidden();

    expectNoCriticalErrors(collector);
  });

  test('06-native-dialog: open and close info dialog', async ({ page }) => {
    const collector = await setup(page, '/examples/intermediate/06-native-dialog.html');

    await page.locator('button:has-text("Open Info Dialog")').click();
    await expect(page.locator('#info-dialog')).toHaveAttribute('open', '');

    await page.locator('#info-dialog button:has-text("Close")').click();
    await expect(page.locator('#info-dialog')).not.toHaveAttribute('open');

    expectNoCriticalErrors(collector);
  });

  test('06-native-dialog: smart toggle', async ({ page }) => {
    const collector = await setup(page, '/examples/intermediate/06-native-dialog.html');
    const dialog = page.locator('#smart-dialog');

    // Open (non-modal)
    await page.locator('button:has-text("Open Dialog (Non-Modal)")').click();
    await expect(dialog).toHaveAttribute('open', '');

    // Close
    await page.locator('#smart-dialog button:has-text("Close")').click();
    await expect(dialog).not.toHaveAttribute('open');

    expectNoCriticalErrors(collector);
  });

  test('07-dialog-toggle: toggle dialog', async ({ page }) => {
    const collector = await setup(page, '/examples/intermediate/07-dialog-toggle.html');
    const dialog = page.locator('#infoDialog');

    await page.locator('button:has-text("Toggle Info Dialog")').click();
    await expect(dialog).toHaveAttribute('open', '');

    await page.locator('button:has-text("Toggle Info Dialog")').click();
    await expect(dialog).not.toHaveAttribute('open');

    expectNoCriticalErrors(collector);
  });
});

// ============================================================
// ADVANCED
// ============================================================

test.describe('Advanced @gallery @interaction', () => {
  test('01-color-cycling: pointerdown changes color', async ({ page }) => {
    const collector = await setup(page, '/examples/advanced/01-color-cycling.html');
    const box = page.locator('#color-box');

    const colorBefore = await box.evaluate(el => getComputedStyle(el).backgroundColor);

    // Press and hold briefly
    await box.dispatchEvent('pointerdown');
    await page.waitForTimeout(600); // wait for at least one color transition
    const colorDuring = await box.evaluate(el => getComputedStyle(el).backgroundColor);
    await box.dispatchEvent('pointerup');

    // Color should have changed during press
    expect(colorDuring).not.toBe(colorBefore);

    expectNoCriticalErrors(collector);
  });

  test('03-sortable-list: delete removes item', async ({ page }) => {
    const collector = await setup(page, '/examples/advanced/03-sortable-list.html');
    const items = page.locator('#task-list .sortable-item');

    const countBefore = await items.count();
    expect(countBefore).toBeGreaterThan(0);

    // Click first delete button
    await page.locator('#task-list .sortable-item button').first().click();
    await expect(items).toHaveCount(countBefore - 1);

    expectNoCriticalErrors(collector);
  });
});

// ============================================================
// LANDING PAGE
// ============================================================

test.describe('Landing Page @gallery @interaction', () => {
  test('clipboard-copy: click executes without errors', async ({ page, context }) => {
    // Grant clipboard permissions for headless Chromium
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    const collector = await setup(page, '/examples/landing-page/clipboard-copy.html');

    const copyBtn = page.locator('.copy-btn').first();
    await copyBtn.click();
    await page.waitForTimeout(500);

    // The clipboard API may not work fully in headless mode,
    // but the hyperscript should execute without runtime errors.
    // If clipboard works, button shows "copied!" then restores.
    expectNoCriticalErrors(collector);
  });

  test('color-cycling: pointerdown changes color', async ({ page }) => {
    const collector = await setup(page, '/examples/landing-page/color-cycling.html');
    const box = page.locator('#color-box');

    const colorBefore = await box.evaluate(el => getComputedStyle(el).backgroundColor);

    await box.dispatchEvent('pointerdown');
    await page.waitForTimeout(600);
    const colorDuring = await box.evaluate(el => getComputedStyle(el).backgroundColor);
    await box.dispatchEvent('pointerup');

    expect(colorDuring).not.toBe(colorBefore);
    expectNoCriticalErrors(collector);
  });

  test('async-fetch: fetch todo from API @network', async ({ page }) => {
    const collector = await setup(page, '/examples/landing-page/async-fetch.html');

    await page.locator('button:has-text("Fetch TODO")').click();
    // Wait for fetch to complete — content changes from "Loading..." to JSON
    await page.waitForFunction(
      () => {
        const el = document.querySelector('#fetch-result');
        return el && el.textContent && el.textContent.includes('userId');
      },
      { timeout: 15000 }
    );

    const text = await page.locator('#fetch-result').textContent();
    expect(text).toContain('userId');

    expectNoCriticalErrors(collector);
  });

  test('js-interop: date/time button populates result', async ({ page }) => {
    const collector = await setup(page, '/examples/landing-page/js-interop.html');

    // Click the date/time button (second button in Demo 1)
    const buttons = page.locator('button');
    // Find the button that puts date into #js-result
    await page.locator('button:has-text("Date")').click();
    await expect(page.locator('#js-result')).not.toHaveText('');

    expectNoCriticalErrors(collector);
  });

  test('js-interop: browser info button populates result', async ({ page }) => {
    const collector = await setup(page, '/examples/landing-page/js-interop.html');

    await page.locator('button:has-text("Browser Info")').click();
    await expect(page.locator('#browser-result')).not.toHaveText('');

    const text = await page.locator('#browser-result').textContent();
    expect(text).toContain('userAgent');

    expectNoCriticalErrors(collector);
  });

  test('send-events: send hello updates event log', async ({ page }) => {
    const collector = await setup(page, '/examples/landing-page/send-events.html');

    await page.locator('button:has-text("Send")').click();
    await expect(page.locator('#event-log')).not.toHaveText('');

    const text = await page.locator('#event-log').textContent();
    expect(text).toContain('Got hello event');

    expectNoCriticalErrors(collector);
  });

  test('tell-command: highlight paragraphs in article', async ({ page }) => {
    const collector = await setup(page, '/examples/landing-page/tell-command.html');

    // Click the article to trigger tell <p/> in me add .highlight
    await page.locator('#article1').click();
    const paragraphs = page.locator('#article1 p');
    const count = await paragraphs.count();
    expect(count).toBeGreaterThan(0);

    // At least one paragraph should have .highlight
    const highlighted = page.locator('#article1 p.highlight');
    await expect(highlighted).not.toHaveCount(0);

    // Clear
    await page.locator('button:has-text("Clear Highlights")').click();
    await expect(page.locator('#article1 p.highlight')).toHaveCount(0);

    expectNoCriticalErrors(collector);
  });

  test('tell-command: highlight first and last list items', async ({ page }) => {
    const collector = await setup(page, '/examples/landing-page/tell-command.html');

    await page.locator('button:has-text("Highlight First")').click();
    await expect(page.locator('#items li').first()).toHaveClass(/highlight/);

    await page.locator('button:has-text("Clear All")').click();
    await expect(page.locator('#items li.highlight')).toHaveCount(0);

    await page.locator('button:has-text("Highlight Last")').click();
    await expect(page.locator('#items li').last()).toHaveClass(/highlight/);

    expectNoCriticalErrors(collector);
  });

  test('tell-command: open and close all details', async ({ page }) => {
    const collector = await setup(page, '/examples/landing-page/tell-command.html');

    await page.locator('button:has-text("Open All")').click();
    const details = page.locator('#article2 details');
    const count = await details.count();
    for (let i = 0; i < count; i++) {
      await expect(details.nth(i)).toHaveAttribute('open', '');
    }

    await page.locator('button:has-text("Close All")').click();
    for (let i = 0; i < count; i++) {
      await expect(details.nth(i)).not.toHaveAttribute('open');
    }

    expectNoCriticalErrors(collector);
  });
});
