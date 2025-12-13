/**
 * Test to understand _hyperscript's actual API behavior
 */

import { test, expect } from '@playwright/test';

test('analyze _hyperscript API behavior', async ({ page }) => {
  await page.goto('http://localhost:3000/hyperscript-api-test.html');
  await page.waitForTimeout(2000);

  // Capture results
  const results = await page.evaluate(() => {
    const tests = [
      '(2 + 3) * 4', // With parentheses
      '2 + 3 + 4', // Same operator
      '2 * 3 * 4', // Same operator
      '5', // Single value
      'true', // Boolean
      '"hello"', // String
      '2 + 3 * 4', // Mixed operators
      'true and false or true', // Mixed logical
    ];

    const results: any[] = [];

    for (const expr of tests) {
      try {
        const result = _hyperscript.evaluate(expr, {});
        results.push({ expr, result, success: true });
      } catch (error) {
        results.push({ expr, error: (error as Error).message, success: false });
      }
    }

    return results;
  });

  console.log('\n=== _HYPERSCRIPT ORIGINAL API BEHAVIOR ===');
  results.forEach(r => {
    if (r.success) {
      console.log(`✅ ${r.expr} = ${r.result}`);
    } else {
      console.log(`❌ ${r.expr}: ${r.error}`);
    }
  });

  expect(results.length).toBeGreaterThan(0);
});
