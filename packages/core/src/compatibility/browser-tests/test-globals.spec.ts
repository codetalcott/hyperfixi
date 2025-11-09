/**
 * Quick test to verify global functions are exposed correctly
 */

import { test, expect } from '@playwright/test';

test.describe('Global Functions Test', () => {
  test('should expose evalHyperScript as global function', async ({ page }) => {
    await page.goto('http://localhost:3000/test-global-functions.html');
    await page.waitForTimeout(1000);

    // Check if window.evalHyperScript exists
    const globalExists = await page.evaluate(() => {
      return typeof window.evalHyperScript === 'function';
    });

    expect(globalExists).toBe(true);
  });

  test('should be able to call evalHyperScript directly', async ({ page }) => {
    await page.goto('http://localhost:3000/test-global-functions.html');
    await page.waitForTimeout(1000);

    // Test calling evalHyperScript directly in browser context
    const result = await page.evaluate(async () => {
      try {
        // Access from window object explicitly
        const result = await window.evalHyperScript('"hello world"');
        return { success: true, result };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    expect(result.success).toBe(true);
    expect(result.result).toBe('hello world');
  });

  test('should work with math expressions', async ({ page }) => {
    await page.goto('http://localhost:3000/test-global-functions.html');
    await page.waitForTimeout(1000);

    const result = await page.evaluate(async () => {
      try {
        const result = await window.evalHyperScript('1 + 1');
        return { success: true, result };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    expect(result.success).toBe(true);
    expect(result.result).toBe(2);
  });
});
