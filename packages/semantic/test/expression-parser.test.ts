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
      expect(parseExpression('undefined').node).toMatchObject({
        type: 'literal',
        value: undefined,
      });
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
      const result = parseExpression('[@data-id="123"]');
      expect(result.success).toBe(true);
      expect(result.node).toMatchObject({
        type: 'selector',
        selectorType: 'attribute',
      });
    });

    // A bare `[…]` is an array in hyperscript (upstream rejects `[data-id="123"]`
    // outright): `[n, 2]` read as the attribute selector `[n, 2]`, which every
    // translation's direct path queried and threw on.
    it.each(['[n, 2]', '[title]'])('reads %s as an array', source => {
      expect(parseExpression(source).node).toMatchObject({ type: 'arrayLiteral' });
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

  // Context words emit plain `identifier` nodes — the traditional parser's
  // spelling (Thread B item 5); the core evaluator resolves them by name.
  describe('Context References', () => {
    it('parses me', () => {
      const result = parseExpression('me');
      expect(result.success).toBe(true);
      expect(result.node).toMatchObject({
        type: 'identifier',
        name: 'me',
      });
    });

    it('parses it', () => {
      const result = parseExpression('it');
      expect(result.success).toBe(true);
      expect(result.node).toMatchObject({
        type: 'identifier',
        name: 'it',
      });
    });

    it('parses event', () => {
      const result = parseExpression('event');
      expect(result.success).toBe(true);
      expect(result.node).toMatchObject({
        type: 'identifier',
        name: 'event',
      });
    });

    it('parses target', () => {
      const result = parseExpression('target');
      expect(result.success).toBe(true);
      expect(result.node).toMatchObject({
        type: 'identifier',
        name: 'target',
      });
    });
  });

  describe('Property Access', () => {
    it('parses dot notation as the traditional nested memberExpression', () => {
      const result = parseExpression('me.value');
      expect(result.success).toBe(true);
      expect(result.node).toMatchObject({
        type: 'memberExpression',
        object: { type: 'identifier', name: 'me' },
        property: { type: 'identifier', name: 'value' },
        computed: false,
      });
    });

    it('parses possessive notation', () => {
      // The property is an identifier node, as core's parser builds it: core's
      // runtime reads `property.name`, and a bare string read as no property.
      const result = parseExpression("me's value");
      expect(result.success).toBe(true);
      expect(result.node).toMatchObject({
        type: 'possessiveExpression',
        object: { type: 'identifier', name: 'me' },
        property: { type: 'identifier', name: 'value' },
      });
    });

    it('parses chained property access as a nested chain', () => {
      const result = parseExpression('event.target.value');
      expect(result.success).toBe(true);
      expect(result.node).toMatchObject({
        type: 'memberExpression',
        object: {
          type: 'memberExpression',
          object: { type: 'identifier', name: 'event' },
          property: { type: 'identifier', name: 'target' },
        },
        property: { type: 'identifier', name: 'value' },
      });
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
          properties: [{ key: { type: 'identifier', name: key } }],
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
        object: { type: 'identifier', name: 'me' },
        property: { type: 'identifier', name: 'innerHTML' },
      });
    });

    it('parses event.target.value', () => {
      const result = parseExpression('event.target.value');
      expect(result.success).toBe(true);
      expect(result.node?.type).toBe('memberExpression');
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
        left: { type: 'identifier', name: 'target' },
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
        left: { type: 'identifier', name: 'result' },
        right: { type: 'literal', value: false },
      });
    });
  });

  // The remaining en condition forms (gate if-exists / if-empty /
  // input-validation execution): the `exists` postfix predicate, the
  // `is empty` / `is not empty` unary predicates, and the possessive SPACE
  // form (`my value`) folding to the traditional parser's memberExpression
  // (object normalised to the base word). All evaluate through existing core
  // runtime expressions (exists/isEmpty/isNotEmpty; memberExpression).
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
          type: 'memberExpression',
          object: { type: 'identifier', name: 'me' },
          property: { type: 'identifier', name: 'value' },
          computed: false,
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

  // Core's comparison phrases, in the shapes core's parser builds. buildAST
  // parses every translated condition here, and this read only `is`, `is
  // empty` and `is not empty`: `p is not q` became `p is (not q)`.
  describe("core's comparison phrases", () => {
    const binary = (operator: string, left: object, right: object) => ({
      type: 'binaryExpression',
      operator,
      left,
      right,
    });
    const p = { type: 'identifier', name: 'p' };
    const q = { type: 'identifier', name: 'q' };

    it.each([
      ['p is not q', binary('is not', p, q)],
      ['p is less than q', binary('is less than', p, q)],
      [
        'p is greater than or equal to 1',
        binary('is greater than or equal to', p, { type: 'literal', value: 1 }),
      ],
      ['p is really equal to q', binary('is really equal to', p, q)],
      ['p is not in [3, 4]', binary('is not in', p, { type: 'arrayLiteral' })],
      [
        '#d1 does not match .x',
        binary(
          'does not match',
          { type: 'selector', value: '#d1' },
          { type: 'selector', value: '.x' }
        ),
      ],
      [
        '#d1 has .x',
        binary('has', { type: 'selector', value: '#d1' }, { type: 'selector', value: '.x' }),
      ],
      ['p am q', binary('am', p, q)],
    ])('%s', (source, node) => {
      const result = parseExpression(source);
      expect(result.success).toBe(true);
      expect(result.node).toMatchObject(node);
    });

    it('reads `does not exist` as a postfix predicate', () => {
      expect(parseExpression('#zz does not exist').node).toMatchObject({
        type: 'unaryExpression',
        operator: 'does not exist',
        operand: { type: 'selector', value: '#zz' },
        prefix: false,
      });
    });

    it('reads `is a` / `is not an …!` as a type check on a type NAME', () => {
      expect(parseExpression('p is a Number').node).toMatchObject({
        type: 'typeCheckExpression',
        value: p,
        typeName: 'Number',
        nullOk: true,
        negated: false,
      });
      expect(parseExpression('p is not an Array!').node).toMatchObject({
        type: 'typeCheckExpression',
        typeName: 'Array',
        nullOk: false,
        negated: true,
      });
    });

    it('reads `the X of Y` and `X of Y` as property access, tighter than `is`', () => {
      const textOfD1 = {
        type: 'propertyOfExpression',
        property: { type: 'identifier', name: 'textContent' },
        target: { type: 'selector', value: '#d1' },
      };
      expect(parseExpression('the textContent of #d1').node).toMatchObject(textOfD1);
      expect(parseExpression('textContent of #d1 is "d"').node).toMatchObject(
        binary('is', textOfD1, { type: 'literal', value: 'd' })
      );
    });
  });

  // Core's strict equality and `mod`, in the shapes core's parser builds.
  // `===` lexed as `==` and a stray `=`, and `mod` read as a bare identifier.
  describe("core's strict equality and mod", () => {
    const n = { type: 'identifier', name: 'n' };

    it.each([
      ['n === 3', '===', { type: 'literal', value: 3 }],
      ['n !== 3', '!==', { type: 'literal', value: 3 }],
      ['n mod 2', 'mod', { type: 'literal', value: 2 }],
    ])('%s', (source, operator, right) => {
      const result = parseExpression(source);
      expect(result.success).toBe(true);
      expect(result.node).toMatchObject({ type: 'binaryExpression', operator, left: n, right });
    });

    it('reads `mod` after a parenthesized sum', () => {
      expect(parseExpression('(n + 1) mod 3').node).toMatchObject({
        type: 'binaryExpression',
        operator: 'mod',
        left: { type: 'binaryExpression', operator: '+', left: n },
        right: { type: 'literal', value: 3 },
      });
    });
  });

  // Conversions and an attribute's `of`, in the shapes and bindings core's
  // parser builds. The parser stopped at `as` and at `@attr of`, so a value
  // with either inside it was cut short: buildAST dropped the conversion, and
  // the matcher could not read the value whole.
  describe("conversions and an attribute's `of`", () => {
    const n = { type: 'identifier', name: 'n' };
    const Int = { type: 'identifier', name: 'Int' };

    it('`n as Int`', () => {
      const result = parseExpression('n as Int');
      expect(result.success).toBe(true);
      expect(result.node).toMatchObject({ type: 'asExpression', expression: n, targetType: Int });
    });

    it('binds tighter than arithmetic: `n + 1 as Int` converts the `1`', () => {
      expect(parseExpression('n + 1 as Int').node).toMatchObject({
        type: 'binaryExpression',
        operator: '+',
        left: n,
        right: { type: 'asExpression', expression: { type: 'literal', value: 1 }, targetType: Int },
      });
    });

    it('binds looser than a prefix operator: `-n as Int` converts `-n`', () => {
      expect(parseExpression('-n as Int').node).toMatchObject({
        type: 'asExpression',
        expression: { type: 'unaryExpression', operator: '-', operand: n },
        targetType: Int,
      });
    });

    it('converts a possessive before the arithmetic after it', () => {
      expect(parseExpression("#a's textContent as Int + 1").node).toMatchObject({
        type: 'binaryExpression',
        operator: '+',
        left: {
          type: 'asExpression',
          expression: { type: 'possessiveExpression' },
          targetType: Int,
        },
        right: { type: 'literal', value: 1 },
      });
    });

    it('`v of obj as Int` converts the target, as upstream and core read it', () => {
      expect(parseExpression('v of obj as Int').node).toMatchObject({
        type: 'propertyOfExpression',
        property: { name: 'v' },
        target: { type: 'asExpression', expression: { name: 'obj' }, targetType: Int },
      });
    });

    it('`the v of obj as Int` converts the property, as core reads it', () => {
      // A known difference: upstream converts the target here too
      // (core/docs/UPSTREAM-KNOWN-DIFFS.md, THE_OF_TARGET_BP).
      expect(parseExpression('the v of obj as Int').node).toMatchObject({
        type: 'asExpression',
        expression: { type: 'propertyOfExpression', target: { name: 'obj' } },
        targetType: Int,
      });
    });

    it('skips an article', () => {
      expect(parseExpression('x as an Object').node).toMatchObject({
        type: 'asExpression',
        targetType: { name: 'Object' },
      });
    });

    it('leaves an `as` with no type unread', () => {
      const result = parseExpression('n as');
      expect(result.consumed).toBe(1);
    });

    // `|` chains conversions left to right, each converting the last one's
    // result, as core's pratt parser and upstream's AsExpression read it. The
    // tokenizer skipped `|`, so `n as JSONString | JSON` read as `n as
    // JSONString JSON` and stopped after the first type.
    it('a pipe converts the conversion before it', () => {
      const result = parseExpression('n as JSONString | JSON');
      expect(result.consumed).toBe(5);
      expect(result.node).toMatchObject({
        type: 'asExpression',
        expression: {
          type: 'asExpression',
          expression: n,
          targetType: { name: 'JSONString' },
        },
        targetType: { name: 'JSON' },
      });
    });

    it('a pipe chain binds as one conversion: `n as Int | String + 1`', () => {
      expect(parseExpression('n as Int | String + 1').node).toMatchObject({
        type: 'binaryExpression',
        operator: '+',
        left: {
          type: 'asExpression',
          expression: { type: 'asExpression', expression: n, targetType: Int },
          targetType: { name: 'String' },
        },
        right: { type: 'literal', value: 1 },
      });
    });

    it('leaves a pipe with no type unread', () => {
      expect(parseExpression('n as Int |').consumed).toBe(3);
    });

    it.each(['Fixed:2', 'Values:Form'])('reads `%s` as one type, as core names it', type => {
      expect(parseExpression(`n as ${type}`).node).toMatchObject({
        type: 'asExpression',
        expression: n,
        targetType: { type: 'identifier', name: type },
      });
    });

    it("`@title of #a` reads the target's attribute", () => {
      expect(parseExpression('@title of #a').node).toMatchObject({
        type: 'binaryExpression',
        operator: 'of',
        left: { type: 'attributeAccess', attributeName: 'title' },
        right: { type: 'selector', value: '#a' },
      });
    });

    it('`@title of #a + "q"` reads the attribute before the arithmetic', () => {
      expect(parseExpression('@title of #a + "q"').node).toMatchObject({
        type: 'binaryExpression',
        operator: '+',
        left: { type: 'binaryExpression', operator: 'of' },
        right: { type: 'literal', value: 'q' },
      });
    });
  });
});
