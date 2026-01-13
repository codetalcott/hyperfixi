/**
 * Tests for CSS selector property access patterns
 * Issue: #selector.value and #selector's value should work natively
 */
import { test, expect } from '@playwright/test';

test.describe('CSS Selector Property Access @comprehensive', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://127.0.0.1:3000/examples/htmx-like/test-property-access.html');
    await page.waitForLoadState('domcontentloaded');
    // Wait for HyperFixi to load
    await page.waitForFunction(() => typeof (window as any).hyperfixi !== 'undefined');
  });

  test('should access property via dot notation: #selector.value', async ({ page }) => {
    // Capture console logs
    const consoleLogs: string[] = [];
    page.on('console', msg => {
      consoleLogs.push(`[${msg.type()}] ${msg.text()}`);
    });

    // Wait for debug info to be written
    await page.waitForTimeout(800);

    // Get the debug output which contains parsed AST
    const debugContent = await page.textContent('#debug');
    console.log('=== DEBUG CONTENT (AST) ===');
    console.log(debugContent);
    console.log('=== END DEBUG CONTENT ===');

    // Set a known value
    await page.fill('#test-input', 'test-dot-notation');

    // Click button that uses #selector.value
    await page.click('#btn1');

    // Wait a moment for any async operations
    await page.waitForTimeout(500);

    // Print console logs
    console.log('=== BROWSER CONSOLE LOGS ===');
    consoleLogs.forEach(log => console.log(log));
    console.log('=== END CONSOLE LOGS ===');

    // Check result
    const result = await page.textContent('#result1');
    expect(result).toContain('test-dot-notation');
  });

  test("should access property via possessive: #selector's value", async ({ page }) => {
    // Set a known value
    await page.fill('#test-input', 'test-possessive');

    // Click button that uses #selector's value
    await page.click('#btn2');

    // Check result
    const result = await page.textContent('#result2');
    expect(result).toContain('test-possessive');
  });

  test('should access property via the X of Y: the value of #selector', async ({ page }) => {
    // Capture console logs
    const consoleLogs: string[] = [];
    page.on('console', msg => {
      consoleLogs.push(`[${msg.type()}] ${msg.text()}`);
    });

    // Get the debug output for the AST
    await page.waitForTimeout(800);
    const debugContent = await page.textContent('#debug');
    console.log('=== DEBUG: the value of #test-input AST ===');
    // Find and print the "the value of" section
    const match = debugContent?.match(/=== AST for the value of.*?({[\s\S]*?})\s*===/);
    if (match) console.log(match[1]);
    else console.log('DEBUG CONTENT:\n', debugContent);

    // Set a known value
    await page.fill('#test-input', 'test-of-pattern');

    // Click button that uses the value of #selector
    await page.click('#btn3');

    // Wait for execution
    await page.waitForTimeout(500);

    // Print console logs
    console.log('=== BROWSER CONSOLE ===');
    consoleLogs.slice(-10).forEach(log => console.log(log));

    // Check result
    const result = await page.textContent('#result3');
    expect(result).toContain('test-of-pattern');
  });

  test('should access property via document.getElementById workaround', async ({ page }) => {
    // Set a known value
    await page.fill('#test-input', 'test-getelementbyid');

    // Click button that uses document.getElementById
    await page.click('#btn4');

    // Check result
    const result = await page.textContent('#result4');
    expect(result).toContain('test-getelementbyid');
  });

  test("should access property via query ref possessive: first <#selector/>'s value", async ({
    page,
  }) => {
    // Set a known value
    await page.fill('#test-input', 'test-query-ref');

    // Click button that uses query ref possessive
    await page.click('#btn5');

    // Check result
    const result = await page.textContent('#result5');
    expect(result).toContain('test-query-ref');
  });

  test('debug: check what value is returned for each pattern', async ({ page }) => {
    // Set a known value
    await page.fill('#test-input', 'DEBUG_VALUE');

    // Click each button
    await page.click('#btn1');
    await page.click('#btn2');
    await page.click('#btn3');
    await page.click('#btn4');
    await page.click('#btn5');

    // Get all results
    const result1 = await page.textContent('#result1');
    const result2 = await page.textContent('#result2');
    const result3 = await page.textContent('#result3');
    const result4 = await page.textContent('#result4');
    const result5 = await page.textContent('#result5');
    const debugLog = await page.textContent('#debug');

    console.log('=== CSS Selector Property Access Debug ===');
    console.log('Result 1 (#test-input.value):', result1);
    console.log("Result 2 (#test-input's value):", result2);
    console.log('Result 3 (the value of #test-input):', result3);
    console.log('Result 4 (document.getElementById):', result4);
    console.log("Result 5 (first <#test-input/>'s value):", result5);
    console.log('Debug log:', debugLog);

    // This test is for debugging - always passes
    expect(true).toBe(true);
  });
});
