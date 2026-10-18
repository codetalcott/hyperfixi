/**
 * Coverage for the interactive multilingual / showcase example pages that had
 * no Playwright spec:
 *   - multilingual/showcase.html            (counter/toggle/mirror/tabs, local core + semantic)
 *   - multilingual/playground.html          (translations, roles, run; local semantic bundle)
 *
 * Strict assertions exercise the runtime/parser surfaces to surface bugs. Tests target
 * locally-served bundles. (polyglot-playground.html was deleted on 2026-10-18, OPEN_ITEMS D5:
 * its "write in any language" claim was never built; it ran its input as typed.) (The
 * examples/playground/* pages are intentionally excluded from the repo via
 * .gitignore, so they are not covered here.)
 */
import { test, expect, type Page } from '@playwright/test';
import { waitForHyperfixi, createErrorCollector } from './test-utils';

const BASE_URL = process.env.BASE_URL ?? 'http://127.0.0.1:3000';

async function load(page: Page, path: string): Promise<void> {
  await page.goto(`${BASE_URL}${path}`, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await waitForHyperfixi(page);
  await page.waitForTimeout(150);
}

test.describe('multilingual/showcase.html @comprehensive', () => {
  test('counter increment/decrement/reset', async ({ page }) => {
    const errors = createErrorCollector(page);
    errors.attach();
    await load(page, '/examples/multilingual/showcase.html');

    const value = page.locator('#counter-value');
    await expect(value).toHaveText('0');
    await page.locator('#counter-demo-increment').click();
    await expect(value).toHaveText('1');
    await page.locator('#counter-demo-increment').click();
    await expect(value).toHaveText('2');
    await page.locator('#counter-demo-decrement').click();
    await expect(value).toHaveText('1');
    await page.locator('#counter-demo-reset').click();
    await expect(value).toHaveText('0');

    expect(errors.getCriticalErrors()).toEqual([]);
  });

  test('toggle .active on me', async ({ page }) => {
    await load(page, '/examples/multilingual/showcase.html');
    const btn = page.locator('#toggle-demo-toggle');
    await expect(btn).not.toHaveClass(/active/);
    await btn.click();
    await expect(btn).toHaveClass(/active/);
    await btn.click();
    await expect(btn).not.toHaveClass(/active/);
  });

  test('input mirror via on input put my value into #mirror-output', async ({ page }) => {
    await load(page, '/examples/multilingual/showcase.html');
    await page.locator('#mirror-demo-mirror').fill('mirrored text');
    await expect(page.locator('#mirror-output')).toHaveText('mirrored text');
  });

  test('tabs: multi-command handler switches active tab and panel', async ({ page }) => {
    await load(page, '/examples/multilingual/showcase.html');

    await expect(page.locator('#tabs-demo-tab1')).toHaveClass(/active/);
    await expect(page.locator('#panel1')).toBeVisible();
    await expect(page.locator('#panel2')).toBeHidden();

    await page.locator('#tabs-demo-tab2').click();
    await expect(page.locator('#tabs-demo-tab2')).toHaveClass(/active/);
    await expect(page.locator('#tabs-demo-tab1')).not.toHaveClass(/active/);
    await expect(page.locator('#panel2')).toBeVisible();
    await expect(page.locator('#panel1')).toBeHidden();

    await page.locator('#tabs-demo-tab3').click();
    await expect(page.locator('#panel3')).toBeVisible();
    await expect(page.locator('#panel2')).toBeHidden();
  });

  // Until 2026-10-18 a non-English choice wrote the translation into `_` with no adapter on
  // the page: the engine rejected it, and every demo stopped working (and the choice persisted).
  test('demos keep working in Japanese and Arabic (the adapter reads their data-lang)', async ({
    page,
  }) => {
    const errors = createErrorCollector(page);
    errors.attach();
    await load(page, '/examples/multilingual/showcase.html');
    for (const lang of ['ja', 'ar']) {
      await page.locator('#language').selectOption(lang);
      const increment = page.locator('#counter-demo-increment');
      await expect(increment).toHaveAttribute('data-lang', lang);
      expect(await increment.getAttribute('_')).not.toContain('increment');
      const value = page.locator('#counter-value');
      const before = parseInt((await value.textContent()) ?? '0', 10);
      await increment.click();
      await expect(value).toHaveText(String(before + 1));
    }
    expect(errors.getCriticalErrors()).toEqual([]);
  });

  test('LokaScriptSemantic.parseSemantic is exposed and returns a real confidence', async ({
    page,
  }) => {
    // showcase.html loads packages/semantic/dist/browser.global.js, so the
    // LokaScriptSemantic global must expose the recommended parseSemantic() entry
    // with a populated confidence (the deprecated analyzer path is not bundled).
    await load(page, '/examples/multilingual/showcase.html');
    await page.waitForFunction(
      () => typeof (window as any).LokaScriptSemantic?.parseSemantic === 'function',
      { timeout: 5000 }
    );
    const result = await page.evaluate(() => {
      const r = (window as any).LokaScriptSemantic.parseSemantic('on click toggle .active', 'en');
      return { hasNode: !!r?.node, confidence: r?.confidence };
    });
    expect(result.hasNode).toBe(true);
    expect(typeof result.confidence).toBe('number');
    expect(result.confidence).toBeGreaterThan(0);
  });
});

test.describe('multilingual/playground.html — local mirror @comprehensive', () => {
  // Translations come from the local semantic bundle (the page called i18n 2.3.0's retired
  // transformer from unpkg until 2026-10-18, so it showed English for every language offline).
  test('renders a translation for every other language the semantic parser reads', async ({
    page,
  }) => {
    await load(page, '/examples/multilingual/playground.html');
    await page.locator('#code-editor').fill('on click toggle .active');
    await page.evaluate(() => (window as any).updateTransformations());
    const cards = page.locator('.transform-card');
    const languages = await page.evaluate(
      () => (window as any).LokaScriptSemantic.getRegisteredLanguages().length
    );
    await expect(cards).toHaveCount(languages - 1);
    await expect(page.locator('.transform-card', { hasText: '切り替え' })).toHaveCount(1);
  });

  test('runs a Japanese script on the demo button, translated to English', async ({ page }) => {
    await load(page, '/examples/multilingual/playground.html');
    await page.locator('#source-lang').selectOption('ja');
    await page.locator('#code-editor').fill('クリック で .active を 切り替え');
    await page.evaluate(() => (window as any).runHyperscript());
    await expect(page.locator('#current-code')).toHaveText('on click toggle .active');
    const button = page.locator('#demo-btn');
    await button.click();
    await expect(button).toHaveClass(/active/);
  });

  test('demo input mirrors into #output', async ({ page }) => {
    await load(page, '/examples/multilingual/playground.html');
    await page.locator('#demo-input').fill('typed value');
    await expect(page.locator('#output')).toHaveText('typed value');
  });
});
