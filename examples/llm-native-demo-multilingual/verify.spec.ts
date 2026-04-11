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

test('canonical JSON is identical across all 5 languages (live-parsed)', async ({ page }) => {
  await page.goto(URL);
  await page.waitForTimeout(300); // semantic bundle is ~650KB, give it time to load

  const snapshots: string[] = [];
  for (const { code } of LANGUAGES) {
    await page.locator(`.lang-btn[data-lang="${code}"]`).click();
    await page.waitForTimeout(150);
    const json = await page.locator('#json-display').textContent();
    snapshots.push(json?.trim() ?? '');
  }

  // All 5 snapshots should be character-identical after canonical role ordering.
  // The demo normalizes role iteration order (patient before destination) in
  // its serializer; without that, ja/ko would emit destination first.
  const [first, ...rest] = snapshots;
  for (const s of rest) {
    expect(s).toBe(first);
  }
  expect(first).toContain('"action": "toggle"');
  expect(first).toContain('"patient"');
  expect(first).toContain('"destination"');
});

test('grammar label and pattern ID update per language', async ({ page }) => {
  await page.goto(URL);
  await page.waitForTimeout(300);

  // Expected: every language has a non-empty wordOrder and a pattern ID that
  // contains the language code. We don't hard-code the exact pattern names
  // because they're implementation details of the pattern generator and
  // could change; we just assert they update per language and look sensible.
  const observations: Array<{ code: string; wordOrder: string; pattern: string }> = [];

  for (const { code } of LANGUAGES) {
    await page.locator(`.lang-btn[data-lang="${code}"]`).click();
    await page.waitForTimeout(150);

    const wordOrder = (await page.locator('#grammar-order').textContent())?.trim() ?? '';
    const pattern = (await page.locator('#grammar-pattern').textContent())?.trim() ?? '';
    observations.push({ code, wordOrder, pattern });

    // wordOrder must be non-empty and recognizable
    expect(wordOrder, `${code} grammar order`).toMatch(/^(SVO|SOV|VSO|V2|OSV|VOS|OVS)$/);

    // pattern ID must exist (not "(no pattern diagnostic)" or "(parse failed)")
    expect(pattern, `${code} pattern ID`).not.toMatch(/^\(/);
    expect(pattern, `${code} pattern ID`).not.toBe('—');

    // pattern ID should contain the language code somewhere (e.g. toggle-event-ja-sov)
    // — except for English, which matches `event-en-standard` (a generic handler).
    expect(pattern, `${code} pattern contains lang code`).toContain(code);
  }

  // At least two different wordOrders should appear across the 5 languages
  // (we expect SVO for en/es and SOV for ja/ko and VSO for ar).
  const uniqueOrders = new Set(observations.map(o => o.wordOrder));
  expect(uniqueOrders.size, 'should see multiple distinct grammars').toBeGreaterThanOrEqual(2);
});
