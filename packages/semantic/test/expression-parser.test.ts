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

    // A context-variable name is an ordinary property name in key position.
    // `{ body: ... }` is the common case — it's a `fetch` request option, not a
    // reference to the document body — and it used to throw 'Expected property
    // name', silently degrading the whole object to an identifier node.
    it.each(['body', 'me', 'it', 'result', 'event', 'target', 'detail'])(
      'parses `%s` as an object key, not a context variable',
      key => {
        const result = parseExpression(`{ ${key}: 'a=1' }`);
        expect(result.success).toBe(true);
        expect(result.node).toMatchObject({
          type: 'objectLiteral',
          properties: [{ key }],
        });
      }
    );
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

  // Keyword infix comparison operators (is/matches/contains/in) are tokenized as
  // IDENTIFIER and must be CONSUMED in parseEquality (checkValue only peeks).
  // Previously they were read via previous() without advancing, so the operator
  // was unconsumed and the operand mis-attributed — `target matches .x` came out
  // as a broken `matches.x` member access. This locks the consume + the selector
  // operand (a class selector tokenizes after a comparison keyword) + the `match`
  // → `matches` corpus alias. These conditions gate en control-flow execution.
  describe('keyword comparison operators with selector operands', () => {
    it('parses `target matches .modal-backdrop` as a matches binary (selector intact)', () => {
      const result = parseExpression('target matches .modal-backdrop');
      expect(result.success).toBe(true);
      expect(result.node).toMatchObject({
        type: 'binaryExpression',
        operator: 'matches',
        left: { type: 'contextReference', name: 'target' },
        right: { type: 'selector', value: '.modal-backdrop' },
      });
    });

    it('accepts the bare `match` form as an alias of `matches`', () => {
      const result = parseExpression('I match .active');
      expect(result.success).toBe(true);
      expect(result.node).toMatchObject({
        type: 'binaryExpression',
        operator: 'matches',
        right: { type: 'selector', value: '.active' },
      });
    });

    it('parses `result is false` as an `is` binary', () => {
      const result = parseExpression('result is false');
      expect(result.success).toBe(true);
      expect(result.node).toMatchObject({
        type: 'binaryExpression',
        operator: 'is',
        left: { type: 'contextReference', name: 'result' },
        right: { type: 'literal', value: false },
      });
    });
  });

  // The remaining en condition forms (gate if-exists / if-empty /
  // input-validation execution): the `exists` postfix predicate, the
  // `is empty` / `is not empty` unary predicates, and the possessive SPACE
  // form (`my value`) folding to a propertyAccess. All evaluate through
  // existing core runtime expressions (exists/isEmpty/isNotEmpty;
  // propertyAccess + the contextReference possessive aliases).
  describe('postfix predicates and possessive space form', () => {
    it('parses `#modal exists` as a postfix exists unary', () => {
      const result = parseExpression('#modal exists');
      expect(result.success).toBe(true);
      expect(result.node).toMatchObject({
        type: 'unaryExpression',
        operator: 'exists',
        prefix: false,
        operand: { type: 'selector', value: '#modal' },
      });
    });

    it('keeps `exists(...)` a call expression (not the postfix predicate)', () => {
      const result = parseExpression('exists(5)');
      expect(result.success).toBe(true);
      expect(result.node).toMatchObject({
        type: 'callExpression',
        callee: { type: 'identifier', name: 'exists' },
      });
    });

    it('parses `my value is empty` — possessive space form + is-empty unary', () => {
      const result = parseExpression('my value is empty');
      expect(result.success).toBe(true);
      expect(result.node).toMatchObject({
        type: 'unaryExpression',
        operator: 'is empty',
        operand: {
          type: 'propertyAccess',
          object: { type: 'contextReference', contextType: 'my' },
          property: 'value',
        },
      });
    });

    it('parses `my value is not empty` as the negated unary', () => {
      const result = parseExpression('my value is not empty');
      expect(result.success).toBe(true);
      expect(result.node).toMatchObject({
        type: 'unaryExpression',
        operator: 'is not empty',
      });
    });

    it('does not fold the space form past an operator keyword (`result is false` intact)', () => {
      // `result` is a context var but NOT a possessive one — no folding at all;
      // and for possessives, `is` is a stop word so `my is …` never folds.
      const result = parseExpression('result is false');
      expect(result.success).toBe(true);
      expect(result.node).toMatchObject({ type: 'binaryExpression', operator: 'is' });
    });
  });

  // Positional builtin + selector operand folds to a call expression — the
  // shape the core runtime's positional expressions evaluate (its call
  // evaluator passes selector args as raw strings). Previously
  // `next .dropdown-menu` mangled into a `next.dropdown - menu` binary.
  describe('positional builtin call folding', () => {
    it('parses `next .dropdown-menu` as next(".dropdown-menu")', () => {
      const result = parseExpression('next .dropdown-menu');
      expect(result.success).toBe(true);
      expect(result.node).toMatchObject({
        type: 'callExpression',
        callee: { type: 'identifier', name: 'next' },
        arguments: [{ type: 'selector', value: '.dropdown-menu' }],
      });
    });

    it('parses `closest .modal` as closest(".modal")', () => {
      const result = parseExpression('closest .modal');
      expect(result.success).toBe(true);
      expect(result.node).toMatchObject({
        type: 'callExpression',
        callee: { type: 'identifier', name: 'closest' },
        arguments: [{ type: 'selector', value: '.modal' }],
      });
    });

    it('a bare positional word stays an identifier (`next` alone)', () => {
      const result = parseExpression('next');
      expect(result.success).toBe(true);
      expect(result.node).toMatchObject({ type: 'identifier', name: 'next' });
    });
  });

  // Bare `@attr` references (`toggle @hidden`, `set @disabled to true`). The
  // tokenizer previously skipped the `@` as an unknown character, so the
  // attribute surfaced as a plain identifier and the write commands treated it
  // as a class/selector. Now emitted as the canonical attributeAccess shape.
  describe('attribute references (@attr)', () => {
    it('parses `@hidden` as an attributeAccess node', () => {
      const result = parseExpression('@hidden');
      expect(result.success).toBe(true);
      expect(result.node).toMatchObject({ type: 'attributeAccess', attributeName: 'hidden' });
    });

    it('parses hyphenated attribute names (`@aria-selected`)', () => {
      const result = parseExpression('@aria-selected');
      expect(result.success).toBe(true);
      expect(result.node).toMatchObject({
        type: 'attributeAccess',
        attributeName: 'aria-selected',
      });
    });
  });
});
