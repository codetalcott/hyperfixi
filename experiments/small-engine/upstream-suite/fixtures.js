// Fixtures for running upstream _hyperscript's Playwright suite against ANY engine bundle.
//
// This replaces upstream's `test/fixtures.js` (run.mjs copies it over the copied test tree).
// It differs from upstream's in three ways, all so that a different engine gets a fair run:
//   - the bundle comes from HS_BUNDLE instead of upstream's own build;
//   - each test navigates to a routed http page instead of `setContent` on about:blank
//     (hyperfixi.js cannot load on an opaque origin), which also gives every test a fresh engine;
//   - `html` awaits `processNode`, so an engine whose processing is async is not raced.
// Coverage instrumentation is dropped.
import { test as base, expect } from '@playwright/test';

const bundlePath = process.env.HS_BUNDLE;
const BLANK_PAGE = [
  '<!DOCTYPE html><html>',
  '<head><base href="http://localhost/"></head>',
  '<body><div id="work-area"></div></body>',
  '</html>',
].join('');

export { expect };

export const test = base.extend({
  _hsContext: [
    async ({ browser }, use) => {
      const context = await browser.newContext();
      await context.addInitScript({ path: bundlePath });
      await context.addInitScript(() => {
        window.promiseAnIntIn = ms => new Promise(r => setTimeout(() => r(42), ms));
        window.promiseValueBackIn = (val, ms) => new Promise(r => setTimeout(() => r(val), ms));
      });
      await use(context);
      await context.close();
    },
    { scope: 'worker' },
  ],

  _hsPage: [
    async ({ _hsContext }, use) => {
      const page = await _hsContext.newPage();
      await use(page);
      await page.close();
    },
    { scope: 'worker' },
  ],

  page: async ({ _hsPage }, use) => {
    await _hsPage.unrouteAll({ behavior: 'ignoreErrors' });
    await _hsPage.route('http://localhost/__blank', r =>
      r.fulfill({ contentType: 'text/html', body: BLANK_PAGE })
    );
    await _hsPage.goto('http://localhost/__blank');
    await _hsPage.waitForFunction(() => typeof _hyperscript !== 'undefined');
    await use(_hsPage);
  },

  html: async ({ page }, use) => {
    await use(async markup => {
      await page.evaluate(h => {
        const wa = document.getElementById('work-area');
        wa.innerHTML = h;
        return Promise.resolve(_hyperscript.processNode(wa)).then(() => undefined);
      }, markup);
    });
  },

  find: async ({ page }, use) => {
    await use(selector => page.locator(`#work-area ${selector}`));
  },

  run: async ({ page }, use) => {
    await use(async (src, ctx) =>
      page.evaluate(({ src, ctx }) => _hyperscript(src, ctx), { src, ctx })
    );
  },

  error: async ({ page }, use) => {
    await use(async src =>
      page.evaluate(async src => {
        try {
          await _hyperscript(src);
          return null;
        } catch (e) {
          return e.message;
        }
      }, src)
    );
  },

  evaluate: async ({ page }, use) => {
    await use((...args) => page.evaluate(...args));
  },

  mock: async ({ page }, use) => {
    await use(async (method, url, body, options = {}) => {
      const pattern = url.startsWith('*') ? url : `**${url}`;
      await page.route(pattern, async route => {
        const req = route.request();
        if (req.method() !== method.toUpperCase()) {
          await route.fallback();
          return;
        }
        await route.fulfill({
          status: options.status || 200,
          contentType: options.contentType || 'text/html',
          body: typeof body === 'string' ? body : JSON.stringify(body),
        });
      });
    });
  },
});
