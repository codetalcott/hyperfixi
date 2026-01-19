import { test, expect } from '@playwright/test';

test.describe('Multilingual Showcase Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/examples/multilingual/showcase.html');
    // Wait for bundles to load
    await page.waitForFunction(
      () =>
        typeof (window as any).LokaScriptSemantic !== 'undefined' &&
        typeof (window as any).hyperfixi !== 'undefined'
    );
  });

  test('loads with all 13 languages in dropdown @quick', async ({ page }) => {
    // Check dropdown exists
    const dropdown = page.locator('#language');
    await expect(dropdown).toBeVisible();

    // Get all options
    const options = await dropdown.locator('option').allTextContents();
    expect(options.length).toBe(13);

    // Verify key languages present
    expect(options.join(' ')).toContain('English');
    expect(options.join(' ')).toContain('日本語');
    expect(options.join(' ')).toContain('العربية');
    expect(options.join(' ')).toContain('한국어');
  });

  test('counter demo works in English @smoke', async ({ page }) => {
    // Find counter value
    const counterValue = page.locator('#counter-value');
    await expect(counterValue).toHaveText('0');

    // Click increment button
    await page.locator('#counter-demo-increment').click();
    await expect(counterValue).toHaveText('1');

    // Click decrement button
    await page.locator('#counter-demo-decrement').click();
    await expect(counterValue).toHaveText('0');

    // Click reset button (should work even after changes)
    await page.locator('#counter-demo-increment').click();
    await page.locator('#counter-demo-increment').click();
    await page.locator('#counter-demo-reset').click();
    await expect(counterValue).toHaveText('0');
  });

  test('toggle class demo works in English @smoke', async ({ page }) => {
    const toggleBtn = page.locator('#toggle-demo-toggle');

    // Initially should not have .active
    await expect(toggleBtn).not.toHaveClass(/active/);

    // Click to toggle
    await toggleBtn.click();
    await expect(toggleBtn).toHaveClass(/active/);

    // Click again to toggle off
    await toggleBtn.click();
    await expect(toggleBtn).not.toHaveClass(/active/);
  });

  test('input mirror demo works in English @quick', async ({ page }) => {
    const input = page.locator('#mirror-demo-mirror');
    const output = page.locator('#mirror-output');

    // Type into input
    await input.fill('Hello World');
    await expect(output).toHaveText('Hello World');

    // Clear and type again
    await input.fill('Test 123');
    await expect(output).toHaveText('Test 123');
  });

  test('switching to Japanese updates code display', async ({ page }) => {
    // Get initial English code
    const counterCode = page.locator('#counter-code-increment');
    const initialCode = await counterCode.textContent();
    // The semantic parser may normalize English - just verify it contains increment
    expect(initialCode).toContain('increment');
    expect(initialCode).toContain('click');

    // Switch to Japanese
    await page.locator('#language').selectOption('ja');

    // Wait for update
    await page.waitForTimeout(100);

    // Code should now be in Japanese (クリック = click, 増加 = increment)
    const jaCode = await counterCode.textContent();
    // Check for Japanese characters
    expect(jaCode).toMatch(/[\u3040-\u30ff\u4e00-\u9faf]/); // Japanese characters
  });

  test('Japanese demo still executes correctly', async ({ page }) => {
    // Switch to Japanese
    await page.locator('#language').selectOption('ja');
    await page.waitForTimeout(100);

    // Counter should still work
    const counterValue = page.locator('#counter-value');
    await expect(counterValue).toHaveText('0');

    await page.locator('#counter-demo-increment').click();
    await expect(counterValue).toHaveText('1');
  });

  test('Arabic shows RTL for code display', async ({ page }) => {
    // Switch to Arabic
    await page.locator('#language').selectOption('ar');
    await page.waitForTimeout(100);

    // Check that code block has RTL class
    const codeBlock = page.locator('#counter-code');
    await expect(codeBlock).toHaveClass(/rtl/);
  });

  test('word order badges update with language', async ({ page }) => {
    // English should show SVO
    const badge = page.locator('#counter-badge');
    await expect(badge).toHaveText('SVO');

    // Switch to Japanese (SOV)
    await page.locator('#language').selectOption('ja');
    await page.waitForTimeout(100);
    await expect(badge).toHaveText('SOV');

    // Switch to Arabic (VSO)
    await page.locator('#language').selectOption('ar');
    await page.waitForTimeout(100);
    await expect(badge).toHaveText('VSO');
  });

  test('view all languages expansion works', async ({ page }) => {
    // Find the expansion toggle - use a more specific selector
    const expandBtn = page.locator('#counter-card .expand-btn');
    const expandSection = page.locator('#counter-all-languages');

    // Initially hidden (no .show class)
    await expect(expandSection).not.toHaveClass(/show/);

    // Click to expand
    await expandBtn.click();
    await expect(expandSection).toHaveClass(/show/);

    // Should show all 13 languages
    const langItems = expandSection.locator('.lang-item');
    const count = await langItems.count();
    expect(count).toBe(13);
  });

  test('tabs demo works correctly', async ({ page }) => {
    const tab1 = page.locator('#tabs-demo-tab1');
    const tab2 = page.locator('#tabs-demo-tab2');
    const tab3 = page.locator('#tabs-demo-tab3');

    // Tab 1 should be active initially
    await expect(tab1).toHaveClass(/active/);
    await expect(tab2).not.toHaveClass(/active/);

    // Click tab 2
    await tab2.click();
    await expect(tab2).toHaveClass(/active/);
    await expect(tab1).not.toHaveClass(/active/);

    // Click tab 3
    await tab3.click();
    await expect(tab3).toHaveClass(/active/);
    await expect(tab2).not.toHaveClass(/active/);
  });
});
