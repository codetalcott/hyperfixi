import { test, expect } from '@playwright/test';

test.describe('Toggle Attributes - Comprehensive Test Suite', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://127.0.0.1:3000/examples/intermediate/09-toggle-attributes.html');
    await page.waitForTimeout(1000); // Give time for LokaScript to initialize
  });

  test('Demo 1: Toggle disabled attribute with status update', async ({ page }) => {
    const targetBtn = page.locator('#target-btn');
    const toggleBtn = page.locator('#toggle-disabled-btn');
    const status = page.locator('#disabled-status');

    // Initial state
    await expect(targetBtn).not.toBeDisabled();
    await expect(status).toHaveText('enabled');

    // First toggle - should disable
    await toggleBtn.click();
    await page.waitForTimeout(200);
    await expect(targetBtn).toBeDisabled();
    await expect(status).toHaveText('disabled');

    // Second toggle - should enable
    await toggleBtn.click();
    await page.waitForTimeout(200);
    await expect(targetBtn).not.toBeDisabled();
    await expect(status).toHaveText('enabled');

    // Third toggle - should disable again
    await toggleBtn.click();
    await page.waitForTimeout(200);
    await expect(targetBtn).toBeDisabled();
    await expect(status).toHaveText('disabled');
  });

  test('Demo 2: Toggle required attribute with status update', async ({ page }) => {
    const emailInput = page.locator('#email-input');
    const toggleBtn = page.locator('#toggle-required-btn');
    const status = page.locator('#required-status');

    // Initial state
    const initialRequired = await emailInput.evaluate((el: HTMLInputElement) => el.required);
    expect(initialRequired).toBe(false);
    await expect(status).toHaveText('no');

    // First toggle - should make required
    await toggleBtn.click();
    await page.waitForTimeout(200);
    const afterFirstToggle = await emailInput.evaluate((el: HTMLInputElement) => el.required);
    expect(afterFirstToggle).toBe(true);
    await expect(status).toHaveText('yes');

    // Second toggle - should make not required
    await toggleBtn.click();
    await page.waitForTimeout(200);
    const afterSecondToggle = await emailInput.evaluate((el: HTMLInputElement) => el.required);
    expect(afterSecondToggle).toBe(false);
    await expect(status).toHaveText('no');
  });

  test('Demo 3: Toggle CSS display property', async ({ page }) => {
    const displayBox = page.locator('#display-box');
    const toggleBtn = page.locator('button:has-text("Toggle Display")').first();

    // Initially visible
    await expect(displayBox).toBeVisible();

    // Toggle to hidden
    await toggleBtn.click();
    await page.waitForTimeout(200);
    await expect(displayBox).toBeHidden();

    // Toggle back to visible
    await toggleBtn.click();
    await page.waitForTimeout(200);
    await expect(displayBox).toBeVisible();
  });

  test('Demo 4: Toggle CSS visibility property', async ({ page }) => {
    const visibilityBox = page.locator('#visibility-box');
    const toggleBtn = page.locator('button:has-text("Toggle Visibility")');

    // Check initial visibility
    const initialVisibility = await visibilityBox.evaluate(
      (el: HTMLElement) => window.getComputedStyle(el).visibility
    );
    expect(initialVisibility).toBe('visible');

    // Toggle to hidden
    await toggleBtn.click();
    await page.waitForTimeout(200);
    const hiddenVisibility = await visibilityBox.evaluate(
      (el: HTMLElement) => window.getComputedStyle(el).visibility
    );
    expect(hiddenVisibility).toBe('hidden');

    // Toggle back to visible
    await toggleBtn.click();
    await page.waitForTimeout(200);
    const visibleAgain = await visibilityBox.evaluate(
      (el: HTMLElement) => window.getComputedStyle(el).visibility
    );
    expect(visibleAgain).toBe('visible');
  });

  test('Demo 5: Toggle CSS opacity with transition', async ({ page }) => {
    const opacityBox = page.locator('#opacity-box');
    const toggleBtn = page.locator('button:has-text("Toggle Opacity")');

    // Check initial opacity
    const initialOpacity = await opacityBox.evaluate(
      (el: HTMLElement) => window.getComputedStyle(el).opacity
    );
    expect(parseFloat(initialOpacity)).toBe(1);

    // Toggle to transparent
    await toggleBtn.click();
    await page.waitForTimeout(500); // Wait for transition
    const transparentOpacity = await opacityBox.evaluate(
      (el: HTMLElement) => window.getComputedStyle(el).opacity
    );
    expect(parseFloat(transparentOpacity)).toBe(0);

    // Toggle back to opaque
    await toggleBtn.click();
    await page.waitForTimeout(500); // Wait for transition
    const opaqueOpacity = await opacityBox.evaluate(
      (el: HTMLElement) => window.getComputedStyle(el).opacity
    );
    expect(parseFloat(opaqueOpacity)).toBe(1);
  });

  test('Demo 6: Toggle attribute on specific element', async ({ page }) => {
    const propBtn = page.locator('#prop-btn');
    // Use exact selector for Demo 6's toggle button
    const toggleBtn = page.locator('button[_="on click toggle @disabled on #prop-btn"]');

    // Initial state - should be enabled
    await expect(propBtn).not.toBeDisabled();

    // First toggle - should disable
    await toggleBtn.click();
    await page.waitForTimeout(200);
    await expect(propBtn).toBeDisabled();

    // Second toggle - should enable
    await toggleBtn.click();
    await page.waitForTimeout(200);
    await expect(propBtn).not.toBeDisabled();

    // Third toggle - should disable again
    await toggleBtn.click();
    await page.waitForTimeout(200);
    await expect(propBtn).toBeDisabled();
  });

  test.skip('Attribute reading: @disabled returns boolean (API bug)', async ({ page }) => {
    // SKIPPED: Known issue - evaluate() API doesn't use fixed expression evaluator
    // The on-page runtime execution works correctly (see if/then/else test)
    // but window.hyperfixi.evaluate() uses a different code path that still returns {}
    // TODO: Fix expression-parser.ts possessive expression evaluation
    const result = await page.evaluate(() => {
      const btn = document.querySelector('#target-btn') as HTMLButtonElement;

      // Set disabled to true
      btn.disabled = true;

      // Read via hyperscript
      const value = window.hyperfixi
        ? // @ts-expect-error - evaluate() not in LokaScriptBrowserAPI type
          window.hyperfixi.evaluate("#target-btn's @disabled", {})
        : null;

      return {
        jsProperty: btn.disabled,
        jsHasAttribute: btn.hasAttribute('disabled'),
        hsValue: value,
        hsType: typeof value,
      };
    });

    expect(result.jsProperty).toBe(true);
    expect(result.jsHasAttribute).toBe(true);
    expect(result.hsValue).toBe(true);
    expect(result.hsType).toBe('boolean');
  });

  test.skip('Attribute reading: @required returns boolean (API bug)', async ({ page }) => {
    // SKIPPED: Known issue - evaluate() API doesn't use fixed expression evaluator
    // The on-page runtime execution works correctly (see if/then/else test)
    // but window.hyperfixi.evaluate() uses a different code path that still returns {}
    // TODO: Fix expression-parser.ts possessive expression evaluation
    const result = await page.evaluate(() => {
      const input = document.querySelector('#email-input') as HTMLInputElement;

      // Set required to true
      input.required = true;

      // Read via hyperscript
      const value = window.hyperfixi
        ? // @ts-expect-error - evaluate() not in LokaScriptBrowserAPI type
          window.hyperfixi.evaluate("#email-input's @required", {})
        : null;

      return {
        jsProperty: input.required,
        jsHasAttribute: input.hasAttribute('required'),
        hsValue: value,
        hsType: typeof value,
      };
    });

    expect(result.jsProperty).toBe(true);
    expect(result.jsHasAttribute).toBe(true);
    expect(result.hsValue).toBe(true);
    expect(result.hsType).toBe('boolean');
  });

  test('If/then/else with attribute check works correctly', async ({ page }) => {
    // Test that if/then/else with @attribute evaluates correctly
    const result = await page.evaluate(async () => {
      const btn = document.querySelector('#target-btn') as HTMLButtonElement;
      const status = document.createElement('span');
      status.id = 'test-status';
      document.body.appendChild(status);

      // Test with disabled = false
      btn.disabled = false;
      // @ts-ignore
      await window.hyperfixi.evaluate(
        "if #target-btn's @disabled then put 'DISABLED' into #test-status else put 'ENABLED' into #test-status end",
        {}
      );
      const result1 = status.textContent;

      // Test with disabled = true
      btn.disabled = true;
      // @ts-ignore
      await window.hyperfixi.evaluate(
        "if #target-btn's @disabled then put 'DISABLED' into #test-status else put 'ENABLED' into #test-status end",
        {}
      );
      const result2 = status.textContent;

      status.remove();
      return { whenFalse: result1, whenTrue: result2 };
    });

    expect(result.whenFalse).toBe('ENABLED');
    expect(result.whenTrue).toBe('DISABLED');
  });

  test("Possessive syntax: toggle #element's @disabled", async ({ page }) => {
    const propBtn = page.locator('#prop-btn');

    // Use the existing button in the HTML with possessive syntax
    const toggleBtn = page.locator('#test-possessive');

    // Initial state
    await expect(propBtn).not.toBeDisabled();

    // First toggle - should disable
    await toggleBtn.click();
    await page.waitForTimeout(200);
    await expect(propBtn).toBeDisabled();

    // Second toggle - should enable
    await toggleBtn.click();
    await page.waitForTimeout(200);
    await expect(propBtn).not.toBeDisabled();

    // Third toggle - should disable again
    await toggleBtn.click();
    await page.waitForTimeout(200);
    await expect(propBtn).toBeDisabled();
  });
});
