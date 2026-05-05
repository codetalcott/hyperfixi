/**
 * @hyperfixi/reactivity — signal-based reactive features for hyperfixi.
 *
 * Adds four constructs from upstream _hyperscript 0.9.90:
 *
 *   live [commandList] end                       reactive block — body re-runs
 *                                                when tracked reads change.
 *
 *   when <expr> [or <expr>]* changes             observer — body runs when any
 *     [commandList] end                          watched expression changes.
 *
 *   bind <var> to <element>                      two-way DOM ⇄ var binding.
 *
 *   ^name [on <target>]                          DOM-scoped inherited variable
 *                                                (read + write with `^`).
 *
 * Install:
 *
 * ```ts
 * import { createRuntime, installPlugin } from '@hyperfixi/core';
 * import { reactivityPlugin } from '@hyperfixi/reactivity';
 *
 * const runtime = createRuntime();
 * installPlugin(runtime, reactivityPlugin);
 * ```
 */

import type { HyperfixiPlugin, HyperfixiPluginContext } from '@hyperfixi/core';
import { reactive } from './signals';
import { parseCaretPrefix, evaluateCaretVar, type CaretVarNode } from './caret-var';
import { parseLiveFeature, makeEvaluateLiveFeature } from './live';
import { parseWhenFeature, makeEvaluateWhenFeature } from './when';
import { parseBindFeature, makeEvaluateBindFeature } from './bind';

export { reactive } from './signals';
export type { CaretVarNode } from './caret-var';
export type { LiveFeatureNode } from './live';
export type { WhenFeatureNode } from './when';
export type { BindFeatureNode } from './bind';

/**
 * The plugin object. Install once at app startup; re-installing is idempotent.
 *
 * Registers:
 *   - Features: `live`, `when`, `bind` (top-level features with `end` bodies)
 *   - Prefix op: `^` (primary expression for DOM-scoped vars)
 *   - Node evaluators: `liveFeature`, `whenFeature`, `bindFeature`, `caretVar`
 *   - A global-write hook so `set $foo` notifies reactive effects
 *   - A runtime cleanup hook so `reactive.stopElementEffects(el)` fires when
 *     elements are cleaned up by the core runtime
 */
export const reactivityPlugin: HyperfixiPlugin = {
  name: '@hyperfixi/reactivity',
  install(ctx: HyperfixiPluginContext) {
    const { parserExtensions, runtime } = ctx;

    // Parser hooks — three block features plus a primary-expression caret.
    parserExtensions.registerFeature('live', parseLiveFeature as never);
    parserExtensions.registerFeature('when', parseWhenFeature as never);
    parserExtensions.registerFeature('bind', parseBindFeature as never);
    parserExtensions.registerPrefixOperator('^', 85, parseCaretPrefix as never);

    // Runtime evaluators. Features capture `runtime` so effect re-runs can
    // dispatch body commands without going through module-scope state.
    parserExtensions.registerNodeEvaluator(
      'liveFeature',
      makeEvaluateLiveFeature(runtime as never) as never
    );
    parserExtensions.registerNodeEvaluator(
      'whenFeature',
      makeEvaluateWhenFeature(runtime as never) as never
    );
    parserExtensions.registerNodeEvaluator(
      'bindFeature',
      makeEvaluateBindFeature(runtime as never) as never
    );
    parserExtensions.registerNodeEvaluator('caretVar', evaluateCaretVar as never);

    // Caret-var write: lets the core `set` command dispatch `set ^X to Y`
    // through `reactive.writeCaret`. Resolves `on <target>` clauses via the
    // shared globalThis expression-evaluator hook below.
    parserExtensions.registerNodeWriter('caretVar', async (node, value, ctx) => {
      const n = node as CaretVarNode;
      const context = ctx as { me?: Element | null };
      const anchor: Element | null = context.me ?? null;
      if (!anchor) return;
      let target: Element | undefined;
      if (n.onTarget) {
        const resolver = (globalThis as Record<string, unknown>)
          .__hyperfixi_reactivity_eval_expr as
          | ((node: unknown, ctx: unknown) => Promise<unknown>)
          | undefined;
        if (resolver) {
          const resolved = await resolver(n.onTarget, ctx);
          if (resolved instanceof Element) target = resolved;
        }
      }
      reactive.writeCaret(anchor, n.name, value, target);
    });

    // Global-write hook: notify the reactive graph whenever `$name` is set.
    parserExtensions.registerGlobalWriteHook((name: string, _value: unknown, _context: unknown) => {
      reactive.notifyGlobal(name);
    });

    // Global-read hook: track the read against the current effect (if any)
    // so effects re-run when the global changes.
    parserExtensions.registerGlobalReadHook((name: string, _context: unknown) => {
      reactive.trackGlobal(name);
    });

    // Expose the expression evaluator for caret-var's `on <target>` resolution
    // via a single global-scope hook. (The caret-var node evaluator has no
    // direct reference to the runtime; this indirection avoids circular
    // captures without forcing each Pratt prefix to route through install
    // context.)
    (globalThis as any).__hyperfixi_reactivity_eval_expr = async (
      node: unknown,
      exCtx: unknown
    ) => {
      return await (
        runtime as unknown as {
          execute(n: unknown, c: unknown): Promise<unknown>;
        }
      ).execute(node, exCtx);
    };
  },
};

export default reactivityPlugin;
