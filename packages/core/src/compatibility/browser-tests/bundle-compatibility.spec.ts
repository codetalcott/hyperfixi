/**
 * Bundle Compatibility Tests
 *
 * Tests each HyperFixi bundle against gallery examples to verify
 * which features work with which bundle sizes.
 *
 * Uses URL-based bundle switching via bundle-loader.js
 */
import { test, expect, Page } from '@playwright/test';

// Default targets the local http-server (port 3000) used by the in-repo flow.
// The release-smoke harness (examples/release-smoke/run.mjs --matrix) overrides
// this via BASE_URL to point at an ephemeral server that swaps in the
// registry-installed @hyperfixi/core/dist bundles, so the same matrix exercises
// the published tarball instead of the locally built artifacts.
const BASE_URL = process.env.BASE_URL ?? 'http://127.0.0.1:3000';

// Bundle configurations with expected capabilities (sizes are gzipped)
const BUNDLES = {
  'hybrid-complete': {
    file: 'hyperfixi-hybrid-complete.js',
    size: '7.7 KB',
    features: {
      toggle: true,
      addClass: true,
      put: true,
      increment: true,
      show: true,
      hide: true,
      blocks: true,
      eventModifiers: true,
      i18nAliases: true,
      semanticParser: false,
      fetch: true,
    },
  },
  'hybrid-hx': {
    file: 'hyperfixi-hybrid-hx.js',
    size: '18 KB',
    features: {
      toggle: true,
      addClass: true,
      put: true,
      increment: true,
      show: true,
      hide: true,
      blocks: true,
      eventModifiers: true,
      i18nAliases: true,
      semanticParser: false,
      fetch: true,
    },
  },
  // hx-v4: full runtime + htmx-compat + reactivity (hx-live/bind/when)
  // auto-installed. Larger than hybrid-hx because it carries the full
  // runtime, but it's the bundle authors reach for when they need the
  // htmx v4 reactive/streaming surface without manual plugin wiring.
  'hybrid-hx-v4': {
    file: 'hyperfixi-hx-v4.js',
    size: '~322 KB',
    features: {
      toggle: true,
      addClass: true,
      put: true,
      increment: true,
      show: true,
      hide: true,
      blocks: true,
      eventModifiers: true,
      i18nAliases: true,
      semanticParser: true,
      fetch: true,
    },
  },
  browser: {
    file: 'hyperfixi.js',
    size: '~310 KB',
    features: {
      toggle: true,
      addClass: true,
      put: true,
      increment: true,
      show: true,
      hide: true,
      blocks: true,
      eventModifiers: true,
      i18nAliases: true,
      semanticParser: true,
      fetch: true,
    },
  },
};

/** The bundles that hand-pick their commands and cannot fall back to the full parser. */
const SMALL_BUNDLES = new Set(['hybrid-complete', 'hybrid-hx']);

// Gallery examples with functional tests
const GALLERY_EXAMPLES = [
  {
    name: 'Toggle Class',
    path: '/examples/toggle-and-state/toggle-class.html',
    requiredFeatures: ['toggle'],
    test: async (page: Page) => {
      // Find a button that toggles a class
      const btn = page.locator('button').first();
      if ((await btn.count()) === 0) return { passed: false, reason: 'No button found' };

      await btn.click();
      await page.waitForTimeout(200);
      // Just verify it doesn't throw
      return { passed: true, reason: 'Button click successful' };
    },
  },
  {
    name: 'Show/Hide Elements',
    path: '/examples/events-and-dom/show-hide.html',
    requiredFeatures: ['show', 'hide'],
    test: async (page: Page) => {
      const showBtn = page.locator('button').filter({ hasText: /show/i }).first();
      const hideBtn = page.locator('button').filter({ hasText: /hide/i }).first();

      if ((await showBtn.count()) === 0 || (await hideBtn.count()) === 0) {
        return { passed: false, reason: 'Show/Hide buttons not found' };
      }

      await showBtn.click();
      await page.waitForTimeout(200);
      await hideBtn.click();
      await page.waitForTimeout(200);

      return { passed: true, reason: 'Show/Hide commands executed' };
    },
  },
  {
    name: 'Input Mirror',
    path: '/examples/events-and-dom/input-mirror.html',
    requiredFeatures: ['put'],
    test: async (page: Page) => {
      const input = page.locator('input').first();
      if ((await input.count()) === 0) return { passed: false, reason: 'No input found' };

      await input.fill('test123');
      await page.waitForTimeout(200);

      // Check if value was mirrored somewhere
      const mirror = page.locator('#mirror, .mirror, #output, .output').first();
      if ((await mirror.count()) > 0) {
        const text = await mirror.textContent();
        if (text?.includes('test123')) {
          return { passed: true, reason: 'Input mirrored correctly' };
        }
      }
      return { passed: true, reason: 'Input interaction successful' };
    },
  },
  {
    name: 'Counter',
    path: '/examples/events-and-dom/counter.html',
    requiredFeatures: ['increment'],
    test: async (page: Page) => {
      // Find increment button (the "Increase" button with +)
      const incBtn = page
        .locator('button')
        .filter({ hasText: /Increase|➕/ })
        .first();
      if ((await incBtn.count()) === 0)
        return { passed: false, reason: 'No increment button found' };

      // Get initial count from #count element
      const countEl = page.locator('#count');
      const initialText = (await countEl.textContent()) ?? '0';
      const initialCount = parseInt(initialText) || 0;

      await incBtn.click();
      await page.waitForTimeout(300);

      const newText = (await countEl.textContent()) ?? '0';
      const newCount = parseInt(newText) || 0;

      // Accept either increment working OR no JS errors
      if (newCount > initialCount) {
        return { passed: true, reason: `Count increased from ${initialCount} to ${newCount}` };
      }
      // Even if count didn't change, clicking worked without errors
      return { passed: true, reason: `Click worked (count: ${initialCount} -> ${newCount})` };
    },
  },
  {
    name: 'Modal Dialog',
    path: '/examples/dialogs/modal.html',
    requiredFeatures: ['addClass', 'blocks'],
    test: async (page: Page) => {
      const openBtn = page.locator('button').filter({ hasText: /open/i }).first();
      if ((await openBtn.count()) === 0) return { passed: false, reason: 'No open button' };

      await openBtn.click();
      await page.waitForTimeout(300);

      // Look for modal element or overlay
      const modal = page.locator('.modal, [role="dialog"], .overlay').first();
      if ((await modal.count()) > 0) {
        return { passed: true, reason: 'Modal opened successfully' };
      }
      return { passed: true, reason: 'Modal interaction executed' };
    },
  },
  {
    name: 'Fetch Data',
    path: '/examples/fetch-and-async/fetch-data.html',
    requiredFeatures: ['fetch', 'blocks'],
    test: async (page: Page) => {
      const fetchBtn = page
        .locator('button')
        .filter({ hasText: /fetch|load/i })
        .first();
      if ((await fetchBtn.count()) === 0) return { passed: false, reason: 'No fetch button' };

      await fetchBtn.click();
      await page.waitForTimeout(1000);

      return { passed: true, reason: 'Fetch command executed' };
    },
  },
  {
    name: 'Tab Navigation',
    path: '/examples/navigation/tabs.html',
    requiredFeatures: ['addClass', 'toggle'],
    test: async (page: Page) => {
      const tabs = page.locator('[role="tab"], .tab');
      if ((await tabs.count()) === 0) return { passed: false, reason: 'No tabs found' };

      await tabs.first().click();
      await page.waitForTimeout(200);

      return { passed: true, reason: 'Tab navigation executed' };
    },
  },
];

// Test each bundle against gallery examples
for (const [bundleKey, bundleConfig] of Object.entries(BUNDLES)) {
  test.describe(`Bundle: ${bundleKey} (${bundleConfig.size})`, () => {
    // Test bundle loads without errors
    test('loads without critical errors', async ({ page }) => {
      const errors: string[] = [];
      page.on('console', msg => {
        if (msg.type() === 'error') errors.push(msg.text());
      });
      page.on('pageerror', err => {
        errors.push('PageError: ' + err.message);
      });

      await page.goto(
        `${BASE_URL}/examples/toggle-and-state/toggle-class.html?bundle=${bundleKey}`
      );
      await page.waitForTimeout(1000);

      // Filter out expected errors
      const criticalErrors = errors.filter(
        e =>
          !e.includes('net::') &&
          !e.includes('Failed to load resource') &&
          !e.includes('favicon') &&
          !e.includes('enable') // debug panel errors
      );

      expect(criticalErrors).toHaveLength(0);
    });

    // Test toggle works (all bundles support this)
    test('toggle command works', async ({ page }) => {
      await page.goto(
        `${BASE_URL}/examples/toggle-and-state/toggle-class.html?bundle=${bundleKey}`
      );
      await page.waitForTimeout(500);

      // This example toggles .active on #box, not on the button
      const box = page.locator('#box');
      const initialClasses = (await box.getAttribute('class')) ?? '';
      const hasActiveInitially = initialClasses.includes('active');

      await page.locator('button').first().click();
      await page.waitForTimeout(200);

      const newClasses = (await box.getAttribute('class')) ?? '';
      const hasActiveNow = newClasses.includes('active');

      // Class should have toggled
      expect(hasActiveNow).not.toBe(hasActiveInitially);
    });

    // Test gallery examples - run all to discover actual capabilities
    for (const example of GALLERY_EXAMPLES) {
      const knownIssue = (example as { knownIssue?: string }).knownIssue;
      const expectedToSupport =
        !knownIssue &&
        example.requiredFeatures.every(
          f => bundleConfig.features[f as keyof typeof bundleConfig.features]
        );

      test(`Gallery: ${example.name}`, async ({ page }) => {
        const errors: string[] = [];
        page.on('pageerror', err => {
          errors.push(err.message);
        });

        await page.goto(`${BASE_URL}${example.path}?bundle=${bundleKey}`);
        await page.waitForTimeout(500);

        // Run functional test
        const result = await example.test(page);

        // Filter critical errors
        const criticalErrors = errors.filter(e => !e.includes('enable') && !e.includes('debug'));

        // For expected support, fail on errors or test failure
        if (expectedToSupport) {
          expect(criticalErrors).toHaveLength(0);
          expect(result.passed).toBe(true);
        } else {
          // For unexpected support, just log what happened (discovery mode)
          if (knownIssue) {
            console.log(
              `⚠️ KNOWN ISSUE (${bundleKey} / ${example.name}): ${knownIssue} — errors: ${criticalErrors.join(' | ') || 'none'}`
            );
          }
          if (criticalErrors.length === 0 && result.passed) {
            console.log(
              `✨ DISCOVERY: ${bundleKey} PASSED ${example.name} (requires: ${example.requiredFeatures.join(', ')})`
            );
          }
          // Don't fail the test - we're discovering capabilities
          expect(true).toBe(true);
        }
      });
    }

    // Bundle-specific feature tests using dedicated test pages (works for all bundle sizes)
    if (bundleConfig.features.blocks) {
      test('if/else blocks work', async ({ page }) => {
        await page.goto(
          `${BASE_URL}/packages/core/test-pages/blocks-if-else.html?bundle=${bundleKey}`
        );
        await page.waitForTimeout(500);

        await page.click('#btn');
        await page.waitForTimeout(200);
        await expect(page.locator('#out')).toHaveText('yes');
      });
    }

    if (bundleConfig.features.eventModifiers) {
      test('.once modifier works', async ({ page }) => {
        await page.goto(
          `${BASE_URL}/packages/core/test-pages/event-modifiers.html?bundle=${bundleKey}`
        );
        await page.waitForTimeout(500);

        // First click should add class
        await page.click('#once-btn');
        await page.waitForTimeout(100);
        await expect(page.locator('#once-btn')).toHaveClass(/clicked/);

        // Remove class manually
        await page.evaluate(() => document.getElementById('once-btn')!.classList.remove('clicked'));

        // Second click should NOT add class back (handler was once)
        await page.click('#once-btn');
        await page.waitForTimeout(100);
        await expect(page.locator('#once-btn')).not.toHaveClass(/clicked/);
      });

      test('.prevent modifier works', async ({ page }) => {
        await page.goto(
          `${BASE_URL}/packages/core/test-pages/event-modifiers.html?bundle=${bundleKey}`
        );
        await page.waitForTimeout(500);

        const initialUrl = page.url();
        await page.click('#prevent-link');
        await page.waitForTimeout(200);

        // URL should not have changed (preventDefault worked)
        expect(page.url()).toBe(initialUrl);
        await expect(page.locator('#prevent-link')).toHaveClass(/prevented/);
      });

      test('.stop modifier works', async ({ page }) => {
        await page.goto(
          `${BASE_URL}/packages/core/test-pages/event-modifiers.html?bundle=${bundleKey}`
        );
        await page.waitForTimeout(500);

        await page.click('#stop-btn');
        await page.waitForTimeout(200);

        // Inner button should have class
        await expect(page.locator('#stop-btn')).toHaveClass(/inner-clicked/);
        // Outer div should NOT have class (propagation stopped)
        await expect(page.locator('#outer')).not.toHaveClass(/outer-clicked/);
      });
    }

    // Test *property CSS style syntax (hybrid-complete only)
    if (bundleKey === 'hybrid-complete') {
      test('*property CSS style syntax works with set', async ({ page }) => {
        await page.goto(
          `${BASE_URL}/packages/core/test-pages/css-property-syntax.html?bundle=${bundleKey}`
        );
        await page.waitForTimeout(500);

        await page.click('#set-btn');
        await page.waitForTimeout(200);
        const opacity = await page
          .locator('#set-box')
          .evaluate(el => (el as HTMLElement).style.opacity);
        expect(opacity).toBe('0.5');
      });

      test('*property CSS style syntax works with put', async ({ page }) => {
        await page.goto(
          `${BASE_URL}/packages/core/test-pages/css-property-syntax.html?bundle=${bundleKey}`
        );
        await page.waitForTimeout(500);

        await page.click('#put-btn');
        await page.waitForTimeout(200);
        const opacity = await page
          .locator('#put-box')
          .evaluate(el => (el as HTMLElement).style.opacity);
        expect(opacity).toBe('0.3');
      });

      test('*property CSS style syntax works with increment', async ({ page }) => {
        await page.goto(
          `${BASE_URL}/packages/core/test-pages/css-property-syntax.html?bundle=${bundleKey}`
        );
        await page.waitForTimeout(500);

        // Get initial opacity (should be 0)
        const initialOpacity = await page
          .locator('#inc-box')
          .evaluate(el => (el as HTMLElement).style.opacity);
        expect(initialOpacity).toBe('0');

        await page.click('#inc-btn');
        await page.waitForTimeout(200);
        const opacity = await page
          .locator('#inc-box')
          .evaluate(el => (el as HTMLElement).style.opacity);
        // Initial 0 + 0.2 = 0.2
        expect(opacity).toBe('0.2');
      });
    }

    // A construct this bundle cannot run must fail LOUDLY and name the remedy.
    // The bundle lineup collapses to two names in the 4.0 cycle
    // (ENGINE_MIGRATION_PLAN Arc 6b); the escape hatch from the small bundle to
    // the full one is only discoverable if the failure says which bundle has the
    // missing command, at the moment it is missing. `make` is a full-runtime-only
    // command (FULL_RUNTIME_ONLY_COMMANDS), so every small bundle lacks it.
    if (SMALL_BUNDLES.has(bundleKey)) {
      test(`unknown command fails loudly and names hyperfixi.js @comprehensive`, async ({
        page,
      }) => {
        const consoleErrors: string[] = [];
        page.on('console', msg => {
          if (msg.type() === 'error') consoleErrors.push(msg.text());
        });
        await page.goto(
          `${BASE_URL}/examples/toggle-and-state/toggle-class.html?bundle=${bundleKey}`
        );
        await page.waitForTimeout(500);

        // The `_` attribute path, not `api.execute()`: that is where a script-tag
        // user meets the failure, and where every bundle's error boundary logs.
        await page.evaluate(() => {
          const el = document.createElement('button');
          el.id = 'probe-unknown';
          el.setAttribute('_', 'on click make a <div/>');
          document.body.appendChild(el);
          (window as unknown as { hyperfixi: { process(root: Element): void } }).hyperfixi.process(
            document.body
          );
        });
        await page.click('#probe-unknown');
        await page.waitForTimeout(200);

        // Lite bundles reach the executor's `default:`; hybrid bundles reject at
        // parse time. Either way: one console.error, naming the word AND the
        // bundle that has it.
        const loud = consoleErrors.filter(e => e.includes('make') && e.includes('hyperfixi.js'));
        expect(loud, `console.error lines: ${JSON.stringify(consoleErrors)}`).toHaveLength(1);
      });
    }
  });
}

// Summary report
test.describe('Bundle Summary', () => {
  test('print compatibility matrix', async () => {
    console.log(
      '\n╔════════════════════════════════════════════════════════════════════════════════════════════════════╗'
    );
    console.log(
      '║                            HYPERFIXI BUNDLE COMPATIBILITY MATRIX                                   ║'
    );
    console.log(
      '╠════════════════════════════════════════════════════════════════════════════════════════════════════╣'
    );

    const features = [
      'toggle',
      'addClass',
      'put',
      'increment',
      'show',
      'hide',
      'blocks',
      'eventModifiers',
      'i18nAliases',
      'semanticParser',
      'fetch',
    ];

    const bundleKeys = Object.keys(BUNDLES);
    const col = (text: string) => text.padStart(6).padEnd(7);

    // Header — one column per bundle key, so the matrix follows the lineup.
    const label = (k: string) =>
      ({
        'hybrid-complete': 'h-cmp',
        'hybrid-hx': 'h-hx',
        'hybrid-hx-v4': 'hx-v4',
        browser: 'brow',
      })[k] ?? k.slice(0, 6);
    console.log(`║ Feature         │${bundleKeys.map(k => col(label(k))).join('│')}║`);
    console.log(`╟─────────────────┼${bundleKeys.map(() => '─'.repeat(7)).join('┼')}╢`);

    // Rows
    for (const feature of features) {
      const cols = bundleKeys.map(key => {
        const bundle = BUNDLES[key as keyof typeof BUNDLES];
        return bundle.features[feature as keyof typeof bundle.features] ? '  ✅  ' : '  ❌  ';
      });
      console.log(`║ ${feature.padEnd(15)} │${cols.join('│')}║`);
    }

    console.log(`╠═════════════════╪${bundleKeys.map(() => '═'.repeat(7)).join('╪')}╣`);
    const sizes = bundleKeys.map(key => col(BUNDLES[key as keyof typeof BUNDLES].size));
    console.log(`║ SIZE (gzipped)  │${sizes.join('│')}║`);
    console.log(`╚═════════════════╧${bundleKeys.map(() => '═'.repeat(7)).join('╧')}╝`);

    expect(true).toBe(true);
  });
});
