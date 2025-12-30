/**
 * Expression Parser Tests
 */

import { describe, it, expect } from 'vitest';
import { parseExpression } from '../src/ast-builder/expression-parser';

describe('ExpressionParser', () => {
  describe('Literals', () => {
    it('parses numbers', () => {
      const result = parseExpression('42');
      expect(result.success).toBe(true);
      expect(result.node).toMatchObject({
        type: 'literal',
        value: 42,
        dataType: 'number',
      });
    });

    it('parses strings', () => {
      const result = parseExpression('"hello"');
      expect(result.success).toBe(true);
      expect(result.node).toMatchObject({
        type: 'literal',
        value: 'hello',
        dataType: 'string',
      });
    });

    it('parses booleans', () => {
      expect(parseExpression('true').node).toMatchObject({ type: 'literal', value: true });
      expect(parseExpression('false').node).toMatchObject({ type: 'literal', value: false });
    });

    it('parses null and undefined', () => {
      expect(parseExpression('null').node).toMatchObject({ type: 'literal', value: null });
      expect(parseExpression('undefined').node).toMatchObject({ type: 'literal', value: undefined });
    });
  });

  describe('Selectors', () => {
    it('parses ID selectors', () => {
      const result = parseExpression('#button');
      expect(result.success).toBe(true);
      expect(result.node).toMatchObject({
        type: 'selector',
        value: '#button',
        selectorType: 'id',
      });
    });

    it('parses class selectors', () => {
      const result = parseExpression('.active');
      expect(result.success).toBe(true);
      expect(result.node).toMatchObject({
        type: 'selector',
        value: '.active',
        selectorType: 'class',
      });
    });

    it('parses attribute selectors', () => {
      const result = parseExpression('[data-id="123"]');
      expect(result.success).toBe(true);
      expect(result.node).toMatchObject({
        type: 'selector',
        selectorType: 'attribute',
      });
    });

    it('parses query selectors', () => {
      const result = parseExpression('<button/>');
      expect(result.success).toBe(true);
      expect(result.node).toMatchObject({
        type: 'selector',
        value: 'button',
        selectorType: 'query',
      });
    });
  });

  describe('Context References', () => {
    it('parses me', () => {
      const result = parseExpression('me');
      expect(result.success).toBe(true);
      expect(result.node).toMatchObject({
        type: 'contextReference',
        contextType: 'me',
      });
    });

    it('parses it', () => {
      const result = parseExpression('it');
      expect(result.success).toBe(true);
      expect(result.node).toMatchObject({
        type: 'contextReference',
        contextType: 'it',
      });
    });

    it('parses event', () => {
      const result = parseExpression('event');
      expect(result.success).toBe(true);
      expect(result.node).toMatchObject({
        type: 'contextReference',
        contextType: 'event',
      });
    });

    it('parses target', () => {
      const result = parseExpression('target');
      expect(result.success).toBe(true);
      expect(result.node).toMatchObject({
        type: 'contextReference',
        contextType: 'target',
      });
    });
  });

  describe('Property Access', () => {
    it('parses dot notation', () => {
      const result = parseExpression('me.value');
      expect(result.success).toBe(true);
      expect(result.node).toMatchObject({
        type: 'propertyAccess',
        object: { type: 'contextReference', contextType: 'me' },
        property: 'value',
      });
    });

    it('parses possessive notation', () => {
      const result = parseExpression("me's value");
      expect(result.success).toBe(true);
      expect(result.node).toMatchObject({
        type: 'possessiveExpression',
        object: { type: 'contextReference', contextType: 'me' },
        property: 'value',
      });
    });

    it('parses chained property access', () => {
      const result = parseExpression('event.target.value');
      expect(result.success).toBe(true);
      expect(result.node?.type).toBe('propertyAccess');
    });
  });

  describe('Binary Expressions', () => {
    it('parses addition', () => {
      const result = parseExpression('1 + 2');
      expect(result.success).toBe(true);
      expect(result.node).toMatchObject({
        type: 'binaryExpression',
        operator: '+',
        left: { type: 'literal', value: 1 },
        right: { type: 'literal', value: 2 },
      });
    });

    it('parses comparison', () => {
      const result = parseExpression('x == 5');
      expect(result.success).toBe(true);
      expect(result.node).toMatchObject({
        type: 'binaryExpression',
        operator: '==',
      });
    });

    it('parses logical and', () => {
      const result = parseExpression('true and false');
      expect(result.success).toBe(true);
      expect(result.node).toMatchObject({
        type: 'binaryExpression',
        operator: 'and',
      });
    });

    it('parses logical or', () => {
      const result = parseExpression('true or false');
      expect(result.success).toBe(true);
      expect(result.node).toMatchObject({
        type: 'binaryExpression',
        operator: 'or',
      });
    });

    it('respects operator precedence', () => {
      const result = parseExpression('1 + 2 * 3');
      expect(result.success).toBe(true);
      // Should be 1 + (2 * 3), not (1 + 2) * 3
      expect(result.node).toMatchObject({
        type: 'binaryExpression',
        operator: '+',
        left: { type: 'literal', value: 1 },
        right: {
          type: 'binaryExpression',
          operator: '*',
          left: { type: 'literal', value: 2 },
          right: { type: 'literal', value: 3 },
        },
      });
    });
  });

  describe('Unary Expressions', () => {
    it('parses not', () => {
      const result = parseExpression('not true');
      expect(result.success).toBe(true);
      expect(result.node).toMatchObject({
        type: 'unaryExpression',
        operator: 'not',
        operand: { type: 'literal', value: true },
      });
    });

    it('parses negative numbers', () => {
      const result = parseExpression('-5');
      expect(result.success).toBe(true);
      expect(result.node).toMatchObject({
        type: 'unaryExpression',
        operator: '-',
      });
    });
  });

  describe('Time Expressions', () => {
    it('parses milliseconds', () => {
      const result = parseExpression('500ms');
      expect(result.success).toBe(true);
      expect(result.node).toMatchObject({
        type: 'timeExpression',
        value: 500,
        unit: 'ms',
      });
    });

    it('parses seconds', () => {
      const result = parseExpression('2s');
      expect(result.success).toBe(true);
      expect(result.node).toMatchObject({
        type: 'timeExpression',
        value: 2,
        unit: 's',
      });
    });
  });

  describe('Arrays and Objects', () => {
    it('parses arrays', () => {
      const result = parseExpression('[1, 2, 3]');
      expect(result.success).toBe(true);
      expect(result.node).toMatchObject({
        type: 'arrayLiteral',
        elements: [
          { type: 'literal', value: 1 },
          { type: 'literal', value: 2 },
          { type: 'literal', value: 3 },
        ],
      });
    });

    it('parses objects', () => {
      const result = parseExpression('{ name: "test", value: 42 }');
      expect(result.success).toBe(true);
      expect(result.node?.type).toBe('objectLiteral');
    });
  });

  describe('Function Calls', () => {
    it('parses function calls', () => {
      const result = parseExpression('foo(1, 2)');
      expect(result.success).toBe(true);
      expect(result.node).toMatchObject({
        type: 'callExpression',
        callee: { type: 'identifier', name: 'foo' },
        arguments: [
          { type: 'literal', value: 1 },
          { type: 'literal', value: 2 },
        ],
      });
    });

    it('parses method calls', () => {
      const result = parseExpression('obj.method()');
      expect(result.success).toBe(true);
      expect(result.node?.type).toBe('callExpression');
    });
  });

  describe('Complex Expressions', () => {
    it('parses parenthesized expressions', () => {
      const result = parseExpression('(1 + 2) * 3');
      expect(result.success).toBe(true);
      expect(result.node).toMatchObject({
        type: 'binaryExpression',
        operator: '*',
        left: {
          type: 'binaryExpression',
          operator: '+',
        },
        right: { type: 'literal', value: 3 },
      });
    });

    it("parses me's innerHTML", () => {
      const result = parseExpression("me's innerHTML");
      expect(result.success).toBe(true);
      expect(result.node).toMatchObject({
        type: 'possessiveExpression',
        object: { type: 'contextReference', contextType: 'me' },
        property: 'innerHTML',
      });
    });

    it('parses event.target.value', () => {
      const result = parseExpression('event.target.value');
      expect(result.success).toBe(true);
      expect(result.node?.type).toBe('propertyAccess');
    });
  });

  describe('Error Handling', () => {
    it('returns error for empty input', () => {
      const result = parseExpression('');
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('returns error for unclosed parentheses', () => {
      const result = parseExpression('(1 + 2');
      expect(result.success).toBe(false);
    });
  });
});
