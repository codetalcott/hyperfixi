/**
 * `transition <prop> to <value>` keeps the value's CSS UNIT.
 *
 * `transition left to 100px` — TransitionCommand's own documented example, and
 * a source `hyperscript.org` accepts — parsed to `to: 100`. The `px` was
 * discarded, so the command animated to a UNITLESS length, which is not a CSS
 * value at all. `transition *width to 50%` lost its `%` the same way.
 *
 * The engine already models a number-plus-unit as a `stringPostfix` node
 * (`Parser.tryParseStringPostfix`, mirroring upstream's StringPostfixExpression
 * over the 15 CSS length units and `%`) — `log 100px` and `set x to 100px` both
 * build it. Only `parseTransitionCommand` did not, because it read its value
 * with `parsePrimary()`, which stops at the literal and never reaches the pratt
 * postfix. Upstream parses the same slot with `requireElement("expression")`.
 *
 * Two things hid it. Bare, the parser had no channel to report the dropped
 * token (that arrived in #1026, and only inside a handler body); and the source
 * is a documented EXAMPLE, which nothing parsed until #1025.
 *
 * The rows below assert the resolved VALUE, not the node shape: a
 * `stringPostfix` node in the AST proves the parse and not the result, and the
 * result is the whole point — `100` and `100px` are different CSS.
 */

import { describe, it, expect } from 'vitest';
import { hyperscript } from '../../../api/hyperscript-api';
import { evaluateAST } from '../../runtime';
import type { ASTNode } from '../../../types/base-types';

interface Compiled {
  ok: boolean;
  errors?: Array<{ message: string }>;
  ast?: Record<string, unknown>;
}

/** The `transition` node from a source, parsed bare AND inside a handler. */
function transitionNodes(source: string): Array<Record<string, unknown>> {
  const out: Array<Record<string, unknown>> = [];
  for (const src of [source, `on click ${source}`]) {
    const r = hyperscript.compileSync(src, { traditional: true } as never) as Compiled;
    // Wrapped is not a duplicate of bare: the parser reports input it could not
    // place only from inside a handler body, so the wrapped parse is the only
    // one that would have FAILED loudly on the drop this test is about.
    expect(r.errors ?? [], `${src}: ${JSON.stringify(r.errors)}`).toHaveLength(0);
    expect(r.ok, src).toBe(true);
    const ast = r.ast as Record<string, unknown>;
    const node = (ast.commands as Array<Record<string, unknown>> | undefined)?.[0] ?? ast;
    expect(node.name, src).toBe('transition');
    out.push(node);
  }
  return out;
}

async function resolvedModifier(node: Record<string, unknown>, key: string): Promise<unknown> {
  const mods = node.modifiers as Record<string, ASTNode> | undefined;
  expect(mods?.[key], `modifiers.${key} is missing`).toBeDefined();
  return evaluateAST(mods![key] as ASTNode, { locals: new Map() } as never);
}

describe('transition keeps its value units', () => {
  it.each([
    ['transition left to 100px', '100px'],
    ['transition *width to 50%', '50%'],
    ['transition *height to 1.5rem', '1.5rem'],
    ['transition *max-width to 100vh', '100vh'],
  ])('%s → %s', async (source, expected) => {
    for (const node of transitionNodes(source)) {
      await expect(resolvedModifier(node, 'to')).resolves.toBe(expected);
    }
  });

  it('keeps the unit AND the duration together', async () => {
    for (const node of transitionNodes('transition left to 100px over 500ms')) {
      await expect(resolvedModifier(node, 'to')).resolves.toBe('100px');
      await expect(resolvedModifier(node, 'over')).resolves.toBe('500ms');
    }
  });

  it('parses a COMPOUND duration, not just a single time token', () => {
    // The `over` slot had the same `parsePrimary` limit, and it is NOT covered
    // by the unit rows above: `500ms` and `1s` arrive as ONE token, so those
    // pass either way. Measured — reverting only the duration to `parsePrimary`
    // leaves every other row in this file green. Upstream parses this slot with
    // `requireElement("expression")` and accepts both shapes below.
    for (const node of transitionNodes('transition opacity to 0 over 2 * delay')) {
      const over = (node.modifiers as Record<string, { type?: string; operator?: string }>).over;
      expect(over?.type).toBe('binaryExpression');
      expect(over?.operator).toBe('*');
    }
    for (const node of transitionNodes('transition opacity to 0 over (100 + 400)')) {
      // Structural, not resolved: arithmetic needs `mathematicalExpressions` in
      // the context registry, which this parse-level harness deliberately does
      // not build. What matters here is that the whole parenthesised expression
      // reached the modifier rather than just its first operand.
      const over = (node.modifiers as Record<string, { type?: string; operator?: string }>).over;
      expect(over?.type).toBe('binaryExpression');
      expect(over?.operator).toBe('+');
    }
  });

  it('still parses the unitless and keyword values it always did', async () => {
    for (const node of transitionNodes('transition opacity to 0')) {
      await expect(resolvedModifier(node, 'to')).resolves.toBe(0);
    }
    // `red` is not a variable; the command falls back to the identifier name.
    for (const node of transitionNodes('transition *background-color to red over 1s')) {
      await expect(resolvedModifier(node, 'over')).resolves.toBe('1s');
    }
  });

  it('does not over-consume the tail', () => {
    // `parseExpression` is greedier than `parsePrimary`; these pin that it
    // still stops where the command's own grammar and the statement loop need
    // it to.
    const r = hyperscript.compileSync('on click transition opacity to 0 then log 1', {
      traditional: true,
    } as never) as Compiled;
    expect(r.errors ?? []).toHaveLength(0);
    const commands = (r.ast as Record<string, unknown>).commands as Array<{ name?: string }>;
    expect(commands.map(c => c.name)).toEqual(['transition', 'log']);
  });
});
