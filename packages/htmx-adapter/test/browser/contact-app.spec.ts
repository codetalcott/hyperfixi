/**
 * The book's Contact.app (Hypermedia Systems, ch10) authored with localized
 * attribute names, driven by REAL stock htmx 4.0.0. Covers the attributes the
 * basic fixtures never touch — hx-delete, hx-confirm, hx-push-url, hx-post,
 * hx-boost, hx-indicator, hx-include — whose names come from core's
 * hand-authored `scripts/htmx-attr-vocab.mjs`, not the semantic profile.
 *
 * Each assertion is on htmx's BEHAVIOR (the verb on the wire, the dialog
 * text, the included parameter), not on the canonical sibling existing: a
 * sibling htmx ignores would satisfy an attribute check and prove nothing.
 */
import { test, expect, type Request } from '@playwright/test';

const FIXTURES = '/packages/htmx-adapter/test/browser/fixtures';

const CASES = [
  { lang: 'ja', confirmText: 'この連絡先を削除しますか？', query: '田中' },
  { lang: 'es', confirmText: '¿Eliminar este contacto?', query: 'García' },
  { lang: 'pt', confirmText: 'Excluir este contato?', query: 'Conceição' },
  { lang: 'ko', confirmText: '이 연락처를 삭제할까요?', query: '김민준' },
];

for (const { lang, confirmText, query } of CASES) {
  test.describe(`Contact.app attributes in ${lang} (htmx 4.0.0)`, () => {
    test.beforeEach(async ({ page }) => {
      await page.route('**/api/**', route =>
        route.fulfill({
          status: 200,
          contentType: 'text/html',
          body: `<b id="done">${route.request().method()}</b>`,
        })
      );
    });

    test('delete asks the localized confirm, then sends DELETE and pushes the URL @smoke', async ({
      page,
    }) => {
      await page.goto(`${FIXTURES}/v4-contact-app-${lang}.html`);
      const requests: Request[] = [];
      page.on('request', r => r.url().includes('/api/') && requests.push(r));

      // Dismissed: the dialog carries the authored message and nothing is sent.
      page.once('dialog', d => {
        expect(d.message()).toBe(confirmText);
        void d.dismiss();
      });
      await page.click('#delete');
      await page.waitForTimeout(250);
      expect(requests).toHaveLength(0);

      page.once('dialog', d => void d.accept());
      await page.click('#delete');
      await expect(page.locator('#out #done')).toHaveText('DELETE');
      expect(requests.map(r => r.method())).toEqual(['DELETE']);
      await expect(page).toHaveURL(/\/contacts$/);
    });

    test('search includes the named input and flags the indicator while in flight', async ({
      page,
    }) => {
      let release: () => void = () => {};
      const held = new Promise<void>(resolve => (release = resolve));
      let url = '';
      await page.route('**/api/contacts**', async route => {
        url = route.request().url();
        await held;
        await route.fulfill({ status: 200, contentType: 'text/html', body: '<b id="done">ok</b>' });
      });
      await page.goto(`${FIXTURES}/v4-contact-app-${lang}.html`);

      await page.click('#search');
      await expect(page.locator('#spinner')).toHaveClass(/htmx-request/);
      release();
      await expect(page.locator('#out #done')).toHaveText('ok');
      await expect(page.locator('#spinner')).not.toHaveClass(/htmx-request/);
      // A <button> GET sends nothing on its own — `q` is there only via hx-include.
      expect(new URL(url).searchParams.get('q')).toBe(query);
    });

    test('post sends POST', async ({ page }) => {
      await page.goto(`${FIXTURES}/v4-contact-app-${lang}.html`);
      await page.click('#create');
      await expect(page.locator('#out #done')).toHaveText('POST');
    });

    test('inherited boost fetches the link through htmx; the opt-out navigates', async ({
      page,
    }) => {
      await page.goto(`${FIXTURES}/v4-contact-app-${lang}.html`);
      const [boosted] = await Promise.all([
        page.waitForRequest('**/api/page2'),
        page.click('#boosted'),
      ]);
      expect(boosted.headers()['hx-request']).toBe('true');

      await page.goto(`${FIXTURES}/v4-contact-app-${lang}.html`);
      const [plain] = await Promise.all([
        page.waitForRequest('**/api/download'),
        page.click('#unboosted'),
      ]);
      expect(plain.headers()['hx-request']).toBeUndefined();
      expect(plain.isNavigationRequest()).toBe(true);
    });
  });
}
