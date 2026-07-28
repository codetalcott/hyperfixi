/**
 * write-target — rung ladder tests
 *
 * The ladder's ORDER is semantics, not style, and it is now defined in exactly
 * one place. These tests are the ratchet on that: they pin which rung wins when
 * two could match, and pin that an un-requested rung is skipped rather than
 * reordered. Behavioral coverage of each command's use of the ladder stays in
 * the set / append / prepend suites.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { resolveWriteTarget } from '../write-target';
import {
  getParserExtensionRegistry,
  type ParserExtensionSnapshot,
} from '../../../parser/extensions';
import type { ASTNode } from '../../../types/base-types';
import type { ExecutionContext } from '../../../types/core';
import type { ExpressionEvaluator } from '../../../core/expression-evaluator';

function makeEvaluator(values: Map<unknown, unknown> = new Map()): ExpressionEvaluator {
  return {
    evaluate: vi.fn(async (node: ASTNode) => {
      if (values.has(node)) return values.get(node);
      const n = node as unknown as Record<string, unknown>;
      if (n.type === 'literal' || n.type === 'string') return n.value;
      return null;
    }),
  } as unknown as ExpressionEvaluator;
}

describe('resolveWriteTarget', () => {
  let me: HTMLElement;
  let context: ExecutionContext;
  let scopeElements: () => Promise<HTMLElement[]>;
  let extensions: ParserExtensionSnapshot;

  beforeEach(() => {
    me = document.createElement('div');
    document.body.appendChild(me);
    context = {
      me,
      you: null,
      locals: new Map(),
      globals: new Map(),
      result: undefined,
      it: undefined,
    } as ExecutionContext;
    scopeElements = async () => [me];
    // The extension registry is a cross-bundle singleton — snapshot so a
    // registered writer cannot leak into another suite.
    extensions = getParserExtensionRegistry().snapshot();
  });

  afterEach(() => {
    document.body.innerHTML = '';
    getParserExtensionRegistry().restore(extensions);
  });

  describe('rung order', () => {
    it('resolves a plugin node-writer ahead of every built-in rung', async () => {
      const writer = vi.fn();
      getParserExtensionRegistry().registerNodeWriter('caretVar', writer);
      // Also a bare-reference shape, so rung 5 would match if rung 1 did not win.
      const node = { type: 'caretVar', name: 'count' } as unknown as ASTNode;

      const target = await resolveWriteTarget(node, makeEvaluator(), context, {
        scopeElements,
        nodeWriters: true,
        bareReference: true,
      });

      expect(target).toEqual({ kind: 'node-write', node, writer });
    });

    it('resolves `X[@attr]` as an attribute write, not a computed member read', async () => {
      // The load-bearing case: an attributeAccess reaching the property/member
      // rung would key the write on the attribute's CURRENT VALUE.
      const objectNode = { type: 'selector', value: '#el' } as unknown as ASTNode;
      const node = {
        type: 'memberExpression',
        object: objectNode,
        property: { type: 'attributeAccess', attributeName: 'data-state' },
      } as unknown as ASTNode;
      const evaluator = makeEvaluator(new Map([[objectNode, me]]));

      const target = await resolveWriteTarget(node, evaluator, context, { scopeElements });

      expect(target).toEqual({ kind: 'attribute', elements: [me], name: 'data-state' });
    });

    it('scopes a standalone `@attr` to the caller-supplied elements', async () => {
      const a = document.createElement('span');
      const b = document.createElement('span');
      const node = {
        type: 'attributeAccess',
        attributeName: 'aria-selected',
      } as unknown as ASTNode;

      const target = await resolveWriteTarget(node, makeEvaluator(), context, {
        scopeElements: async () => [a, b],
      });

      expect(target).toEqual({ kind: 'attribute', elements: [a, b], name: 'aria-selected' });
    });
  });

  describe('opt-in rungs are skipped, not reordered', () => {
    const selectorNode = { type: 'selector', value: '.items' } as unknown as ASTNode;

    it('keeps a selector’s source text only when selectorSource is requested', async () => {
      const requested = await resolveWriteTarget(selectorNode, makeEvaluator(), context, {
        scopeElements,
        selectorSource: true,
      });
      expect(requested).toEqual({ kind: 'selector', selector: '.items' });

      // set does not request it: the node falls through to set's evaluated tail.
      const notRequested = await resolveWriteTarget(selectorNode, makeEvaluator(), context, {
        scopeElements,
      });
      expect(notRequested).toBeNull();
    });

    it('keeps a bare reference’s name only when bareReference is requested', async () => {
      const node = { type: 'identifier', name: 'total', scope: 'element' } as unknown as ASTNode;

      const requested = await resolveWriteTarget(node, makeEvaluator(), context, {
        scopeElements,
        bareReference: true,
      });
      expect(requested).toEqual({ kind: 'variable', name: 'total', scope: 'element' });

      const notRequested = await resolveWriteTarget(node, makeEvaluator(), context, {
        scopeElements,
      });
      expect(notRequested).toBeNull();
    });

    it('drops an unrecognized scope tag rather than passing it through', async () => {
      const node = { type: 'identifier', name: 'total', scope: 'local' } as unknown as ASTNode;

      const target = await resolveWriteTarget(node, makeEvaluator(), context, {
        scopeElements,
        bareReference: true,
      });

      expect(target).toEqual({ kind: 'variable', name: 'total', scope: undefined });
    });

    it('splits `*prop` into a style write only when styleSplit is requested', async () => {
      const objectNode = { type: 'selector', value: '#el' } as unknown as ASTNode;
      const node = {
        type: 'possessiveExpression',
        object: objectNode,
        property: { type: 'identifier', name: '*opacity' },
      } as unknown as ASTNode;

      const split = await resolveWriteTarget(
        node,
        makeEvaluator(new Map([[objectNode, me]])),
        context,
        {
          scopeElements,
          styleSplit: true,
        }
      );
      expect(split).toEqual({ kind: 'style', element: me, property: 'opacity' });

      // append/prepend leave it a property target — read/writePropertyTarget
      // already route the `*` prefix to inline style.
      const unsplit = await resolveWriteTarget(
        node,
        makeEvaluator(new Map([[objectNode, me]])),
        context,
        { scopeElements }
      );
      expect(unsplit).toEqual({ kind: 'property', target: { element: me, property: '*opacity' } });
    });

    it('does not consult the node-writer registry unless nodeWriters is requested', async () => {
      const writer = vi.fn();
      getParserExtensionRegistry().registerNodeWriter('caretVar', writer);
      const node = { type: 'caretVar', name: 'count' } as unknown as ASTNode;

      const target = await resolveWriteTarget(node, makeEvaluator(), context, { scopeElements });

      expect(target).toBeNull();
    });
  });

  describe('fall-through', () => {
    it('returns null for a node no requested rung recognizes', async () => {
      const node = { type: 'positionalExpression', operator: 'first' } as unknown as ASTNode;

      const target = await resolveWriteTarget(node, makeEvaluator(), context, {
        scopeElements,
        nodeWriters: true,
        selectorSource: true,
        styleSplit: true,
        bareReference: true,
      });

      expect(target).toBeNull();
    });

    it('returns null for an absent target node', async () => {
      expect(
        await resolveWriteTarget(undefined, makeEvaluator(), context, { scopeElements })
      ).toBeNull();
    });

    it('does not resolve the attribute scope for a non-attribute node', async () => {
      const scope = vi.fn(async () => [me]);
      const node = { type: 'identifier', name: 'total' } as unknown as ASTNode;

      await resolveWriteTarget(node, makeEvaluator(), context, {
        scopeElements: scope,
        bareReference: true,
      });

      expect(scope).not.toHaveBeenCalled();
    });
  });
});
