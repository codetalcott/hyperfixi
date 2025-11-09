/**
 * Type Conversion ('as' keyword) Fix Test
 * TDD approach: Write failing tests, then implement missing functionality
 * Target: Fix 'as' keyword for 100% type conversion compatibility
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { hyperscript } from '../api/hyperscript-api';
import { createMockHyperscriptContext } from '../test-setup';

// Compatibility wrapper for our tests
const evalHyperScript = async (code: string, context?: any) => {
  return await hyperscript.run(code, context);
};

describe('Type Conversion Fix', () => {
  let context: any;

  beforeEach(() => {
    context = createMockHyperscriptContext();
  });

  describe('Basic Type Conversions', () => {
    it('should handle string to number conversions', async () => {
      const tests = [
        { expr: '"123" as Int', expected: 123 },
        { expr: '"123.45" as Float', expected: 123.45 },
        { expr: '"123.45" as Number', expected: 123.45 },
        { expr: '"0" as Int', expected: 0 },
        { expr: '"-42" as Int', expected: -42 },
      ];

      let passed = 0;
      console.log('\n🔢 Testing string to number conversions:');

      for (const test of tests) {
        try {
          const result = await evalHyperScript(test.expr, context);
          if (result === test.expected) {
            console.log(`  ✅ ${test.expr} = ${result}`);
            passed++;
          } else {
            console.log(
              `  ❌ ${test.expr}: Expected ${test.expected}, got ${result} (${typeof result})`
            );
          }
        } catch (error) {
          console.log(`  ❌ ${test.expr}: Error - ${error.message}`);
        }
      }

      console.log(
        `  📊 Number Conversion Tests: ${passed}/${tests.length} passed (${Math.round((passed / tests.length) * 100)}%)`
      );
      expect(passed).toBe(tests.length); // All must pass
    });
  });

  describe('Number to String Conversions', () => {
    it('should handle number to string conversions', async () => {
      const tests = [
        { expr: '123 as String', expected: '123' },
        { expr: '123.45 as String', expected: '123.45' },
        { expr: '0 as String', expected: '0' },
        { expr: '-42 as String', expected: '-42' },
      ];

      let passed = 0;
      console.log('\n📝 Testing number to string conversions:');

      for (const test of tests) {
        try {
          const result = await evalHyperScript(test.expr, context);
          if (result === test.expected) {
            console.log(`  ✅ ${test.expr} = "${result}"`);
            passed++;
          } else {
            console.log(
              `  ❌ ${test.expr}: Expected "${test.expected}", got "${result}" (${typeof result})`
            );
          }
        } catch (error) {
          console.log(`  ❌ ${test.expr}: Error - ${error.message}`);
        }
      }

      console.log(
        `  📊 String Conversion Tests: ${passed}/${tests.length} passed (${Math.round((passed / tests.length) * 100)}%)`
      );
      expect(passed).toBe(tests.length); // All must pass
    });
  });

  describe('Boolean Conversions', () => {
    it('should handle boolean conversions', async () => {
      const tests = [
        { expr: '"true" as Boolean', expected: true },
        { expr: '"false" as Boolean', expected: false },
        { expr: 'true as String', expected: 'true' },
        { expr: 'false as String', expected: 'false' },
        { expr: '1 as Boolean', expected: true },
        { expr: '0 as Boolean', expected: false },
      ];

      let passed = 0;
      console.log('\n🔄 Testing boolean conversions:');

      for (const test of tests) {
        try {
          const result = await evalHyperScript(test.expr, context);
          if (result === test.expected) {
            console.log(`  ✅ ${test.expr} = ${result} (${typeof result})`);
            passed++;
          } else {
            console.log(
              `  ❌ ${test.expr}: Expected ${test.expected} (${typeof test.expected}), got ${result} (${typeof result})`
            );
          }
        } catch (error) {
          console.log(`  ❌ ${test.expr}: Error - ${error.message}`);
        }
      }

      console.log(
        `  📊 Boolean Conversion Tests: ${passed}/${tests.length} passed (${Math.round((passed / tests.length) * 100)}%)`
      );
      expect(passed).toBe(tests.length); // All must pass
    });
  });

  describe('Array and Object Conversions', () => {
    it('should handle array and object conversions', async () => {
      const tests = [
        { expr: '"[1,2,3]" as JSON', expected: [1, 2, 3] },
        { expr: '\'{"name":"test"}\' as JSON', expected: { name: 'test' } },
        { expr: '"" as Array', expected: [] },
      ];

      let passed = 0;
      console.log('\n🗃️ Testing array/object conversions:');

      for (const test of tests) {
        try {
          const result = await evalHyperScript(test.expr, context);
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
          console.log(`  ❌ ${test.expr}: Error - ${error.message}`);
        }
      }

      console.log(
        `  📊 Array/Object Conversion Tests: ${passed}/${tests.length} passed (${Math.round((passed / tests.length) * 100)}%)`
      );
      expect(passed).toBe(tests.length); // All must pass
    });
  });

  describe('Overall Type Conversion Assessment', () => {
    it('should provide assessment of type conversion fix', async () => {
      console.log('\n🎯 Type Conversion Fix Assessment:');
      console.log('  This test identifies specific failures in "as" keyword conversions');
      console.log('  Once implemented, these tests should achieve 100% pass rate');
      console.log('  Expected after fix: Type conversion compatibility 100% (was 0%)');

      expect(true).toBe(true);
    });
  });
});
