/**
 * Expression Transforms Tests
 */

import { describe, it, expect } from 'vitest';
import {
  ExpressionCodegen,
  sanitizeClassName,
  sanitizeSelector,
  sanitizeIdentifier,
} from './expression-transforms.js';
import type { CodegenContext, AnalysisResult, CodegenOptions } from '../types/aot-types.js';

function createMockContext(): CodegenContext {
  const requiredHelpers = new Set<string>();

  return {
    handlerId: 'test_handler',
    generateId: (prefix = '_id') => `${prefix}_0`,
    generateExpression: () => '',
    implicitTarget: '_ctx.me',
    localVarDeclarations: '',
    canCacheSelector: () => false,
    getCachedSelector: sel => `document.querySelector('${sel}')`,
    requireHelper: name => {
      requiredHelpers.add(name);
    },
    requiredHelpers,
    analysis: {} as AnalysisResult,
    options: {} as CodegenOptions,
  };
}

describe('sanitizeClassName', () => {
  it('returns valid class names unchanged', () => {
    expect(sanitizeClassName('active')).toBe('active');
    expect(sanitizeClassName('btn-primary')).toBe('btn-primary');
    expect(sanitizeClassName('_hidden')).toBe('_hidden');
    expect(sanitizeClassName('class123')).toBe('class123');
  });

  it('returns null for invalid class names', () => {
    expect(sanitizeClassName('123abc')).toBeNull();
    expect(sanitizeClassName('class name')).toBeNull();
    expect(sanitizeClassName('class.name')).toBeNull();
    expect(sanitizeClassName('')).toBeNull();
  });

  it('allows classes starting with hyphen', () => {
    expect(sanitizeClassName('-hidden')).toBe('-hidden');
  });
});

describe('sanitizeSelector', () => {
  it('escapes backslashes', () => {
    expect(sanitizeSelector('div\\:hover')).toBe('div\\\\:hover');
  });

  it('escapes quotes', () => {
    expect(sanitizeSelector("div[data='value']")).toBe("div[data=\\'value\\']");
    expect(sanitizeSelector('div[data="value"]')).toBe('div[data=\\"value\\"]');
  });

  it('escapes newlines', () => {
    expect(sanitizeSelector('div\nspan')).toBe('div\\nspan');
  });

  it('removes null bytes', () => {
    expect(sanitizeSelector('div\0span')).toBe('divspan');
  });
});

describe('sanitizeIdentifier', () => {
  it('replaces invalid characters with underscores', () => {
    expect(sanitizeIdentifier('my-var')).toBe('my_var');
    expect(sanitizeIdentifier('my.var')).toBe('my_var');
    expect(sanitizeIdentifier('my var')).toBe('my_var');
  });

  it('preserves valid characters', () => {
    expect(sanitizeIdentifier('myVar')).toBe('myVar');
    expect(sanitizeIdentifier('my_var')).toBe('my_var');
    expect(sanitizeIdentifier('$var')).toBe('$var');
    expect(sanitizeIdentifier('var123')).toBe('var123');
  });
});

describe('ExpressionCodegen', () => {
  let ctx: CodegenContext;
  let codegen: ExpressionCodegen;

  function setup() {
    ctx = createMockContext();
    codegen = new ExpressionCodegen(ctx);
  }

  describe('literals', () => {
    it('generates string literals', () => {
      setup();
      const result = codegen.generate({ type: 'literal', value: 'hello' });
      expect(result).toBe('"hello"');
    });

    it('generates number literals', () => {
      setup();
      const result = codegen.generate({ type: 'literal', value: 42 });
      expect(result).toBe('42');
    });

    it('generates boolean literals', () => {
      setup();
      expect(codegen.generate({ type: 'literal', value: true })).toBe('true');
      expect(codegen.generate({ type: 'literal', value: false })).toBe('false');
    });

    it('generates null', () => {
      setup();
      expect(codegen.generate({ type: 'literal', value: null })).toBe('null');
    });
  });

  describe('identifiers', () => {
    it('generates context variable references', () => {
      setup();
      expect(codegen.generate({ type: 'identifier', value: 'me' })).toBe('_ctx.me');
      expect(codegen.generate({ type: 'identifier', value: 'you' })).toBe('_ctx.you');
      expect(codegen.generate({ type: 'identifier', value: 'it' })).toBe('_ctx.it');
      expect(codegen.generate({ type: 'identifier', value: 'event' })).toBe('_ctx.event');
    });

    it('generates global references', () => {
      setup();
      expect(codegen.generate({ type: 'identifier', value: 'body' })).toBe('document.body');
      expect(codegen.generate({ type: 'identifier', value: 'document' })).toBe('document');
      expect(codegen.generate({ type: 'identifier', value: 'window' })).toBe('window');
    });

    it('generates plain identifiers', () => {
      setup();
      expect(codegen.generate({ type: 'identifier', value: 'myFunc' })).toBe('myFunc');
    });
  });

  describe('selectors', () => {
    it('generates ID selector with getElementById', () => {
      setup();
      const result = codegen.generate({ type: 'selector', value: '#myId' });
      expect(result).toBe("document.getElementById('myId')");
    });

    it('generates complex selector with querySelector', () => {
      setup();
      const result = codegen.generate({ type: 'selector', value: '.class > span' });
      expect(result).toBe("document.querySelector('.class > span')");
    });
  });

  describe('variables', () => {
    it('generates local variable access', () => {
      setup();
      const result = codegen.generate({
        type: 'variable',
        name: ':count',
        scope: 'local',
      });
      expect(result).toBe("_ctx.locals.get('count')");
    });

    it('generates global variable access', () => {
      setup();
      const result = codegen.generate({
        type: 'variable',
        name: '$total',
        scope: 'global',
      });
      expect(result).toContain("_rt.globals.get('total')");
      expect(ctx.requiredHelpers.has('globals')).toBe(true);
    });
  });

  describe('binary expressions', () => {
    it('generates arithmetic operators', () => {
      setup();
      const result = codegen.generate({
        type: 'binary',
        operator: '+',
        left: { type: 'literal', value: 5 },
        right: { type: 'literal', value: 3 },
      });
      expect(result).toBe('(5 + 3)');
    });

    it('generates equality operators', () => {
      setup();
      expect(
        codegen.generate({
          type: 'binary',
          operator: 'is',
          left: { type: 'identifier', value: 'x' },
          right: { type: 'literal', value: 5 },
        })
      ).toBe('(x === 5)');

      expect(
        codegen.generate({
          type: 'binary',
          operator: 'is not',
          left: { type: 'identifier', value: 'x' },
          right: { type: 'literal', value: 5 },
        })
      ).toBe('(x !== 5)');
    });

    it('generates logical operators', () => {
      setup();
      expect(
        codegen.generate({
          type: 'binary',
          operator: 'and',
          left: { type: 'literal', value: true },
          right: { type: 'literal', value: false },
        })
      ).toBe('(true && false)');

      expect(
        codegen.generate({
          type: 'binary',
          operator: 'or',
          left: { type: 'literal', value: true },
          right: { type: 'literal', value: false },
        })
      ).toBe('(true || false)');
    });

    it('generates contains operator', () => {
      setup();
      const result = codegen.generate({
        type: 'binary',
        operator: 'contains',
        left: { type: 'identifier', value: 'arr' },
        right: { type: 'identifier', value: 'item' },
      });
      expect(result).toBe('_rt.contains(arr, item)');
      expect(ctx.requiredHelpers.has('contains')).toBe(true);
    });

    it('generates has .class check', () => {
      setup();
      const result = codegen.generate({
        type: 'binary',
        operator: 'has',
        left: { type: 'identifier', value: 'me' },
        right: { type: 'selector', value: '.active' },
      });
      expect(result).toBe("_ctx.me.classList.contains('active')");
    });
  });

  describe('possessive expressions', () => {
    it('generates property access', () => {
      setup();
      const result = codegen.generate({
        type: 'possessive',
        object: { type: 'identifier', value: 'me' },
        property: 'value',
      });
      expect(result).toBe('_ctx.me.value');
    });

    it('generates style property access', () => {
      setup();
      const result = codegen.generate({
        type: 'possessive',
        object: { type: 'identifier', value: 'me' },
        property: '*opacity',
      });
      expect(result).toBe('_ctx.me.style.opacity');
    });

    it('generates attribute access', () => {
      setup();
      const result = codegen.generate({
        type: 'possessive',
        object: { type: 'identifier', value: 'me' },
        property: '@disabled',
      });
      expect(result).toBe("_ctx.me.getAttribute('disabled')");
    });

    it('generates getValues helper for values pseudo-property', () => {
      setup();
      const result = codegen.generate({
        type: 'possessive',
        object: { type: 'identifier', value: 'me' },
        property: 'values',
      });
      expect(result).toBe('_rt.getValues(_ctx.me)');
    });
  });

  describe('positional expressions', () => {
    it('generates next sibling', () => {
      setup();
      const result = codegen.generate({
        type: 'positional',
        position: 'next',
      });
      expect(result).toBe('_ctx.me.nextElementSibling');
    });

    it('generates previous sibling', () => {
      setup();
      const result = codegen.generate({
        type: 'positional',
        position: 'previous',
      });
      expect(result).toBe('_ctx.me.previousElementSibling');
    });

    it('generates parent', () => {
      setup();
      const result = codegen.generate({
        type: 'positional',
        position: 'parent',
      });
      expect(result).toBe('_ctx.me.parentElement');
    });

    it('generates closest with selector', () => {
      setup();
      const result = codegen.generate({
        type: 'positional',
        position: 'closest',
        target: { type: 'selector', value: '.container' },
      });
      expect(result).toBe("_ctx.me.closest('.container')");
    });

    it('generates first with selector', () => {
      setup();
      const result = codegen.generate({
        type: 'positional',
        position: 'first',
        target: { type: 'selector', value: '.item' },
      });
      expect(result).toBe("document.querySelector('.item')");
    });
  });

  describe('call expressions', () => {
    it('generates method calls', () => {
      setup();
      const result = codegen.generate({
        type: 'call',
        callee: {
          type: 'member',
          object: { type: 'identifier', value: 'str' },
          property: 'toUpperCase',
        },
        args: [],
      });
      expect(result).toBe('str.toUpperCase()');
    });

    it('generates function calls with arguments', () => {
      setup();
      const result = codegen.generate({
        type: 'call',
        callee: { type: 'identifier', value: 'myFunc' },
        args: [
          { type: 'literal', value: 'arg1' },
          { type: 'literal', value: 42 },
        ],
      });
      expect(result).toBe('myFunc("arg1", 42)');
    });
  });
});
