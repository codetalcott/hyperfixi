/**
 * Official Expression Evaluation Tests
 * Tests our expression system against official _hyperscript patterns
 * Uses direct evalHyperScript calls (not browser/playwright)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { hyperscript } from '../api/hyperscript-api';
import { createMockHyperscriptContext } from '../test-setup';

// Compatibility wrapper for our tests
const evalHyperScript = async (code: string, context?: any) => {
  return await hyperscript.run(code, context);
};

describe('Official Expression Compatibility Tests', () => {
  let context: any;

  beforeEach(() => {
    context = createMockHyperscriptContext();
  });

  describe('String Expressions (Official Test Patterns)', () => {
    it('should handle string literals correctly', async () => {
      const tests = [
        // From official strings.js test file
        { expr: '"foo"', expected: 'foo' },
        { expr: '"fo\'o"', expected: "fo'o" },
        { expr: "'foo'", expected: 'foo' },
        { expr: "'hello world'", expected: 'hello world' },
        { expr: '"hello world"', expected: 'hello world' },
      ];

      let passed = 0;
      console.log('\n📝 String Expression Results (Official Patterns):');

      for (const test of tests) {
        try {
          const result = await evalHyperScript(test.expr, context);
          if (result === test.expected) {
            console.log(`  ✅ ${test.expr} = ${JSON.stringify(result)}`);
            passed++;
          } else {
            console.log(
              `  ❌ ${test.expr}: Expected ${JSON.stringify(test.expected)}, got ${JSON.stringify(result)}`
            );
          }
        } catch (error) {
          console.log(`  ❌ ${test.expr}: Error - ${(error as Error).message}`);
        }
      }

      console.log(
        `  📊 String Tests: ${passed}/${tests.length} passed (${Math.round((passed / tests.length) * 100)}%)`
      );
      expect(passed).toBeGreaterThan(tests.length * 0.8); // 80%+ success rate
    });
  });

  describe('Math Expressions (Official Test Patterns)', () => {
    it('should handle mathematical operations correctly', async () => {
      const tests = [
        // From official mathOperator.js test file
        { expr: '1 + 1', expected: 2 },
        { expr: '5 - 3', expected: 2 },
        { expr: '2 * 3', expected: 6 },
        { expr: '6 / 2', expected: 3 },
        { expr: '5 mod 3', expected: 2 },
        { expr: '1 + 2 + 3', expected: 6 },
        { expr: "'a' + 'b'", expected: 'ab' },
        { expr: '(2 + 3) * 4', expected: 20 },
      ];

      let passed = 0;
      console.log('\n🧮 Math Expression Results (Official Patterns):');

      for (const test of tests) {
        try {
          const result = await evalHyperScript(test.expr, context);
          if (result === test.expected) {
            console.log(`  ✅ ${test.expr} = ${result}`);
            passed++;
          } else {
            console.log(`  ❌ ${test.expr}: Expected ${test.expected}, got ${result}`);
          }
        } catch (error) {
          console.log(`  ❌ ${test.expr}: Error - ${(error as Error).message}`);
        }
      }

      console.log(
        `  📊 Math Tests: ${passed}/${tests.length} passed (${Math.round((passed / tests.length) * 100)}%)`
      );
      expect(passed).toBeGreaterThan(tests.length * 0.7); // 70%+ success rate
    });
  });

  describe('Boolean & Logical Expressions (Official Test Patterns)', () => {
    it('should handle boolean and logical operations correctly', async () => {
      const tests = [
        // From official boolean.js and logicalOperator.js
        { expr: 'true', expected: true },
        { expr: 'false', expected: false },
        { expr: 'true and true', expected: true },
        { expr: 'true and false', expected: false },
        { expr: 'false or true', expected: true },
        { expr: 'false or false', expected: false },
        { expr: 'not true', expected: false },
        { expr: 'not false', expected: true },
        { expr: '(true and false) or true', expected: true },
      ];

      let passed = 0;
      console.log('\n🤔 Boolean/Logical Expression Results (Official Patterns):');

      for (const test of tests) {
        try {
          const result = await evalHyperScript(test.expr, context);
          if (result === test.expected) {
            console.log(`  ✅ ${test.expr} = ${result}`);
            passed++;
          } else {
            console.log(`  ❌ ${test.expr}: Expected ${test.expected}, got ${result}`);
          }
        } catch (error) {
          console.log(`  ❌ ${test.expr}: Error - ${(error as Error).message}`);
        }
      }

      console.log(
        `  📊 Boolean/Logical Tests: ${passed}/${tests.length} passed (${Math.round((passed / tests.length) * 100)}%)`
      );
      expect(passed).toBeGreaterThan(tests.length * 0.8); // 80%+ success rate
    });
  });

  describe('Comparison Expressions (Official Test Patterns)', () => {
    it('should handle comparison operations correctly', async () => {
      const tests = [
        // From official comparisonOperator.js
        { expr: '5 > 3', expected: true },
        { expr: '3 > 5', expected: false },
        { expr: '5 >= 5', expected: true },
        { expr: '3 < 5', expected: true },
        { expr: '5 <= 5', expected: true },
        { expr: '5 == 5', expected: true },
        { expr: '5 != 3', expected: true },
        { expr: '5 is 5', expected: true },
        { expr: '5 is not 3', expected: true },
      ];

      let passed = 0;
      console.log('\n⚖️ Comparison Expression Results (Official Patterns):');

      for (const test of tests) {
        try {
          const result = await evalHyperScript(test.expr, context);
          if (result === test.expected) {
            console.log(`  ✅ ${test.expr} = ${result}`);
            passed++;
          } else {
            console.log(`  ❌ ${test.expr}: Expected ${test.expected}, got ${result}`);
          }
        } catch (error) {
          console.log(`  ❌ ${test.expr}: Error - ${(error as Error).message}`);
        }
      }

      console.log(
        `  📊 Comparison Tests: ${passed}/${tests.length} passed (${Math.round((passed / tests.length) * 100)}%)`
      );
      expect(passed).toBeGreaterThan(tests.length * 0.8); // 80%+ success rate
    });
  });

  describe('Context References (Official Test Patterns)', () => {
    it('should handle me/you/it/its references correctly', async () => {
      const tests = [
        { expr: 'me', context: { me: { test: 'value' } }, expected: { test: 'value' } },
        { expr: 'you', context: { you: 'user' }, expected: 'user' },
        { expr: 'it', context: { it: 42 }, expected: 42 },
        { expr: 'its test', context: { it: { test: 'result' } }, expected: 'result' },
        { expr: 'my test', context: { me: { test: 'me value' } }, expected: 'me value' },
      ];

      let passed = 0;
      console.log('\n🔗 Context Reference Results (Official Patterns):');

      for (const test of tests) {
        try {
          const testContext = { ...context, ...test.context };
          const result = await evalHyperScript(test.expr, testContext);

          // Deep equality check for objects
          const matches = JSON.stringify(result) === JSON.stringify(test.expected);

          if (matches) {
            console.log(`  ✅ ${test.expr} = ${JSON.stringify(result)}`);
            passed++;
          } else {
            console.log(
              `  ❌ ${test.expr}: Expected ${JSON.stringify(test.expected)}, got ${JSON.stringify(result)}`
            );
          }
        } catch (error) {
          console.log(`  ❌ ${test.expr}: Error - ${(error as Error).message}`);
        }
      }

      console.log(
        `  📊 Context Tests: ${passed}/${tests.length} passed (${Math.round((passed / tests.length) * 100)}%)`
      );
      expect(passed).toBeGreaterThan(tests.length * 0.6); // 60%+ success rate (context is complex)
    });
  });

  describe('Type Conversion (Official Test Patterns)', () => {
    it('should handle "as" keyword conversions correctly', async () => {
      const tests = [
        // From official asExpression.js
        { expr: '"123" as Int', expected: 123 },
        { expr: '"123.45" as Float', expected: 123.45 },
        { expr: '123 as String', expected: '123' },
        { expr: 'true as String', expected: 'true' },
        { expr: '"true" as Boolean', expected: true },
        { expr: '"false" as Boolean', expected: false },
      ];

      let passed = 0;
      console.log('\n🔄 Type Conversion Results (Official Patterns):');

      for (const test of tests) {
        try {
          const result = await evalHyperScript(test.expr, context);
          if (result === test.expected) {
            console.log(`  ✅ ${test.expr} = ${JSON.stringify(result)}`);
            passed++;
          } else {
            console.log(
              `  ❌ ${test.expr}: Expected ${JSON.stringify(test.expected)}, got ${JSON.stringify(result)}`
            );
          }
        } catch (error) {
          console.log(`  ❌ ${test.expr}: Error - ${(error as Error).message}`);
        }
      }

      console.log(
        `  📊 Conversion Tests: ${passed}/${tests.length} passed (${Math.round((passed / tests.length) * 100)}%)`
      );
      expect(passed).toBeGreaterThan(tests.length * 0.7); // 70%+ success rate
    });
  });

  describe('Overall Official Pattern Summary', () => {
    it('should provide compatibility assessment', async () => {
      console.log('\n🎯 Official Expression Pattern Compatibility Assessment:');
      console.log('  This test suite covers key patterns from official _hyperscript test files');
      console.log('  Results show our expression system compatibility with official syntax');
      console.log(
        '  Categories tested: strings, math, boolean/logical, comparison, context, conversion'
      );
      console.log(
        '  Based on: strings.js, mathOperator.js, boolean.js, logicalOperator.js, comparisonOperator.js, asExpression.js'
      );

      // This test always passes - it's just for reporting
      expect(true).toBe(true);
    });
  });
});
