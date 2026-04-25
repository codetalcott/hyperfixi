/**
 * AOT Compiled Output Browser Tests
 *
 * Verifies that AOT-compiled JavaScript (what the compiler produces)
 * runs correctly in a real browser, including batched class operations
 * and pre-rendered init block effects.
 *
 * These tests use a static HTML page with inline compiled JS that
 * mirrors the output of the AOT compiler pipeline.
 */

import { test, expect } from '@playwright/test';

const TEST_PAGE = '/packages/core/aot-compiled-fixture.html';

test.describe('AOT Compiled Output @integration @aot', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(TEST_PAGE);
    // Wait for handlers to be bound
    await page.waitForFunction(() => {
      const btn = document.getElementById('btn-toggle');
      return btn !== null;
    });
  });

  test('single toggle command toggles class on click @quick @aot', async ({ page }) => {
    const btn = page.locator('#btn-toggle');

    // Initially no .active class on button
    await expect(btn).not.toHaveClass(/active/);

    // Click → toggle on
    await btn.click();
    await expect(btn).toHaveClass(/active/);

    // Click again → toggle off
    await btn.click();
    await expect(btn).not.toHaveClass(/active/);
  });

  test('batched classList.add applies multiple classes at once @quick @aot', async ({ page }) => {
    const btn = page.locator('#btn-batch-add');

    // Click → should add all three classes
    await btn.click();

    await expect(btn).toHaveClass(/active/);
    await expect(btn).toHaveClass(/visible/);
    await expect(btn).toHaveClass(/highlighted/);
  });

  test('mixed batch: add + remove + toggle on explicit target @quick @aot', async ({ page }) => {
    const target = page.locator('#target-mixed');

    // Initially has class="hidden"
    await expect(target).toHaveClass(/hidden/);
    await expect(target).not.toHaveClass(/visible/);
    await expect(target).not.toHaveClass(/selected/);

    // Click the mixed batch button
    await page.locator('#btn-mixed').click();

    // .visible added, .hidden removed, .selected toggled on
    await expect(target).toHaveClass(/visible/);
    await expect(target).not.toHaveClass(/hidden/);
    await expect(target).toHaveClass(/selected/);
  });

  test('batched add on explicit #id target @quick @aot', async ({ page }) => {
    const target = page.locator('#explicit-target');

    await expect(target).not.toHaveClass(/active/);
    await expect(target).not.toHaveClass(/highlighted/);

    await page.locator('#btn-explicit').click();

    await expect(target).toHaveClass(/active/);
    await expect(target).toHaveClass(/highlighted/);
  });

  test('show/hide compiled commands work @quick @aot', async ({ page }) => {
    const box = page.locator('#content-box');

    // Initially hidden
    await expect(box).toBeHidden();

    // Show
    await page.locator('#btn-show').click();
    await expect(box).toBeVisible();

    // Hide
    await page.locator('#btn-hide').click();
    await expect(box).toBeHidden();
  });

  test('pre-rendered init block effects are present in HTML @quick @aot', async ({ page }) => {
    // The pre-rendered div already has classes applied in HTML
    // (simulating what preRenderInitBlock does at build time)
    const preRendered = page.locator('#pre-rendered');

    await expect(preRendered).toHaveClass(/active/);
    await expect(preRendered).toHaveClass(/visible/);
    await expect(preRendered).toHaveText('Pre-rendered content');
  });

  test('no JavaScript errors on page load @smoke @aot', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', err => errors.push(err.message));

    await page.goto(TEST_PAGE);
    await page.waitForLoadState('domcontentloaded');

    expect(errors).toHaveLength(0);
  });

  test('batched classList.add is idempotent (clicking twice) @aot', async ({ page }) => {
    const btn = page.locator('#btn-batch-add');

    await btn.click();
    await btn.click();

    // Classes should still be present (classList.add is idempotent)
    await expect(btn).toHaveClass(/active/);
    await expect(btn).toHaveClass(/visible/);
    await expect(btn).toHaveClass(/highlighted/);
  });

  test('mixed batch toggle is not idempotent @aot', async ({ page }) => {
    const target = page.locator('#target-mixed');

    // Click once → selected toggled ON
    await page.locator('#btn-mixed').click();
    await expect(target).toHaveClass(/selected/);

    // Click again → selected toggled OFF (toggle flips)
    await page.locator('#btn-mixed').click();
    await expect(target).not.toHaveClass(/selected/);
    // But .visible should still be present (add is idempotent)
    await expect(target).toHaveClass(/visible/);
  });
});
