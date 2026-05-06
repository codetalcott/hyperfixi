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
import { parseCaretPrefix, makeEvaluateCaretVar, makeWriteCaretVar } from './caret-var';
import { parseLiveFeature, makeEvaluateLiveFeature } from './live';
import { parseWhenFeature, makeEvaluateWhenFeature } from './when';
import { parseBindFeature, makeEvaluateBindFeature } from './bind';

export { reactive } from './signals';
export type { CaretVarNode } from './caret-var';
export type { LiveFeatureNode } from './live';
export type { WhenFeatureNode } from './when';
export type { BindFeatureNode } from './bind';

/**
 * The plugin object. Install once at app startup; re-installing is idempotent
 * (guarded via a `parserExtensions.hasFeature('live')` check).
 *
 * Registers:
 *   - Features: `live`, `when`, `bind` (top-level features with `end` bodies)
 *   - Prefix op: `^` (primary expression for DOM-scoped vars)
 *   - Node evaluators: `liveFeature`, `whenFeature`, `bindFeature`, `caretVar`
 *   - A node writer for `caretVar` so `set ^X to Y` flows through `reactive.writeCaret`
 *   - Global read/write hooks so `$name` reads track and writes notify
 *
 * Effect cleanup: each effect-creating evaluator calls
 * `context.registerCleanup(owner, stop, ...)` so the core runtime tears effects
 * down when their owning element is cleaned up. There is no separate plugin-level
 * cleanup hook; `reactive.stopElementEffects(el)` is exposed for explicit teardown
 * by tests and consumers that manage element lifecycle outside the runtime.
 */
export const reactivityPlugin: HyperfixiPlugin & { version: string } = {
  name: '@hyperfixi/reactivity',
  version: '2.3.1',
  install(ctx: HyperfixiPluginContext) {
    const { parserExtensions, runtime } = ctx;

    // Idempotency: the parser-extension registry is process-singleton, so
    // re-installing into a fresh runtime would otherwise stack additional
    // global read/write hooks on every call. `snapshot()`/`restore()` clears
    // the feature registry — when tests roll back the registry, this guard
    // re-enables a fresh install.
    if (parserExtensions.hasFeature('live')) return;

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
    parserExtensions.registerNodeEvaluator(
      'caretVar',
      makeEvaluateCaretVar(runtime as never) as never
    );

    // Caret-var write: lets the core `set` command dispatch `set ^X to Y`
    // through `reactive.writeCaret`. Resolves `on <target>` via the captured
    // runtime — no global-scope indirection.
    parserExtensions.registerNodeWriter('caretVar', makeWriteCaretVar(runtime as never) as never);

    // Global-write hook: notify the reactive graph whenever `$name` is set.
    // The returned disposer is intentionally discarded — the install-time
    // idempotency guard above is the sole gate against double-registration.
    parserExtensions.registerGlobalWriteHook((name: string, _value: unknown, _context: unknown) => {
      reactive.notifyGlobal(name);
    });

    // Global-read hook: track the read against the current effect (if any)
    // so effects re-run when the global changes.
    parserExtensions.registerGlobalReadHook((name: string, _context: unknown) => {
      reactive.trackGlobal(name);
    });

    // Local hooks — analogous to globals, but keyed by `context.me` so each
    // element holds independent state. A `set :foo to ...` running in a
    // handler with `me=button1` notifies effects subscribed to (button1, 'foo');
    // a `set :foo` in a different `me` won't reach them. This matches how
    // locals already work — they're never cross-context — and lets two
    // components hold independent `:foo` state without interference.
    parserExtensions.registerLocalWriteHook((name: string, _value: unknown, context) => {
      const owner = (context as { me?: Element | null }).me ?? null;
      if (owner) reactive.notifyElement(owner, name);
    });

    parserExtensions.registerLocalReadHook((name: string, context) => {
      const owner = (context as { me?: Element | null }).me ?? null;
      if (owner) reactive.trackElement(owner, name);
    });
  },
};

export default reactivityPlugin;
