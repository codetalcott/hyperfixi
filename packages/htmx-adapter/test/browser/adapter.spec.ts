/**
 * End-to-end truth tests: the adapter driving REAL vendored libraries
 * (htmx 4.0.0, htmx 2.0.10, _hyperscript 0.9.93 — see
 * vendor/README.md). Everything the jsdom suite mocks is exercised for
 * real here: extension registration, the htmx_before_process hook name
 * and firing granularity, initial-page ordering, swapped-content
 * re-processing, hx-on claim-before-bind, and _hyperscript's
 * evaluate(code, { me, event }) context convention.
 *
 * API endpoints are Playwright route interceptions — no dynamic server.
 */
import { test, expect, type Page } from '@playwright/test';

const FIXTURES = '/packages/htmx-adapter/test/browser/fixtures';

async function routeGreeting(page: Page): Promise<void> {
  await page.route('**/api/saludo', route =>
    route.fulfill({ status: 200, contentType: 'text/html', body: '<b id="hola">¡Hola!</b>' })
  );
}

/**
 * htmx catches the SyntaxError from JS-evaling a hyperscript body and routes
 * it to `htmx:error` + console.error — never an uncaught exception, and
 * never a DOM change. So the only way to SEE htmx binding a claimed node
 * is to collect console errors and `htmx:error` events, installed BEFORE
 * navigation. (Deleting the before:on:init hook used to leave the suite
 * green; with this collector it goes red.)
 */
async function collectHtmxErrors(
  page: Page
): Promise<{ console: string[]; warnings: string[]; htmx: () => Promise<string[]> }> {
  const consoleErrors: string[] = [];
  const warnings: string[] = [];
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
    if (msg.type() === 'warning') warnings.push(msg.text());
  });
  await page.addInitScript(() => {
    const w = window as unknown as { __htmxErrors: string[] };
    w.__htmxErrors = [];
    document.addEventListener('htmx:error', e => {
      w.__htmxErrors.push(String((e as CustomEvent).detail?.error ?? e.type));
    });
  });
  return {
    console: consoleErrors,
    warnings,
    htmx: () => page.evaluate(() => (window as unknown as { __htmxErrors: string[] }).__htmxErrors),
  };
}

test.describe('htmx v4 (4.0.0)', () => {
  test('localized button drives a real GET + swap @smoke', async ({ page }) => {
    await routeGreeting(page);
    await page.goto(`${FIXTURES}/v4-basic.html`);
    await page.click('#btn');
    await expect(page.locator('#out #hola')).toHaveText('¡Hola!');

    // Devtools faithfulness: authored attributes stay verbatim.
    const btn = page.locator('#btn');
    await expect(btn).toHaveAttribute('hx-obtener', '/api/saludo');
    await expect(btn).toHaveAttribute('hx-get', '/api/saludo');
    await expect(btn).toHaveAttribute('hx-trigger', 'click');
  });

  test('trigger really is click-only (hx-disparar="clic" translated, not defaulted)', async ({
    page,
  }) => {
    await routeGreeting(page);
    await page.goto(`${FIXTURES}/v4-basic.html`);
    // No click yet — nothing should have fired on load.
    await page.waitForTimeout(250);
    await expect(page.locator('#out')).toBeEmpty();
  });

  test('htmx loaded BEFORE the adapter still works via the extension hook', async ({ page }) => {
    await routeGreeting(page);
    await page.goto(`${FIXTURES}/v4-order-reversed.html`);
    await page.click('#btn');
    await expect(page.locator('#out #hola')).toHaveText('¡Hola!');
  });

  test('localized attributes inside swapped-in content work (re-process hook)', async ({
    page,
  }) => {
    await page.route('**/api/paso1', route =>
      route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: '<button id="btn2" hx-obtener="/api/paso2" hx-objetivo="#out" hx-disparar="clic">Paso 2</button>',
      })
    );
    await page.route('**/api/paso2', route =>
      route.fulfill({ status: 200, contentType: 'text/html', body: '<i id="fin">listo</i>' })
    );
    await page.goto(`${FIXTURES}/v4-swap.html`);
    await page.click('#btn1');
    await page.click('#zona #btn2'); // exists only after the first swap
    await expect(page.locator('#out #fin')).toHaveText('listo');
  });

  test('executor mode: hx-on bodies run through real _hyperscript with me bound', async ({
    page,
  }) => {
    const errors = await collectHtmxErrors(page);
    await page.goto(`${FIXTURES}/v4-hx-on.html`);

    // Canonical-named claim on v4: the authored attribute is PRESERVED —
    // the cancelable before:on:init hook keeps htmx from JS-evaling it,
    // so no mutation is needed. Body executed by _hyperscript with
    // `me` = the button; the toggle-on/toggle-off pair below doubles as
    // the double-execution probe (two executions would cancel out).
    const canonical = page.locator('#canonical');
    await expect(canonical).toHaveAttribute('hx-on:click', 'toggle .marcado on me');
    await canonical.click();
    await expect(canonical).toHaveClass(/marcado/);
    await canonical.click();
    await expect(canonical).not.toHaveClass(/marcado/);

    // Localized-named claim: authored attr verbatim, no canonical sibling,
    // body translated lazily (exactly once) then executed.
    const localized = page.locator('#localizado');
    await expect(localized).toHaveAttribute('hx-en:clic', 'alternar .activo');
    await expect(localized).not.toHaveAttribute('hx-on:click', /./);
    await localized.click();
    await expect(localized).toHaveClass(/activo/);
    await localized.click();
    await expect(localized).not.toHaveClass(/activo/);
    const translations = await page.evaluate(
      () => (window as unknown as { __translations: unknown[] }).__translations
    );
    expect(translations).toEqual([{ body: 'alternar .activo', lang: 'es' }]);

    // htmx never bound the claimed node: no htmx:error, no console error.
    expect(await errors.htmx()).toEqual([]);
    expect(errors.console).toEqual([]);
  });

  test('executor mode: _hyperscript loaded AFTER htmx — attr still preserved on v4', async ({
    page,
  }) => {
    const errors = await collectHtmxErrors(page);
    await page.goto(`${FIXTURES}/v4-hx-on-late-hyperscript.html`);
    const canonical = page.locator('#canonical');
    await expect(canonical).toHaveAttribute('hx-on:click', 'toggle .marcado on me');
    await canonical.click();
    await expect(canonical).toHaveClass(/marcado/);
    await canonical.click();
    await expect(canonical).not.toHaveClass(/marcado/);
    expect(await errors.htmx()).toEqual([]);
    expect(errors.console).toEqual([]);
  });

  test('executor mode: everything loaded with defer — sweep waits for DOMContentLoaded', async ({
    page,
  }) => {
    const errors = await collectHtmxErrors(page);
    await page.goto(`${FIXTURES}/v4-hx-on-defer.html`);
    const canonical = page.locator('#canonical');
    await expect(canonical).toHaveAttribute('hx-on:click', 'toggle .marcado on me');
    await canonical.click();
    await expect(canonical).toHaveClass(/marcado/);
    const localized = page.locator('#localizado');
    await expect(localized).not.toHaveAttribute('hx-on:click', /./);
    await localized.click();
    await expect(localized).toHaveClass(/activo/);
    expect(await errors.htmx()).toEqual([]);
    expect(errors.console).toEqual([]);
  });

  test('executor mode: extension allowlist rejects the adapter — removal guard, warning, no JS eval', async ({
    page,
  }) => {
    const errors = await collectHtmxErrors(page);
    await page.goto(`${FIXTURES}/v4-hx-on-allowlist.html`);
    const canonical = page.locator('#canonical');
    // Not registered → the hook cannot run → the claim removed the attr.
    await expect(canonical).not.toHaveAttribute('hx-on:click', /./);
    await canonical.click();
    await expect(canonical).toHaveClass(/marcado/);
    await canonical.click();
    await expect(canonical).not.toHaveClass(/marcado/);
    expect(errors.warnings.some(w => w.includes('htmx.config.extensions'))).toBe(true);
    expect(await errors.htmx()).toEqual([]);
    expect(errors.console).toEqual([]);
  });

  test('executor mode: mixed node — composite hx-on stays with htmx, colon form with the executor', async ({
    page,
  }) => {
    await page.goto(`${FIXTURES}/v4-hx-on.html`);
    const mixed = page.locator('#mixto');

    // On a node that also carries the legacy composite form, per-node
    // cancellation would kill htmx's composite binding too — so the
    // adapter falls back to removing the claimed colon-form attr and
    // lets htmx proceed.
    await expect(mixed).not.toHaveAttribute('hx-on:click', /./);
    await expect(mixed).toHaveAttribute('hx-on', /blur/);

    await mixed.click(); // executor path (claimed body)
    await expect(mixed).toHaveClass(/marcado/);

    await mixed.focus();
    await mixed.blur(); // htmx's own JS path (composite body)
    await expect(mixed).toHaveClass(/js-blur/);
  });
});

test.describe('reference-patched htmx v4 (upstream proposal proof)', () => {
  test('resolver mode: localized button works with ZERO DOM mutation', async ({ page }) => {
    await routeGreeting(page);
    await page.goto(`${FIXTURES}/v4-resolver-patched.html`);
    await page.click('#btn');
    await expect(page.locator('#out #hola')).toHaveText('¡Hola!');

    // The whole point of the upstream seam: no canonical attribute was
    // ever written — the DOM is exactly what the author typed.
    const btn = page.locator('#btn');
    await expect(btn).toHaveAttribute('hx-obtener', '/api/saludo');
    await expect(btn).not.toHaveAttribute('hx-get', /./);
    await expect(btn).not.toHaveAttribute('hx-target', /./);
    // htmx v4 stamps its own data-htmx-powered marker on initialized
    // elements (its bookkeeping, listed in its morphIgnore default) —
    // everything else must be exactly what the author typed.
    const attrNames = await btn.evaluate(el =>
      el
        .getAttributeNames()
        .filter(n => n !== 'data-htmx-powered')
        .sort()
    );
    expect(attrNames).toEqual(['hx-objetivo', 'hx-obtener', 'id'].sort());
  });
});

test.describe('htmx v2 fallback (2.0.10)', () => {
  test('localized button drives a real GET + swap via defineExtension/onEvent', async ({
    page,
  }) => {
    await routeGreeting(page);
    await page.goto(`${FIXTURES}/v2-basic.html`);
    await page.click('#btn');
    await expect(page.locator('#out #hola')).toHaveText('¡Hola!');
    await expect(page.locator('#btn')).toHaveAttribute('hx-obtener', '/api/saludo');
  });
});
