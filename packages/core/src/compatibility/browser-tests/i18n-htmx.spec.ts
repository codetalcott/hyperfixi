/**
 * Playwright smoke test for Phase 8 localized htmx attributes.
 * Drives the multi-language fixtures in `examples/hx-v4-i18n/` to
 * confirm vocab-aware attribute resolution works end-to-end in a real
 * browser.
 *
 * Companion to `hx-v4-features.spec.ts`. Same loader pattern, different
 * fixture directory.
 */
import { test, expect, type Page } from '@playwright/test';
import { waitForHyperfixi } from './test-utils';

// Mirrors bundle-compatibility.spec.ts / hx-v4-features.spec.ts — env override
// lets the release-smoke `--matrix` stage point this spec at its ephemeral
// server (which serves the registry-installed @hyperfixi/core/{dist,vocab}/).
const BASE_URL = process.env.BASE_URL ?? 'http://127.0.0.1:3000';

async function loadDemo(page: Page, file: string): Promise<void> {
  await page.goto(`${BASE_URL}/examples/hx-v4-i18n/${file}`, {
    waitUntil: 'domcontentloaded',
    timeout: 10000,
  });
  await waitForHyperfixi(page);
  // Allow vocab modules + orchestrator + processor scan to settle.
  await page.waitForTimeout(200);
}

test.describe('hx-v4 localized htmx attributes @comprehensive', () => {
  test('multilang-page: each lang section issues its own localized fetch', async ({ page }) => {
    await loadDemo(page, 'multilang-page.html');

    // Spanish: hx-obtener wires to fetch (mocked to echo URL into target).
    await page.getByRole('button', { name: 'Cargar usuarios' }).click();
    await expect(page.locator('#out-es')).toHaveText(/Fetched: \/api\/usuarios/);

    // Japanese: hx-取得 wires the same way.
    await page.getByRole('button', { name: 'ユーザーを読み込む' }).click();
    await expect(page.locator('#out-ja')).toHaveText(/Fetched: \/api\/ユーザー/);

    // Arabic: hx-احصل (RTL).
    await page.getByRole('button', { name: 'تحميل المستخدمين' }).click();
    await expect(page.locator('#out-ar')).toHaveText(/Fetched: \/api\/مستخدمين/);

    // English: canonical hx-get keeps working.
    await page.getByRole('button', { name: 'Load users' }).click();
    await expect(page.locator('#out-en')).toHaveText(/Fetched: \/api\/users/);
  });

  test('live-multilang: localized hx-live re-renders all 3 counters from one shared var', async ({
    page,
  }) => {
    await loadDemo(page, 'live-multilang.html');

    // All three counters start at 0 (initial value before any clicks).
    // The hx-live expression `put $global_count or 0 into me` renders
    // 0 when the var is undefined.
    const esCounter = page.locator('section[lang="es"] .counter');
    const jaCounter = page.locator('section[lang="ja"] .counter');
    const arCounter = page.locator('section[lang="ar"] .counter');

    await expect(esCounter).toHaveText('0');
    await expect(jaCounter).toHaveText('0');
    await expect(arCounter).toHaveText('0');

    // Click +1 three times. Each click updates $global_count; all 3
    // localized hx-live counters re-render.
    const plus = page.getByRole('button', { name: '+1' });
    await plus.click();
    await plus.click();
    await plus.click();

    await expect(esCounter).toHaveText('3');
    await expect(jaCounter).toHaveText('3');
    await expect(arCounter).toHaveText('3');

    // reset zeros all three.
    await page.getByRole('button', { name: 'reset' }).click();
    await expect(esCounter).toHaveText('0');
    await expect(jaCounter).toHaveText('0');
    await expect(arCounter).toHaveText('0');
  });
});
