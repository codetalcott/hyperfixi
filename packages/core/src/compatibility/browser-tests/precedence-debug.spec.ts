/**
 * Precedence Debug Test - Analyze specific operator precedence failures
 */

import { test, expect } from '@playwright/test';

test('analyze precedence failures', async ({ page }) => {
  // Navigate to precedence debug page
  await page.goto('http://localhost:3000/precedence-debug.html');
  
  // Wait for test to complete
  await page.waitForTimeout(2000);
  
  // Capture console logs
  const logs: string[] = [];
  page.on('console', msg => logs.push(msg.text()));
  
  // Trigger the test
  await page.evaluate(() => testPrecedence());
  
  // Wait for logs
  await page.waitForTimeout(1000);
  
  // Output all logs for analysis
  console.log('=== PRECEDENCE DEBUG RESULTS ===');
  logs.forEach(log => console.log(log));
  
  // Get the results from the page
  const results = await page.evaluate(() => {
    const tests = [
      '2 + 3 * 4',
      '10 - 2 * 3', 
      '(2 + 3) * 4',
      '2 * 3 + 4',
      '8 / 2 + 3',
      '2 + 3 + 4',
      'true and false or true',
      'false or true and false'
    ];
    
    const results: any[] = [];
    
    for (const expr of tests) {
      try {
        const original = _hyperscript.evaluate(expr, {});
        const ours = hyperfixi.evalHyperScript(expr, {});
        results.push({ expr, original, ours: ours, match: original === ours });
      } catch (error) {
        results.push({ expr, error: error.message });
      }
    }
    
    return Promise.all(results.map(async (r) => {
      if (r.ours && typeof r.ours.then === 'function') {
        r.ours = await r.ours;
        r.match = r.original === r.ours;
      }
      return r;
    }));
  });
  
  console.log('\n=== DETAILED ANALYSIS ===');
  results.forEach((result, i) => {
    if (result.error) {
      console.log(`❌ ${result.expr}: ERROR - ${result.error}`);
    } else {
      const status = result.match ? '✅' : '❌';
      console.log(`${status} ${result.expr}: _hyperscript=${result.original}, hyperfixi=${result.ours}`);
    }
  });
  
  // This test is for analysis - always pass
  expect(results.length).toBeGreaterThan(0);
});