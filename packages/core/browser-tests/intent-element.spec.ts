/**
 * Playwright smoke test for <lse-intent> custom element.
 *
 * Loads the demo page (examples/intent-element/index.html) and verifies:
 * 1. the hyperscript host (hyperfixi-hs.js) and the English renderer load
 * 2. intent-element IIFE auto-registers <lse-intent>
 * 3. Valid inline JSON validates and executes
 * 4. Invalid JSON shows the error slot
 * 5. Missing action field shows the error slot
 * 6. Toggle interaction actually mutates the DOM
 */
import { test, expect } from '@playwright/test';

const DEMO_URL = '/examples/intent-element/index.html';

// @comprehensive: untagged, this spec matched none of the projects CI runs.
test.describe('<lse-intent> browser integration @comprehensive', () => {
  test('the host and the renderer are loaded', async ({ page }) => {
    await page.goto(DEMO_URL);
    const loaded = await page.evaluate(() => ({
      evaluate: typeof (window as any).hyperfixi?.evaluate === 'function',
      render: typeof (window as any).LokaScriptSemanticEn?.render === 'function',
    }));
    expect(loaded).toEqual({ evaluate: true, render: true });
  });

  test('<lse-intent> custom element is registered', async ({ page }) => {
    await page.goto(DEMO_URL);
    const isRegistered = await page.evaluate(() => customElements.get('lse-intent') !== undefined);
    expect(isRegistered).toBe(true);
  });

  test('valid inline JSON fires lse:validated event', async ({ page }) => {
    await page.goto(DEMO_URL);

    const validated = await page.evaluate(() => {
      return new Promise<boolean>(resolve => {
        const el = document.getElementById('demo-toggle');
        if (!el) return resolve(false);
        // The element already initialized on connect, check its node
        const node = (el as any).node;
        resolve(node !== null && node.action === 'toggle');
      });
    });
    expect(validated).toBe(true);
  });

  test('invalid JSON shows error slot', async ({ page }) => {
    await page.goto(DEMO_URL);
    // Wait for initialization
    await page.waitForTimeout(200);

    const errorVisible = await page.evaluate(() => {
      const el = document.getElementById('demo-invalid');
      if (!el) return false;
      const errorSlot = el.querySelector('[slot="error"]') as HTMLElement;
      // _showError() sets style.display = '' which removes the inline display:none
      return errorSlot && errorSlot.style.display !== 'none';
    });
    expect(errorVisible).toBe(true);
  });

  test('missing action field shows error slot', async ({ page }) => {
    await page.goto(DEMO_URL);
    await page.waitForTimeout(200);

    const errorVisible = await page.evaluate(() => {
      const el = document.getElementById('demo-missing-action');
      if (!el) return false;
      const errorSlot = el.querySelector('[slot="error"]') as HTMLElement;
      return errorSlot && errorSlot.style.display !== 'none';
    });
    expect(errorVisible).toBe(true);
  });

  test('toggle button click mutates #sidebar class', async ({ page }) => {
    await page.goto(DEMO_URL);
    // Wait for element to initialize — connectedCallback auto-executes the intent,
    // so sidebar already has .active from the initial toggle
    await page.waitForTimeout(300);

    const sidebar = page.locator('#sidebar');

    // Record initial state (already toggled once on connect)
    const initialHasActive = await sidebar.evaluate(el => el.classList.contains('active'));

    // Click the toggle button: trigger="click" runs the intent again
    await page.click('#demo-toggle [slot="trigger"]');
    await page.waitForTimeout(200);

    // Class should have toggled from initial state
    const afterFirstClick = await sidebar.evaluate(el => el.classList.contains('active'));
    expect(afterFirstClick).toBe(!initialHasActive);

    // Click again — should toggle back
    await page.click('#demo-toggle [slot="trigger"]');
    await page.waitForTimeout(200);

    const afterSecondClick = await sidebar.evaluate(el => el.classList.contains('active'));
    expect(afterSecondClick).toBe(initialHasActive);
  });

  test('clicking toggle adds new entries to event log', async ({ page }) => {
    await page.goto(DEMO_URL);
    await page.waitForTimeout(300);

    // Click the toggle button to trigger a fresh round of events
    await page.click('#demo-toggle [slot="trigger"]');
    await page.waitForTimeout(300);

    const logText = await page.locator('#event-log').textContent();
    // Validated once, on connect; each click is an lse:executed
    expect(logText).toContain('lse:validated');
    expect(logText).toContain('lse:executed');
  });

  test('a handler body runs on its event, as one script (`it` carries)', async ({ page }) => {
    await page.goto(DEMO_URL);
    await page.waitForTimeout(300);
    await expect(page.locator('#chain-out')).toHaveText('(not run yet)');
    await page.click('#demo-chain button');
    await expect(page.locator('#chain-out')).toHaveText('3');
  });

  test('allow refuses a value that carries a second command', async ({ page }) => {
    await page.goto(DEMO_URL);
    await page.waitForTimeout(300);
    const state = await page.evaluate(() => {
      const el = document.getElementById('demo-allow') as any;
      return {
        codes: el.diagnostics.map((d: { code: string }) => d.code),
        node: el.node,
        boxClass: document.getElementById('allow-box')!.className,
        pwned: (window as any).pwned,
        errorShown: (el.querySelector('[slot="error"]') as HTMLElement).style.display !== 'none',
      };
    });
    expect(state).toEqual({
      codes: ['VALUE_NOT_ALLOWED'],
      node: null,
      boxClass: '',
      pwned: undefined,
      errorShown: true,
    });
  });

  test('scripts loaded before the markup: the intent still runs, and an empty element says so', async ({
    page,
  }) => {
    await page.goto('/examples/intent-element/scripts-first.html');
    await page.waitForTimeout(300);
    const state = await page.evaluate(() => ({
      log: (window as any).lseLog,
      box: document.getElementById('box')!.className,
    }));
    expect(state.box).toBe('ran');
    expect(state.log).toEqual(['lse:validated:', 'lse:executed:', 'lse:error:NO_INTENT']);
  });

  test('runs on upstream _hyperscript as the host', async ({ page, baseURL }) => {
    const intent = {
      kind: 'event-handler',
      action: 'on',
      roles: { event: { type: 'literal', value: 'click' } },
      body: [
        { action: 'get', roles: { source: { type: 'expression', raw: '1 + 2' } } },
        {
          action: 'put',
          roles: {
            patient: { type: 'expression', raw: "it + ' ' + event.type + ' ' + me.id" },
            destination: { type: 'selector', value: '#out' },
          },
        },
      ],
    };
    // A page of its own (a fresh window: no engine global), scripts ahead of the markup.
    await page.route('**/lse-intent-upstream.html', route =>
      route.fulfill({
        contentType: 'text/html',
        body: `<!DOCTYPE html><html><head>
      <script src="/node_modules/hyperscript.org/dist/_hyperscript.min.js"></script>
      <script src="/packages/semantic/dist/browser-en.en.global.js"></script>
      <script src="/packages/intent-element/dist/intent-element.iife.global.js"></script>
      </head><body><div id="out"></div>
      <lse-intent id="chain"><script type="application/lse+json">${JSON.stringify(intent)}</script>
      <button>go</button></lse-intent></body></html>`,
      })
    );
    await page.goto(`${baseURL}/lse-intent-upstream.html`);
    await page.waitForFunction(() => customElements.get('lse-intent') !== undefined);
    const host = await page.evaluate(() => ({
      upstream: typeof (window as any)._hyperscript?.evaluate,
      engine: typeof (window as any).hyperfixi,
    }));
    expect(host).toEqual({ upstream: 'function', engine: 'undefined' });
    await page.waitForTimeout(200);
    await page.click('#chain button');
    await expect(page.locator('#out')).toHaveText('3 click chain');
  });

  test('console has no uncaught errors from intent-element', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', err => errors.push(err.message));
    await page.goto(DEMO_URL);
    await page.waitForTimeout(500);

    // Filter out known non-intent-element errors if any
    const intentErrors = errors.filter(
      e => e.includes('lse') || e.includes('intent') || e.includes('evalLSE')
    );
    expect(intentErrors).toHaveLength(0);
  });
});
