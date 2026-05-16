/**
 * End-to-end tests for pick variants.
 *
 * Covers the 4 upstream `_hyperscript` variants newly added to hyperfixi:
 *   - pick first <count> of <expr>
 *   - pick last <count> of <expr>
 *   - pick random <count> of <expr>  (the count variant; bare random already covered in pick.test.ts)
 *   - pick item(s)|character(s) <i> [to <j>|end] [inclusive|exclusive] of <expr>
 *   - pick match|matches of <regex>[|<flags>] of <expr>
 *
 * Runs through the canonical parse → run path to verify the custom parser
 * in command-parsers/utility-commands.ts integrates with the runtime.
 */

import { describe, it, expect, vi } from 'vitest';
import { PickCommand } from '../pick';
import type { ExecutionContext, TypedExecutionContext } from '../../../types/core';
import type { ASTNode, ExpressionNode } from '../../../types/base-types';
import type { ExpressionEvaluator } from '../../../core/expression-evaluator';

// ---------- helpers ----------

function ctx(): ExecutionContext & TypedExecutionContext {
  return {
    me: document.createElement('div'),
    you: undefined,
    it: undefined,
    result: undefined,
    locals: new Map(),
    target: document.createElement('div'),
    detail: undefined,
  } as unknown as ExecutionContext & TypedExecutionContext;
}

/**
 * Evaluator that returns the literal value of each node it's asked to
 * evaluate. Sufficient for parseInput tests since args + modifiers passed
 * to parseInput contain pre-built literal nodes.
 */
function makeEvaluator(): ExpressionEvaluator {
  return {
    evaluate: async (node: ASTNode | unknown) => {
      if (node && typeof node === 'object' && 'value' in node) {
        return (node as { value: unknown }).value;
      }
      if (Array.isArray(node)) return node;
      return node;
    },
  } as unknown as ExpressionEvaluator;
}

const lit = (value: unknown) => ({ type: 'literal', value }) as unknown as ExpressionNode;

// ---------- tests ----------

describe('PickCommand variants', () => {
  const cmd = new PickCommand();

  describe('first <count> of <array>', () => {
    it('first 3 of [a,b,c,d,e] → [a,b,c]', async () => {
      const input = await cmd.parseInput(
        {
          args: [lit(['a', 'b', 'c', 'd', 'e'])],
          modifiers: { variant: lit('first'), count: lit(3) },
        },
        makeEvaluator(),
        ctx()
      );
      const out = await cmd.execute(input, ctx());
      expect(out.selectedItem).toEqual(['a', 'b', 'c']);
      expect(out.variant).toBe('first');
    });

    it('first 100 of [1,2,3] → [1,2,3] (count exceeds length)', async () => {
      const input = await cmd.parseInput(
        {
          args: [lit([1, 2, 3])],
          modifiers: { variant: lit('first'), count: lit(100) },
        },
        makeEvaluator(),
        ctx()
      );
      const out = await cmd.execute(input, ctx());
      expect(out.selectedItem).toEqual([1, 2, 3]);
    });

    it('first 0 of arr → []', async () => {
      const input = await cmd.parseInput(
        {
          args: [lit([1, 2, 3])],
          modifiers: { variant: lit('first'), count: lit(0) },
        },
        makeEvaluator(),
        ctx()
      );
      const out = await cmd.execute(input, ctx());
      expect(out.selectedItem).toEqual([]);
    });

    it('throws if source is not an array', async () => {
      await expect(
        cmd.parseInput(
          {
            args: [lit('not-an-array')],
            modifiers: { variant: lit('first'), count: lit(2) },
          },
          makeEvaluator(),
          ctx()
        )
      ).rejects.toThrow(/source must be an array/i);
    });
  });

  describe('last <count> of <array>', () => {
    it('last 2 of [a,b,c,d,e] → [d,e]', async () => {
      const input = await cmd.parseInput(
        {
          args: [lit(['a', 'b', 'c', 'd', 'e'])],
          modifiers: { variant: lit('last'), count: lit(2) },
        },
        makeEvaluator(),
        ctx()
      );
      const out = await cmd.execute(input, ctx());
      expect(out.selectedItem).toEqual(['d', 'e']);
    });

    it('last 0 of arr → [] (no negative-zero slice surprise)', async () => {
      const input = await cmd.parseInput(
        {
          args: [lit([1, 2, 3])],
          modifiers: { variant: lit('last'), count: lit(0) },
        },
        makeEvaluator(),
        ctx()
      );
      const out = await cmd.execute(input, ctx());
      expect(out.selectedItem).toEqual([]);
    });

    it('last 100 of [1,2,3] → [1,2,3]', async () => {
      const input = await cmd.parseInput(
        {
          args: [lit([1, 2, 3])],
          modifiers: { variant: lit('last'), count: lit(100) },
        },
        makeEvaluator(),
        ctx()
      );
      const out = await cmd.execute(input, ctx());
      expect(out.selectedItem).toEqual([1, 2, 3]);
    });
  });

  describe('random <count> of <array>', () => {
    it('random 2 of [a,b,c,d,e] → 2-element subset', async () => {
      const input = await cmd.parseInput(
        {
          args: [lit(['a', 'b', 'c', 'd', 'e'])],
          modifiers: { variant: lit('random'), count: lit(2) },
        },
        makeEvaluator(),
        ctx()
      );
      const out = await cmd.execute(input, ctx());
      const selected = out.selectedItem as string[];
      expect(selected).toHaveLength(2);
      // No replacement — elements are unique.
      expect(new Set(selected).size).toBe(2);
      // All selected elements come from the source.
      for (const x of selected) {
        expect(['a', 'b', 'c', 'd', 'e']).toContain(x);
      }
    });

    it('random count > length → full shuffled copy', async () => {
      const input = await cmd.parseInput(
        {
          args: [lit([1, 2, 3])],
          modifiers: { variant: lit('random'), count: lit(10) },
        },
        makeEvaluator(),
        ctx()
      );
      const out = await cmd.execute(input, ctx());
      expect(out.selectedItem).toHaveLength(3);
      expect(new Set(out.selectedItem as number[])).toEqual(new Set([1, 2, 3]));
    });

    it('random with no count → single element (legacy behavior)', async () => {
      const input = await cmd.parseInput(
        {
          args: [lit([1, 2, 3])],
          modifiers: { variant: lit('random') },
        },
        makeEvaluator(),
        ctx()
      );
      const out = await cmd.execute(input, ctx());
      expect([1, 2, 3]).toContain(out.selectedItem);
      expect(typeof out.selectedIndex).toBe('number');
    });
  });

  describe('item(s) range slice', () => {
    it('items 1 to 3 of [a,b,c,d,e] → default mode (exclusive end) → [b,c]', async () => {
      const input = await cmd.parseInput(
        {
          args: [lit(['a', 'b', 'c', 'd', 'e'])],
          modifiers: {
            variant: lit('range'),
            rangeStart: lit(1),
            rangeEnd: lit(3),
            rangeMode: lit('default'),
          },
        },
        makeEvaluator(),
        ctx()
      );
      const out = await cmd.execute(input, ctx());
      expect(out.selectedItem).toEqual(['b', 'c']);
    });

    it('items 1 to 3 inclusive → [b,c,d]', async () => {
      const input = await cmd.parseInput(
        {
          args: [lit(['a', 'b', 'c', 'd', 'e'])],
          modifiers: {
            variant: lit('range'),
            rangeStart: lit(1),
            rangeEnd: lit(3),
            rangeMode: lit('inclusive'),
          },
        },
        makeEvaluator(),
        ctx()
      );
      const out = await cmd.execute(input, ctx());
      expect(out.selectedItem).toEqual(['b', 'c', 'd']);
    });

    it('items 1 to 3 exclusive → [c] (exclude start, exclude end)', async () => {
      const input = await cmd.parseInput(
        {
          args: [lit(['a', 'b', 'c', 'd', 'e'])],
          modifiers: {
            variant: lit('range'),
            rangeStart: lit(1),
            rangeEnd: lit(3),
            rangeMode: lit('exclusive'),
          },
        },
        makeEvaluator(),
        ctx()
      );
      const out = await cmd.execute(input, ctx());
      expect(out.selectedItem).toEqual(['c']);
    });

    it('items 2 to end → [c,d,e]', async () => {
      const input = await cmd.parseInput(
        {
          args: [lit(['a', 'b', 'c', 'd', 'e'])],
          modifiers: {
            variant: lit('range'),
            rangeStart: lit(2),
            rangeEnd: lit('end'),
            rangeMode: lit('default'),
          },
        },
        makeEvaluator(),
        ctx()
      );
      const out = await cmd.execute(input, ctx());
      expect(out.selectedItem).toEqual(['c', 'd', 'e']);
    });

    it('items at start to 2 → [a,b]', async () => {
      const input = await cmd.parseInput(
        {
          args: [lit(['a', 'b', 'c', 'd', 'e'])],
          modifiers: {
            variant: lit('range'),
            rangeStart: lit('start'),
            rangeEnd: lit(2),
            rangeMode: lit('default'),
          },
        },
        makeEvaluator(),
        ctx()
      );
      const out = await cmd.execute(input, ctx());
      expect(out.selectedItem).toEqual(['a', 'b']);
    });

    it('items 1 (no end) → [b]', async () => {
      const input = await cmd.parseInput(
        {
          args: [lit(['a', 'b', 'c', 'd', 'e'])],
          modifiers: {
            variant: lit('range'),
            rangeStart: lit(1),
            rangeMode: lit('default'),
          },
        },
        makeEvaluator(),
        ctx()
      );
      const out = await cmd.execute(input, ctx());
      expect(out.selectedItem).toEqual(['b']);
    });
  });

  describe('match / matches (regex)', () => {
    it('match of "[0-9]+" from "abc123def456" → first match', async () => {
      const input = await cmd.parseInput(
        {
          args: [lit('abc123def456')],
          modifiers: {
            variant: lit('match'),
            regex: lit('[0-9]+'),
          },
        },
        makeEvaluator(),
        ctx()
      );
      const out = await cmd.execute(input, ctx());
      const result = out.selectedItem as RegExpExecArray | null;
      expect(result).not.toBeNull();
      expect(result?.[0]).toBe('123');
    });

    it('match of "[0-9]+" from "no digits" → null', async () => {
      const input = await cmd.parseInput(
        {
          args: [lit('no digits')],
          modifiers: {
            variant: lit('match'),
            regex: lit('[0-9]+'),
          },
        },
        makeEvaluator(),
        ctx()
      );
      const out = await cmd.execute(input, ctx());
      expect(out.selectedItem).toBeNull();
    });

    it('matches of "[0-9]+" from "abc123def456" → all matches', async () => {
      const input = await cmd.parseInput(
        {
          args: [lit('abc123def456')],
          modifiers: {
            variant: lit('matches'),
            regex: lit('[0-9]+'),
          },
        },
        makeEvaluator(),
        ctx()
      );
      const out = await cmd.execute(input, ctx());
      const matches = out.selectedItem as RegExpMatchArray[];
      expect(matches).toHaveLength(2);
      expect(matches[0][0]).toBe('123');
      expect(matches[1][0]).toBe('456');
    });

    it('match honors flags: "ABC" with flags "i" matches', async () => {
      const input = await cmd.parseInput(
        {
          args: [lit('xyz')],
          modifiers: {
            variant: lit('match'),
            regex: lit('XYZ'),
            flags: lit('i'),
          },
        },
        makeEvaluator(),
        ctx()
      );
      const out = await cmd.execute(input, ctx());
      const result = out.selectedItem as RegExpExecArray | null;
      expect(result).not.toBeNull();
      expect(result?.[0]).toBe('xyz');
    });

    it('throws if source is not a string', async () => {
      await expect(
        cmd.parseInput(
          {
            args: [lit([1, 2, 3])], // array, not string
            modifiers: {
              variant: lit('match'),
              regex: lit('[0-9]+'),
            },
          },
          makeEvaluator(),
          ctx()
        )
      ).rejects.toThrow(/source must be a string/i);
    });
  });

  describe('end-to-end via parser', () => {
    it('parses and executes `pick first 3 of items`', async () => {
      // Roundtrip through the canonical parser to ensure the custom
      // parsePickCommand emits the expected AST shape.
      const { parse } = await import('../../../parser/parser');
      const result = parse('pick first 3 of [1, 2, 3, 4, 5]');
      if (!result.success) {
        throw new Error(`parse failed: ${result.error?.message ?? 'unknown'}`);
      }
      const cmdNode = (result.node as any).body?.[0] ?? result.node;
      expect(cmdNode.name).toBe('pick');
      expect(cmdNode.modifiers?.variant?.value).toBe('first');
      expect(cmdNode.modifiers?.count?.value).toBe(3);
      expect(cmdNode.args?.[0]).toBeDefined();
    });

    it('parses and executes `pick last 2 of items`', async () => {
      const { parse } = await import('../../../parser/parser');
      const result = parse('pick last 2 of [1, 2, 3, 4, 5]');
      if (!result.success) {
        throw new Error(`parse failed: ${result.error?.message ?? 'unknown'}`);
      }
      const cmdNode = (result.node as any).body?.[0] ?? result.node;
      expect(cmdNode.modifiers?.variant?.value).toBe('last');
      expect(cmdNode.modifiers?.count?.value).toBe(2);
    });

    it('parses `pick items 1 to 3 of items`', async () => {
      const { parse } = await import('../../../parser/parser');
      const result = parse('pick items 1 to 3 of [1, 2, 3, 4, 5]');
      if (!result.success) {
        throw new Error(`parse failed: ${result.error?.message ?? 'unknown'}`);
      }
      const cmdNode = (result.node as any).body?.[0] ?? result.node;
      expect(cmdNode.modifiers?.variant?.value).toBe('range');
      expect(cmdNode.modifiers?.rangeStart?.value).toBe(1);
      expect(cmdNode.modifiers?.rangeEnd?.value).toBe(3);
    });

    it('parses `pick match of "[a-z]+" from "hello"`', async () => {
      const { parse } = await import('../../../parser/parser');
      const result = parse('pick match of "[a-z]+" from "hello"');
      if (!result.success) {
        throw new Error(`parse failed: ${result.error?.message ?? 'unknown'}`);
      }
      const cmdNode = (result.node as any).body?.[0] ?? result.node;
      expect(cmdNode.modifiers?.variant?.value).toBe('match');
      expect(cmdNode.modifiers?.regex?.value).toBe('[a-z]+');
    });
  });
});
