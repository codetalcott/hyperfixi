import { test, expect } from '@playwright/test';

const TEST_PAGE = '/packages/hyperscript-adapter/test/browser/adapter-test.html';

test.describe('Hyperscript Adapter - Browser Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(TEST_PAGE);
    // Wait for both _hyperscript and the adapter to load
    await page.waitForFunction(() => (window as any).__testReady === true, null, {
      timeout: 10000,
    });
  });

  // ── Smoke: bundle loads ──────────────────────────────────────────

  test('adapter bundle loads and exposes HyperscriptI18n global @smoke', async ({ page }) => {
    const info = await page.evaluate(() => {
      const g = (window as any).__adapterGlobal;
      return {
        exists: !!g,
        hasSupportedLanguages: Array.isArray(g?.supportedLanguages),
        languageCount: g?.supportedLanguages?.length,
      };
    });
    expect(info.exists).toBe(true);
    expect(info.hasSupportedLanguages).toBe(true);
    expect(info.languageCount).toBeGreaterThanOrEqual(10);
  });

  test('original _hyperscript runtime is loaded @smoke', async ({ page }) => {
    const loaded = await page.evaluate(() => typeof (window as any)._hyperscript !== 'undefined');
    expect(loaded).toBe(true);
  });

  // ── Smoke: English passthrough ───────────────────────────────────

  test('English toggle works without translation @smoke', async ({ page }) => {
    const btn = page.locator('#btn-en-toggle');
    await expect(btn).not.toHaveClass(/active/);

    await btn.click();
    await expect(btn).toHaveClass(/active/);

    await btn.click();
    await expect(btn).not.toHaveClass(/active/);
  });

  // ── Quick: toggle in multiple languages ──────────────────────────

  test('Spanish toggle (SVO) @quick', async ({ page }) => {
    const btn = page.locator('#btn-es-toggle');
    await expect(btn).not.toHaveClass(/active/);
    await btn.click();
    await expect(btn).toHaveClass(/active/);
    await btn.click();
    await expect(btn).not.toHaveClass(/active/);
  });

  test('Japanese toggle (SOV) @quick', async ({ page }) => {
    const btn = page.locator('#btn-ja-toggle');
    await expect(btn).not.toHaveClass(/active/);
    await btn.click();
    await expect(btn).toHaveClass(/active/);
    await btn.click();
    await expect(btn).not.toHaveClass(/active/);
  });

  test('Korean toggle (SOV) @quick', async ({ page }) => {
    const btn = page.locator('#btn-ko-toggle');
    await expect(btn).not.toHaveClass(/active/);
    await btn.click();
    await expect(btn).toHaveClass(/active/);
    await btn.click();
    await expect(btn).not.toHaveClass(/active/);
  });

  test('Chinese toggle (SVO) @quick', async ({ page }) => {
    const btn = page.locator('#btn-zh-toggle');
    await expect(btn).not.toHaveClass(/active/);
    await btn.click();
    await expect(btn).toHaveClass(/active/);
    await btn.click();
    await expect(btn).not.toHaveClass(/active/);
  });

  test('German toggle (SVO) @quick', async ({ page }) => {
    const btn = page.locator('#btn-de-toggle');
    await expect(btn).not.toHaveClass(/active/);
    await btn.click();
    await expect(btn).toHaveClass(/active/);
  });

  test('Portuguese toggle (SVO) @quick', async ({ page }) => {
    const btn = page.locator('#btn-pt-toggle');
    await expect(btn).not.toHaveClass(/active/);
    await btn.click();
    await expect(btn).toHaveClass(/active/);
  });

  test('Arabic toggle (VSO) @quick', async ({ page }) => {
    const btn = page.locator('#btn-ar-toggle');
    await expect(btn).not.toHaveClass(/active/);
    await btn.click();
    await expect(btn).toHaveClass(/active/);
  });

  // ── Quick: other commands ────────────────────────────────────────

  test('French add class to target @quick', async ({ page }) => {
    const box = page.locator('#box-fr');
    await expect(box).not.toHaveClass(/highlight/);
    await page.locator('#btn-fr-add').click();
    await expect(box).toHaveClass(/highlight/);
  });

  test('Spanish put text into element @quick', async ({ page }) => {
    const msg = page.locator('#msg-es');
    await expect(msg).toHaveText('');
    await page.locator('#btn-es-put').click();
    await expect(msg).toHaveText('Hola!');
  });

  test('Spanish remove class from element @quick', async ({ page }) => {
    const box = page.locator('#box-es-remove');
    await expect(box).toHaveClass(/highlight/);
    await page.locator('#btn-es-remove').click();
    await expect(box).not.toHaveClass(/highlight/);
  });

  // ── Integration: language inheritance ────────────────────────────

  test('inherits language from parent data-hyperscript-lang @quick', async ({ page }) => {
    const btn = page.locator('#btn-inherited');
    await expect(btn).not.toHaveClass(/highlight/);
    await btn.click();
    await expect(btn).toHaveClass(/highlight/);
  });
});
