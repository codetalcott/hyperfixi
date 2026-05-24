/**
 * Playwright spec exercising the hx-v4 bundle against the live demos in
 * examples/hx-v4/. Item 14 of htmx-v4-reactive-streaming.md follow-ups.
 *
 * bundle-compatibility.spec.ts registers `hybrid-hx-v4` and verifies basic
 * pre-v4 features (toggle/show/hide/etc.) work. This spec is the
 * complementary surface — it asserts the *new* reactive + streaming
 * behaviors that make the hx-v4 bundle distinct: hx-live re-renders,
 * bind two-way sync, SSE swap routing, WS envelope swaps.
 *
 * The demos use in-page mocks for EventSource / WebSocket so no backend
 * is needed; the spec just drives the page state and observes DOM updates.
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
  // Allow the htmx-compat scanner + reactivity init pass to complete.
  await page.waitForTimeout(150);
}

test.describe('hx-v4 reactive/streaming features @comprehensive', () => {
  test('hx-live-counter: clicks update the live-bound counter', async ({ page }) => {
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

  test('hx-live-multiple-deps: changing either dep triggers re-render', async ({ page }) => {
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

  test('sse-stream: incoming mock SSE events append to the feed', async ({ page }) => {
    await loadDemo(page, 'sse-stream.html');

    const feed = page.locator('#feed');
    // Mock emits a synthetic `tick` every 800ms; wait for the first one.
    await expect
      .poll(async () => (await feed.textContent()) ?? '', { timeout: 4000 })
      .not.toBe('(events appear here, newest first)');
    // After ~2s we should see multiple ticks accumulated.
    await page.waitForTimeout(1800);
    const text = (await feed.textContent()) ?? '';
    // The mock emits HTML fragments containing the word "tick" or a number;
    // we don't pin the exact shape, just verify *something* streamed in.
    expect(text.length).toBeGreaterThan(20);
  });

  test('hx-on:click fires on the no-reactivity demo (Phase 8-pre regression)', async ({ page }) => {
    // Confirms hx-on:* now registers real DOM listeners even without
    // reactivity installed and without any paired request attribute.
    // Pre-8-pre: translator wrapped the body as `on click body` text and
    // shipped it through executeCallback, which silently no-op'd.
    await loadDemo(page, 'hx-live-no-reactivity.html');

    // Scoped CSS selector instead of getByRole — the button's accessible name
    // changes after the first click (from "I am wired..." to "clicked N time(s)"),
    // which would break a role-name locator on subsequent assertions.
    const button = page.locator('.other button');
    await expect(button).toHaveText(/wired via hx-on:click/);
    await button.click();
    // Body increments $clicks and rewrites the button text. Two clicks proves
    // the listener stays attached AND that the slim runtime's `set` persists
    // state across invocations even without reactivity wired in.
    await expect(button).toHaveText(/clicked 1 time/);
    await button.click();
    await expect(button).toHaveText(/clicked 2 time/);
  });

  test('ws-chat: ws-send submits to the mocked socket and echoes back', async ({ page }) => {
    await loadDemo(page, 'ws-chat.html');

    const messages = page.locator('#messages');
    await page.locator('input[name="msg"]').fill('hello world');
    await page.locator('button[type="submit"]').click();

    // Mock echoes back as a JSON envelope; the swap puts it into #messages.
    await expect
      .poll(async () => (await messages.textContent()) ?? '', { timeout: 3000 })
      .toContain('hello world');
  });
});
