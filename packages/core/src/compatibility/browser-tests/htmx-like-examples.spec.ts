/**
 * htmx-like Examples Live Tests
 *
 * These tests validate that the htmx-like example pages work correctly.
 * Each example serves as both documentation AND a live test.
 *
 * Examples tested:
 * 1. Swap & Morph - DOM swapping with state preservation
 * 2. View Transitions - Smooth CSS-powered transitions
 * 3. History Navigation - push url / replace url commands
 * 4. Multi-Target Swaps - Update multiple elements from single action
 * 5. Boosted Links - AJAX navigation patterns
 *
 * NOTE: Many tests are marked .fixme() because the underlying commands
 * (swap, morph, push url, replace url, process partials) are planned but
 * not yet fully implemented. These tests serve as a specification for
 * what behavior to expect once the commands are built.
 *
 * Tests that PASS now:
 * - Page loading without errors
 * - HyperFixi loads correctly
 * - Active class management (uses existing add/remove commands)
 * - Browser support check display
 *
 * Tests that need htmx-like commands implemented:
 * - swap command tests
 * - morph command tests
 * - push url tests
 * - replace url tests
 * - process partials tests
 */
import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:3000';

test.describe('htmx-like Examples Live Tests @comprehensive', () => {

  test.describe('01: Swap & Morph (01-swap-morph.html)', () => {

    // Test swap command - now registered in parser
    test('basic swap updates content', async ({ page }) => {
      await page.goto(`${BASE_URL}/examples/htmx-like/01-swap-morph.html`, {
        waitUntil: 'domcontentloaded',
        timeout: 10000
      });
      await page.waitForTimeout(500);

      // Get initial content
      const initialText = await page.textContent('#morph-target h3');
      expect(initialText).toContain('Original Content');

      // Click swap button (first "Swap innerHTML" button in #morph-target area)
      await page.click('#morph-target ~ div button:has-text("Swap innerHTML")');
      await page.waitForTimeout(300);

      // Content should be updated
      const updatedText = await page.textContent('#morph-target h3');
      expect(updatedText).toContain('Updated at');
    });

    // Test morphlex preserveChanges with name attribute on inputs
    test('morph preserves form input state', async ({ page }) => {
      await page.goto(`${BASE_URL}/examples/htmx-like/01-swap-morph.html`, {
        waitUntil: 'domcontentloaded',
        timeout: 10000
      });
      await page.waitForTimeout(500);

      // Type into the morph comparison input
      const morphInput = page.locator('#compare-morph input[type="text"]');
      await morphInput.fill('user typed text');
      await page.waitForTimeout(100);

      // Verify text was typed
      expect(await morphInput.inputValue()).toBe('user typed text');

      // Click morph button
      await page.click('button:has-text("Morph Content")');
      await page.waitForTimeout(300);

      // Input value should be preserved (morph preserves state)
      const preservedValue = await page.locator('#compare-morph input[type="text"]').inputValue();
      expect(preservedValue).toBe('user typed text');
    });

    // swap innerHTML is implemented
    test('innerHTML destroys form input state', async ({ page }) => {
      await page.goto(`${BASE_URL}/examples/htmx-like/01-swap-morph.html`, {
        waitUntil: 'domcontentloaded',
        timeout: 10000
      });
      await page.waitForTimeout(500);

      // Type into the innerHTML comparison input
      const innerHTMLInput = page.locator('#compare-innerhtml input[type="text"]');
      await innerHTMLInput.fill('will be lost');
      await page.waitForTimeout(100);

      // Verify text was typed
      expect(await innerHTMLInput.inputValue()).toBe('will be lost');

      // Click innerHTML swap button (in the #compare-innerhtml section specifically)
      await page.click('#compare-innerhtml button:has-text("Swap innerHTML")');
      await page.waitForTimeout(300);

      // Input value should be empty (innerHTML destroys state)
      const newValue = await page.locator('#compare-innerhtml input[type="text"]').inputValue();
      expect(newValue).toBe('');
    });

    // swap beforeEnd is implemented
    test('swap beforeEnd appends content', async ({ page }) => {
      await page.goto(`${BASE_URL}/examples/htmx-like/01-swap-morph.html`, {
        waitUntil: 'domcontentloaded',
        timeout: 10000
      });
      await page.waitForTimeout(500);

      // Count initial items in strategies list
      const initialItems = await page.locator('#strategies-list .card').count();
      expect(initialItems).toBe(0);

      // Click beforeEnd button to append
      await page.click('button:has-text("beforeEnd (append)")');
      await page.waitForTimeout(200);

      // Should have 1 item
      let itemCount = await page.locator('#strategies-list .card').count();
      expect(itemCount).toBe(1);

      // Click again
      await page.click('button:has-text("beforeEnd (append)")');
      await page.waitForTimeout(200);

      // Should have 2 items
      itemCount = await page.locator('#strategies-list .card').count();
      expect(itemCount).toBe(2);
    });

    // swap afterBegin is implemented
    test('swap afterBegin prepends content', async ({ page }) => {
      await page.goto(`${BASE_URL}/examples/htmx-like/01-swap-morph.html`, {
        waitUntil: 'domcontentloaded',
        timeout: 10000
      });
      await page.waitForTimeout(500);

      // First add an item at end
      await page.click('button:has-text("beforeEnd (append)")');
      await page.waitForTimeout(200);

      // Then add at beginning
      await page.click('button:has-text("afterBegin (prepend)")');
      await page.waitForTimeout(200);

      // First card should say "added at start"
      const firstCard = await page.locator('#strategies-list .card').first().textContent();
      expect(firstCard).toContain('added at start');
    });

    // swap delete is implemented
    test('swap delete removes elements', async ({ page }) => {
      await page.goto(`${BASE_URL}/examples/htmx-like/01-swap-morph.html`, {
        waitUntil: 'domcontentloaded',
        timeout: 10000
      });
      await page.waitForTimeout(500);

      // Should have 3 cards initially
      let cardCount = await page.locator('#delete-container .card').count();
      expect(cardCount).toBe(3);

      // Delete first card
      await page.click('#delete-1 button');
      await page.waitForTimeout(200);

      // Should have 2 cards
      cardCount = await page.locator('#delete-container .card').count();
      expect(cardCount).toBe(2);

      // Card 1 should no longer exist
      const card1Exists = await page.locator('#delete-1').count();
      expect(card1Exists).toBe(0);
    });
  });

  test.describe('02: View Transitions (02-view-transitions.html)', () => {

    // swap with view transition is implemented
    test('swap with transition updates content', async ({ page }) => {
      await page.goto(`${BASE_URL}/examples/htmx-like/02-view-transitions.html`, {
        waitUntil: 'domcontentloaded',
        timeout: 10000
      });
      await page.waitForTimeout(500);

      // Get initial content
      const initialText = await page.textContent('#vt-target h3');
      expect(initialText).toContain('Original Content');

      // Click swap with transition
      await page.click('button:has-text("Swap with Transition")');
      await page.waitForTimeout(800); // Allow for transition

      // Content should be updated
      const updatedText = await page.textContent('#vt-target h3');
      expect(updatedText).toContain('View Transition Demo');
    });

    // swap is implemented
    test('swap without transition updates instantly', async ({ page }) => {
      await page.goto(`${BASE_URL}/examples/htmx-like/02-view-transitions.html`, {
        waitUntil: 'domcontentloaded',
        timeout: 10000
      });
      await page.waitForTimeout(500);

      // Click swap without transition
      await page.click('button:has-text("Swap without Transition")');
      await page.waitForTimeout(300);

      // Content should be updated
      const updatedText = await page.textContent('#vt-target h3');
      expect(updatedText).toContain('No Transition');
    });

    // swap is implemented
    test('page navigation buttons work', async ({ page }) => {
      await page.goto(`${BASE_URL}/examples/htmx-like/02-view-transitions.html`, {
        waitUntil: 'domcontentloaded',
        timeout: 10000
      });
      await page.waitForTimeout(500);

      // Initial state - Home active
      let activeBtnText = await page.$eval('.page-nav button.active', el => el.textContent);
      expect(activeBtnText).toContain('Home');

      // Click About
      await page.click('#page-about');
      await page.waitForTimeout(500);

      // About should be active
      activeBtnText = await page.$eval('.page-nav button.active', el => el.textContent);
      expect(activeBtnText).toContain('About');

      // Content should show About page
      const pageContent = await page.textContent('#page-content h3');
      expect(pageContent).toContain('About Page');
    });

    test('browser support check displays correctly', async ({ page }) => {
      await page.goto(`${BASE_URL}/examples/htmx-like/02-view-transitions.html`, {
        waitUntil: 'domcontentloaded',
        timeout: 10000
      });
      await page.waitForTimeout(300);

      // Support check should show either supported or not supported
      const statusText = await page.textContent('#support-status');
      expect(statusText).toMatch(/View Transitions API (is supported|not supported)/);
    });
  });

  test.describe('03: History Navigation (03-history-navigation.html)', () => {

    // push url is implemented
    test('push url updates browser hash', async ({ page }) => {
      // Capture ALL console output for debugging
      const logs: string[] = [];
      page.on('console', msg => {
        logs.push(`[${msg.type()}] ${msg.text()}`);
      });
      page.on('pageerror', err => {
        logs.push(`[PAGE ERROR] ${err.message}`);
      });

      await page.goto(`${BASE_URL}/examples/htmx-like/03-history-navigation.html`, {
        waitUntil: 'domcontentloaded',
        timeout: 10000
      });
      await page.waitForTimeout(500);

      // Get URL before click
      const urlBefore = await page.evaluate(() => window.location.href);
      console.log('URL before click:', urlBefore);

      // Check page content and script loaded
      const hyperfixi = await page.evaluate(() => typeof (window as any).hyperfixi);
      console.log('hyperfixi loaded:', hyperfixi);

      // Try manually triggering pushState to verify it works
      await page.evaluate(() => {
        console.log('[TEST] Manual pushState test');
        window.history.pushState(null, '', '#/test');
      });
      const testUrl = await page.evaluate(() => window.location.href);
      console.log('URL after manual pushState:', testUrl);

      // Reset to original (go back)
      await page.evaluate(() => window.history.back());

      // Click Products nav
      await page.click('#nav-products');
      await page.waitForTimeout(1000);

      // Get URL after click
      const urlAfter = await page.evaluate(() => window.location.href);
      console.log('URL after click:', urlAfter);

      // Check if push was called at all by checking what last error was
      const lastError = await page.evaluate(() => (window as any).__lastError || 'none');
      console.log('Last error:', lastError);

      // Print captured logs for debugging
      console.log('=== CAPTURED CONSOLE LOGS ===');
      logs.forEach(log => console.log(log));
      console.log('=== END LOGS ===');

      // URL should contain the products path
      const url = page.url();
      console.log('Final URL:', url);
      expect(url).toContain('/fragments/products.html');

      // Click About nav
      await page.click('#nav-about');
      await page.waitForTimeout(500);

      // URL should contain the about path
      const newUrl = page.url();
      expect(newUrl).toContain('/fragments/about.html');
    });

    // swap is implemented
    test('navigation updates content', async ({ page }) => {
      await page.goto(`${BASE_URL}/examples/htmx-like/03-history-navigation.html`, {
        waitUntil: 'domcontentloaded',
        timeout: 10000
      });
      await page.waitForTimeout(500);

      // Initial content
      let content = await page.textContent('#history-content h3');
      expect(content).toContain('Home');

      // Navigate to Products
      await page.click('#nav-products');
      await page.waitForTimeout(500);

      // Content should update
      content = await page.textContent('#history-content h3');
      expect(content).toContain('Products');
    });

    test('active class moves with navigation', async ({ page }) => {
      await page.goto(`${BASE_URL}/examples/htmx-like/03-history-navigation.html`, {
        waitUntil: 'domcontentloaded',
        timeout: 10000
      });
      await page.waitForTimeout(500);

      // Home should be active initially
      let activeCount = await page.locator('.page-nav button.active').count();
      expect(activeCount).toBe(1);

      let activeText = await page.$eval('.page-nav button.active', el => el.textContent);
      expect(activeText).toContain('Home');

      // Click Products
      await page.click('#nav-products');
      await page.waitForTimeout(300);

      // Products should now be active
      activeCount = await page.locator('.page-nav button.active').count();
      expect(activeCount).toBe(1);

      activeText = await page.$eval('.page-nav button.active', el => el.textContent);
      expect(activeText).toContain('Products');
    });

    // replace url is implemented
    test('replace url changes URL without creating history', async ({ page }) => {
      await page.goto(`${BASE_URL}/examples/htmx-like/03-history-navigation.html`, {
        waitUntil: 'domcontentloaded',
        timeout: 10000
      });
      await page.waitForTimeout(500);

      // Click filter button (uses replace url)
      await page.click('button:has-text("Apply Filter (replace)")');
      await page.waitForTimeout(300);

      // URL should contain the filter path
      const url = page.url();
      expect(url).toContain('/fragments/filter.html');
    });
  });

  test.describe('04: Multi-Target Swaps (04-multi-target-swaps.html)', () => {

    // swap is implemented
    test('explicit multi-swap updates all panels', async ({ page }) => {
      await page.goto(`${BASE_URL}/examples/htmx-like/04-multi-target-swaps.html`, {
        waitUntil: 'domcontentloaded',
        timeout: 10000
      });
      await page.waitForTimeout(500);

      // Get initial content
      const initialMain = await page.textContent('#main-content h3');
      expect(initialMain).toContain('Welcome');

      // Click update all panels
      await page.click('button:has-text("Update All Panels")');
      await page.waitForTimeout(500);

      // All panels should be updated
      const mainContent = await page.textContent('#main-content h3');
      expect(mainContent).toContain('Main Content Updated');

      const sidebarContent = await page.textContent('#sidebar-content h3');
      expect(sidebarContent).toContain('Sidebar Updated');

      const statsContent = await page.textContent('#stats-content h3');
      expect(statsContent).toContain('Stats');

      const notifContent = await page.textContent('#notifications-content h3');
      expect(notifContent).toContain('New Notification');
    });

    // Tests multiple swap commands (process partials pattern)
    test('process partials updates multiple targets', async ({ page }) => {
      await page.goto(`${BASE_URL}/examples/htmx-like/04-multi-target-swaps.html`, {
        waitUntil: 'domcontentloaded',
        timeout: 10000
      });
      await page.waitForTimeout(500);

      // Get initial partial content
      const initialPartial = await page.textContent('#partial-main h3');
      expect(initialPartial).toContain('Waiting for partial');

      // Click process partials
      await page.click('button:has-text("Process Partials Response")');
      await page.waitForTimeout(500);

      // Partials should be updated
      const mainPartial = await page.textContent('#partial-main h3');
      expect(mainPartial).toContain('Main Area (from partial)');

      const counterPartial = await page.textContent('#partial-counter h3');
      expect(counterPartial).toContain('Counter');
    });

    // Tests beforeEnd swap strategy
    test('beforeEnd strategy appends to alerts', async ({ page }) => {
      await page.goto(`${BASE_URL}/examples/htmx-like/04-multi-target-swaps.html`, {
        waitUntil: 'domcontentloaded',
        timeout: 10000
      });
      await page.waitForTimeout(500);

      // Click process partials multiple times
      await page.click('button:has-text("Process Partials Response")');
      await page.waitForTimeout(300);
      await page.click('button:has-text("Process Partials Response")');
      await page.waitForTimeout(300);

      // Should have multiple alert cards (beforeEnd appends) - note: cards only have class "card"
      const alertCards = await page.locator('#partial-alert .card').count();
      expect(alertCards).toBeGreaterThanOrEqual(2);
    });

    // swap is implemented
    test('dashboard refresh updates stats', async ({ page }) => {
      await page.goto(`${BASE_URL}/examples/htmx-like/04-multi-target-swaps.html`, {
        waitUntil: 'domcontentloaded',
        timeout: 10000
      });
      await page.waitForTimeout(500);

      // Initial stats show ---
      const initialUsers = await page.textContent('#dash-users .stat-value');
      expect(initialUsers?.trim()).toBe('---');

      // Click refresh dashboard
      await page.click('button:has-text("Refresh Dashboard")');
      await page.waitForTimeout(800); // Has 500ms wait + swap time

      // Stats should now have numbers
      const updatedUsers = await page.textContent('#dash-users .stat-value');
      expect(updatedUsers?.trim()).not.toBe('---');
      expect(parseInt(updatedUsers?.trim() || '0')).toBeGreaterThan(0);
    });
  });

  test.describe('05: Boosted Links (05-boosted-links.html)', () => {

    // swap and push url are implemented
    test('boosted nav links update content without reload', async ({ page }) => {
      await page.goto(`${BASE_URL}/examples/htmx-like/05-boosted-links.html`, {
        waitUntil: 'domcontentloaded',
        timeout: 10000
      });
      await page.waitForTimeout(500);

      // Initial content
      let content = await page.textContent('#boosted-content h3');
      expect(content).toContain('Home Page');

      // Click Products link
      await page.click('#boosted-nav a[href="#/products"]');
      await page.waitForTimeout(600); // Has 300ms wait

      // Content should update
      content = await page.textContent('#boosted-content h3');
      expect(content).toContain('Products Page');

      // URL should change
      const url = page.url();
      expect(url).toContain('#/products');
    });

    test('boosted nav updates active class', async ({ page }) => {
      await page.goto(`${BASE_URL}/examples/htmx-like/05-boosted-links.html`, {
        waitUntil: 'domcontentloaded',
        timeout: 10000
      });
      await page.waitForTimeout(500);

      // Home should be active initially
      let activeLink = await page.$eval('#boosted-nav a.active', el => el.textContent);
      expect(activeLink).toContain('Home');

      // Click About
      await page.click('#boosted-nav a[href="#/about"]');
      await page.waitForTimeout(500);

      // About should be active now
      activeLink = await page.$eval('#boosted-nav a.active', el => el.textContent);
      expect(activeLink).toContain('About');

      // Should have exactly 1 active link
      const activeCount = await page.locator('#boosted-nav a.active').count();
      expect(activeCount).toBe(1);
    });

    // swap and replace url are implemented
    test('boosted form submission works', async ({ page }) => {
      await page.goto(`${BASE_URL}/examples/htmx-like/05-boosted-links.html`, {
        waitUntil: 'domcontentloaded',
        timeout: 10000
      });
      await page.waitForTimeout(500);

      // Type search query
      await page.fill('#search-input', 'test query');
      await page.waitForTimeout(100);

      // Submit form
      await page.click('#search-form button[type="submit"]');
      await page.waitForTimeout(800); // Has 500ms wait

      // Results should show
      const results = await page.textContent('#search-results h3');
      expect(results).toContain('Search Results');

      // Query should be in results
      const resultText = await page.textContent('#search-results');
      expect(resultText).toContain('test query');
    });

    // swap is implemented
    test('empty search shows error message', async ({ page }) => {
      await page.goto(`${BASE_URL}/examples/htmx-like/05-boosted-links.html`, {
        waitUntil: 'domcontentloaded',
        timeout: 10000
      });
      await page.waitForTimeout(500);

      // Submit empty form
      await page.click('#search-form button[type="submit"]');
      await page.waitForTimeout(300);

      // Should show error
      const errorText = await page.textContent('#search-results');
      expect(errorText).toContain('Please enter a search term');
    });

    // swap and replace url are implemented
    test('search updates URL with query params', async ({ page }) => {
      await page.goto(`${BASE_URL}/examples/htmx-like/05-boosted-links.html`, {
        waitUntil: 'domcontentloaded',
        timeout: 10000
      });
      await page.waitForTimeout(500);

      // Type and submit search (use term without spaces to avoid encoding issues)
      await page.fill('#search-input', 'mysearch');
      await page.click('#search-form button[type="submit"]');
      await page.waitForTimeout(800);

      // URL should contain search query
      const url = page.url();
      expect(url).toContain('#/search?q=');
      expect(url).toContain('mysearch');
    });
  });

  test.describe('Cross-Example Consistency', () => {

    test('all examples load without JavaScript errors', async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', err => {
        errors.push(err.message);
      });

      const examples = [
        '01-swap-morph.html',
        '02-view-transitions.html',
        '03-history-navigation.html',
        '04-multi-target-swaps.html',
        '05-boosted-links.html'
      ];

      for (const example of examples) {
        await page.goto(`${BASE_URL}/examples/htmx-like/${example}`, {
          waitUntil: 'domcontentloaded',
          timeout: 10000
        });
        await page.waitForTimeout(500);
      }

      // Should have no JavaScript errors
      expect(errors.length).toBe(0);
    });

    test('HyperFixi loads on all examples', async ({ page }) => {
      const examples = [
        '01-swap-morph.html',
        '02-view-transitions.html',
        '03-history-navigation.html',
        '04-multi-target-swaps.html',
        '05-boosted-links.html'
      ];

      for (const example of examples) {
        await page.goto(`${BASE_URL}/examples/htmx-like/${example}`, {
          waitUntil: 'domcontentloaded',
          timeout: 10000
        });
        await page.waitForTimeout(500);

        // Check that HyperFixi is loaded
        const hyperFixiLoaded = await page.evaluate(() => {
          return typeof (window as any)._hyperscript !== 'undefined' ||
                 typeof (window as any).hyperFixi !== 'undefined';
        });

        expect(hyperFixiLoaded).toBe(true);
      }
    });
  });
});
