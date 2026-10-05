/**
 * Shared navigation helper for the semantic browser-bundle specs.
 *
 * Both `semantic-package.spec.ts` and `semantic-multilingual.spec.ts` load
 * `/packages/semantic/test-browser.html`, whose only job is to pull in the
 * ~906 KB IIFE bundle (`dist/browser.global.js`) and expose
 * `window.LokaScriptSemantic`.
 *
 * History: these specs failed 25/92 on every CI run because the fixture HTML
 * was matched by a `test-*.html` glob in .gitignore and never tracked — so a
 * fresh CI checkout 404'd on it, the page never loaded the bundle, and every
 * assertion threw `Cannot read properties of undefined`. The real fix is
 * tracking the fixture (see the .gitignore negation). This helper stays as a
 * cheap guard: instead of an opaque `undefined` deref, it fails with a clear
 * message — and paired with the uploaded Playwright trace, the network 404 /
 * console error is one click away.
 */
import type { Page } from '@playwright/test';

const SEMANTIC_FIXTURE = '/packages/semantic/test-browser.html';

/**
 * Navigate to the semantic test page and wait until the bundle's global is
 * present, throwing a clear, trace-pointing error (not an opaque `undefined`
 * deref) if the fixture or bundle fails to load.
 */
export async function gotoSemanticPage(page: Page): Promise<void> {
  const response = await page.goto(SEMANTIC_FIXTURE);
  if (response && !response.ok()) {
    throw new Error(
      `${SEMANTIC_FIXTURE} returned HTTP ${response.status()} — the fixture is ` +
        `not being served (is it tracked in git? it's otherwise ignored by ` +
        `**/test-*.html). Check the Playwright trace for the failed request.`
    );
  }
  try {
    // The IIFE assigns window.LokaScriptSemantic synchronously once it
    // executes; if the page + script loaded, this resolves immediately.
    await page.waitForFunction(() => 'LokaScriptSemantic' in window, undefined, {
      timeout: 8_000,
    });
  } catch {
    throw new Error(
      `window.LokaScriptSemantic never became defined after loading ` +
        `${SEMANTIC_FIXTURE}. The semantic browser bundle ` +
        `(dist/browser.global.js) failed to load or execute — check the ` +
        `Playwright trace (network + console) for the bundle request.`
    );
  }
}
