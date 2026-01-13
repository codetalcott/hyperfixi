/**
 * Gallery Examples Regression Tests
 *
 * Tests for bugs fixed in the gallery examples:
 * 1. Counter Reset - put command was appending instead of replacing
 * 2. Input Mirroring - same put command issue
 * 3. Tab Navigation - CSS selectors only returning first element
 */
import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:3000';

test.describe('Gallery Example Regression Tests @comprehensive', () => {
  test.describe('Counter Example (05-counter.html)', () => {
    test('reset button should replace content, not append', async ({ page }) => {
      await page.goto(`${BASE_URL}/examples/basics/05-counter.html`, {
        waitUntil: 'domcontentloaded',
        timeout: 10000,
      });
      await page.waitForTimeout(300);

      // Increment counter several times (button text is "Increase")
      await page.click('button:has-text("Increase")');
      await page.click('button:has-text("Increase")');
      await page.click('button:has-text("Increase")');
      await page.waitForTimeout(100);

      const countBefore = await page.textContent('#count');
      expect(countBefore?.trim()).toBe('3');

      // Click reset
      await page.click('button:has-text("Reset")');
      await page.waitForTimeout(100);

      // Should be exactly "0", not "30" (appended)
      const countAfter = await page.textContent('#count');
      expect(countAfter?.trim()).toBe('0');
    });

    test('put command should replace, not append on multiple resets', async ({ page }) => {
      await page.goto(`${BASE_URL}/examples/basics/05-counter.html`, {
        waitUntil: 'domcontentloaded',
        timeout: 10000,
      });
      await page.waitForTimeout(300);

      // Increment and reset multiple times
      for (let i = 0; i < 3; i++) {
        await page.click('button:has-text("Increase")');
        await page.click('button:has-text("Increase")');
        await page.click('button:has-text("Reset")');
        await page.waitForTimeout(50);

        const count = await page.textContent('#count');
        expect(count?.trim()).toBe('0');
      }
    });
  });

  test.describe('Input Mirror Example (04-input-mirror.html)', () => {
    test('input mirror should replace content, not concatenate', async ({ page }) => {
      await page.goto(`${BASE_URL}/examples/basics/04-input-mirror.html`, {
        waitUntil: 'domcontentloaded',
        timeout: 10000,
      });
      await page.waitForTimeout(300);

      // Type into input (ID is 'name', not 'name-input')
      await page.type('#name', 'wim');
      await page.waitForTimeout(100);

      // Should be exactly "wim", not "wwiwim" (concatenated)
      const mirrorText = await page.textContent('#name-mirror');
      expect(mirrorText?.trim()).toBe('wim');
    });

    test('input mirror should handle clearing and retyping', async ({ page }) => {
      await page.goto(`${BASE_URL}/examples/basics/04-input-mirror.html`, {
        waitUntil: 'domcontentloaded',
        timeout: 10000,
      });
      await page.waitForTimeout(300);

      // Type first value (ID is 'name', not 'name-input')
      await page.fill('#name', 'hello');
      await page.waitForTimeout(100);
      expect((await page.textContent('#name-mirror'))?.trim()).toBe('hello');

      // Clear and type new value
      await page.fill('#name', 'world');
      await page.waitForTimeout(100);
      expect((await page.textContent('#name-mirror'))?.trim()).toBe('world');
    });
  });

  test.describe('Tab Navigation Example (04-tabs.html)', () => {
    test('clicking tabs should remove active from ALL tabs, not just first', async ({ page }) => {
      await page.goto(`${BASE_URL}/examples/intermediate/04-tabs.html`, {
        waitUntil: 'domcontentloaded',
        timeout: 10000,
      });
      await page.waitForTimeout(300);

      // Initial state: Overview tab active
      let activeTabs = await page.$$eval('.tab.active', tabs => tabs.length);
      expect(activeTabs).toBe(1);

      // Click Features tab
      await page.click('button[data-tab="features"]');
      await page.waitForTimeout(200);

      activeTabs = await page.$$eval('.tab.active', tabs => tabs.length);
      expect(activeTabs).toBe(1);

      const activeTabText = await page.$eval('.tab.active', el => el.textContent?.trim());
      expect(activeTabText).toContain('Features');

      // Click Pricing tab
      await page.click('button[data-tab="pricing"]');
      await page.waitForTimeout(200);

      activeTabs = await page.$$eval('.tab.active', tabs => tabs.length);
      expect(activeTabs).toBe(1);

      // Click Overview tab
      await page.click('button[data-tab="overview"]');
      await page.waitForTimeout(200);

      activeTabs = await page.$$eval('.tab.active', tabs => tabs.length);
      expect(activeTabs).toBe(1);
    });

    test('tab content should show only selected panel', async ({ page }) => {
      await page.goto(`${BASE_URL}/examples/intermediate/04-tabs.html`, {
        waitUntil: 'domcontentloaded',
        timeout: 10000,
      });
      await page.waitForTimeout(300);

      // Click through all tabs and verify only one content panel is active
      const tabs = ['overview', 'features', 'pricing', 'support'];

      for (const tab of tabs) {
        await page.click(`button[data-tab="${tab}"]`);
        await page.waitForTimeout(200);

        const activeContent = await page.$$eval('.tab-content.active', panels =>
          panels.map(p => p.id)
        );
        expect(activeContent.length).toBe(1);
        expect(activeContent[0]).toBe(tab);
      }
    });

    test('CSS class selector should target all matching elements', async ({ page }) => {
      await page.goto(`${BASE_URL}/examples/intermediate/04-tabs.html`, {
        waitUntil: 'domcontentloaded',
        timeout: 10000,
      });
      await page.waitForTimeout(300);

      // Click tabs multiple times to ensure consistent behavior
      for (let i = 0; i < 5; i++) {
        await page.click('button[data-tab="features"]');
        await page.waitForTimeout(100);
        await page.click('button[data-tab="pricing"]');
        await page.waitForTimeout(100);
        await page.click('button[data-tab="overview"]');
        await page.waitForTimeout(100);
      }

      // After all clicks, should still have exactly 1 active tab
      const activeTabs = await page.$$eval('.tab.active', tabs => tabs.length);
      expect(activeTabs).toBe(1);
    });
  });

  test.describe('Color Cycling Example (01-color-cycling.html)', () => {
    test('computed style access should work for my *property syntax', async ({ page }) => {
      const pageErrors: string[] = [];
      page.on('pageerror', err => {
        pageErrors.push(err.message);
      });

      await page.goto(`${BASE_URL}/examples/advanced/01-color-cycling.html`, {
        waitUntil: 'domcontentloaded',
        timeout: 10000,
      });
      await page.waitForTimeout(300);

      // Get the color box and interact with it
      const colorBox = page.locator('#color-box');
      const box = await colorBox.boundingBox();

      if (box) {
        // Move to element and simulate mouse press/hold/release
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await page.mouse.down();
        await page.waitForTimeout(1000); // Hold for a bit
        await page.mouse.up();
      }

      await page.waitForTimeout(500);

      // Should have no page errors (especially not "requires a target value")
      expect(pageErrors.length).toBe(0);
    });
  });
});
