/**
 * Browser test for Grammar Transformation Demo
 *
 * Verifies that the GrammarTransformer class works correctly in the browser
 * and the multilingual demo page properly demonstrates live transformations.
 */
import { test, expect } from '@playwright/test';

test.describe('Grammar Transformation Demo', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://127.0.0.1:3000/examples/multilingual/index.html');
    // Wait for i18n bundle to load
    await page.waitForFunction(() => window.HyperFixiI18n !== undefined, { timeout: 5000 });
  });

  test('should load HyperFixiI18n bundle with GrammarTransformer', async ({ page }) => {
    const hasI18n = await page.evaluate(() => !!window.HyperFixiI18n);
    expect(hasI18n).toBe(true);

    const hasTransformer = await page.evaluate(() => !!window.HyperFixiI18n.GrammarTransformer);
    expect(hasTransformer).toBe(true);

    const hasTranslate = await page.evaluate(
      () => typeof window.HyperFixiI18n.translate === 'function'
    );
    expect(hasTranslate).toBe(true);
  });

  test('should have profile functions available', async ({ page }) => {
    const locales = await page.evaluate(() => window.HyperFixiI18n.getSupportedLocales?.() || []);
    expect(locales).toContain('en');
    expect(locales).toContain('ja');
    expect(locales).toContain('ar');
    expect(locales).toContain('zh');
  });

  test('should transform English to Japanese (SOV)', async ({ page }) => {
    const result = await page.evaluate(() => {
      const { translate } = window.HyperFixiI18n;
      return translate('on click increment #count', 'en', 'ja');
    });

    // Japanese SOV should have #count before the action
    expect(result).toContain('#count');
    expect(result).toContain('を'); // Object particle
    // Patient should come before action in SOV
    const countIndex = result.indexOf('#count');
    const actionIndex = result.indexOf('増加');
    expect(countIndex).toBeLessThan(actionIndex);
  });

  test('should transform English to Arabic (VSO)', async ({ page }) => {
    const result = await page.evaluate(() => {
      const { translate } = window.HyperFixiI18n;
      return translate('on click increment #count', 'en', 'ar');
    });

    // Arabic VSO should have action first
    expect(result).toContain('#count');
    expect(result).toContain('زِد'); // Action should be present
    // Action should come first in VSO
    const actionIndex = result.indexOf('زِد');
    const countIndex = result.indexOf('#count');
    expect(actionIndex).toBeLessThan(countIndex);
  });

  test('should transform English to Chinese with circumfix', async ({ page }) => {
    const result = await page.evaluate(() => {
      const { translate } = window.HyperFixiI18n;
      return translate('on click increment #count', 'en', 'zh');
    });

    // Chinese should have 当...时 circumfix pattern
    expect(result).toContain('当');
    expect(result).toContain('时');
    expect(result).toContain('#count');
  });

  test('should preserve CSS selectors during transformation', async ({ page }) => {
    const selectors = ['.active', '#count', '.menu-item[data-active="true"]'];

    for (const selector of selectors) {
      const result = await page.evaluate(
        ({ sel }) => {
          const { translate } = window.HyperFixiI18n;
          return translate(`on click toggle ${sel}`, 'en', 'ja');
        },
        { sel: selector }
      );

      expect(result).toContain(selector);
    }
  });

  test('should have grammar demo section with live input', async ({ page }) => {
    // Check for grammar demo input
    const input = await page.locator('#grammar-input');
    await expect(input).toBeVisible();

    // Check for results container
    const results = await page.locator('#grammar-results');
    await expect(results).toBeVisible();
  });

  test('should update transformations when input changes', async ({ page }) => {
    const input = await page.locator('#grammar-input');
    const results = await page.locator('#grammar-results');

    // Clear and enter new code
    await input.fill('on click toggle .active');

    // Wait for debounce and transformation
    await page.waitForTimeout(200);

    // Results should contain transformations
    const resultsText = await results.textContent();
    expect(resultsText).toContain('.active');
  });

  test('should show all 10 language transformations', async ({ page }) => {
    const results = await page.locator('#grammar-results');

    // Wait for initial render
    await page.waitForTimeout(200);

    // Count language cards (each has a flag emoji)
    const langCards = await results.locator('div[style*="border-radius: 8px"]').count();
    expect(langCards).toBeGreaterThanOrEqual(10);
  });

  test('should handle example buttons', async ({ page }) => {
    const input = await page.locator('#grammar-input');

    // Click toggle example button
    await page.click('button:has-text("toggle")');

    // Input should be updated
    const value = await input.inputValue();
    expect(value).toBe('on click toggle .active');
  });

  test('should have utility functions exported', async ({ page }) => {
    const utilities = await page.evaluate(() => ({
      hasJoinTokens: typeof window.HyperFixiI18n.joinTokens === 'function',
      hasReorderRoles: typeof window.HyperFixiI18n.reorderRoles === 'function',
      hasInsertMarkers: typeof window.HyperFixiI18n.insertMarkers === 'function',
      hasTransformStatement: typeof window.HyperFixiI18n.transformStatement === 'function',
      hasUniversalPatterns: !!window.HyperFixiI18n.UNIVERSAL_PATTERNS,
      hasLanguageFamilyDefaults: !!window.HyperFixiI18n.LANGUAGE_FAMILY_DEFAULTS,
    }));

    expect(utilities.hasJoinTokens).toBe(true);
    expect(utilities.hasReorderRoles).toBe(true);
    expect(utilities.hasInsertMarkers).toBe(true);
    expect(utilities.hasTransformStatement).toBe(true);
    expect(utilities.hasUniversalPatterns).toBe(true);
    expect(utilities.hasLanguageFamilyDefaults).toBe(true);
  });

  test('should handle joinTokens for agglutinative suffixes', async ({ page }) => {
    const result = await page.evaluate(() => {
      const { joinTokens } = window.HyperFixiI18n;
      return joinTokens(['#count', '-ta', 'increment']); // Quechua-style suffix
    });

    // Suffix should attach without space
    expect(result).toBe('#countta increment');
  });
});
