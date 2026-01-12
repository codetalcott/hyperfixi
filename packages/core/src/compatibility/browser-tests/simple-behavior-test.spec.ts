import { test, expect } from '@playwright/test';

test('simple toggle test: click button should add active class', async ({ page }) => {
  // Capture console errors
  const errors: string[] = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
    console.log('[' + msg.type() + ']', msg.text());
  });
  page.on('pageerror', error => {
    errors.push(error.message);
    console.log('PAGE ERROR:', error.message);
  });

  await page.goto('/examples/behaviors/demo.html');

  // Wait for hyperscript to initialize
  await page.waitForFunction(() => (window as any)._hyperscript?.behaviors !== undefined, { timeout: 10000 });
  await page.waitForTimeout(1000); // Extra time for behaviors to install

  // Check if behavior was installed
  const behaviorInstalled = await page.evaluate(() => {
    const btn = document.querySelector('.toggle-button');
    if (!btn) return 'Button not found';

    // Check if hyperfixi processed this element
    const hf = (window as any)._hyperscript;
    if (!hf?.behaviors?.has('Toggleable')) return 'Toggleable behavior not registered';

    return 'OK';
  });
  console.log('Behavior check:', behaviorInstalled);

  // Find the first toggle button
  const toggleButton = page.locator('.toggle-button').first();
  await expect(toggleButton).toBeVisible();

  // Check initial state
  const hasActiveBefore = await toggleButton.evaluate(el => el.classList.contains('active'));
  console.log('Has active before click:', hasActiveBefore);

  // Click the button
  await toggleButton.click();

  // Wait a bit for handler to run
  await page.waitForTimeout(500);

  // Check if there were any errors
  console.log('Errors:', errors);

  // Check state after click
  const hasActiveAfter = await toggleButton.evaluate(el => el.classList.contains('active'));
  console.log('Has active after click:', hasActiveAfter);

  expect(hasActiveAfter).toBe(true);
});

test('simple removable test: click should remove element', async ({ page }) => {
  await page.goto('/examples/behaviors/demo.html');

  // Wait for hyperscript to initialize
  await page.waitForFunction(() => (window as any)._hyperscript?.behaviors !== undefined, { timeout: 10000 });
  await page.waitForTimeout(1000);

  // Count removable items before
  const countBefore = await page.locator('.removable-item').count();
  console.log('Removable items before:', countBefore);

  // Get the first removable item (no confirmation) - use text content to be specific
  const removableItem = page.locator('.removable-item', { hasText: 'no confirmation' });
  await expect(removableItem).toBeVisible();

  // Click it
  await removableItem.click();

  // Wait for removal
  await page.waitForTimeout(500);

  // Count should decrease by 1
  const countAfter = await page.locator('.removable-item').count();
  console.log('Removable items after:', countAfter);

  // Should have one fewer item
  expect(countAfter).toBe(countBefore - 1);

  // The specific item should no longer exist
  await expect(removableItem).not.toBeVisible();
});

test('removable with confirmation: cancel should not remove', async ({ page }) => {
  // Capture console logs
  page.on('console', msg => {
    console.log('[browser]', msg.text());
  });

  await page.goto('/examples/behaviors/demo.html');

  // Wait for hyperscript to initialize
  await page.waitForFunction(() => (window as any)._hyperscript?.behaviors !== undefined, { timeout: 10000 });
  await page.waitForTimeout(1000);

  // Set up dialog handler to cancel
  let dialogAppeared = false;
  page.on('dialog', async dialog => {
    dialogAppeared = true;
    console.log('Dialog appeared:', dialog.message());
    await dialog.dismiss(); // Click "Cancel"
  });

  // Get the confirmation removable item
  const confirmItem = page.locator('.removable-item', { hasText: 'with confirmation' });
  console.log('Looking for confirmation item...');

  // Debug: list all removable items
  const allItems = await page.locator('.removable-item').allTextContents();
  console.log('All removable items:', allItems);

  await expect(confirmItem).toBeVisible();

  // Click it - should show confirm dialog, which we'll cancel
  await confirmItem.click();
  await page.waitForTimeout(500);

  console.log('Dialog appeared:', dialogAppeared);

  // Item should still be visible because we cancelled
  await expect(confirmItem).toBeVisible();
});

test('removable with confirmation: accept should remove', async ({ page }) => {
  await page.goto('/examples/behaviors/demo.html');

  // Wait for hyperscript to initialize
  await page.waitForFunction(() => (window as any)._hyperscript?.behaviors !== undefined, { timeout: 10000 });
  await page.waitForTimeout(1000);

  // Set up dialog handler to accept
  page.on('dialog', async dialog => {
    console.log('Dialog appeared:', dialog.message());
    await dialog.accept(); // Click "OK"
  });

  // Get the confirmation removable item
  const confirmItem = page.locator('.removable-item', { hasText: 'with confirmation' });
  await expect(confirmItem).toBeVisible();

  // Click it - should show confirm dialog, which we'll accept
  await confirmItem.click();
  await page.waitForTimeout(500);

  // Item should be removed because we accepted
  await expect(confirmItem).not.toBeVisible();
});
