/**
 * Localized SSE and WebSocket attributes on htmx 4.0.0 with its own hx-sse and hx-ws extensions
 * (vendored, vendor/README.md). The adapter writes htmx 4's names (`hx-sse:connect`,
 * `hx-ws:connect`, `hx-ws:send`), not htmx 2's: htmx 4 still reads `sse-connect` and `ws-*`, but
 * copies each with a "legacy attribute … is deprecated" warning. Both spellings of a localized
 * name are read: `sse-conectar` and htmx 4's `hx-sse:conectar`.
 *
 * The event stream and the socket are Playwright routes; nothing listens on them.
 */
import { test, expect } from '@playwright/test';

const FIXTURES = '/packages/htmx-adapter/test/browser/fixtures';

test.describe('htmx v4 (4.0.0): SSE and WebSocket', () => {
  test("localized names connect, swap and send under htmx 4's names, without its legacy warnings", async ({
    page,
  }) => {
    const warnings: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'warning' || msg.type() === 'error') warnings.push(msg.text());
    });
    for (const [path, id] of [
      ['**/api/eventos', 'sse-got'],
      ['**/api/eventos-v4', 'sse-v4-got'],
    ])
      await page.route(path, route =>
        route.fulfill({
          status: 200,
          headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
          body: `data: <p id="${id}">hola</p>\n\n`,
        })
      );
    const received: string[] = [];
    await page.routeWebSocket('ws://localhost:3009/api/socket', ws => {
      ws.send('<b id="ws-got">hola</b>');
      ws.onMessage(message => received.push(String(message)));
    });

    await page.goto(`${FIXTURES}/v4-sse-ws.html`);

    // Unnamed SSE messages swap into the connecting element, from either spelling.
    await expect(page.locator('#sse #sse-got')).toHaveText('hola');
    await expect(page.locator('#sse-v4 #sse-v4-got')).toHaveText('hola');
    // The socket connects, and a raw string message swaps into hx-objetivo's target.
    await expect(page.locator('#ws-out #ws-got')).toHaveText('hola');
    // The form sends over the same socket.
    await page.click('#enviar');
    await expect.poll(() => received.join('\n')).toContain('hola');

    // The element's attribute names, less htmx's own markers (`data-htmx-powered`).
    const names = (selector: string) =>
      page.locator(selector).evaluate(el =>
        Array.from(el.attributes, a => a.name)
          .filter(n => !n.startsWith('data-htmx-'))
          .sort()
      );
    expect(await names('#sse')).toEqual(['hx-sse:connect', 'id', 'sse-conectar']);
    expect(await names('#sse-v4')).toEqual(['hx-sse:conectar', 'hx-sse:connect', 'id']);
    expect(await names('#ws')).toEqual([
      'hx-objetivo',
      'hx-target',
      'hx-ws:connect',
      'id',
      'ws-conectar',
    ]);
    expect(await names('#form')).toEqual(['hx-ws:send', 'id', 'ws-enviar']);
    expect(warnings.filter(w => /legacy attribute|deprecated/i.test(w))).toEqual([]);
  });
});
