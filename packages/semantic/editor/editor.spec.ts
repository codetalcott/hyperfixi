/**
 * Playwright tests for the Semantic Language Profile Editor
 */
import { test, expect } from '@playwright/test';

test.describe('Semantic Language Profile Editor', () => {
  test.beforeEach(async ({ page }) => {
    // The test runs from packages/semantic, so use relative path from project root
    await page.goto('/packages/semantic/editor/');

    // Wait for both bundles to load and selectLanguage to be available
    await page.waitForFunction(() => {
      const w = window as any;
      return w.hyperfixi && w.LokaScriptSemantic &&
             typeof w.selectLanguage === 'function';
    }, { timeout: 10000 });
  });

  test('loads editor HTML', async ({ page }) => {
    await expect(page).toHaveTitle('Semantic Language Profile Editor');
    await expect(page.locator('h1')).toContainText('Language Profile Editor');
  });

  test('loads both JavaScript bundles', async ({ page }) => {
    // Check hyperfixi global is defined
    const hyperfixi = await page.evaluate(() => typeof (window as any).hyperfixi);
    expect(hyperfixi).toBe('object');

    // Check LokaScriptSemantic global is defined
    const semantic = await page.evaluate(() => typeof (window as any).LokaScriptSemantic);
    expect(semantic).toBe('object');
  });

  test('loads language profiles', async ({ page }) => {
    // Wait for profiles to load
    const profiles = await page.evaluate(() => {
      const hs = (window as any).LokaScriptSemantic;
      return hs && hs.registeredLanguageProfiles
        ? Object.keys(hs.registeredLanguageProfiles)
        : null;
    });

    expect(profiles).not.toBeNull();
    expect(profiles).toContain('en');
    expect(profiles).toContain('ja');
    expect(profiles).toContain('es');
    // Full bundle should have all 23 languages
    expect(profiles.length).toBe(23);
  });

  test('populates language selector', async ({ page }) => {
    // Wait for the select to be populated
    await page.waitForFunction(() => {
      const select = document.getElementById('language-select') as HTMLSelectElement;
      return select && select.options.length > 1;
    });

    const options = await page.evaluate(() => {
      const select = document.getElementById('language-select') as HTMLSelectElement;
      return Array.from(select.options).map(opt => opt.value);
    });

    expect(options).toContain('en');
    expect(options).toContain('ja');
    expect(options).toContain('es');
  });

  test('selecting a language renders profile data', async ({ page }) => {
    // Wait for select to be populated
    await page.waitForFunction(() => {
      const select = document.getElementById('language-select') as HTMLSelectElement;
      return select && select.options.length > 1;
    });

    // Call selectLanguage directly (bypasses hyperscript event handling for reliable testing)
    await page.evaluate(() => (window as any).selectLanguage('en'));

    // Check profile fields are populated
    await expect(page.locator('#profile-code')).toHaveValue('en');
    await expect(page.locator('#profile-name')).toHaveValue('English');
    await expect(page.locator('#profile-direction')).toHaveValue('ltr');
    await expect(page.locator('#profile-wordOrder')).toHaveValue('SVO');
  });

  test('selecting a language loads keywords', async ({ page }) => {
    // Wait for select to be populated
    await page.waitForFunction(() => {
      const select = document.getElementById('language-select') as HTMLSelectElement;
      return select && select.options.length > 1;
    });

    // Call selectLanguage directly
    await page.evaluate(() => (window as any).selectLanguage('ja'));

    // Switch to Keywords tab by clicking
    await page.click('button[data-tab="keywords"]');

    // Wait for keywords panel to become visible
    await page.waitForSelector('#panel-keywords.active', { timeout: 5000 });

    // Check keywords table has content
    const rows = await page.locator('.keyword-row').count();
    expect(rows).toBeGreaterThan(10);
  });

  test('live parse test works', async ({ page }) => {
    // Wait for select to be populated
    await page.waitForFunction(() => {
      const select = document.getElementById('language-select') as HTMLSelectElement;
      return select && select.options.length > 1;
    });

    // Call selectLanguage directly
    await page.evaluate(() => (window as any).selectLanguage('en'));

    // Switch to Patterns tab
    await page.click('button[data-tab="patterns"]');
    await page.waitForSelector('#panel-patterns.active', { timeout: 5000 });

    // Enter test input and run parse
    await page.fill('#test-input', 'toggle .active on me');
    await page.evaluate(() => (window as any).runParseTest());

    // Wait for and check result
    await page.waitForSelector('#test-result:not([style*="display: none"])', { timeout: 5000 });
    await expect(page.locator('#test-result')).toContainText('toggle');
  });

  test('tab navigation works', async ({ page }) => {
    // Wait for select to be populated
    await page.waitForFunction(() => {
      const select = document.getElementById('language-select') as HTMLSelectElement;
      return select && select.options.length > 1;
    });

    // Call selectLanguage directly
    await page.evaluate(() => (window as any).selectLanguage('en'));

    // Check Profile tab is active by default
    await expect(page.locator('#panel-profile')).toBeVisible();

    // Click Keywords tab
    await page.click('button[data-tab="keywords"]');
    await page.waitForSelector('#panel-keywords.active', { timeout: 5000 });
    await expect(page.locator('#panel-keywords')).toBeVisible();
    await expect(page.locator('#panel-profile')).toBeHidden();

    // Click Markers tab
    await page.click('button[data-tab="markers"]');
    await page.waitForSelector('#panel-markers.active', { timeout: 5000 });
    await expect(page.locator('#panel-markers')).toBeVisible();

    // Click Export tab
    await page.click('button[data-tab="export"]');
    await page.waitForSelector('#panel-export.active', { timeout: 5000 });
    await expect(page.locator('#panel-export')).toBeVisible();
  });
});
