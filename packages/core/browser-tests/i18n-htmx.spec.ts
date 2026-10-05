/**
 * Playwright smoke test for the localized pages in `examples/hx-v4-i18n/`, which since
 * 2026-10-03 run on the engine beside upstream libraries: multilang-page.html on REAL htmx 4
 * with `@lokascript/htmx-adapter` canonicalizing the localized attribute names
 * (`hx-obtener` → `hx-get`), live-multilang.html with three `live` blocks written in es /
 * ja / ar and translated by the lite hyperscript adapter as the engine reads them.
 *
 * Companion to `hx-v4-features.spec.ts`. Same loader pattern, different fixture directory.
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
  // Allow the adapter's sweep, htmx's init and the engine's first live run to settle.
  await page.waitForTimeout(200);
}

test.describe('localized htmx attributes and live blocks on the engine @comprehensive', () => {
  test('multilang-page: each lang section issues its own localized fetch', async ({ page }) => {
    await loadDemo(page, 'multilang-page.html');

    // Spanish: hx-obtener is canonicalized to hx-get; htmx fetches (mocked to echo the URL).
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

  test('live-multilang: live blocks in three languages re-render from one shared var', async ({
    page,
  }) => {
    await loadDemo(page, 'live-multilang.html');

    // All three counters start at 0: each block is `live put $global_count or 0 into me`
    // in its language, and renders 0 while the variable is undefined.
    const esCounter = page.locator('section[lang="es"] .counter');
    const jaCounter = page.locator('section[lang="ja"] .counter');
    const arCounter = page.locator('section[lang="ar"] .counter');

    await expect(esCounter).toHaveText('0');
    await expect(jaCounter).toHaveText('0');
    await expect(arCounter).toHaveText('0');

    // Click +1 three times. Each click updates $global_count; all three live blocks re-run.
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
