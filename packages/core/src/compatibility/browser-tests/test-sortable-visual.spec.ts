import { test, expect } from '@playwright/test';

// Skip: debugging test with outdated expectations - sortable-reorder.spec.ts tests actual functionality
test.skip('Sortable visual tracking test', async ({ page }) => {
  // Enable console logging
  page.on('console', msg => {
    if (
      msg.text().includes('📍') ||
      msg.text().includes('📐') ||
      msg.text().includes('✅') ||
      msg.text().includes('✨')
    ) {
      console.log(`Browser: ${msg.text()}`);
    }
  });

  page.on('pageerror', err => {
    console.error('Page error:', err.message);
  });

  // Navigate to test page
  await page.goto('http://127.0.0.1:3000/packages/core/sortable-behavior-final.html');
  await page.waitForLoadState('networkidle');

  console.log('\n=== TESTING SORTABLE VISUAL TRACKING ===\n');

  // Get the first sortable item
  const firstItem = page.locator('.sortable-item').first();
  const initialBox = await firstItem.boundingBox();

  if (!initialBox) {
    throw new Error('Could not get bounding box for first item');
  }

  console.log('Initial position:', { x: initialBox.x, y: initialBox.y });

  // Start drag
  await page.mouse.move(initialBox.x + initialBox.width / 2, initialBox.y + initialBox.height / 2);
  await page.mouse.down();

  await page.waitForTimeout(100);

  // Check if position: fixed was applied
  const hasFixedPosition = await firstItem.evaluate(el => {
    return window.getComputedStyle(el).position === 'fixed';
  });
  console.log('Has position: fixed during drag:', hasFixedPosition);

  // Check if width was preserved
  const widthStyle = await firstItem.evaluate(el => {
    return el.style.width;
  });
  console.log('Width style during drag:', widthStyle);

  // Move mouse down significantly (100px)
  const newY = initialBox.y + initialBox.height / 2 + 100;
  await page.mouse.move(initialBox.x + initialBox.width / 2, newY);
  await page.waitForTimeout(100);

  // Check if element followed cursor
  const duringDragBox = await firstItem.boundingBox();
  console.log('Position during drag:', { x: duringDragBox?.x, y: duringDragBox?.y });
  console.log('Expected Y position:', newY - initialBox.height / 2);
  console.log('Actual Y position:', duringDragBox?.y);

  // Release mouse
  await page.mouse.up();
  await page.waitForTimeout(200);

  // Check if position: fixed was removed
  const hasFixedPositionAfter = await firstItem.evaluate(el => {
    return window.getComputedStyle(el).position === 'fixed';
  });
  console.log('Has position: fixed after release:', hasFixedPositionAfter);

  // Check if position styles were cleaned up
  const positionStyle = await firstItem.evaluate(el => {
    return el.style.position;
  });
  console.log('Position style after release:', positionStyle);

  console.log('\n=== TEST COMPLETE ===\n');

  // Assertions
  expect(hasFixedPosition).toBe(true); // Should have fixed position during drag
  expect(hasFixedPositionAfter).toBe(false); // Should not have fixed position after release
  expect(duringDragBox?.y).toBeGreaterThan(initialBox.y); // Element should have moved down
  expect(positionStyle).toBe(''); // Position style should be cleared
});
