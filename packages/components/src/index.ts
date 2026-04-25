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
 * v1 scope:
 *   - `<template component="tag-name">` scan + customElements.define
 *   - `${attrs.name}` interpolation (kebab-case attribute → camelCase prop,
 *     with Number/Boolean coercion)
 *   - `<slot/>` + `<slot name="X"/>` substitution from instantiation children
 *   - disconnectedCallback fires CleanupRegistry teardown
 *   - MutationObserver watches for dynamically-added templates
 *
 * v2 plans (deferred):
 *   - Reactive re-render (Phase 7 reactivity integration for ${^var})
 *   - Full render-command reuse (`@if` / `@repeat` directives inside templates)
 *   - Style scoping (@scope (tag-name) ...)
 *   - dom-scope isolation for `^var` boundaries
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
