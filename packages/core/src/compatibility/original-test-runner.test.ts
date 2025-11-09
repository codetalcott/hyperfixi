/**
 * Original _hyperscript Test Suite Runner
 * Runs adapted tests from the original _hyperscript test suite
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { evalHyperScript } from './eval-hyperscript';

// Helper function to clear work area (from original tests)
function clearWorkArea() {
  // In original tests this clears DOM, we'll use it for consistency
}

// Mock for should assertions (original tests use chai)
const should = {
  equal: (actual: any, expected: any) => expect(actual).toBe(expected),
};

// Add should property to all values (chai-style)
function addShouldProperty(value: any) {
  if (value && typeof value === 'object') {
    value.should = {
      equal: (expected: any) => expect(value).toBe(expected),
    };
  } else {
    // For primitives, we'll handle it differently
    return {
      value,
      should: {
        equal: (expected: any) => expect(value).toBe(expected),
      },
    };
  }
  return value;
}

describe('Original _hyperscript Test Suite Compatibility', () => {
  beforeEach(() => {
    clearWorkArea();
  });

  describe('Possessive Expression Tests (from possessiveExpression.js)', () => {
    // Direct adaptation from _hyperscript/test/expressions/possessiveExpression.js

    it('can access basic properties', async () => {
      const result = await evalHyperScript("foo's foo", { locals: { foo: { foo: 'foo' } } });
      result.should.equal('foo');
    });

    it('is null safe', async () => {
      const result = await evalHyperScript("foo's foo");
      should.equal(result, undefined);
    });

    it('can access my properties', async () => {
      const mockElement = {
        foo: 'foo',
        hasAttribute: () => false,
        getAttribute: () => null,
        setAttribute: () => {},
        tagName: 'DIV',
      };
      const result = await evalHyperScript('my foo', { me: mockElement });
      result.should.equal('foo');
    });

    it('my property is null safe', async () => {
      const result = await evalHyperScript('my foo');
      should.equal(result, undefined);
    });

    it('can access its properties', async () => {
      const result = await evalHyperScript('its foo', { result: { foo: 'foo' } });
      result.should.equal('foo');
    });

    it('its property is null safe', async () => {
      const result = await evalHyperScript('its foo');
      should.equal(result, undefined);
    });

    it('can access your properties', async () => {
      const mockElement = {
        foo: 'foo',
        hasAttribute: () => false,
        getAttribute: () => null,
        setAttribute: () => {},
        tagName: 'DIV',
      };
      const result = await evalHyperScript('your foo', { you: mockElement });
      result.should.equal('foo');
    });

    it('your property is null safe', async () => {
      const result = await evalHyperScript('your foo');
      should.equal(result, undefined);
    });

    it('can access chained properties', async () => {
      const result = await evalHyperScript("foo's bar's baz", {
        locals: { foo: { bar: { baz: 'baz' } } },
      });
      result.should.equal('baz');
    });

    it('chained properties are null safe', async () => {
      const result = await evalHyperScript("foo's bar's baz", {
        locals: { foo: null },
      });
      should.equal(result, undefined);
    });
  });

  describe('Arithmetic Expression Tests (from mathOperator.js)', () => {
    // Direct adaptation from _hyperscript/test/expressions/mathOperator.js

    it('can add', async () => {
      const result = await evalHyperScript('1 + 1');
      result.should.equal(2);
    });

    it('can subtract', async () => {
      const result = await evalHyperScript('3 - 1');
      result.should.equal(2);
    });

    it('can multiply', async () => {
      const result = await evalHyperScript('2 * 3');
      result.should.equal(6);
    });

    it('can divide', async () => {
      const result = await evalHyperScript('6 / 3');
      result.should.equal(2);
    });

    it('can mod', async () => {
      const result = await evalHyperScript('5 mod 3');
      result.should.equal(2);
    });

    it('respects precedence', async () => {
      const result = await evalHyperScript('1 + 2 * 3');
      result.should.equal(7);
    });

    it('handles parentheses', async () => {
      const result = await evalHyperScript('(1 + 2) * 3');
      result.should.equal(9);
    });
  });

  describe('Comparison Operator Tests (from comparisonOperator.js)', () => {
    // Direct adaptation from _hyperscript/test/expressions/comparisonOperator.js

    it('can compare equality', async () => {
      const result = await evalHyperScript('1 == 1');
      result.should.equal(true);
    });

    it('can compare inequality', async () => {
      const result = await evalHyperScript('1 != 2');
      result.should.equal(true);
    });

    it('can compare greater than', async () => {
      const result = await evalHyperScript('2 > 1');
      result.should.equal(true);
    });

    it('can compare less than', async () => {
      const result = await evalHyperScript('1 < 2');
      result.should.equal(true);
    });

    it('can compare greater than or equal', async () => {
      const result = await evalHyperScript('2 >= 2');
      result.should.equal(true);
    });

    it('can compare less than or equal', async () => {
      const result = await evalHyperScript('2 <= 2');
      result.should.equal(true);
    });
  });

  describe('String Expression Tests (from strings.js)', () => {
    // Direct adaptation from _hyperscript/test/expressions/strings.js

    it('can parse simple strings', async () => {
      const result = await evalHyperScript('"foo"');
      result.should.equal('foo');
    });

    it('can parse single quoted strings', async () => {
      const result = await evalHyperScript("'foo'");
      result.should.equal('foo');
    });

    it('can concatenate strings', async () => {
      const result = await evalHyperScript('"foo" + "bar"');
      result.should.equal('foobar');
    });

    it('can mix string and number concatenation', async () => {
      const result = await evalHyperScript('"number: " + 42');
      result.should.equal('number: 42');
    });
  });

  describe('Logical Operator Tests (from logicalOperator.js)', () => {
    // Direct adaptation from _hyperscript/test/expressions/logicalOperator.js

    it('can and', async () => {
      const result = await evalHyperScript('true and true');
      result.should.equal(true);
    });

    it('can or', async () => {
      const result = await evalHyperScript('false or true');
      result.should.equal(true);
    });

    it('can not', async () => {
      const result = await evalHyperScript('not false');
      result.should.equal(true);
    });

    it('handles logical precedence', async () => {
      const result = await evalHyperScript('true or false and false');
      result.should.equal(true); // 'and' has higher precedence
    });
  });

  describe('Type Conversion Tests (from asExpression.js)', () => {
    // Direct adaptation from _hyperscript/test/expressions/asExpression.js

    it('can convert to Int', async () => {
      const result = await evalHyperScript('"123" as Int');
      result.should.equal(123);
    });

    it('can convert to Float', async () => {
      const result = await evalHyperScript('"123.45" as Float');
      result.should.equal(123.45);
    });

    it('can convert to String', async () => {
      const result = await evalHyperScript('123 as String');
      result.should.equal('123');
    });

    it('can convert to JSON', async () => {
      const result = await evalHyperScript('obj as JSON', {
        locals: { obj: { foo: 'bar' } },
      });
      result.should.equal('{"foo":"bar"}');
    });
  });
});
