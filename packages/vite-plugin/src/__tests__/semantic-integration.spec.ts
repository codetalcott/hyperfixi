/**
 * E2E Integration Tests for Semantic Multilingual Support
 *
 * These tests verify that the vite-plugin correctly integrates semantic parsing
 * with multilingual support in a real browser environment.
 *
 * Prerequisites:
 * - Run `npm run build` in examples/vite-plugin-multilingual
 * - Run `npm run preview` to start the preview server on port 4173
 *
 * Or run via the test script:
 * - npm run test:e2e --prefix packages/vite-plugin
 *
 * Tests will automatically skip if no server is running.
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { chromium, type Browser, type Page } from 'playwright';

const PREVIEW_URL = 'http://localhost:4173/';
const DEV_URL = 'http://localhost:5173/';

// Helper to find an available server
async function findServer(): Promise<string | null> {
  const { exec } = await import('child_process');
  const { promisify } = await import('util');
  const execAsync = promisify(exec);

  try {
    await execAsync('curl -s http://localhost:4173/ > /dev/null');
    return PREVIEW_URL;
  } catch {
    try {
      await execAsync('curl -s http://localhost:5173/ > /dev/null');
      return DEV_URL;
    } catch {
      return null;
    }
  }
}

// Check for server availability before running tests
const serverAvailable = await findServer();

describe.skipIf(!serverAvailable)('Semantic Integration E2E', () => {
  let browser: Browser;
  let page: Page;
  let serverUrl: string;

  beforeAll(async () => {
    serverUrl = serverAvailable!;
    browser = await chromium.launch({ headless: true });
  });

  afterAll(async () => {
    await browser?.close();
  });

  beforeEach(async () => {
    page = await browser.newPage();
    await page.goto(serverUrl);
    await page.waitForLoadState('networkidle');
  });

  afterEach(async () => {
    await page?.close();
  });

  test('semantic parser is enabled', async () => {
    const logs: string[] = [];
    page.on('console', (msg) => logs.push(msg.text()));

    await page.reload();
    await page.waitForTimeout(1000);

    expect(logs.some((log) => log.includes('Semantic parser: ENABLED'))).toBe(true);
  });

  test('English toggle works', async () => {
    const btn = page.locator('button:has-text("EN: Toggle")');
    const hasActiveBefore = await btn.evaluate((el) => el.classList.contains('active'));
    expect(hasActiveBefore).toBe(false);

    await btn.click();
    const hasActiveAfter = await btn.evaluate((el) => el.classList.contains('active'));
    expect(hasActiveAfter).toBe(true);

    await btn.click();
    const hasActiveToggle = await btn.evaluate((el) => el.classList.contains('active'));
    expect(hasActiveToggle).toBe(false);
  });

  test('Japanese toggle works', async () => {
    const btn = page.locator('button:has-text("JA: トグル")');
    const hasActiveBefore = await btn.evaluate((el) => el.classList.contains('active'));
    expect(hasActiveBefore).toBe(false);

    await btn.click();
    const hasActiveAfter = await btn.evaluate((el) => el.classList.contains('active'));
    expect(hasActiveAfter).toBe(true);

    await btn.click();
    const hasActiveToggle = await btn.evaluate((el) => el.classList.contains('active'));
    expect(hasActiveToggle).toBe(false);
  });

  test('Spanish toggle works', async () => {
    const btn = page.locator('button:has-text("ES: Alternar")');
    const hasActiveBefore = await btn.evaluate((el) => el.classList.contains('active'));
    expect(hasActiveBefore).toBe(false);

    await btn.click();
    const hasActiveAfter = await btn.evaluate((el) => el.classList.contains('active'));
    expect(hasActiveAfter).toBe(true);

    await btn.click();
    const hasActiveToggle = await btn.evaluate((el) => el.classList.contains('active'));
    expect(hasActiveToggle).toBe(false);
  });

  test('Korean toggle works', async () => {
    const btn = page.locator('button:has-text("KO: 토글")');
    const hasActiveBefore = await btn.evaluate((el) => el.classList.contains('active'));
    expect(hasActiveBefore).toBe(false);

    await btn.click();
    const hasActiveAfter = await btn.evaluate((el) => el.classList.contains('active'));
    expect(hasActiveAfter).toBe(true);

    await btn.click();
    const hasActiveToggle = await btn.evaluate((el) => el.classList.contains('active'));
    expect(hasActiveToggle).toBe(false);
  });

  test('all four languages work on same page', async () => {
    const buttons = [
      { label: 'EN: Toggle', lang: 'English' },
      { label: 'JA: トグル', lang: 'Japanese' },
      { label: 'ES: Alternar', lang: 'Spanish' },
      { label: 'KO: 토글', lang: 'Korean' },
    ];

    for (const { label, lang } of buttons) {
      const btn = page.locator(`button:has-text("${label}")`);

      // Click to activate
      await btn.click();
      const hasActive = await btn.evaluate((el) => el.classList.contains('active'));
      expect(hasActive, `${lang} should have .active after click`).toBe(true);
    }

    // All should now be active
    for (const { label, lang } of buttons) {
      const btn = page.locator(`button:has-text("${label}")`);
      const hasActive = await btn.evaluate((el) => el.classList.contains('active'));
      expect(hasActive, `${lang} should still have .active`).toBe(true);
    }
  });
});
