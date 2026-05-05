/**
 * @hyperfixi/components — template-component plugin for hyperfixi.
 *
 * Registers custom elements from `<template component="tag-name">` definitions
 * (mirrors upstream _hyperscript 0.9.91's component extension). Users write:
 *
 * ```html
 * <template component="my-counter">
 *   <button>Count: ${attrs.initialCount ?? 0}</button>
 * </template>
 *
 * <my-counter initial-count="5"></my-counter>
 * ```
 *
 * Install at app startup:
 *
 * ```ts
 * import { createRuntime, installPlugin } from '@hyperfixi/core';
 * import { componentsPlugin } from '@hyperfixi/components';
 *
 * const runtime = createRuntime();
 * installPlugin(runtime, componentsPlugin);
 * // Then scan (typically after DOMContentLoaded):
 * componentsPlugin.scan(document);
 * ```
 *
 * v2.1 scope:
 *   - `<template component="tag-name">` scan + customElements.define
 *   - `${attrs.name}` and `${^var}` interpolation (kebab-case attribute →
 *     camelCase prop, with Number/Boolean coercion)
 *   - `^var` reads tracked via @hyperfixi/reactivity; the template re-stamps
 *     when any tracked `^var` changes
 *   - Per-instance init script — `<template _="set ^count to 0">` (or `_=`
 *     on the upstream `<script type="text/hyperscript-template">` form) runs
 *     once on each instance via the runtime's standard init mechanism
 *   - `attrs` available as a hyperscript local inside the init script — so
 *     `_="set ^user to attrs.data as JSON"` works (descendants don't see
 *     attrs; copy via ^vars during init if needed)
 *   - `<slot/>` + `<slot name="X"/>` substitution from instantiation children
 *   - `#if` / `#for` / `#else` / `#end` template directives
 *   - `dom-scope="isolated"` boundary auto-set on each instance — nested
 *     components don't leak `^var` reads/writes through each other
 *   - `<style>` blocks lifted into <head> wrapped in `@scope (tag-name)` so
 *     styles only apply within instances of that tag
 *   - disconnectedCallback fires CleanupRegistry teardown
 *   - MutationObserver watches for dynamically-added templates
 *
 * v2.2+ deferred:
 *   - `#continue` directive in `#for` loops
 *   - Reactive array mutation auto-tracking (matches upstream's known limit)
 *   - Full parent-scope hyperscript evaluation of attribute values (today
 *     `attrs.X` returns the raw string; users `as JSON` to parse)
 */

import type { HyperfixiPlugin, HyperfixiPluginContext } from '@hyperfixi/core';
import type { RuntimeLike } from './types';
import { scanAndRegister, watchForTemplates } from './scan';
import { registerTemplateComponent } from './register';

export { registerTemplateComponent, scanAndRegister, watchForTemplates };

/**
 * Module-level handle to the runtime captured at install time. Used by `scan`
 * and `watch` to thread the runtime into each registered component for
 * cleanup-registry access and child-processing.
 */
let INSTALLED_RUNTIME: RuntimeLike | null = null;
let STOP_WATCH: (() => void) | null = null;

/**
 * Plugin object. `install()` captures the runtime; `scan()` / `watch()` can
 * be called any time after install.
 */
export const componentsPlugin: HyperfixiPlugin & {
  scan(root?: ParentNode): number;
  watch(): () => void;
  unwatch(): void;
} = {
  name: '@hyperfixi/components',
  install(ctx: HyperfixiPluginContext) {
    INSTALLED_RUNTIME = ctx.runtime as unknown as RuntimeLike;
  },
  /**
   * Scan `root` (defaults to `document`) for template components and register
   * each. Safe to call before or after install (but install is needed for
   * cleanup-registry hookup).
   */
  scan(root?: ParentNode): number {
    return scanAndRegister(root, { runtime: INSTALLED_RUNTIME ?? undefined });
  },
  /**
   * Start watching the document for dynamically-added template components.
   * Idempotent — calling twice is a no-op on the second call.
   * Returns a disposer that also clears the module-level handle.
   */
  watch(): () => void {
    if (STOP_WATCH) return STOP_WATCH;
    const stop = watchForTemplates({ runtime: INSTALLED_RUNTIME ?? undefined });
    STOP_WATCH = () => {
      stop();
      STOP_WATCH = null;
    };
    return STOP_WATCH;
  },
  unwatch(): void {
    if (STOP_WATCH) STOP_WATCH();
  },
};

export default componentsPlugin;
