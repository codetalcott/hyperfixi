import { test, expect } from '@playwright/test';

// Skip: debugging test with outdated expectations - sortable-reorder.spec.ts tests actual functionality
test.skip('Sortable interactive drag test', async ({ page }) => {
  // Enable console logging
  page.on('console', msg => {
    console.log(`Browser: ${msg.text()}`);
  });

  page.on('pageerror', err => {
    console.error('Page error:', err.message);
  });

  // Navigate to test page
  await page.goto('http://127.0.0.1:3000/packages/core/sortable-behavior-final.html');
  await page.waitForLoadState('networkidle');

  console.log('\n=== TESTING SORTABLE DRAG ===\n');

  // Get the first sortable item
  const firstItem = page.locator('.sortable-item').first();
  const box = await firstItem.boundingBox();

  if (!box) {
    throw new Error('Could not get bounding box for first item');
  }

  console.log('First item position:', { x: box.x, y: box.y });

  // Perform a real drag operation
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();

  console.log('Mouse down at:', { x: box.x + box.width / 2, y: box.y + box.height / 2 });

  // Wait a bit
  await page.waitForTimeout(100);

  // Check if dragging class was added
  const hasDraggingAfterDown = await firstItem.evaluate(el => el.classList.contains('dragging'));
  console.log('Has dragging class after mouse down:', hasDraggingAfterDown);

  // Move mouse down (drag)
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2 + 100);
  console.log('Moved mouse to:', { x: box.x + box.width / 2, y: box.y + box.height / 2 + 100 });

  await page.waitForTimeout(200);

  // Release mouse
  await page.mouse.up();
  console.log('Mouse up');

  await page.waitForTimeout(200);

  // Check if dragging class was removed
  const hasDraggingAfterUp = await firstItem.evaluate(el => el.classList.contains('dragging'));
  console.log('Has dragging class after mouse up:', hasDraggingAfterUp);

  console.log('\n=== TEST COMPLETE ===\n');

  // Test should pass if we got this far without errors
  expect(hasDraggingAfterDown).toBe(true); // Should have dragging class during drag
  expect(hasDraggingAfterUp).toBe(false); // Should not have dragging class after release
});
