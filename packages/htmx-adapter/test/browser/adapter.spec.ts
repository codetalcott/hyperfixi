/**
 * End-to-end truth tests: the adapter driving REAL vendored libraries
 * (htmx 4.0.0-beta5, htmx 2.0.10, _hyperscript 0.9.93 — see
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

test.describe('htmx v4 (4.0.0-beta5)', () => {
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
    await page.goto(`${FIXTURES}/v4-hx-on.html`);

    // Canonical-named claim: attribute removed (htmx must not JS-eval it),
    // body executed by _hyperscript with `me` = the button.
    const canonical = page.locator('#canonical');
    await expect(canonical).not.toHaveAttribute('hx-on:click', /./);
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

    // No JS-eval errors from htmx trying to run hyperscript bodies.
    const errors: string[] = [];
    page.on('pageerror', err => errors.push(String(err)));
    await canonical.click();
    expect(errors).toEqual([]);
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
