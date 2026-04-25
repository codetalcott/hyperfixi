/**
 * Lightweight local type stubs — mirror the speech/reactivity/components
 * pattern of avoiding tight coupling to `@hyperfixi/core` internals. Only the
 * plugin contract itself (`HyperfixiPlugin`, `HyperfixiPluginContext`) is
 * imported from core; everything the parser and evaluator touch is described
 * by these stubs.
 */

export interface ASTNode {
  type: string;
  start?: number;
  end?: number;
  line?: number;
  column?: number;
  [k: string]: unknown;
}

export interface ExecutionContext {
  me?: Element | null;
  result?: unknown;
  it?: unknown;
  globals?: Map<string, unknown>;
  locals?: Map<string, unknown>;
  [k: string]: unknown;
}

/** The five cache strategies upstream ships. */
export type Strategy =
  | 'cache-first'
  | 'network-first'
  | 'stale-while-revalidate'
  | 'network-only'
  | 'cache-only';

/** Runtime config posted to the service worker as `hs:intercept:config`. */
export interface InterceptConfig {
  scope: string;
  precache: { urls: string[]; version: string | null } | null;
  routes: Array<{ patterns: string[]; strategy: Strategy }>;
  offlineFallback: string | null;
}
