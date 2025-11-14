import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:3000';
const TIMEOUT = 10000; // 10 seconds max

test.describe('Page Loading Tests', () => {
  test('test-minimal.html loads quickly', async ({ page }) => {
    const start = Date.now();
    await page.goto(`${BASE_URL}/cookbook/test-minimal.html`, {
      waitUntil: 'networkidle',
      timeout: TIMEOUT
    });
    const loadTime = Date.now() - start;

    console.log(`✅ test-minimal.html loaded in ${loadTime}ms`);
    expect(loadTime).toBeLessThan(5000);

    // Check if HyperFixi ready event fired
    const processedElements = await page.evaluate(() => {
      return new Promise((resolve) => {
        document.addEventListener('hyperscript:ready', (e: any) => {
          resolve(e.detail.processedElements);
        });
        // In case event already fired
        setTimeout(() => resolve(-1), 100);
      });
    });

    console.log(`   Processed ${processedElements} elements`);
  });

  test('test-just-log.html loads quickly', async ({ page }) => {
    const start = Date.now();
    await page.goto(`${BASE_URL}/cookbook/test-just-log.html`, {
      waitUntil: 'networkidle',
      timeout: TIMEOUT
    });
    const loadTime = Date.now() - start;

    console.log(`✅ test-just-log.html loaded in ${loadTime}ms`);
    expect(loadTime).toBeLessThan(5000);
  });

  test('test-no-show.html loads quickly', async ({ page }) => {
    const start = Date.now();
    await page.goto(`${BASE_URL}/cookbook/test-no-show.html`, {
      waitUntil: 'networkidle',
      timeout: TIMEOUT
    });
    const loadTime = Date.now() - start;

    console.log(`✅ test-no-show.html loaded in ${loadTime}ms`);
    expect(loadTime).toBeLessThan(5000);
  });

  test('test-show-when.html loads (or times out)', async ({ page }) => {
    const start = Date.now();

    try {
      await page.goto(`${BASE_URL}/cookbook/test-show-when.html`, {
        waitUntil: 'networkidle',
        timeout: TIMEOUT
      });
      const loadTime = Date.now() - start;
      console.log(`✅ test-show-when.html loaded in ${loadTime}ms`);
      expect(loadTime).toBeLessThan(5000);
    } catch (error) {
      const loadTime = Date.now() - start;
      console.log(`❌ test-show-when.html TIMEOUT after ${loadTime}ms`);
      throw error;
    }
  });

  test('test-recursion-fix.html loads (or times out)', async ({ page }) => {
    const start = Date.now();

    try {
      await page.goto(`${BASE_URL}/cookbook/test-recursion-fix.html`, {
        waitUntil: 'networkidle',
        timeout: TIMEOUT
      });
      const loadTime = Date.now() - start;
      console.log(`✅ test-recursion-fix.html loaded in ${loadTime}ms`);
      expect(loadTime).toBeLessThan(5000);
    } catch (error) {
      const loadTime = Date.now() - start;
      console.log(`❌ test-recursion-fix.html TIMEOUT after ${loadTime}ms`);
      throw error;
    }
  });

  test('complete-cookbook-test.html loads (or times out)', async ({ page }) => {
    const start = Date.now();

    try {
      await page.goto(`${BASE_URL}/cookbook/complete-cookbook-test.html`, {
        waitUntil: 'networkidle',
        timeout: TIMEOUT
      });
      const loadTime = Date.now() - start;
      console.log(`✅ complete-cookbook-test.html loaded in ${loadTime}ms`);
      expect(loadTime).toBeLessThan(5000);
    } catch (error) {
      const loadTime = Date.now() - start;
      console.log(`❌ complete-cookbook-test.html TIMEOUT after ${loadTime}ms`);
      throw error;
    }
  });
});
