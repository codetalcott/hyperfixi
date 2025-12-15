import { test, expect } from '@playwright/test';

/**
 * Tests for the behaviors demo page
 */
test.describe('Behaviors Demo', () => {
  test('should load without console errors and behaviors should work', async ({ page }) => {
    const consoleErrors: string[] = [];

    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto('/examples/behaviors/demo.html');

    // Wait for init to complete (check debug log)
    await page.waitForFunction(() => {
      const dbg = (window as any).__hyperfixi_debug || [];
      return dbg.includes('init() completed');
    }, { timeout: 10000 });

    // Give a bit more time for event handlers to be set up
    await page.waitForTimeout(200);

    // Check no console errors
    expect(consoleErrors.filter(e => !e.includes('favicon'))).toEqual([]);

    // Test Draggable - verify element exists and can be interacted with
    const draggableBox = page.locator('.draggable-box');
    await expect(draggableBox).toBeVisible();

    // Get initial position
    const initialBox = await draggableBox.boundingBox();
    expect(initialBox).not.toBeNull();

    // Test Toggleable - click the toggle button
    const toggleButton = page.locator('.toggle-button').first();
    await expect(toggleButton).toBeVisible();

    // Should not have 'active' class initially
    await expect(toggleButton).not.toHaveClass(/active/);

    // Click to toggle
    await toggleButton.click();

    // Should now have 'active' class
    await expect(toggleButton).toHaveClass(/active/);

    // Click again to toggle off
    await toggleButton.click();
    await expect(toggleButton).not.toHaveClass(/active/);

    // Test Sortable - verify list exists
    const sortableList = page.locator('.sortable-list');
    await expect(sortableList).toBeVisible();

    // Verify items exist
    const sortableItems = sortableList.locator('li');
    await expect(sortableItems).toHaveCount(5);

    // Test Resizable - verify element exists
    const resizableBox = page.locator('.resizable-box');
    await expect(resizableBox).toBeVisible();
  });

  test('Draggable behavior should move element on drag', async ({ page }) => {
    await page.goto('/examples/behaviors/demo.html');
    await page.waitForFunction(() => {
      const dbg = (window as any).__hyperfixi_debug || [];
      return dbg.includes('init() completed');
    }, { timeout: 10000 });

    const draggableBox = page.locator('.draggable-box');
    const initialBox = await draggableBox.boundingBox();
    expect(initialBox).not.toBeNull();

    // Perform drag
    await draggableBox.hover();
    await page.mouse.down();
    await page.mouse.move(initialBox!.x + 100, initialBox!.y + 50);
    await page.mouse.up();

    // Check position changed
    const finalBox = await draggableBox.boundingBox();
    expect(finalBox).not.toBeNull();

    // Position should have changed (allow some tolerance)
    // Note: actual movement may be less than mouse delta due to coordinate systems
    expect(Math.abs(finalBox!.x - initialBox!.x)).toBeGreaterThan(20);
  });

  test('Removable behavior should remove element on click', async ({ page }) => {
    await page.goto('/examples/behaviors/demo.html');
    await page.waitForFunction(() => {
      const dbg = (window as any).__hyperfixi_debug || [];
      return dbg.includes('init() completed');
    }, { timeout: 10000 });

    // Get all removable items
    const allItems = await page.locator('.removable-item').all();
    expect(allItems.length).toBe(3);

    // First item should have no confirmation - verify by checking attribute
    const firstAttr = await page.locator('.removable-item').first().getAttribute('_');
    expect(firstAttr).toBe('install Removable');

    // Click to remove (first item has no confirmation dialog)
    await page.locator('.removable-item').first().click();
    await page.waitForTimeout(500); // Wait for removal

    // Should now have 2 items
    const remainingItems = await page.locator('.removable-item').all();
    expect(remainingItems.length).toBe(2);
  });

  test('Accordion toggleable should expand/collapse', async ({ page }) => {
    await page.goto('/examples/behaviors/demo.html');
    await page.waitForFunction(() => {
      const dbg = (window as any).__hyperfixi_debug || [];
      return dbg.includes('init() completed');
    }, { timeout: 10000 });

    const accordionItem = page.locator('.accordion-item').first();

    // Should not have 'active' class initially (Toggleable uses 'active' by default)
    await expect(accordionItem).not.toHaveClass(/active/);

    // Click to expand
    await accordionItem.click();
    await expect(accordionItem).toHaveClass(/active/);

    // Click to collapse
    await accordionItem.click();
    await expect(accordionItem).not.toHaveClass(/active/);
  });
});
