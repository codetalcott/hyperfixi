/**
 * Error Observability Tests (shipped bundle)
 *
 * Regression guard for the drop_console incident: the production terser
 * config stripped ALL console methods (drop_console: true), so parse
 * failures on the _= attribute path were silent no-ops in dist/hyperfixi.js
 * even though the source code warned correctly. These tests run against the
 * BUILT bundle, so they fail if a build-config change ever silences
 * console.error again.
 */
import { test, expect } from '@playwright/test';

const BUNDLE_URL = '/packages/core/dist/hyperfixi.js';

test.describe('Shipped bundle error observability @quick', () => {
  test('unparseable _= attribute surfaces a console.error and a hyperfixi:compile-error event', async ({
    page,
    baseURL,
  }) => {
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    await page.goto(`${baseURL}/packages/core/compatibility-test.html`);
    await page.addScriptTag({ url: BUNDLE_URL });

    const eventDetail = await page.evaluate(async () => {
      const w = window as unknown as {
        hyperfixi: { process: (el: Element) => Promise<void> };
      };

      const eventPromise = new Promise<Record<string, unknown> | null>(resolve => {
        document.addEventListener(
          'hyperfixi:compile-error',
          e => {
            const detail = (e as CustomEvent).detail;
            resolve({
              source: detail.source,
              code: detail.code,
              errorCount: Array.isArray(detail.errors) ? detail.errors.length : -1,
              firstMessage: detail.errors?.[0]?.message ?? null,
            });
          },
          { once: true }
        );
        // Don't hang forever if the event never fires
        setTimeout(() => resolve(null), 3000);
      });

      const el = document.createElement('div');
      el.setAttribute('_', 'klaatu barada nikto (((');
      document.body.appendChild(el);
      await w.hyperfixi.process(el);

      return eventPromise;
    });

    expect(eventDetail).not.toBeNull();
    expect(eventDetail!.source).toBe('attribute');
    expect(eventDetail!.code).toBe('klaatu barada nikto (((');
    expect(eventDetail!.errorCount).toBeGreaterThan(0);

    expect(
      consoleErrors.some(t => t.includes('Compilation failed for _= attribute')),
      `Expected a console.error mentioning the _= compile failure; got: ${JSON.stringify(consoleErrors)}`
    ).toBe(true);
  });

  test('valid _= attribute produces no compile errors', async ({ page, baseURL }) => {
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    await page.goto(`${baseURL}/packages/core/compatibility-test.html`);
    await page.addScriptTag({ url: BUNDLE_URL });

    await page.evaluate(async () => {
      const w = window as unknown as {
        hyperfixi: { process: (el: Element) => Promise<void> };
      };
      const el = document.createElement('button');
      el.setAttribute('_', 'on click toggle .active');
      document.body.appendChild(el);
      await w.hyperfixi.process(el);
    });

    expect(consoleErrors.filter(t => t.includes('Compilation failed'))).toEqual([]);
  });
});
