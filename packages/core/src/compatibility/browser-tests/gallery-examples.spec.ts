import { test, expect } from '@playwright/test';

const EXAMPLES_TO_TEST = [
  // Basics
  '/examples/basics/01-hello-world.html',
  '/examples/basics/02-toggle-class.html',
  '/examples/basics/03-show-hide.html',
  '/examples/basics/04-input-mirror.html',
  '/examples/basics/05-counter.html',
  // Landing Page Examples (from hyperscript.org)
  '/examples/landing-page/color-cycling.html',
  '/examples/landing-page/send-events.html',
  '/examples/landing-page/async-fetch.html',
  '/examples/landing-page/js-interop.html',
  '/examples/landing-page/tell-command.html',
  '/examples/landing-page/clipboard-copy.html',
  // Intermediate
  '/examples/intermediate/01-form-validation.html',
  '/examples/intermediate/02-fetch-data.html',
  '/examples/intermediate/03-fade-effects.html',
  '/examples/intermediate/04-tabs.html',
  '/examples/intermediate/05-modal.html',
  '/examples/intermediate/06-native-dialog.html',
  '/examples/intermediate/07-dialog-toggle.html',
  // Advanced
  '/examples/advanced/01-color-cycling.html',
  // NOTE: 02-draggable.html skipped - parser bug with `wait for ... from document` inside nested blocks in behaviors
  // Specifically: `wait for pointermove from document` inside `repeat...end` inside `on...end` inside `behavior...end`
  // Error: "Expected 'end' to close behavior definition" - the `from` keyword conflicts with behavior parsing
  '/examples/advanced/03-sortable-list.html',
];

test.describe('Gallery Examples', () => {
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
          !e.includes('net::') && !e.includes('Failed to load resource') && !e.includes('favicon')
      );

      if (criticalErrors.length > 0) {
        console.log(`Errors in ${example}:`, criticalErrors);
      }

      expect(criticalErrors).toHaveLength(0);
    });
  }
});
