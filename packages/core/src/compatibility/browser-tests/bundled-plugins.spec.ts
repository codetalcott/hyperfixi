/**
 * Bundled Plugins Tests (shipped bundle)
 *
 * The full hyperfixi.js bundle auto-installs @hyperfixi/reactivity and
 * @hyperfixi/realtime, so reactivity (live/when/bind/$var) and realtime
 * (socket/eventsource/worker) syntax must compile out of the box — no extra
 * script tags. These run against the BUILT bundle, so they fail if the
 * auto-install wiring (browser-bundle.ts installBundledPlugins) regresses.
 */
import { test, expect } from '@playwright/test';

// compatibility-test.html loads dist/hyperfixi.js itself. Do NOT addScriptTag
// the bundle again: a second copy's plugin install hits the idempotency guard
// on the first copy's globalThis-hoisted registry, leaving the second copy's
// module-local parser maps empty (features register in one bundle instance
// only — single-bundle pages are the supported case).

const PLUGIN_PATTERNS = [
  ['socket', 'socket ChatSocket ws://localhost:8080 on message put it into #chat end'],
  ['eventsource', 'eventsource ChatStream from /events on message put it into #messages end end'],
  ['worker', 'worker Calculator def add(a, b) return a + b end end'],
  ['bind', 'bind $name to #input-a'],
  ['live', 'live put `Count: ${$count}` into me end'],
  ['when', 'when $count changes put $count into #out end'],
] as const;

test.describe('Shipped bundle auto-installs plugins @quick', () => {
  test('realtime and reactivity syntax compiles on plain hyperfixi.js', async ({
    page,
    baseURL,
  }) => {
    await page.goto(`${baseURL}/packages/core/compatibility-test.html`);

    const results = await page.evaluate(
      patterns => {
        const w = window as unknown as {
          hyperfixi: {
            compileSync: (code: string) => { ok: boolean; errors?: Array<{ message: string }> };
          };
        };
        return patterns.map(([name, code]) => {
          const r = w.hyperfixi.compileSync(code);
          return { name, ok: r.ok, error: r.ok ? null : (r.errors?.[0]?.message ?? 'unknown') };
        });
      },
      PLUGIN_PATTERNS as unknown as string[][]
    );

    for (const r of results) {
      expect(r.ok, `${r.name} should compile on the shipped bundle: ${r.error}`).toBe(true);
    }
  });

  test('a socket handler executes end-to-end with a fake WebSocket', async ({ page, baseURL }) => {
    await page.goto(`${baseURL}/packages/core/compatibility-test.html`);

    const chatText = await page.evaluate(async () => {
      const w = window as unknown as {
        hyperfixi: { process: (el: Element) => Promise<void> };
        WebSocket: unknown;
      };

      // Swap in a controllable fake before the feature installs.
      const instances: Array<{ onmessage: ((ev: { data: string }) => void) | null }> = [];
      class FakeWebSocket {
        readyState = 1;
        onopen: (() => void) | null = null;
        onclose: (() => void) | null = null;
        onerror: (() => void) | null = null;
        onmessage: ((ev: { data: string }) => void) | null = null;
        constructor(public url: string) {
          instances.push(this);
        }
        send() {}
        close() {}
      }
      w.WebSocket = FakeWebSocket;

      const chat = document.createElement('div');
      chat.id = 'chat';
      document.body.appendChild(chat);

      const el = document.createElement('div');
      el.setAttribute(
        '_',
        'socket ChatSocket ws://localhost:8080 on message put it into #chat end'
      );
      document.body.appendChild(el);
      await w.hyperfixi.process(el);

      instances[0]?.onmessage?.({ data: 'hello from socket' });
      await new Promise(resolve => setTimeout(resolve, 50));
      return chat.textContent;
    });

    expect(chatText).toBe('hello from socket');
  });
});
