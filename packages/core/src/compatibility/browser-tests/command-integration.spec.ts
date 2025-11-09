/**
 * Command Integration Tests
 * Tests that our command system works with HTML _="" attributes
 */

import { test, expect, Page } from '@playwright/test';

test.describe('HyperFixi Command Integration Tests', () => {
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    await page.goto('http://localhost:3000/compatibility-test.html');
    await page.waitForTimeout(2000);
  });

  test('PUT command with _="" attribute should work', async () => {
    const result = await page.evaluate(async () => {
      // Clear work area
      clearWorkArea();

      // Create element with hyperscript behavior using our make function
      const div = make(
        '<div id="test-put" _=\'on click put "hello world" into #test-put.innerHTML\'></div>'
      );

      // Add to DOM temporarily for selector resolution
      document.body.appendChild(div);

      // Trigger the click event
      div.click();

      // Wait a bit for async execution
      await new Promise(resolve => setTimeout(resolve, 100));

      // Check the result
      const success = div.innerHTML === 'hello world';
      const result = div.innerHTML;

      // Clean up
      document.body.removeChild(div);

      return { success, result, expected: 'hello world' };
    });

    console.log('PUT test result:', result);
    expect(result.success).toBe(true);
    expect(result.result).toBe(result.expected);
  });

  test('SET command with _="" attribute should work', async () => {
    const result = await page.evaluate(async () => {
      // Clear work area
      clearWorkArea();

      // Create element with hyperscript behavior
      const div = make(
        '<div id="test-set" _=\'on click set my innerHTML to "test content"\'></div>'
      );

      // Add to DOM temporarily
      document.body.appendChild(div);

      // Trigger the click event
      div.click();

      // Wait a bit for async execution
      await new Promise(resolve => setTimeout(resolve, 100));

      // Check the result
      const success = div.innerHTML === 'test content';
      const result = div.innerHTML;

      // Clean up
      document.body.removeChild(div);

      return { success, result, expected: 'test content' };
    });

    console.log('SET test result:', result);
    expect(result.success).toBe(true);
    expect(result.result).toBe(result.expected);
  });

  test('Multiple commands should work', async () => {
    const result = await page.evaluate(async () => {
      // Clear work area
      clearWorkArea();

      // Create elements with different behaviors
      const div1 = make(
        '<div id="test-multi-1" _=\'on click put "first" into #test-multi-1.innerHTML\'></div>'
      );
      const div2 = make(
        '<div id="test-multi-2" _=\'on click set my innerHTML to "second"\'></div>'
      );

      // Add to DOM
      document.body.appendChild(div1);
      document.body.appendChild(div2);

      // Trigger clicks
      div1.click();
      div2.click();

      // Wait for async execution
      await new Promise(resolve => setTimeout(resolve, 100));

      // Check results
      const result1 = div1.innerHTML;
      const result2 = div2.innerHTML;
      const success = result1 === 'first' && result2 === 'second';

      // Clean up
      document.body.removeChild(div1);
      document.body.removeChild(div2);

      return {
        success,
        result1,
        result2,
        expected1: 'first',
        expected2: 'second',
      };
    });

    console.log('Multiple commands test result:', result);
    expect(result.success).toBe(true);
    expect(result.result1).toBe(result.expected1);
    expect(result.result2).toBe(result.expected2);
  });
});
