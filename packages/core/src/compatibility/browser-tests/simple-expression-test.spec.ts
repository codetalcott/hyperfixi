/**
 * Simple Expression Test - Direct testing without complex setup
 */

import { test, expect } from '@playwright/test';

test.describe('Simple Expression Tests', () => {
  test('math expression test', async ({ page }) => {
    await page.goto('http://localhost:3000/test-global-functions.html');
    await page.waitForTimeout(1000);

    const result = await page.evaluate(async () => {
      try {
        // Test basic addition
        const addResult = await window.evalHyperScript('1 + 1');

        // Test string concatenation
        const strResult = await window.evalHyperScript('"hello" + " world"');

        // Test subtraction
        const subResult = await window.evalHyperScript('5 - 3');

        return {
          success: true,
          addition: addResult,
          string: strResult,
          subtraction: subResult,
          additionCorrect: addResult === 2,
          stringCorrect: strResult === 'hello world',
          subtractionCorrect: subResult === 2,
        };
      } catch (error) {
        return {
          success: false,
          error: error.message,
        };
      }
    });

    console.log('Test results:', JSON.stringify(result, null, 2));

    expect(result.success).toBe(true);
    expect(result.additionCorrect).toBe(true);
    expect(result.stringCorrect).toBe(true);
    expect(result.subtractionCorrect).toBe(true);
  });

  test('boolean expression test', async ({ page }) => {
    await page.goto('http://localhost:3000/test-global-functions.html');
    await page.waitForTimeout(1000);

    const result = await page.evaluate(async () => {
      try {
        const trueResult = await window.evalHyperScript('true');
        const falseResult = await window.evalHyperScript('false');
        const andResult = await window.evalHyperScript('true and true');
        const orResult = await window.evalHyperScript('false or true');

        return {
          success: true,
          trueValue: trueResult,
          falseValue: falseResult,
          andValue: andResult,
          orValue: orResult,
          trueCorrect: trueResult === true,
          falseCorrect: falseResult === false,
          andCorrect: andResult === true,
          orCorrect: orResult === true,
        };
      } catch (error) {
        return {
          success: false,
          error: error.message,
        };
      }
    });

    console.log('Boolean test results:', JSON.stringify(result, null, 2));

    expect(result.success).toBe(true);
    expect(result.trueCorrect).toBe(true);
    expect(result.falseCorrect).toBe(true);
  });

  test('comparison expression test', async ({ page }) => {
    await page.goto('http://localhost:3000/test-global-functions.html');
    await page.waitForTimeout(1000);

    const result = await page.evaluate(async () => {
      try {
        const gtResult = await window.evalHyperScript('5 > 3');
        const ltResult = await window.evalHyperScript('2 < 10');
        const eqResult = await window.evalHyperScript('5 == 5');
        const neqResult = await window.evalHyperScript('5 != 3');

        return {
          success: true,
          gt: gtResult,
          lt: ltResult,
          eq: eqResult,
          neq: neqResult,
          gtCorrect: gtResult === true,
          ltCorrect: ltResult === true,
          eqCorrect: eqResult === true,
          neqCorrect: neqResult === true,
        };
      } catch (error) {
        return {
          success: false,
          error: error.message,
        };
      }
    });

    console.log('Comparison test results:', JSON.stringify(result, null, 2));

    expect(result.success).toBe(true);
  });
});
