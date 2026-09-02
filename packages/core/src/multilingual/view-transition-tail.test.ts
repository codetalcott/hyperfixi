/**
 * `using view transition` survives the SEMANTIC path into both runtimes.
 *
 * English never had this problem: `process` was on the traditional parser's
 * `skipSemanticParsing` list and `swap` on the semantic adapter's skip list (historical: the in-loop semantic path this describes was deleted by Arc 1 step 6, 2026-09-02 — English is parsed by the core parser alone), so
 * the tail arrives as three flat identifier args there. Every OTHER language
 * reaches the runtime through semantic parse → buildAST, and until
 * `swapSchema`/`processSchema` grew a `manner` role that path dropped the tail
 * silently — an animated swap degraded to a plain one with no diagnostic, in all
 * 24 languages.
 *
 * These rows walk the whole path for a non-English language, ending at the
 * parseInput each command actually runs, because that is the only place the
 * defect was observable: the semantic node can carry the role correctly and
 * still lose it at the AST descriptor, or reach the AST and be read under a
 * different key. Role-level assertions live in
 * `packages/semantic/test/view-transition-manner.test.ts`.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { parse, buildAST } from '@lokascript/semantic';
import { ProcessPartialsCommand } from '../commands/dom/process-partials';
import { SwapCommand } from '../commands/dom/swap';
import type { ASTNode } from '../types/base-types';
import type { ExecutionContext } from '../types/core';
import type { ExpressionEvaluator } from '../core/expression-evaluator';

/** Resolves literals to their value and everything else to its raw name. */
const evaluator = {
  evaluate: async (node: ASTNode) => {
    const n = node as unknown as { type?: string; value?: unknown; name?: unknown };
    if (n.type === 'literal') return n.value;
    return n.name ?? undefined;
  },
} as unknown as ExpressionEvaluator;

const context = {
  me: null,
  it: '<hx-partial target="#t">x</hx-partial>',
} as unknown as ExecutionContext;

/** semantic surface → the `{ args, modifiers }` shape a runtime parseInput gets. */
function rawInput(
  source: string,
  language: string
): {
  args: ASTNode[];
  modifiers: Record<string, unknown>;
} {
  const node = parse(source, language);
  expect(node, `${language}: "${source}" did not parse`).not.toBeNull();
  const ast = buildAST(node as never).ast as unknown as {
    args?: ASTNode[];
    modifiers?: Record<string, unknown>;
  };
  return { args: ast.args ?? [], modifiers: ast.modifiers ?? {} };
}

describe('process partials — the tail reaches ProcessPartialsCommand', () => {
  const command = new ProcessPartialsCommand();

  // Rendered from the English node by the semantic renderer. ja is verb-final,
  // so the tail lands BEFORE the verb — the placement that makes this worth
  // testing outside English.
  it.each([
    ['ja', 'それ partials in using view transition 処理'],
    ['ko', '그것 partials in using view transition 처리'],
    ['es', 'procesar partials in ello using view transition'],
  ])('%s', async (lang, source) => {
    const raw = rawInput(source, lang);
    expect(raw.modifiers.viewTransition, `${lang}: modifiers.viewTransition`).toBeDefined();

    const input = await command.parseInput(raw as never, evaluator, context);
    expect(input.useViewTransition, `${lang}: useViewTransition`).toBe(true);
  });

  it('stays false for the tail-less form (ja)', async () => {
    const raw = rawInput('それ partials in 処理', 'ja');
    expect(raw.modifiers.viewTransition).toBeUndefined();

    const input = await command.parseInput(raw as never, evaluator, context);
    expect(input.useViewTransition).toBe(false);
  });
});

describe('swap — the tail reaches SwapCommand', () => {
  const command = new SwapCommand();

  // SwapCommand.parseInput resolves its target eagerly and throws when the
  // selector matches nothing, so the elements have to exist.
  beforeEach(() => {
    document.body.innerHTML = '<div id="a"></div><div id="b"></div>';
  });

  it.each([
    ['ja', '#a に #b を using view transition 交換'],
    ['ko', '#a 에 #b 을 using view transition 교환'],
    ['es', 'intercambiar #a con #b using view transition'],
  ])('%s', async (lang, source) => {
    const raw = rawInput(source, lang);
    expect(raw.modifiers.viewTransition, `${lang}: modifiers.viewTransition`).toBeDefined();

    const input = await command.parseInput(raw as never, evaluator, context);
    expect(input.useViewTransition, `${lang}: useViewTransition`).toBe(true);
    // The tail must not disturb positional selection: SwapCommand reads its
    // target from args[len-2] and its content from args[len-1].
    expect(raw.args).toHaveLength(2);
  });

  it('stays false for the tail-less form (es)', async () => {
    const raw = rawInput('intercambiar #a con #b', 'es');
    expect(raw.modifiers.viewTransition).toBeUndefined();

    const input = await command.parseInput(raw as never, evaluator, context);
    expect(input.useViewTransition).toBe(false);
  });
});
