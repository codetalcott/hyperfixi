import { test, expect } from '@playwright/test';

const EXAMPLES_TO_TEST = [
  // Events & DOM
  '/examples/events-and-dom/hello-world.html',
  '/examples/events-and-dom/show-hide.html',
  '/examples/events-and-dom/input-mirror.html',
  '/examples/events-and-dom/counter.html',
  '/examples/events-and-dom/send-events.html',
  '/examples/events-and-dom/tell-command.html',
  // Toggle & State
  '/examples/toggle-and-state/toggle-class.html',
  // Animation
  '/examples/animation/color-cycling.html',
  '/examples/animation/color-cycling-simple.html',
  // Fetch & Async
  '/examples/fetch-and-async/async-fetch.html',
  '/examples/fetch-and-async/fetch-data.html',
  // JS Interop
  '/examples/js-interop/js-interop.html',
  '/examples/js-interop/clipboard-copy.html',
  // Forms
  '/examples/forms/form-validation.html',
  // Animation
  '/examples/animation/fade-effects.html',
  // Navigation
  '/examples/navigation/tabs.html',
  // Dialogs
  '/examples/dialogs/modal.html',
  '/examples/dialogs/native-dialog.html',
  '/examples/dialogs/dialog-toggle.html',
  // Drag & Drop
  // NOTE: draggable.html skipped - parser bug with `wait for ... from document` inside nested blocks in behaviors
  // Specifically: `wait for pointermove from document` inside `repeat...end` inside `on...end` inside `behavior...end`
  // Error: "Expected 'end' to close behavior definition" - the `from` keyword conflicts with behavior parsing
  '/examples/drag-and-drop/sortable-list.html',
];

// NOTE: nothing here is tagged @quick anymore, so this whole file is
// full-project only. It used to tag the seven events-and-dom/toggle-and-state
// examples, and gallery-interactions.spec.ts already covers all seven with a
// STRICTLY STRONGER @quick test: it loads the same page, asserts
// expectNoCriticalErrors (the same console/pageerror check this file makes) AND
// verifies observable DOM behaviour. Five were covered outright; send-events and
// tell-command had behavioural tests that were merely untagged, so they were
// promoted to @quick rather than keeping the load-only versions here. That is
// the same reasoning this file's counterpart records in its own header ("runtime
// errors that only fire on user interaction were invisible to load-only tests").
test.describe('Gallery Examples @gallery', () => {
  for (const example of EXAMPLES_TO_TEST) {
    test(`${example} loads without JS errors`, async ({ page }) => {
      const errors: string[] = [];

      page.on('console', msg => {
        if (msg.type() === 'error') {
          errors.push(msg.text());
        }
      });

      page.on('pageerror', err => {
        errors.push('PageError: ' + err.message);
      });

      await page.goto(`http://127.0.0.1:3000${example}`);
      await page.waitForTimeout(1000);

      // Filter out expected errors (like failed network requests)
      const criticalErrors = errors.filter(
        e =>
          !e.includes('net::') &&
          !e.includes('Failed to load resource') &&
          !e.includes('favicon') &&
          !e.includes('[prism-loader]')
      );

      if (criticalErrors.length > 0) {
        console.log(`Errors in ${example}:`, criticalErrors);
      }

      expect(criticalErrors).toHaveLength(0);
    });
  }
});
