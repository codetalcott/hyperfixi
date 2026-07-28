/**
 * Real-browser arbitration for the shipped-examples execution gate —
 * baseline families 1 (element-target writes) and 2 (show/hide strategy).
 *
 * The gate (packages/testing-framework/src/multilingual/shipped-examples-execution.ts)
 * diffs both engines under jsdom; for these two families jsdom itself was the
 * suspect. This spec loads the same shapes in real Chrome against each engine
 * (fixtures/execution-arbitration.html?engine=hyperfixi|upstream), performs the
 * same trigger, and reports the OBSERVED outcome per engine — element survival
 * and text for family 1, computed display (visibility) for family 2.
 *
 * It asserts only harness sanity (engine loaded, probe elements present);
 * the per-probe observations are printed as JSON for human arbitration. See
 * docs-internal/HANDOFF-shipped-examples-execution.md for the verdicts this
 * produced.
 *
 * Run (from packages/core):
 *   npx playwright test --project=debug execution-arbitration
 */
import { test, expect, type Page } from '@playwright/test';

const FIXTURE =
  '/packages/core/src/compatibility/browser-tests/debug/fixtures/execution-arbitration.html';

interface ElementObservation {
  exists: boolean;
  text?: string;
  computedDisplay?: string;
  classes?: string[];
  inlineStyle?: string;
  parentHTML?: string;
}

async function observe(
  page: Page,
  selector: string,
  parentOf?: string
): Promise<ElementObservation> {
  return page.evaluate(
    ({ sel, parentSel }) => {
      const el = document.querySelector(sel);
      if (!el) {
        const parent = parentSel ? document.querySelector(parentSel) : null;
        return {
          exists: false,
          parentHTML: parent
            ? parent.innerHTML.replace(/\s+/g, ' ').trim().slice(0, 200)
            : undefined,
        };
      }
      return {
        exists: true,
        text: (el.textContent ?? '').trim().slice(0, 80),
        computedDisplay: getComputedStyle(el).display,
        classes: Array.from(el.classList),
        inlineStyle: el.getAttribute('style') ?? '',
      };
    },
    { sel: selector, parentSel: parentOf }
  );
}

async function loadFixture(page: Page, engine: 'hyperfixi' | 'upstream'): Promise<void> {
  await page.goto(`${FIXTURE}?engine=${engine}`);
  // Both engines process `_` attributes at DOMContentLoaded; give them a beat.
  await page.waitForTimeout(400);
  const loaded = await page.evaluate(() => ({
    hyperfixi: typeof (window as never as Record<string, unknown>).hyperfixi !== 'undefined',
    upstream: typeof (window as never as Record<string, unknown>)._hyperscript !== 'undefined',
  }));
  expect(
    loaded[engine === 'upstream' ? 'upstream' : 'hyperfixi'],
    `${engine} engine global present`
  ).toBe(true);
}

async function runProbes(page: Page, engine: 'hyperfixi' | 'upstream') {
  const results: Record<string, unknown> = { engine };

  // ---- Family 1: element-target writes ----
  await loadFixture(page, engine);
  await page.click('#b-inc');
  await page.waitForTimeout(100);
  results['f1a increment #count1 (was "0")'] = await observe(page, '#count1', 'body');

  await page.click('#b-dec');
  await page.waitForTimeout(100);
  results['f1b decrement #count2 (was "5")'] = await observe(page, '#count2', 'body');

  await page.click('#b-set');
  await page.waitForTimeout(100);
  results['f1c set #count3 to 0 (was "5")'] = await observe(page, '#count3', 'body');

  // ---- Family 2: show/hide ----
  // Fresh page per probe group so earlier probes cannot contaminate.
  await loadFixture(page, engine);
  await page.click('#b-show-modal');
  await page.waitForTimeout(100);
  results['f2a show #modal (stylesheet-hidden, .show CSS rule)'] = await observe(page, '#modal');

  await page.click('#b-hide-modal');
  await page.waitForTimeout(100);
  results['f2a2 then hide #modal'] = await observe(page, '#modal');

  await page.click('#b-show-inline');
  await page.waitForTimeout(100);
  results['f2b show #inline-hidden (inline display:none)'] = await observe(page, '#inline-hidden');

  await page.click('#b-show-vis');
  await page.waitForTimeout(100);
  results['f2c show #vis-box (already visible)'] = await observe(page, '#vis-box');

  await page.click('#b-hide-vis');
  await page.waitForTimeout(100);
  results['f2c2 then hide #vis-box'] = await observe(page, '#vis-box');

  await loadFixture(page, engine);
  await page.click('#tab2');
  await page.waitForTimeout(100);
  results['f2d tabs: click Tab 2 → #panel1'] = await observe(page, '#panel1');
  results['f2d tabs: click Tab 2 → #panel2'] = await observe(page, '#panel2');

  await loadFixture(page, engine);
  // "code" appears in q1 only; recipes.html filtered-show shape.
  await page.locator('#quote-search').pressSequentially('code');
  await page.waitForTimeout(150);
  results['f2e filtered show → #q1 (matches "code")'] = await observe(page, '#q1');
  results['f2e filtered show → #q2 (no match)'] = await observe(page, '#q2');
  results['f2e filtered show → input itself'] = await observe(page, '#quote-search');

  // ---- Family 4 (bonus): boolean-attribute toggle ----
  await loadFixture(page, engine);
  await page.click('#b-toggle-disabled');
  await page.waitForTimeout(100);
  results['f4 toggle @disabled → #target-btn'] = await page.evaluate(() => {
    const el = document.querySelector('#target-btn') as HTMLButtonElement;
    return {
      hasAttr: el.hasAttribute('disabled'),
      attrValue: el.getAttribute('disabled'),
      disabledProp: el.disabled,
    };
  });

  return results;
}

test.describe('execution-gate arbitration: hyperfixi vs upstream in real Chrome', () => {
  test('hyperfixi observations', async ({ page }) => {
    const results = await runProbes(page, 'hyperfixi');
    console.log('\n===== HYPERFIXI (real Chrome) =====\n' + JSON.stringify(results, null, 2));
  });

  test('upstream observations', async ({ page }) => {
    const results = await runProbes(page, 'upstream');
    console.log('\n===== UPSTREAM (real Chrome) =====\n' + JSON.stringify(results, null, 2));
  });
});
