/**
 * URL pattern matcher — shared between the SW runtime and unit tests.
 *
 * Mirrors upstream `intercept-sw.js`'s matcher rules:
 *   `*`            → match anything
 *   `*.ext`        → match any path ending with `.ext`
 *   `/prefix/*`    → match any path starting with `/prefix/`
 *   `/exact`       → match only the exact path
 *
 * Intentionally tiny: the service-worker context is sensitive to startup cost,
 * and users rarely need full glob/regex matching at this layer. If you need
 * something more expressive, filter inside the `intercept` body.
 */

import type { InterceptConfig, Strategy } from './types';

export interface Route {
  patterns: string[];
  strategy: Strategy;
}

export function matchesPattern(path: string, pattern: string): boolean {
  if (pattern === '*') return true;
  if (pattern.startsWith('*.')) return path.endsWith(pattern.slice(1));
  if (pattern.endsWith('/*')) return path.startsWith(pattern.slice(0, -1));
  return pattern === path;
}

export function findRoute(path: string, routes: Route[]): Route | null {
  for (const r of routes) {
    for (const p of r.patterns) {
      if (matchesPattern(path, p)) return r;
    }
  }
  return null;
}

/** Resolve the cache key a runtime should use for a given config. */
export function cacheKeyFor(config: Pick<InterceptConfig, 'precache'>): string {
  return config.precache?.version || 'hs-v1';
}
