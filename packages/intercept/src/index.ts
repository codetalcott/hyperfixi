/**
 * @hyperfixi/intercept — service-worker request-interception plugin.
 *
 * Adds the upstream _hyperscript 0.9.90 `intercept ... end` feature to
 * hyperfixi. The plugin auto-registers a service worker that routes matching
 * requests through configurable caching strategies.
 *
 * ```ts
 * import { createRuntime, installPlugin } from '@hyperfixi/core';
 * import { interceptPlugin } from '@hyperfixi/intercept';
 *
 * const runtime = createRuntime();
 * installPlugin(runtime, interceptPlugin);
 * ```
 *
 * DSL (v1 — string-literal URLs only):
 *
 * ```
 * intercept "/"
 *   precache "/", "/index.html", "/app.js" as "v2"
 *   on "/api/*" use network-first
 *   on "*.css", "*.js" use cache-first
 *   offline fallback "/offline.html"
 * end
 * ```
 *
 * **Ship as strictly opt-in.** Service-worker registration has strong UX and
 * security implications — never enable by default. Users must also serve
 * `dist/intercept-sw.js` at the path configured via `swUrl` (default
 * `/hyperfixi-sw.js`).
 */

import type { HyperfixiPlugin, HyperfixiPluginContext } from '@hyperfixi/core';
import { parseInterceptFeature, makeEvaluateInterceptFeature } from './parse';

export type { InterceptConfig, Strategy } from './types';
export type { InterceptFeatureNode } from './parse';
export { _resetForTest } from './parse';
export { matchesPattern, findRoute, cacheKeyFor } from './pattern-match';

export interface InterceptPluginOptions {
  /**
   * URL where the service-worker runtime is hosted. Default
   * `'/hyperfixi-sw.js'`. You must serve the `dist/intercept-sw.js` file
   * shipped in this package at that path.
   */
  swUrl?: string;
}

const DEFAULT_SW_URL = '/hyperfixi-sw.js';

/**
 * Factory for a configured intercept plugin. Use when you need a non-default
 * `swUrl`; otherwise import `interceptPlugin` directly.
 */
export function createInterceptPlugin(options: InterceptPluginOptions = {}): HyperfixiPlugin {
  const swUrl = options.swUrl ?? DEFAULT_SW_URL;
  return {
    name: '@hyperfixi/intercept',
    install(ctx: HyperfixiPluginContext) {
      const { parserExtensions } = ctx;
      parserExtensions.registerFeature('intercept', parseInterceptFeature as never);
      parserExtensions.registerNodeEvaluator(
        'interceptFeature',
        makeEvaluateInterceptFeature(swUrl) as never
      );
    },
  };
}

/** Default plugin — uses `/hyperfixi-sw.js` as the service-worker path. */
export const interceptPlugin: HyperfixiPlugin = createInterceptPlugin();

export default interceptPlugin;
