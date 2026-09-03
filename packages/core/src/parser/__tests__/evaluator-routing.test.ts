/**
 * Which kinds reach the evaluators, and which never do
 *
 * Arc 2 step 3 of `docs-internal/ENGINE_MIGRATION_PLAN.md`. Making the two
 * evaluator switches exhaustive gave the compiler a `never` default, which
 * proves every kind in `EvaluableNode` HAS an arm. It cannot prove the other
 * half — that the 11 union kinds deliberately left out really are unreachable
 * here, and are handled somewhere else.
 *
 * That half was prose in `runtime.ts` until this file, and prose rots: the same
 * argument `ast/nodes.ts`'s conformance test makes about field shapes. So the
 * routing table on `evaluateKnown` is asserted here rather than merely written.
 *
 * The assertion is deliberately on the ERROR MESSAGE, not on the kind list. A
 * test that re-listed `EVALUABLE_KINDS` would just be a second copy of the
 * array agreeing with the first; asking `evaluateAST` what it does with a node
 * is a question only the real dispatch can answer.
 */

import { describe, it, expect } from 'vitest';
import { evaluateAST } from '../runtime';
import { getParserExtensionRegistry } from '../extensions';
import type { ExecutionContext } from '../../types/core';

const UNKNOWN = /Unknown AST node type/;

function ctx(): ExecutionContext {
  return {
    me: document.createElement('div'),
    locals: new Map(),
    globals: new Map(),
  } as unknown as ExecutionContext;
}

/**
 * The 24 kinds `evaluateAST` dispatches. A bare `{ type }` node is usually
 * malformed for its arm, so these are expected to throw — just never the
 * "unknown kind" throw, which is the one thing that would mean the arm is gone.
 */
const EVALUATED = [
  'literal',
  'string',
  'identifier',
  'selector',
  'attributeAccess',
  'binaryExpression',
  'unaryExpression',
  'callExpression',
  'memberExpression',
  'possessiveExpression',
  'propertyOfExpression',
  'arrayLiteral',
  'objectLiteral',
  'templateLiteral',
  'asExpression',
  'betweenExpression',
  'typeCheckExpression',
  'collectionExpression',
  'conditionalExpression',
  'stringPostfix',
  'blockLiteral',
  'propertyAccess',
  'contextReference',
  'eventHandler',
] as const;

/** The 11 union kinds that never arrive, and who owns each instead. */
const NOT_EVALUATED: ReadonlyArray<readonly [string, string]> = [
  ['cssProperty', 'selector-type-detection.ts reads it structurally'],
  ['functionCall', 'commands/events/trigger.ts destructures .name / .args'],
  ['expression', 'commands/async/fetch.ts + semantic-integration.ts'],
  ['command', 'runtime-base.ts EXECUTES it'],
  ['block', 'runtime-base.ts EXECUTES it'],
  ['CommandSequence', 'runtime-base.ts EXECUTES it'],
  ['Program', 'runtime-base.ts EXECUTES it'],
  ['behavior', 'runtime-base.ts installs it at registration time'],
  ['def', 'runtime-base.ts installs it at registration time'],
  ['initBlock', 'runtime-base.ts installs it at registration time'],
  ['error', 'the interchange converter marker; never executed'],
];

describe('evaluator routing (ENGINE_MIGRATION_PLAN Arc 2 step 3)', () => {
  it('covers every union kind exactly once — otherwise the split below is vacuous', () => {
    // 35 = 26 Expr + 9 Stmt, measured 2026-09-01 and cross-checked two ways.
    // If the union grows, this fails and forces the new kind into one list or
    // the other, which is precisely the decision this file exists to record.
    const all = [...EVALUATED, ...NOT_EVALUATED.map(([k]) => k)];
    expect(new Set(all).size).toBe(all.length);
    expect(all).toHaveLength(35);
  });

  it.each(EVALUATED)('%s reaches a real arm', async kind => {
    const failure = await evaluateAST({ type: kind } as never, ctx()).then(
      () => null,
      (e: Error) => e.message
    );
    if (failure !== null) expect(failure).not.toMatch(UNKNOWN);
  });

  it.each(NOT_EVALUATED)('%s never reaches the evaluator (%s)', async kind => {
    await expect(evaluateAST({ type: kind } as never, ctx())).rejects.toThrow(UNKNOWN);
  });

  it('a plugin kind is served by the registry, not by the unknown throw', async () => {
    const registry = getParserExtensionRegistry();
    const saved = registry.snapshot();
    try {
      registry.registerNodeEvaluator('zzPluginKind', () => 'from-plugin');
      await expect(evaluateAST({ type: 'zzPluginKind' } as never, ctx())).resolves.toBe(
        'from-plugin'
      );
    } finally {
      registry.restore(saved);
    }
    // …and once restored it is unknown again, so the case above proved the
    // registry ran rather than some ambient fallback.
    await expect(evaluateAST({ type: 'zzPluginKind' } as never, ctx())).rejects.toThrow(UNKNOWN);
  });

  /**
   * The old `default` arm consulted the registry only after the switch fell
   * through; the router preserves that order. If it inverted, a plugin could
   * silently replace a core kind's evaluation.
   *
   * `selector` on purpose, NOT `literal`. `evaluateAST` returns `literal` and
   * `identifier` from inlined fast paths ahead of BOTH the kind-set check and
   * the registry, so those two kinds are unshadowable whatever the order is —
   * a version of this test written against `literal` passes even with the
   * registry moved first, which is to say it tests nothing. Measured, not
   * assumed: that mutation was run.
   */
  it('a plugin CANNOT shadow a kind the parser emits', async () => {
    const node = { type: 'selector', value: '.zz-no-such-class' } as never;
    // Compare the outcome WITH a shadowing plugin against the outcome without
    // one, rather than asserting a particular value. `evaluateSelector` needs
    // an expression registry this bare context does not carry, so it throws
    // either way — and "throws the same way" is exactly the claim: the core arm
    // ran. Under the inverted order the second outcome becomes `'hijacked'`
    // while the first does not, so the two stop matching. (Verified: that
    // mutation reddens this row.)
    const outcome = (): Promise<unknown> =>
      evaluateAST(node, ctx()).then(
        value => ({ ok: true, value }),
        (e: Error) => ({ ok: false, value: e.message })
      );

    const withoutPlugin = await outcome();
    const registry = getParserExtensionRegistry();
    const saved = registry.snapshot();
    let withPlugin: unknown;
    try {
      registry.registerNodeEvaluator('selector', () => 'hijacked');
      withPlugin = await outcome();
    } finally {
      registry.restore(saved);
    }

    expect(withPlugin).toEqual(withoutPlugin);
    expect(withPlugin).not.toEqual({ ok: true, value: 'hijacked' });
  });

  it('the two fast-path kinds are unshadowable as well', async () => {
    // Weaker claim than the one above (they never reach either check), but it
    // is the behaviour callers actually depend on, and it is what makes the
    // `selector` choice above necessary rather than arbitrary.
    const registry = getParserExtensionRegistry();
    const saved = registry.snapshot();
    try {
      registry.registerNodeEvaluator('literal', () => 'hijacked');
      await expect(evaluateAST({ type: 'literal', value: 42 } as never, ctx())).resolves.toBe(42);
    } finally {
      registry.restore(saved);
    }
  });
});
