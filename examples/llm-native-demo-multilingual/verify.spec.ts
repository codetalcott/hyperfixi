/**
 * Multilingual LSE demo — end-to-end verification.
 *
 * Loops over all 5 languages in `demo.html`, clicks the language button,
 * clicks the "Run the intent" button, and asserts that `#button` toggles its
 * `.active` class correctly. This exercises the full pipeline:
 *
 *   language picker → canonical protocol JSON → <lse-intent>.refresh()
 *   → trigger="click" wiring → evalLSENode → DOM mutation
 *
 * All 5 languages use the SAME canonical JSON (that's the demo's point), but
 * each click cycle independently re-initializes the element, so a failure in
 * any cycle indicates a real regression in the pipeline.
 *
 * To run: copy this file into packages/core/src/compatibility/browser-tests/
 * (which has the right Playwright baseURL configured) and run:
 *   cd packages/core && npx playwright test src/compatibility/browser-tests/llm-multilingual-demo.spec.ts
 */
import { test, expect } from '@playwright/test';

const URL = '/examples/llm-native-demo-multilingual/demo.html';

const LANGUAGES: Array<{ code: string; name: string }> = [
  { code: 'en', name: 'English' },
  { code: 'ja', name: '日本語' },
  { code: 'ar', name: 'العربية' },
  { code: 'es', name: 'Español' },
  { code: 'ko', name: '한국어' },
];

for (const { code, name } of LANGUAGES) {
  test(`${name} (${code}): click toggles #button.active`, async ({ page }) => {
    await page.goto(URL);
    await page.waitForTimeout(200);

    const targetButton = page.locator('#button');
    const langBtn = page.locator(`.lang-btn[data-lang="${code}"]`);
    const runBtn = page.locator('#lse-host button[slot="trigger"]');

    // Switch to the target language.
    await langBtn.click();
    await page.waitForTimeout(150); // let setLanguage + disabled-toggle + re-init settle

    // Baseline: targetButton is NOT active.
    await expect(targetButton).not.toHaveClass(/active/);

    // Fire the intent.
    await runBtn.click();
    await page.waitForTimeout(150);

    // #button SHOULD be active now (destination role honored, unwrap fix working).
    await expect(targetButton).toHaveClass(/active/);

    // Click again — should toggle off.
    await runBtn.click();
    await page.waitForTimeout(150);
    await expect(targetButton).not.toHaveClass(/active/);
  });
}

test('canonical JSON is identical across all 5 languages', async ({ page }) => {
  await page.goto(URL);
  await page.waitForTimeout(200);

  const snapshots: string[] = [];
  for (const { code } of LANGUAGES) {
    await page.locator(`.lang-btn[data-lang="${code}"]`).click();
    await page.waitForTimeout(100);
    const json = await page.locator('#json-display').textContent();
    snapshots.push(json?.trim() ?? '');
  }

  // All 5 snapshots should be character-identical — that's the demo's whole point.
  const [first, ...rest] = snapshots;
  for (const s of rest) {
    expect(s).toBe(first);
  }
  // Sanity: the canonical JSON should at least mention the action.
  expect(first).toContain('"action": "toggle"');
  expect(first).toContain('"patient"');
  expect(first).toContain('"destination"');
});
