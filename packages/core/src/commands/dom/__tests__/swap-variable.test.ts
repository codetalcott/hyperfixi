/**
 * Tests for variable-swap form.
 *
 * `swap x with y` where both operands are bare identifier names exchanges
 * the values of two local variables. Mirrors upstream `_hyperscript`
 * SwapCommand in setters.js:210-252. Disambiguated from the DOM-swap form
 * by argument shape (no selectors, no strategy keywords, no `of`/`into`).
 */

import { describe, it, expect } from 'vitest';
import { SwapCommand } from '../swap';
import type { ExecutionContext, TypedExecutionContext } from '../../../types/core';
import type { ASTNode, ExpressionNode } from '../../../types/base-types';
import type { ExpressionEvaluator } from '../../../core/expression-evaluator';

function ctx(
  locals: Record<string, unknown> = {},
  globals: Record<string, unknown> = {}
): ExecutionContext & TypedExecutionContext {
  return {
    me: document.createElement('div'),
    you: undefined,
    it: undefined,
    result: undefined,
    locals: new Map(Object.entries(locals)),
    globals: new Map(Object.entries(globals)),
    target: document.createElement('div'),
    detail: undefined,
  } as unknown as ExecutionContext & TypedExecutionContext;
}

function evaluator(): ExpressionEvaluator {
  return {
    evaluate: async (node: ASTNode | unknown) => {
      if (node && typeof node === 'object' && 'value' in node) {
        return (node as { value: unknown }).value;
      }
      return node;
    },
  } as unknown as ExpressionEvaluator;
}

const ident = (name: string) => ({ type: 'identifier', name }) as unknown as ExpressionNode;

describe('SwapCommand variable-swap variant', () => {
  const cmd = new SwapCommand();

  describe('parseInput detection', () => {
    it('detects variable-swap when args are [ident, with, ident]', async () => {
      const input = await cmd.parseInput(
        { args: [ident('x'), ident('with'), ident('y')], modifiers: {} },
        evaluator(),
        ctx()
      );
      expect(input.variant).toBe('variable');
      expect(input.leftName).toBe('x');
      expect(input.rightName).toBe('y');
    });

    it('does NOT detect variable-swap when first operand is a known strategy', async () => {
      // `innerHTML` is a recognized strategy keyword → falls through to DOM swap.
      const input = await cmd.parseInput(
        { args: [ident('innerHTML'), ident('with'), ident('y')], modifiers: {} },
        evaluator(),
        ctx()
      );
      expect(input.variant).not.toBe('variable');
    });

    it('does NOT detect variable-swap when an operand is a reserved context var', async () => {
      // `me`/`you`/`it`/etc. are reserved — falls through to DOM-swap.
      const input = await cmd.parseInput(
        { args: [ident('me'), ident('with'), ident('x')], modifiers: {} },
        evaluator(),
        ctx({ x: 5 })
      );
      expect(input.variant).not.toBe('variable');
      // DOM-swap branch should populate targets (`me` resolves to context.me).
      expect(input.targets).toBeDefined();
    });

    it('does NOT detect variable-swap when `of` keyword is present', async () => {
      // `swap innerHTML of #target with "new"` — DOM swap pattern.
      const target = document.createElement('div');
      target.id = 'target';
      document.body.appendChild(target);
      try {
        const input = await cmd.parseInput(
          {
            args: [
              ident('innerHTML'),
              ident('of'),
              { type: 'selector', value: '#target' } as unknown as ExpressionNode,
              ident('with'),
              { type: 'literal', value: 'new' } as unknown as ExpressionNode,
            ],
            modifiers: {},
          },
          evaluator(),
          ctx()
        );
        expect(input.variant).not.toBe('variable');
        expect(input.strategy).toBe('innerHTML');
      } finally {
        target.remove();
      }
    });
  });

  describe('execute', () => {
    it('exchanges two local variables', async () => {
      const context = ctx({ a: 1, b: 2 });
      await cmd.execute({ variant: 'variable', leftName: 'a', rightName: 'b' }, context);
      expect(context.locals?.get('a')).toBe(2);
      expect(context.locals?.get('b')).toBe(1);
    });

    it('exchanges values across different types (number / string)', async () => {
      const context = ctx({ x: 42, y: 'hello' });
      await cmd.execute({ variant: 'variable', leftName: 'x', rightName: 'y' }, context);
      expect(context.locals?.get('x')).toBe('hello');
      expect(context.locals?.get('y')).toBe(42);
    });

    it('falls back to undefined when a variable is missing', async () => {
      const context = ctx({ a: 'present' });
      await cmd.execute({ variant: 'variable', leftName: 'a', rightName: 'missing' }, context);
      // `a` now has the missing variable's value (undefined)
      // `missing` now has `a`'s old value ('present')
      expect(context.locals?.get('a')).toBeUndefined();
      expect(context.locals?.get('missing')).toBe('present');
    });

    it('exchanges values across locals and globals (preserving scope)', async () => {
      const context = ctx({ localVar: 'L' }, { globalVar: 'G' });
      await cmd.execute(
        { variant: 'variable', leftName: 'localVar', rightName: 'globalVar' },
        context
      );
      // Each value lands in its original scope (no shadowing).
      expect(context.locals?.get('localVar')).toBe('G');
      expect(context.globals?.get('globalVar')).toBe('L');
    });

    it('does not modify DOM when running variable swap', async () => {
      const beforeHTML = document.body.innerHTML;
      const context = ctx({ a: 1, b: 2 });
      await cmd.execute({ variant: 'variable', leftName: 'a', rightName: 'b' }, context);
      expect(document.body.innerHTML).toBe(beforeHTML);
    });
  });

  describe('end-to-end via parser', () => {
    it('parses `swap a with b` as variable-swap shape', async () => {
      const { parse } = await import('../../../parser/parser');
      const result = parse('swap a with b');
      if (!result.success) {
        throw new Error(`parse failed: ${result.error?.message ?? 'unknown'}`);
      }
      const cmdNode = (result.node as any).body?.[0] ?? result.node;
      expect(cmdNode.name).toBe('swap');
      // The parsed args should be three identifiers; parseInput then routes
      // them to the variable variant.
      const input = await cmd.parseInput(
        { args: cmdNode.args, modifiers: cmdNode.modifiers ?? {} },
        evaluator(),
        ctx({ a: 10, b: 20 })
      );
      expect(input.variant).toBe('variable');
    });
  });
});
