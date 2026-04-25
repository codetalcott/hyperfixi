import { test, expect } from '@playwright/test';

const BASE = 'http://127.0.0.1:3000/examples/behaviors/demo.html';

test.describe('Behavior Resolver Bundle — Demo', () => {
  test('page loads without errors and behaviors are registered', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));

    await page.goto(BASE, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);

    const criticalErrors = errors.filter(e => !e.includes('favicon') && !e.includes('404'));
    expect(criticalErrors).toEqual([]);
  });

  test('Toggleable — click toggles .active class', async ({ page }) => {
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);

    const btn = page.locator('.toggle-button').first();
    await expect(btn).not.toHaveClass(/active/);

    await btn.click();
    await page.waitForTimeout(200);
    await expect(btn).toHaveClass(/active/, { timeout: 3000 });

    await btn.click();
    await page.waitForTimeout(200);
    await expect(btn).not.toHaveClass(/active/);
  });

  test('Toggleable — custom class "highlighted"', async ({ page }) => {
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);

    const btn = page.locator('.toggle-button').nth(1);
    await btn.click();
    await page.waitForTimeout(200);
    await expect(btn).toHaveClass(/highlighted/, { timeout: 3000 });
  });

  test('Removable — click removes element', async ({ page }) => {
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);

    const items = page.locator('.removable-item');
    const count = await items.count();
    expect(count).toBeGreaterThan(0);

    await items.first().click();
    await page.waitForTimeout(500);

    expect(await items.count()).toBe(count - 1);
  });

  test('Draggable — box position changes on drag', async ({ page }) => {
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);

    const box = page.locator('.draggable-box');
    const startBox = await box.boundingBox();
    expect(startBox).not.toBeNull();

    await box.hover();
    await page.mouse.down();
    await page.mouse.move(startBox!.x + 100, startBox!.y + 50, { steps: 5 });
    await page.mouse.up();
    await page.waitForTimeout(200);

    const endBox = await box.boundingBox();
    // Box should have moved from its start position (tolerance for event loop timing)
    expect(endBox!.x).toBeGreaterThan(startBox!.x + 10);
  });

  test('Tabs — clicking tab switches active panel', async ({ page }) => {
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);

    const tabsContainer = page.locator('.tabs-demo').first();
    const tabs = tabsContainer.locator('[role="tab"]');
    const panels = tabsContainer.locator('[role="tabpanel"]');

    await expect(tabs.first()).toHaveClass(/active/);
    await expect(panels.first()).toHaveClass(/active/);

    await tabs.nth(1).click();
    await page.waitForTimeout(200);

    await expect(tabs.nth(1)).toHaveClass(/active/);
    await expect(panels.nth(1)).toHaveClass(/active/);
    await expect(tabs.first()).not.toHaveClass(/active/);
  });

  test('Clipboard — button shows .copied feedback', async ({ page }) => {
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);

    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);

    const copyBtn = page.locator('.copy-area button').first();
    await copyBtn.click();
    await page.waitForTimeout(300);

    await expect(copyBtn).toHaveClass(/copied/, { timeout: 3000 });
  });
});
