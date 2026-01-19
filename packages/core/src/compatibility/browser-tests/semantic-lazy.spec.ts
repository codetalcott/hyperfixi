/**
 * Semantic Lazy Loading Browser Tests
 *
 * Tests the lazy loading bundle functionality:
 * - Languages load on demand
 * - Parsing works after loading
 * - Unloaded languages throw errors
 */

import { test, expect } from '@playwright/test';

test.describe('Semantic Lazy Loading', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the lazy loading test page
    await page.goto('/packages/semantic/lazy-loading-test.html');
  });

  test('lazy bundle loads languages on demand', async ({ page }) => {
    // Wait for tests to complete (the page shows "--- Tests Complete ---")
    await page.waitForSelector('text=Tests Complete', { timeout: 20000 });

    // Check no failures
    const failures = await page.locator('.fail').count();
    expect(failures).toBe(0);
  });

  test('LokaScriptSemanticLazy global is available', async ({ page }) => {
    // Wait for page load
    await page.waitForSelector('text=LokaScriptSemanticLazy global', { timeout: 10000 });

    // Check the global availability test passed
    const globalTest = await page
      .locator('text=LokaScriptSemanticLazy global is available')
      .count();
    expect(globalTest).toBeGreaterThan(0);
  });

  test('English loads and parses correctly', async ({ page }) => {
    // Wait for English loading test
    await page.waitForSelector('text=English loaded successfully', { timeout: 15000 });

    // Check English parsing works
    const parseTest = await page.locator('text=English parsing works').count();
    expect(parseTest).toBeGreaterThan(0);
  });

  test('Japanese loads and parses correctly', async ({ page }) => {
    // Wait for tests to complete first
    await page.waitForSelector('text=Tests Complete', { timeout: 20000 });

    // Check Japanese parsing works (SOV order: ".active を トグル")
    const parseTest = await page.locator('.pass:has-text("Japanese parsing works")').count();
    expect(parseTest).toBeGreaterThan(0);
  });

  test('unloaded language throws error', async ({ page }) => {
    // Wait for the Spanish error test
    await page.waitForSelector('text=Correctly threw error for unloaded', { timeout: 15000 });

    // Verify the test passed
    const errorTest = await page.locator('text=Correctly threw error for unloaded Spanish').count();
    expect(errorTest).toBeGreaterThan(0);
  });
});
