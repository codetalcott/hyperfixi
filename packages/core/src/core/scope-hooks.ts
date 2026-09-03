/**
 * Scope read/write hooks — the reactivity plugin's dependency tracking
 * (Arc 4c step 4 of `docs-internal/ENGINE_MIGRATION_PLAN.md`).
 *
 * These used to live in `parser/extensions.ts`, which put two upward imports
 * in the layering graph (`expressions → parser`, `commands → parser`) for
 * something that has nothing to do with parsing: a `$name` write or a `:name`
 * read notifying whoever subscribed. They belong with the scope, in `core/`.
 * `parser/extensions.ts` re-exports them and its registry's `register*Hook`
 * methods delegate here, so a plugin's `parserExtensions.registerGlobalWriteHook`
 * keeps working unchanged.
 *
 * Every notify is a no-op when no hook is installed — the common case — and
 * a hook that throws is reported, never propagated: hooks are best-effort.
 */

import type { ExecutionContext } from '../types/base-types';

/** Invoked on every global-variable write (`set $foo to 42`). Fire-and-forget. */
export type GlobalWriteHook = (name: string, value: unknown, context: ExecutionContext) => void;
/** Invoked on every global-variable read, so an effect can subscribe to `$foo`. */
export type GlobalReadHook = (name: string, context: ExecutionContext) => void;
/** Invoked on every local-variable write (`set :foo to 42`). */
export type LocalWriteHook = (name: string, value: unknown, context: ExecutionContext) => void;
/** Invoked on every local-variable read (`:foo`). */
export type LocalReadHook = (name: string, context: ExecutionContext) => void;

const GLOBAL_WRITE_HOOKS = new Set<GlobalWriteHook>();
const GLOBAL_READ_HOOKS = new Set<GlobalReadHook>();
const LOCAL_WRITE_HOOKS = new Set<LocalWriteHook>();
const LOCAL_READ_HOOKS = new Set<LocalReadHook>();

function report(kind: string, err: unknown): void {
  if (typeof console !== 'undefined') {
    console.error(`[hyperfixi] ${kind} threw:`, err);
  }
}

export function registerGlobalWriteHook(hook: GlobalWriteHook): () => void {
  GLOBAL_WRITE_HOOKS.add(hook);
  return () => GLOBAL_WRITE_HOOKS.delete(hook);
}
export function registerGlobalReadHook(hook: GlobalReadHook): () => void {
  GLOBAL_READ_HOOKS.add(hook);
  return () => GLOBAL_READ_HOOKS.delete(hook);
}
export function registerLocalWriteHook(hook: LocalWriteHook): () => void {
  LOCAL_WRITE_HOOKS.add(hook);
  return () => LOCAL_WRITE_HOOKS.delete(hook);
}
export function registerLocalReadHook(hook: LocalReadHook): () => void {
  LOCAL_READ_HOOKS.add(hook);
  return () => LOCAL_READ_HOOKS.delete(hook);
}

/** Iterate registered global-write hooks (internal; `setGlobal` is the caller). */
export function getGlobalWriteHooks(): Iterable<GlobalWriteHook> {
  return GLOBAL_WRITE_HOOKS;
}
/** Iterate registered local-write hooks (internal). */
export function getLocalWriteHooks(): Iterable<LocalWriteHook> {
  return LOCAL_WRITE_HOOKS;
}

export function notifyGlobalRead(name: string, context: ExecutionContext): void {
  if (GLOBAL_READ_HOOKS.size === 0) return;
  for (const hook of GLOBAL_READ_HOOKS) {
    try {
      hook(name, context);
    } catch (err) {
      report('globalReadHook', err);
    }
  }
}
export function notifyLocalWrite(name: string, value: unknown, context: ExecutionContext): void {
  if (LOCAL_WRITE_HOOKS.size === 0) return;
  for (const hook of LOCAL_WRITE_HOOKS) {
    try {
      hook(name, value, context);
    } catch (err) {
      report('localWriteHook', err);
    }
  }
}
export function notifyLocalRead(name: string, context: ExecutionContext): void {
  if (LOCAL_READ_HOOKS.size === 0) return;
  for (const hook of LOCAL_READ_HOOKS) {
    try {
      hook(name, context);
    } catch (err) {
      report('localReadHook', err);
    }
  }
}

/**
 * Write a `$name` global and notify the write hooks. Every core write path
 * for a global goes through here.
 */
export function setGlobal(context: ExecutionContext, name: string, value: unknown): void {
  context.globals.set(name, value);
  if (GLOBAL_WRITE_HOOKS.size === 0) return;
  for (const hook of GLOBAL_WRITE_HOOKS) {
    try {
      hook(name, value, context);
    } catch (err) {
      report('globalWriteHook', err);
    }
  }
}

/** The hook sets, for the parser-extension registry's test-isolation snapshot. */
export interface ScopeHooksSnapshot {
  globalWriteHooks: GlobalWriteHook[];
  globalReadHooks: GlobalReadHook[];
  localWriteHooks: LocalWriteHook[];
  localReadHooks: LocalReadHook[];
}
export function snapshotScopeHooks(): ScopeHooksSnapshot {
  return {
    globalWriteHooks: Array.from(GLOBAL_WRITE_HOOKS),
    globalReadHooks: Array.from(GLOBAL_READ_HOOKS),
    localWriteHooks: Array.from(LOCAL_WRITE_HOOKS),
    localReadHooks: Array.from(LOCAL_READ_HOOKS),
  };
}
export function restoreScopeHooks(snapshot: Partial<ScopeHooksSnapshot>): void {
  GLOBAL_WRITE_HOOKS.clear();
  for (const h of snapshot.globalWriteHooks ?? []) GLOBAL_WRITE_HOOKS.add(h);
  GLOBAL_READ_HOOKS.clear();
  for (const h of snapshot.globalReadHooks ?? []) GLOBAL_READ_HOOKS.add(h);
  LOCAL_WRITE_HOOKS.clear();
  for (const h of snapshot.localWriteHooks ?? []) LOCAL_WRITE_HOOKS.add(h);
  LOCAL_READ_HOOKS.clear();
  for (const h of snapshot.localReadHooks ?? []) LOCAL_READ_HOOKS.add(h);
}
