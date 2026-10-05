/**
 * Playwright spec for the demos in examples/hx-v4/, which since 2026-10-03 run on
 * `hyperfixi-hs.js` (the engine) — the three reactive pages on the engine's own `live` and
 * `bind` features, the SSE and WebSocket pages on REAL htmx 4 (vendored under
 * examples/vendor/) with its hx-sse / hx-ws extensions, loaded beside the engine.
 *
 * Before that the pages ran core's htmx-compat layer (`hyperfixi-hx-v4.js`: `hx-live`,
 * `sse-connect`, `ws-connect`), retired by owner decision in the engine migration.
 *
 * The demos use in-page mocks for fetch / WebSocket so no backend is needed; the spec
 * drives the page state and observes DOM updates.
 */
import { test, expect, type Page } from '@playwright/test';
import { waitForHyperfixi } from './test-utils';

// Mirrors bundle-compatibility.spec.ts — env override lets the release-smoke
// `--matrix` stage point this spec at its ephemeral server (which serves the
// registry-installed @hyperfixi/core/dist instead of the repo build).
const BASE_URL = process.env.BASE_URL ?? 'http://127.0.0.1:3000';

async function loadDemo(page: Page, file: string): Promise<void> {
  await page.goto(`${BASE_URL}/examples/hx-v4/${file}`, {
    waitUntil: 'domcontentloaded',
    timeout: 10000,
  });
  await waitForHyperfixi(page);
  // Allow the engine's first live run (a microtask) and htmx's init to complete.
  await page.waitForTimeout(150);
}

test.describe('hx-v4 demos on the engine and real htmx 4 @comprehensive', () => {
  test('hx-live-counter: clicks update the live counter', async ({ page }) => {
    await loadDemo(page, 'hx-live-counter.html');

    const counter = page.locator('.counter');
    await expect(counter).toHaveText('0');

    // "+1 from raw JS" matches "+1" too — use exact-name locator to pick
    // the hyperscript-driven button.
    const plus = page.getByRole('button', { name: '+1', exact: true });
    const minus = page.getByRole('button', { name: '−1', exact: true });
    const reset = page.getByRole('button', { name: 'reset', exact: true });

    await plus.click();
    await expect(counter).toHaveText('1');

    await plus.click();
    await expect(counter).toHaveText('2');

    await minus.click();
    await expect(counter).toHaveText('1');

    await reset.click();
    await expect(counter).toHaveText('0');
  });

  test('hx-live-multiple-deps: changing either dependency re-runs the live body', async ({
    page,
  }) => {
    await loadDemo(page, 'hx-live-multiple-deps.html');

    const display = page.locator('.display');
    await expect(display).toHaveText('Total: $0');

    await page.locator('#price').fill('10');
    await page.locator('#price').dispatchEvent('input');
    await page.locator('#qty').fill('3');
    await page.locator('#qty').dispatchEvent('input');

    await expect(display).toHaveText('Total: $30');

    await page.locator('#price').fill('5');
    await page.locator('#price').dispatchEvent('input');
    await expect(display).toHaveText('Total: $15');
  });

  test('bind-to-property: color picker drives the swatch background', async ({ page }) => {
    await loadDemo(page, 'bind-to-property.html');

    // The bind effect runs on init — the swatch should reflect the picker
    // value once the bind handlers have settled. Sanity-check that the
    // page didn't throw the v1 "did not resolve to an element" error.
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));

    await page.locator('#picker').evaluate((el: HTMLInputElement) => {
      el.value = '#ff8800';
      el.dispatchEvent(new Event('input'));
    });
    // Reactivity microtask flush; bind effect runs.
    await page.waitForTimeout(150);

    // The echo input should pick up the picker value via shared $color.
    const echo = page.locator('#echo');
    await expect(echo).toHaveValue('#ff8800');

    expect(errors.filter(m => /bind:/i.test(m))).toHaveLength(0);
  });

  test('sse-stream: htmx 4 hx-sse streams the mocked event-stream into the feed', async ({
    page,
  }) => {
    await loadDemo(page, 'sse-stream.html');

    const feed = page.locator('#feed');
    // Mock emits a synthetic `tick` every 800ms; wait for the first one.
    await expect
      .poll(async () => (await feed.textContent()) ?? '', { timeout: 4000 })
      .not.toBe('(events appear here, newest first)');
    // After ~2s we should see multiple ticks accumulated.
    await page.waitForTimeout(1800);
    const text = (await feed.textContent()) ?? '';
    // The mock emits `data: <div …>tick #N</div>` events; hx-sse swaps each one in.
    expect(text).toContain('tick #');
    expect(text.length).toBeGreaterThan(20);
  });

  test('ws-chat: htmx 4 hx-ws:send submits to the mocked socket and the echo is swapped in', async ({
    page,
  }) => {
    await loadDemo(page, 'ws-chat.html');

    const messages = page.locator('#messages');
    await page.locator('input[name="msg"]').fill('hello world');
    await page.locator('button[type="submit"]').click();

    // The mock echoes htmx 4's JSON message shape ({target, swap, content}); hx-ws swaps it in.
    await expect
      .poll(async () => (await messages.textContent()) ?? '', { timeout: 3000 })
      .toContain('hello world');
  });
});
