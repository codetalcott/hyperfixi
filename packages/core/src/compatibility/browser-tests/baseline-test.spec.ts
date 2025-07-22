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
          name: "addition works",
          test: async () => {
            const result = await hyperfixi.evalHyperScript("1 + 1");
            return { success: result === 2, result, expected: 2 };
          }
        },
        {
          name: "string concat works", 
          test: () => {
            const result = evalHyperScript("'a' + 'b'");
            return { success: result === "ab", result, expected: "ab" };
          }
        },
        {
          name: "subtraction works",
          test: () => {
            const result = evalHyperScript("1 - 1"); 
            return { success: result === 0, result, expected: 0 };
          }
        },
        {
          name: "multiplication works",
          test: () => {
            const result = evalHyperScript("1 * 2");
            return { success: result === 2, result, expected: 2 };
          }
        },
        {
          name: "division works",
          test: () => {
            const result = evalHyperScript("1 / 2");
            return { success: result === 0.5, result, expected: 0.5 };
          }
        },
        {
          name: "mod works",
          test: () => {
            const result = evalHyperScript("3 mod 2");
            return { success: result === 1, result, expected: 1 };
          }
        },
        {
          name: "addition works w/ more than one value",
          test: () => {
            const result = evalHyperScript("1 + 2 + 3");
            return { success: result === 6, result, expected: 6 };
          }
        },
        {
          name: "unparenthesized expressions with mixed operators cause error",
          test: () => {
            const result = getParseErrorFor("1 + 2 * 3");
            const hasCorrectError = result.indexOf("You must parenthesize math operations with different operators") === 0;
            return { success: hasCorrectError, result, expected: "error message" };
          }
        },
        {
          name: "parenthesized expressions with multiple operators work",
          test: () => {
            const result = evalHyperScript("1 + (2 * 3)");
            return { success: result === 7, result, expected: 7 };
          }
        }
      ];

      const results = [];
      for (const testCase of tests) {
        try {
          const result = testCase.test();
          results.push({
            name: testCase.name,
            success: result.success,
            result: result.result,
            expected: result.expected,
            error: null
          });
        } catch (error) {
          results.push({
            name: testCase.name,
            success: false,
            result: null,
            expected: null,
            error: error.message
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
    console.log(`  📊 Math Tests: ${passed}/${results.length} passed (${Math.round(passed/results.length*100)}%)`);

    // We expect most of these to pass based on our 100% expression compatibility
    expect(passed).toBeGreaterThan(6); // At least 7/9 should pass
  });

  test('String Tests (should pass)', async () => {
    const results = await page.evaluate(async () => {
      const tests = [
        {
          name: "can parse simple strings",
          test: () => {
            const result = evalHyperScript('"hello world"');
            return { success: result === "hello world", result, expected: "hello world" };
          }
        },
        {
          name: "can parse simple strings w/ single quotes",
          test: () => {
            const result = evalHyperScript("'hello world'");
            return { success: result === "hello world", result, expected: "hello world" };
          }
        }
      ];

      const results = [];
      for (const testCase of tests) {
        try {
          const result = testCase.test();
          results.push({
            name: testCase.name,
            success: result.success,
            result: result.result,
            expected: result.expected,
            error: null
          });
        } catch (error) {
          results.push({
            name: testCase.name,
            success: false,
            result: null,
            expected: null,
            error: error.message
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
    console.log(`  📊 String Tests: ${passed}/${results.length} passed (${Math.round(passed/results.length*100)}%)`);

    // Should pass 100%
    expect(passed).toBe(results.length);
  });

  test('Possessive Expression Tests (should pass)', async () => {
    const results = await page.evaluate(async () => {
      const tests = [
        {
          name: "its result works",
          test: () => {
            const result = evalHyperScript("its result", { result: { result: 'success' } });
            return { success: result === 'success', result, expected: 'success' };
          }
        },
        {
          name: "my property works",
          test: () => {
            const result = evalHyperScript("my value", { me: { value: 42 } });
            return { success: result === 42, result, expected: 42 };
          }
        },
        {
          name: "your property works",
          test: () => {
            const result = evalHyperScript("your data", { you: { data: 'test' } });
            return { success: result === 'test', result, expected: 'test' };
          }
        }
      ];

      const results = [];
      for (const testCase of tests) {
        try {
          const result = testCase.test();
          results.push({
            name: testCase.name,
            success: result.success,
            result: result.result,
            expected: result.expected,
            error: null
          });
        } catch (error) {
          results.push({
            name: testCase.name,
            success: false,
            result: null,
            expected: null,
            error: error.message
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
    console.log(`  📊 Possessive Tests: ${passed}/${results.length} passed (${Math.round(passed/results.length*100)}%)`);

    // Should pass 100%
    expect(passed).toBe(results.length);
  });

  test('Command Tests (expected to fail)', async () => {
    const results = await page.evaluate(async () => {
      const tests = [
        {
          name: "put command into innerHTML",
          test: () => {
            // This should fail - we don't have command system implemented
            clearWorkArea();
            const div = make('<div id="d1" _="on click put \\"foo\\" into #d1.innerHTML"></div>');
            div.click();
            return { success: div.innerHTML === "foo", result: div.innerHTML, expected: "foo" };
          }
        },
        {
          name: "set command",
          test: () => {
            // This should fail - we don't have command system implemented  
            clearWorkArea();
            const div = make('<div _="on click set my innerHTML to \\"test\\""></div>');
            div.click();
            return { success: div.innerHTML === "test", result: div.innerHTML, expected: "test" };
          }
        }
      ];

      const results = [];
      for (const testCase of tests) {
        try {
          const result = testCase.test();
          results.push({
            name: testCase.name,
            success: result.success,
            result: result.result,
            expected: result.expected,
            error: null
          });
        } catch (error) {
          results.push({
            name: testCase.name,
            success: false,
            result: null,
            expected: null,
            error: error.message
          });
        }
      }
      return results;
    });

    // Log results
    console.log('\n⚙️ Command Test Results (expected to fail):');
    let passed = 0;
    results.forEach(result => {
      if (result.success) {
        console.log(`  ✅ ${result.name} (unexpected pass!)`);
        passed++;
      } else {
        console.log(`  ❌ ${result.name}: ${result.error || 'failed as expected'}`);
      }
    });
    console.log(`  📊 Command Tests: ${passed}/${results.length} passed (${Math.round(passed/results.length*100)}%)`);

    // We expect these to fail since we haven't implemented the command system
    expect(passed).toBe(0);
  });

  test.afterAll(async () => {
    console.log('\n🎯 Baseline Test Summary:');
    console.log('✅ Expression tests: Should pass at high rate (60-100%)');
    console.log('❌ Command tests: Expected to fail (command system not implemented)');
    console.log('📈 Overall baseline established for future comparison');
  });
});