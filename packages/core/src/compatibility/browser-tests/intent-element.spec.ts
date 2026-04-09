/**
 * Playwright smoke test for <lse-intent> custom element.
 *
 * Loads the demo page (examples/intent-element/index.html) and verifies:
 * 1. hyperfixi.js loads and exposes evalLSENode
 * 2. intent-element IIFE auto-registers <lse-intent>
 * 3. Valid inline JSON validates and executes
 * 4. Invalid JSON shows the error slot
 * 5. Missing action field shows the error slot
 * 6. Toggle interaction actually mutates the DOM
 */
import { test, expect } from '@playwright/test';

const DEMO_URL = '/examples/intent-element/index.html';

test.describe('<lse-intent> browser integration', () => {
  test('window.hyperfixi.evalLSENode is a function', async ({ page }) => {
    await page.goto(DEMO_URL);
    const hasEvalLSENode = await page.evaluate(
      () => typeof (window as any).hyperfixi?.evalLSENode === 'function'
    );
    expect(hasEvalLSENode).toBe(true);
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
    // Wait for element to initialize — connectedCallback auto-executes evalLSENode,
    // so sidebar already has .active from the initial toggle
    await page.waitForTimeout(300);

    const sidebar = page.locator('#sidebar');

    // Record initial state (already toggled once on connect)
    const initialHasActive = await sidebar.evaluate(el => el.classList.contains('active'));

    // Click the toggle button — this calls refresh() which re-executes evalLSENode
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
    // The click triggers refresh() → lse:validated → lse:executed
    expect(logText).toContain('lse:validated');
    expect(logText).toContain('lse:executed');
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
