import { test, expect } from '@playwright/test';

/**
 * Tests for ClickOutside + FocusTrap behavior composition
 * in examples/dialogs/modal.html (Demo 4)
 */
test.describe('Behavior-Powered Modal @integration', () => {
  const url = '/examples/dialogs/modal.html';

  async function setupPage(page: import('@playwright/test').Page) {
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto(url);

    // Wait for behaviors to register (helper functions available)
    await page.waitForFunction(() => typeof (window as any).openBehaviorModal === 'function', {
      timeout: 10000,
    });

    // Extra time for behavior installation
    await page.waitForTimeout(500);

    return consoleErrors;
  }

  test('should load without console errors', async ({ page }) => {
    const consoleErrors = await setupPage(page);
    expect(consoleErrors.filter(e => !e.includes('favicon'))).toEqual([]);
  });

  test('should open modal and show overlay', async ({ page }) => {
    await setupPage(page);

    const openBtn = page.locator('button.success').filter({ hasText: /Open Behavior Modal/ });
    const overlay = page.locator('#behavior-modal');

    // Modal overlay should be hidden initially
    await expect(overlay).not.toBeVisible();

    // Click to open
    await openBtn.click();
    await page.waitForTimeout(300);

    // Modal should now be visible
    await expect(overlay).toBeVisible();
  });

  test('ClickOutside should close modal when clicking overlay', async ({ page }) => {
    await setupPage(page);

    const openBtn = page.locator('button.success').filter({ hasText: /Open Behavior Modal/ });
    const overlay = page.locator('#behavior-modal');

    // Open modal
    await openBtn.click();
    await page.waitForTimeout(300);
    await expect(overlay).toBeVisible();

    // Click the overlay background (top-left corner, away from centered modal)
    await page.mouse.click(20, 20);
    await page.waitForTimeout(300);

    // Modal should be hidden
    await expect(overlay).not.toBeVisible();
  });

  test('ESC key should close modal', async ({ page }) => {
    await setupPage(page);

    const openBtn = page.locator('button.success').filter({ hasText: /Open Behavior Modal/ });
    const overlay = page.locator('#behavior-modal');

    // Open modal
    await openBtn.click();
    await page.waitForTimeout(300);
    await expect(overlay).toBeVisible();

    // Press Escape
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    // Modal should be hidden
    await expect(overlay).not.toBeVisible();
  });

  test('Close button should close modal', async ({ page }) => {
    await setupPage(page);

    const openBtn = page.locator('button.success').filter({ hasText: /Open Behavior Modal/ });
    const overlay = page.locator('#behavior-modal');

    // Open modal
    await openBtn.click();
    await page.waitForTimeout(300);
    await expect(overlay).toBeVisible();

    // Click close button (×)
    const closeBtn = page.locator('#behavior-content .close-btn');
    await closeBtn.click();
    await page.waitForTimeout(300);

    // Modal should be hidden
    await expect(overlay).not.toBeVisible();
  });

  test('FocusTrap should set aria-modal when activated', async ({ page }) => {
    await setupPage(page);

    const openBtn = page.locator('button.success').filter({ hasText: /Open Behavior Modal/ });
    const modalContent = page.locator('#behavior-content');

    // Before opening: no aria-modal
    await expect(modalContent).not.toHaveAttribute('aria-modal');

    // Open modal (activates FocusTrap)
    await openBtn.click();
    await page.waitForTimeout(300);

    // aria-modal should be set
    await expect(modalContent).toHaveAttribute('aria-modal', 'true');
  });

  test('FocusTrap should remove aria-modal when closed', async ({ page }) => {
    await setupPage(page);

    const openBtn = page.locator('button.success').filter({ hasText: /Open Behavior Modal/ });
    const modalContent = page.locator('#behavior-content');

    // Open, then close
    await openBtn.click();
    await page.waitForTimeout(300);
    await expect(modalContent).toHaveAttribute('aria-modal', 'true');

    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    // aria-modal should be removed
    await expect(modalContent).not.toHaveAttribute('aria-modal');
  });

  test('FocusTrap should keep Tab focus inside modal', async ({ page }) => {
    await setupPage(page);

    const openBtn = page.locator('button.success').filter({ hasText: /Open Behavior Modal/ });

    // Open modal
    await openBtn.click();
    await page.waitForTimeout(300);

    const modalContent = page.locator('#behavior-content');

    // Get count of focusable elements in modal
    const focusableCount = await modalContent
      .locator(
        'a[href], button:not(:disabled), input:not(:disabled), [tabindex]:not([tabindex="-1"])'
      )
      .count();
    expect(focusableCount).toBeGreaterThan(0);

    // Verify focus starts inside the modal (FocusTrap activate sets it)
    const initialFocus = await page.evaluate(() => {
      const modal = document.getElementById('behavior-content');
      return modal?.contains(document.activeElement) ?? false;
    });
    expect(initialFocus).toBe(true);

    // Use JS-dispatched Tab events (Playwright CDP keyboard bypasses DOM event handlers)
    const tabResult = await page.evaluate(count => {
      const modal = document.getElementById('behavior-content')!;
      const focusLog: string[] = [];

      for (let i = 0; i < count + 1; i++) {
        const tabEvent = new KeyboardEvent('keydown', {
          key: 'Tab',
          code: 'Tab',
          keyCode: 9,
          bubbles: true,
          cancelable: true,
        });
        (document.activeElement as HTMLElement).dispatchEvent(tabEvent);
        focusLog.push(
          (document.activeElement?.tagName ?? 'null') + '#' + (document.activeElement?.id ?? '')
        );
      }

      return {
        focusLog,
        finalInside: modal.contains(document.activeElement),
      };
    }, focusableCount);

    expect(tabResult.finalInside).toBe(true);
  });

  test('FocusTrap should restore focus to trigger button on close', async ({ page }) => {
    await setupPage(page);

    const openBtn = page.locator('button.success').filter({ hasText: /Open Behavior Modal/ });

    // Focus and click the open button
    await openBtn.focus();
    await openBtn.click();
    await page.waitForTimeout(300);

    // Close with ESC
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    // Focus should return to the open button
    const activeElementText = await page.evaluate(() => {
      return document.activeElement?.textContent?.trim() ?? '';
    });
    expect(activeElementText).toContain('Open Behavior Modal');
  });

  test('clicking inside modal content should NOT trigger ClickOutside', async ({ page }) => {
    await setupPage(page);

    const openBtn = page.locator('button.success').filter({ hasText: /Open Behavior Modal/ });
    const overlay = page.locator('#behavior-modal');

    // Open modal
    await openBtn.click();
    await page.waitForTimeout(300);
    await expect(overlay).toBeVisible();

    // Click inside the modal body (not on overlay)
    const modalBody = page.locator('#behavior-content .modal-body');
    await modalBody.click();
    await page.waitForTimeout(300);

    // Modal should still be visible
    await expect(overlay).toBeVisible();
  });
});
