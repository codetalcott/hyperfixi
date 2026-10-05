/**
 * Error Observability Tests (shipped bundle)
 *
 * Regression guard for the drop_console incident: core's production terser
 * config once stripped ALL console methods (drop_console: true), so parse
 * failures on the _= attribute path were silent no-ops in the shipped bundle
 * even though the source code warned correctly. These tests run against the
 * BUILT bundle the page loads — the engine's hyperfixi-hs.js since Phase C3
 * (C-R4a) — so they fail if a build-config change ever silences the error.
 *
 * The engine reports a parse error the way upstream _hyperscript does: a
 * `hyperscript:parse-error` event dispatched on the element (detail `{ errors }`) and a
 * console.error naming the element. (Core fired `hyperfixi:compile-error` and
 * logged "Compilation failed for _= attribute".)
 */
import { test, expect } from '@playwright/test';

test.describe('Shipped bundle error observability @quick', () => {
  test('unparseable _= attribute surfaces a console.error and a hyperscript:parse-error event', async ({
    page,
    baseURL,
  }) => {
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    await page.goto(`${baseURL}/packages/core/compatibility-test.html`);

    const eventDetail = await page.evaluate(async () => {
      const w = window as unknown as { _hyperscript: { processNode: (el: Element) => void } };

      const eventPromise = new Promise<Record<string, unknown> | null>(resolve => {
        document.addEventListener(
          'hyperscript:parse-error',
          e => {
            const detail = (e as CustomEvent).detail;
            resolve({
              onElement: e.target === el,
              errorCount: Array.isArray(detail.errors) ? detail.errors.length : -1,
              firstMessage: detail.errors?.[0]?.message ?? null,
            });
          },
          { once: true, capture: true }
        );
        // Don't hang forever if the event never fires
        setTimeout(() => resolve(null), 3000);
      });

      const el = document.createElement('div');
      el.setAttribute('_', 'klaatu barada nikto (((');
      document.body.appendChild(el);
      w._hyperscript.processNode(el);

      return eventPromise;
    });

    expect(eventDetail).not.toBeNull();
    expect(eventDetail!.onElement).toBe(true);
    expect(eventDetail!.errorCount).toBeGreaterThan(0);
    expect(eventDetail!.firstMessage).toBeTruthy();

    expect(
      consoleErrors.some(t => t.includes('parse error')),
      `Expected a console.error reporting the parse error; got: ${JSON.stringify(consoleErrors)}`
    ).toBe(true);
  });

  test('valid _= attribute produces no parse errors', async ({ page, baseURL }) => {
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    await page.goto(`${baseURL}/packages/core/compatibility-test.html`);

    const parseErrors = await page.evaluate(async () => {
      const w = window as unknown as { _hyperscript: { processNode: (el: Element) => void } };
      let count = 0;
      document.addEventListener('hyperscript:parse-error', () => count++, { capture: true });
      const el = document.createElement('button');
      el.setAttribute('_', 'on click toggle .active');
      document.body.appendChild(el);
      w._hyperscript.processNode(el);
      await new Promise(resolve => setTimeout(resolve, 50));
      return count;
    });

    expect(parseErrors).toBe(0);
    expect(consoleErrors.filter(t => t.includes('parse error'))).toEqual([]);
  });
});
