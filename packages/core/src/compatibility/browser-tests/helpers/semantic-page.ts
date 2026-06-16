/**
 * Shared navigation helper for the semantic browser-bundle specs.
 *
 * Both `semantic-package.spec.ts` and `semantic-multilingual.spec.ts` load
 * `/packages/semantic/test-browser.html`, whose only job is to pull in the
 * ~906 KB IIFE bundle (`dist/browser.global.js`) and expose
 * `window.LokaScriptSemantic`.
 *
 * On resource-pressured CI runners that large, uncached asset (the webServer
 * runs `http-server -c-1`) intermittently fails to fully load/execute before
 * the test reads the global, so `window.LokaScriptSemantic` is `undefined` and
 * every assertion in the spec throws `Cannot read properties of undefined`.
 * The bundle itself is byte-identical between passing and failing runs — it is
 * purely a transient load flake, so a bounded re-navigation self-heals it
 * within the test instead of burning all of Playwright's full-test retries
 * against one bad page load.
 */
import type { Page } from '@playwright/test';

const SEMANTIC_FIXTURE = '/packages/semantic/test-browser.html';

/** Number of navigation attempts before giving up (1 initial + retries). */
const MAX_ATTEMPTS = 3;

/**
 * Navigate to the semantic test page and wait until the bundle's global is
 * present. Reloads (up to {@link MAX_ATTEMPTS} total) if the global hasn't
 * appeared, which recovers from a transient/truncated bundle download. Throws
 * with a clear message — not an opaque `undefined` deref — if it never loads.
 */
export async function gotoSemanticPage(page: Page): Promise<void> {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    if (attempt === 1) {
      await page.goto(SEMANTIC_FIXTURE);
    } else {
      await page.reload();
    }
    try {
      // The IIFE assigns window.LokaScriptSemantic synchronously once it
      // executes; if the script truly loaded, this resolves immediately.
      await page.waitForFunction(() => 'LokaScriptSemantic' in window, undefined, {
        timeout: 10_000,
      });
      return;
    } catch {
      if (attempt === MAX_ATTEMPTS) {
        throw new Error(
          `window.LokaScriptSemantic never became defined after ${MAX_ATTEMPTS} ` +
            `loads of ${SEMANTIC_FIXTURE}. The semantic browser bundle ` +
            `(dist/browser.global.js) failed to load or execute — check the ` +
            `Playwright trace (network + console) for the bundle request.`
        );
      }
      // else: loop and reload to retry the bundle download.
    }
  }
}
