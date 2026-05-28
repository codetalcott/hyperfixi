/**
 * Coverage for the interactive multilingual / showcase example pages that had
 * no Playwright spec:
 *   - multilingual/showcase.html            (counter/toggle/mirror/tabs, local core + semantic)
 *   - multilingual/test-minimal.html        (hyperfixi.execute on classic-i18n bundle)
 *   - multilingual/polyglot-playground.html (local inc/dec/toggle demo)
 *   - multilingual/playground.html          (local demo mirror; i18n via unpkg CDN)
 *
 * Strict assertions exercise the runtime/parser/i18n surfaces to surface bugs.
 * Tests target locally-served bundles and avoid the unpkg CDN. (The
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

test.describe('multilingual/test-minimal.html @comprehensive', () => {
  test('hyperfixi.execute writes into #result element', async ({ page }) => {
    const consoleErrs: string[] = [];
    page.on('console', m => {
      if (m.type() === 'error') consoleErrs.push(m.text());
    });
    page.on('pageerror', e => consoleErrs.push(`PageError: ${e.message}`));

    await load(page, '/examples/multilingual/test-minimal.html');
    await expect(page.locator('#result')).toHaveText('not clicked');

    await page.locator('#test-btn').click();
    // execute('set #result to "clicked!"') should update the element text.
    await expect(page.locator('#result')).toHaveText('clicked!', { timeout: 5000 });

    expect(consoleErrs.filter(e => /Execute failed|Parse failed/.test(e))).toEqual([]);
  });
});

test.describe('multilingual/polyglot-playground.html — local demo @comprehensive', () => {
  test('increment/decrement buttons drive #count', async ({ page }) => {
    await load(page, '/examples/multilingual/polyglot-playground.html');
    const count = page.locator('#count');
    const start = parseInt((await count.textContent()) ?? '0', 10);

    await page.locator('.demo-btn.inc').click();
    await expect(count).toHaveText(String(start + 1));
    await page.locator('.demo-btn.inc').click();
    await expect(count).toHaveText(String(start + 2));
    await page.locator('.demo-btn.dec').click();
    await expect(count).toHaveText(String(start + 1));
  });

  test('toggle-box toggles its own .active class', async ({ page }) => {
    await load(page, '/examples/multilingual/polyglot-playground.html');
    const box = page.locator('#toggle-box');
    await expect(box).not.toHaveClass(/active/);
    await box.click();
    await expect(box).toHaveClass(/active/);
  });
});

test.describe('multilingual/playground.html — local mirror @comprehensive', () => {
  // i18n translate here comes from the unpkg CDN; this test only exercises the
  // locally-served runtime (demo input mirror), so it stays deterministic offline.
  test('demo input mirrors into #output', async ({ page }) => {
    await load(page, '/examples/multilingual/playground.html');
    await page.locator('#demo-input').fill('typed value');
    await expect(page.locator('#output')).toHaveText('typed value');
  });
});
