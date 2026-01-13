import { test, expect } from '@playwright/test';

test('Sortable diagnostic - check if behavior is working', async ({ page }) => {
  // Enable console logging
  const consoleMessages: string[] = [];
  const errors: string[] = [];

  page.on('console', msg => {
    consoleMessages.push(`${msg.type()}: ${msg.text()}`);
    console.log(`Browser console: ${msg.text()}`);
  });

  page.on('pageerror', err => {
    errors.push(err.message);
    console.error('Page error:', err.message);
  });

  // Navigate to test page
  await page.goto('http://127.0.0.1:3000/packages/core/sortable-behavior-final.html');

  // Wait for page to load
  await page.waitForLoadState('networkidle');

  console.log('\n=== DIAGNOSTIC REPORT ===\n');

  // Check if HyperFixi loaded
  const hyperFixiLoaded = await page.evaluate(() => {
    return typeof (window as any).hyperfixi !== 'undefined';
  });
  console.log('1. HyperFixi loaded:', hyperFixiLoaded);

  // Check if behavior is installed
  const behaviorInstalled = await page.evaluate(() => {
    const list = document.getElementById('todo-list');
    if (!list) return { found: false, reason: 'List element not found' };

    // Check if _hyperscript attribute exists
    const hasAttribute = list.hasAttribute('_');

    // Check if behavior is in runtime
    const runtime = (window as any).hyperfixi?.runtime;
    if (!runtime) return { found: false, reason: 'Runtime not found', hasAttribute };

    return { found: true, hasAttribute, runtime: typeof runtime };
  });
  console.log('2. Behavior installation:', JSON.stringify(behaviorInstalled, null, 2));

  // Check if sortable items exist
  const items = await page.locator('.sortable-item').count();
  console.log('3. Sortable items found:', items);

  // Try to interact with first item
  if (items > 0) {
    const firstItem = page.locator('.sortable-item').first();
    const box = await firstItem.boundingBox();
    console.log('4. First item bounding box:', box);

    // Try to trigger pointerdown
    if (box) {
      console.log('\n5. Attempting to trigger pointerdown...');
      await firstItem.dispatchEvent('pointerdown', {
        clientX: box.x + box.width / 2,
        clientY: box.y + box.height / 2,
        button: 0,
      });

      // Wait a bit and check for any responses
      await page.waitForTimeout(500);

      // Check if dragging class was added
      const hasDragging = await firstItem.evaluate(el => el.classList.contains('dragging'));
      console.log('6. Dragging class added:', hasDragging);
    }
  }

  // Check for errors
  console.log('\n7. Errors detected:', errors.length);
  if (errors.length > 0) {
    console.log('Errors:', errors);
  }

  // Check console messages for clues
  const relevantMessages = consoleMessages.filter(
    msg =>
      msg.includes('HyperFixi') ||
      msg.includes('Sortable') ||
      msg.includes('behavior') ||
      msg.includes('ERROR') ||
      msg.includes('error')
  );
  console.log('\n8. Relevant console messages:');
  relevantMessages.forEach(msg => console.log('   -', msg));

  console.log('\n=== END DIAGNOSTIC ===\n');

  // Don't fail the test, just report
  expect(hyperFixiLoaded).toBe(true);
});
