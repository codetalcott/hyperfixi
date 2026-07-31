/**
 * Descriptor-vs-runtime contract tests (Arc F follow-up).
 *
 * The `ast-shape-consistency` gate asks whether a descriptor's modifier KEYS
 * agree with the schema's English markers. That is a necessary check and not a
 * sufficient one: a descriptor can name perfectly consistent keys and still
 * hand the runtime command an AST it cannot read, because the marker data says
 * nothing about which slot — arg or modifier — the command consumes.
 *
 * These tests close that gap for the commands where the two disagreed, by
 * asserting the built AST against what the core command's `parseInput`
 * actually reads. The contract each one pins is quoted from the runtime.
 */

import { describe, it, expect } from 'vitest';
import { parse } from '../src/index';
import { buildAST } from '../src/ast-builder/index';
import type { CommandSemanticNode } from '../src/types';

/** Parse English source and return the built command node (unwrapping warnings). */
function astOf(source: string): Record<string, any> {
  const node = parse(source, 'en') as CommandSemanticNode | null;
  expect(node, `'${source}' did not parse`).not.toBeNull();
  const built = buildAST(node!) as unknown as Record<string, any>;
  return (built.ast ?? built) as Record<string, any>;
}

describe('default — the target variable must survive into args[0]', () => {
  // packages/core/src/commands/data/default.ts parseInput:
  //   target = evaluate(raw.args[0])
  //   value  = evaluate(raw.modifiers.to)  (falling back to raw.args[1])
  // The semantic parse binds destination=':x', patient=0 — so a descriptor
  // reading patient→args and source→`to` drops the variable entirely.

  it('builds `default :x to 0` as args:[:x] + modifiers.to = 0', () => {
    const ast = astOf('default :x to 0');

    expect(ast.name).toBe('default');
    expect(ast.args).toHaveLength(1);
    expect(ast.args[0]).toMatchObject({ type: 'contextReference', name: ':x' });
    expect(ast.modifiers?.to).toMatchObject({ type: 'literal', value: 0 });
  });

  it('builds the corpus form `default my @data-count to "0"` the same way', () => {
    const ast = astOf('default my @data-count to "0"');

    expect(ast.args).toHaveLength(1);
    expect(ast.args[0]).toMatchObject({ type: 'propertyAccess', property: '@data-count' });
    expect(ast.modifiers?.to).toMatchObject({ type: 'literal', value: '0' });
  });

  it('never leaves the value as the only positional arg', () => {
    // The pre-fix shape was exactly `{ name: 'default', args: [0] }`. Assert
    // the failure mode directly so a regression names itself.
    const ast = astOf('default :x to 0');
    expect(ast.args[0]).not.toMatchObject({ type: 'literal', value: 0 });
  });
});

describe('scroll — the destination must be an ARG, not a modifier', () => {
  // packages/core/src/commands/navigation/scroll-to.ts parseInput reads ONLY
  // `raw.args` and throws 'scroll command requires a target' when it is empty;
  // `resolveTarget`/`parsePosition` then walk that same arg list. A destination
  // delivered as a modifier is invisible to the command on every path.

  it('builds `scroll to #header` with the target in args', () => {
    const ast = astOf('scroll to #header');

    expect(ast.name).toBe('scroll');
    expect(ast.args).toHaveLength(1);
    expect(ast.args[0]).toMatchObject({ type: 'selector', value: '#header' });
    expect(ast.modifiers).toBeUndefined();
  });

  it('builds the corpus form `scroll to last <.message/> in #chat` with the target in args', () => {
    const ast = astOf('scroll to last <.message/> in #chat');

    expect(ast.args).toHaveLength(1);
    expect(ast.args[0]).toMatchObject({ type: 'binaryExpression', operator: 'in' });
    expect(ast.modifiers).toBeUndefined();
  });

  it('leaves no `on` modifier for ScrollCommand to ignore', () => {
    const ast = astOf('scroll to #header');
    expect(ast.modifiers?.on).toBeUndefined();
  });
});
