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

    // Wait for hyperscript:ready event
    await page.waitForFunction(() => {
      return (window as any).__hyperscriptReady === true;
    }, { timeout: 5000 }).catch(() => {
      // hyperscript:ready may not set this flag, just wait a bit
    });

    // Give time for scripts to execute
    await page.waitForTimeout(500);

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
    await page.waitForTimeout(500);

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
    expect(Math.abs(finalBox!.x - initialBox!.x)).toBeGreaterThan(50);
  });

  test('Removable behavior should remove element on click', async ({ page }) => {
    await page.goto('/examples/behaviors/demo.html');
    await page.waitForTimeout(500);

    // Get the first removable item (no confirmation)
    const removableItem = page.locator('.removable-item').first();
    await expect(removableItem).toBeVisible();

    // Click to remove
    await removableItem.click();

    // Should be removed from DOM
    await expect(removableItem).not.toBeVisible();
  });

  test('Accordion toggleable should expand/collapse', async ({ page }) => {
    await page.goto('/examples/behaviors/demo.html');
    await page.waitForTimeout(500);

    const accordionItem = page.locator('.accordion-item').first();
    const accordionContent = accordionItem.locator('.accordion-content');

    // Should not have 'expanded' class initially
    await expect(accordionItem).not.toHaveClass(/expanded/);

    // Click to expand
    await accordionItem.click();
    await expect(accordionItem).toHaveClass(/expanded/);

    // Click to collapse
    await accordionItem.click();
    await expect(accordionItem).not.toHaveClass(/expanded/);
  });
});
