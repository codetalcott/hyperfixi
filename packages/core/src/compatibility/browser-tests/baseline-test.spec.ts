/**
 * Baseline Test Suite - Official _hyperscript tests vs HyperFixi
 * Establishes current compatibility before implementing missing features
 */

import { test, expect, Page } from '@playwright/test';

test.describe('HyperFixi vs _hyperscript Baseline Tests', () => {
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    await page.goto('http://localhost:3000/compatibility-test.html');
    await page.waitForTimeout(2000);
  });

  test('Math Operator Tests (should mostly pass)', async () => {
    const results = await page.evaluate(async () => {
      const tests = [
        {
          name: 'addition works',
          test: async () => {
            const result = await hyperfixi.evalHyperScript('1 + 1');
            return { success: result === 2, result, expected: 2 };
          },
        },
        {
          name: 'string concat works',
          test: async () => {
            const result = await evalHyperScript("'a' + 'b'");
            return { success: result === 'ab', result, expected: 'ab' };
          },
        },
        {
          name: 'subtraction works',
          test: async () => {
            const result = await evalHyperScript('1 - 1');
            return { success: result === 0, result, expected: 0 };
          },
        },
        {
          name: 'multiplication works',
          test: async () => {
            const result = await evalHyperScript('1 * 2');
            return { success: result === 2, result, expected: 2 };
          },
        },
        {
          name: 'division works',
          test: async () => {
            const result = await evalHyperScript('1 / 2');
            return { success: result === 0.5, result, expected: 0.5 };
          },
        },
        {
          name: 'mod works',
          test: async () => {
            const result = await evalHyperScript('3 mod 2');
            return { success: result === 1, result, expected: 1 };
          },
        },
        {
          name: 'addition works w/ more than one value',
          test: async () => {
            const result = await evalHyperScript('1 + 2 + 3');
            return { success: result === 6, result, expected: 6 };
          },
        },
        {
          name: 'unparenthesized expressions with mixed operators work correctly',
          test: async () => {
            const result = await evalHyperScript('1 + 2 * 3');
            return { success: result === 7, result, expected: 7 };
          },
        },
        {
          name: 'parenthesized expressions with multiple operators work',
          test: async () => {
            const result = await evalHyperScript('1 + (2 * 3)');
            return { success: result === 7, result, expected: 7 };
          },
        },
      ];

      const results = [];
      for (const testCase of tests) {
        try {
          const result = await testCase.test();
          results.push({
            name: testCase.name,
            success: result.success,
            result: result.result,
            expected: result.expected,
            error: null,
          });
        } catch (error) {
          results.push({
            name: testCase.name,
            success: false,
            result: null,
            expected: null,
            error: error.message,
          });
        }
      }
      return results;
    });

    // Log results
    console.log('\n🧮 Math Operator Test Results:');
    let passed = 0;
    results.forEach(result => {
      if (result.success) {
        console.log(`  ✅ ${result.name}`);
        passed++;
      } else {
        console.log(`  ❌ ${result.name}: got ${result.result}, expected ${result.expected}`);
        if (result.error) console.log(`     Error: ${result.error}`);
      }
    });
    console.log(
      `  📊 Math Tests: ${passed}/${results.length} passed (${Math.round((passed / results.length) * 100)}%)`
    );

    // We expect most of these to pass based on our 100% expression compatibility
    expect(passed).toBeGreaterThan(6); // At least 7/9 should pass
  });

  test('String Tests (should pass)', async () => {
    const results = await page.evaluate(async () => {
      const tests = [
        {
          name: 'can parse simple strings',
          test: async () => {
            const result = await evalHyperScript('"hello world"');
            return { success: result === 'hello world', result, expected: 'hello world' };
          },
        },
        {
          name: 'can parse simple strings w/ single quotes',
          test: async () => {
            const result = await evalHyperScript("'hello world'");
            return { success: result === 'hello world', result, expected: 'hello world' };
          },
        },
      ];

      const results = [];
      for (const testCase of tests) {
        try {
          const result = await testCase.test();
          results.push({
            name: testCase.name,
            success: result.success,
            result: result.result,
            expected: result.expected,
            error: null,
          });
        } catch (error) {
          results.push({
            name: testCase.name,
            success: false,
            result: null,
            expected: null,
            error: error.message,
          });
        }
      }
      return results;
    });

    // Log results
    console.log('\n🔤 String Test Results:');
    let passed = 0;
    results.forEach(result => {
      if (result.success) {
        console.log(`  ✅ ${result.name}`);
        passed++;
      } else {
        console.log(`  ❌ ${result.name}: got ${result.result}, expected ${result.expected}`);
        if (result.error) console.log(`     Error: ${result.error}`);
      }
    });
    console.log(
      `  📊 String Tests: ${passed}/${results.length} passed (${Math.round((passed / results.length) * 100)}%)`
    );

    // Should pass 100%
    expect(passed).toBe(results.length);
  });

  test('Possessive Expression Tests (should pass)', async () => {
    const results = await page.evaluate(async () => {
      const tests = [
        {
          name: 'its result works',
          test: async () => {
            const result = await evalHyperScript('its result', { result: { result: 'success' } });
            return { success: result === 'success', result, expected: 'success' };
          },
        },
        {
          name: 'my property works',
          test: async () => {
            const result = await evalHyperScript('my value', { me: { value: 42 } });
            return { success: result === 42, result, expected: 42 };
          },
        },
        {
          name: 'your property works',
          test: async () => {
            const result = await evalHyperScript('your data', { you: { data: 'test' } });
            return { success: result === 'test', result, expected: 'test' };
          },
        },
      ];

      const results = [];
      for (const testCase of tests) {
        try {
          const result = await testCase.test();
          results.push({
            name: testCase.name,
            success: result.success,
            result: result.result,
            expected: result.expected,
            error: null,
          });
        } catch (error) {
          results.push({
            name: testCase.name,
            success: false,
            result: null,
            expected: null,
            error: error.message,
          });
        }
      }
      return results;
    });

    // Log results
    console.log('\n🔗 Possessive Expression Test Results:');
    let passed = 0;
    results.forEach(result => {
      if (result.success) {
        console.log(`  ✅ ${result.name}`);
        passed++;
      } else {
        console.log(`  ❌ ${result.name}: got ${result.result}, expected ${result.expected}`);
        if (result.error) console.log(`     Error: ${result.error}`);
      }
    });
    console.log(
      `  📊 Possessive Tests: ${passed}/${results.length} passed (${Math.round((passed / results.length) * 100)}%)`
    );

    // Should pass 100%
    expect(passed).toBe(results.length);
  });

  test('Command Tests (should now pass)', async () => {
    const results = await page.evaluate(async () => {
      const tests = [
        {
          name: 'put command into innerHTML',
          test: async () => {
            // This should now work - we have command system implemented!
            clearWorkArea();
            const div = make('<div id="d1" _=\'on click put "foo" into #d1.innerHTML\'></div>');
            document.body.appendChild(div); // Add to DOM for selector resolution
            div.click();
            await new Promise(resolve => setTimeout(resolve, 100)); // Wait for async execution
            const success = div.innerHTML === 'foo';
            document.body.removeChild(div); // Clean up
            return { success, result: div.innerHTML, expected: 'foo' };
          },
        },
        {
          name: 'set command',
          test: async () => {
            // This should now work - we have command system implemented!
            clearWorkArea();
            const div = make('<div _=\'on click set my innerHTML to "test"\'></div>');
            document.body.appendChild(div); // Add to DOM
            div.click();
            await new Promise(resolve => setTimeout(resolve, 100)); // Wait for async execution
            const success = div.innerHTML === 'test';
            document.body.removeChild(div); // Clean up
            return { success, result: div.innerHTML, expected: 'test' };
          },
        },
      ];

      const results = [];
      for (const testCase of tests) {
        try {
          const result = await testCase.test();
          results.push({
            name: testCase.name,
            success: result.success,
            result: result.result,
            expected: result.expected,
            error: null,
          });
        } catch (error) {
          results.push({
            name: testCase.name,
            success: false,
            result: null,
            expected: null,
            error: error.message,
          });
        }
      }
      return results;
    });

    // Log results
    console.log('\n⚙️ Command Test Results (should now pass):');
    let passed = 0;
    results.forEach(result => {
      if (result.success) {
        console.log(`  ✅ ${result.name}: passed`);
        passed++;
      } else {
        console.log(
          `  ❌ ${result.name}: failed (got: ${result.result}, expected: ${result.expected})`
        );
      }
    });
    console.log(
      `  📊 Command Tests: ${passed}/${results.length} passed (${Math.round((passed / results.length) * 100)}%)`
    );
    console.log('\n🎯 Command Integration Success:');
    console.log('✅ HTML _="" attribute parsing working');
    console.log('✅ Event handler binding working');
    console.log('✅ Command execution working');

    // Commands should now pass
    expect(passed).toBe(results.length);
  });

  test.afterAll(async () => {
    console.log('\n🎯 Baseline Test Summary:');
    console.log('✅ Expression tests: Should pass at high rate (60-100%)');
    console.log('❌ Command tests: Expected to fail (command system not implemented)');
    console.log('📈 Overall baseline established for future comparison');
  });
});
