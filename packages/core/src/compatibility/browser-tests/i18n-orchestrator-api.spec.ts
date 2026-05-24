/**
 * Smoke test for the orchestrator's public-API surface in the minified
 * bundles that ship htmx-compat. Targets the v2.5.0 regression where
 * terser's `unused/toplevel` pass + `properties.regex: /^_/` mangled
 * `window.__hyperfixi_i18n = { register }` away, silently breaking every
 * `vocab/htmx/{lang}.js` module on load (fixed in 90ba037b).
 *
 * Scoped intentionally: doesn't touch the swap pipeline, doesn't drive
 * fixtures. The contract under test is the single line vocab modules
 * depend on — `typeof window.__hyperfixi_i18n.register === 'function'`.
 *
 * Wired into pre-publish-check.yml and release-smoke `--matrix` so the
 * gate fires against both the locally-built dist and the published
 * tarball.
 */
import { test, expect, type Page } from '@playwright/test';

// Mirrors the env-override pattern used by bundle-compatibility,
// hx-v4-features, and i18n-htmx — release-smoke's matrix stage points
// BASE_URL at an ephemeral server serving the registry-installed dist.
const BASE_URL = process.env.BASE_URL ?? 'http://127.0.0.1:3000';

// `blocks-if-else.html` is a tiny no-bundle test page that exists in
// every published-or-local layout we care about. We navigate there to
// get a same-origin document, then inject the bundle script tag.
const HOST_PAGE = '/packages/core/test-pages/blocks-if-else.html';

async function loadBundle(page: Page, bundle: string): Promise<void> {
  await page.goto(`${BASE_URL}${HOST_PAGE}`, { waitUntil: 'domcontentloaded' });
  await page.addScriptTag({ url: `${BASE_URL}/packages/core/dist/${bundle}` });
  await page.waitForFunction(() => !!(window as Window & { hyperfixi?: unknown }).hyperfixi, null, {
    timeout: 15000,
  });
}

async function readApiShape(page: Page): Promise<{ type: string; registerType: string }> {
  return page.evaluate(() => {
    const api = (window as Window & { __hyperfixi_i18n?: { register?: unknown } }).__hyperfixi_i18n;
    return { type: typeof api, registerType: typeof api?.register };
  });
}

test.describe('htmx i18n orchestrator public API @comprehensive', () => {
  test('hyperfixi-hx.js: window.__hyperfixi_i18n.register survives terser', async ({ page }) => {
    await loadBundle(page, 'hyperfixi-hx.js');
    expect(await readApiShape(page)).toEqual({ type: 'object', registerType: 'function' });
  });

  test('hyperfixi-hx-v4.js: window.__hyperfixi_i18n.register survives terser', async ({ page }) => {
    await loadBundle(page, 'hyperfixi-hx-v4.js');
    expect(await readApiShape(page)).toEqual({ type: 'object', registerType: 'function' });
  });
});
