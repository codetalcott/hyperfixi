/**
 * Compiled form of a statement — Arc 4b of `docs-internal/ENGINE_MIGRATION_PLAN.md`.
 *
 * `RuntimeBase.compile(node)` binds an AST node to an `Op` ONCE (memoised on
 * the node object, so the API's cached ASTs yield cached closures) and every
 * structural loop in the runtime runs the closure. The protocol is Arc 4a's:
 * an `Op` resolves to `ok(value)` or `err(signal)`, never throws a signal.
 *
 * A command whose arguments carry bodies — `if`/`unless` branches, `repeat`'s
 * loop body and `else`, `tell`'s and `start view transition`'s command lists
 * — receives them precompiled as {@link BodyOps}, parallel to `args`: the
 * entry at index `i` is the `Op` for `args[i]` when that argument is a `block`
 * or a `command` node, and `undefined` otherwise. That replaces the
 * former `_runtimeExecute` back-channel through `context.locals`: no command
 * re-enters the runtime through a variable map.
 */

import type { ExecutionContext } from './core';
import type { ExecutionResult } from './result';

export type Op = (context: ExecutionContext) => Promise<ExecutionResult<unknown>>;

export interface Program {
  readonly run: Op;
}

export type BodyOps = ReadonlyArray<Op | undefined>;
