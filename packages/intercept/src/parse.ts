/**
 * `intercept "<scope>" ... end` — top-level feature parser + evaluator.
 *
 * Grammar (v1 — string-literal URLs only):
 *
 *   intercept "<scope>"
 *     precache "<url>"[, "<url>"]* [as "<version>"]
 *     on "<pattern>"[, "<pattern>"]* use <strategy>
 *     on ...                                       (any number)
 *     offline fallback "<url>"
 *   end
 *
 * Upstream (`_hyperscript/src/ext/intercept.js`) also supports naked paths
 * via `consumeNakedPath` — deferred to v2. String literals are unambiguous
 * and cover the same use cases.
 *
 * The entire config is built at parse time (no runtime expressions). The
 * evaluator just hands the config to `registerSW()` which takes care of
 * the navigator.serviceWorker dance.
 */

import type { ASTNode, ExecutionContext, InterceptConfig, Strategy } from './types';
import { registerSW, resetInstalledForTest } from './register-sw';

export { resetInstalledForTest as _resetForTest };

const VALID_STRATEGIES: readonly Strategy[] = [
  'cache-first',
  'network-first',
  'stale-while-revalidate',
  'network-only',
  'cache-only',
];

export interface InterceptFeatureNode extends ASTNode {
  type: 'interceptFeature';
  config: InterceptConfig;
}

/** Minimal shape of the tokens the parser hands us. */
interface ParseToken {
  kind: string;
  value: string;
  start?: number;
  end?: number;
  line?: number;
  column?: number;
}

/**
 * Narrow slice of `ParserContext` this parser actually uses. Keeps the plugin
 * decoupled from `@hyperfixi/core`'s internal type surface; matches the
 * reactivity/components pattern.
 */
interface ParserCtx {
  peek(): ParseToken;
  advance(): ParseToken;
  previous(): ParseToken;
  match(...types: string[]): boolean;
  matchOperator(operator: string): boolean;
  check(value: string): boolean;
  isAtEnd(): boolean;
  getPosition(): { start: number; end: number; line?: number; column?: number };
}

/** Strip surrounding quotes from a STRING token's raw value. */
function unquote(raw: string): string {
  if (raw.length >= 2) {
    const first = raw[0];
    const last = raw[raw.length - 1];
    if ((first === '"' || first === "'" || first === '`') && first === last) {
      return raw.slice(1, -1);
    }
  }
  return raw;
}

/** Consume and return a quoted-string token's content. Throws on non-string. */
function consumeString(ctx: ParserCtx, role: string): string {
  const tok = ctx.peek();
  if (tok.kind !== 'string') {
    throw new Error(
      `intercept: expected a quoted string (${role}), got ${tok.kind} '${tok.value}'`
    );
  }
  ctx.advance();
  return unquote(tok.value);
}

/** Consume a comma (operator token). */
function matchComma(ctx: ParserCtx): boolean {
  return ctx.matchOperator(',');
}

/**
 * Parse the `intercept` feature body after the `intercept` keyword has already
 * been consumed by the parser dispatcher.
 */
export function parseInterceptFeature(ctxAny: unknown, tokenAny: unknown): ASTNode {
  const ctx = ctxAny as ParserCtx;
  const startToken = tokenAny as ParseToken;

  // Scope — required first argument.
  const scope = consumeString(ctx, 'scope');

  const config: InterceptConfig = {
    scope,
    precache: null,
    routes: [],
    offlineFallback: null,
  };

  while (!ctx.isAtEnd() && !ctx.check('end')) {
    if (ctx.match('precache')) {
      parsePrecacheClause(ctx, config);
    } else if (ctx.match('on')) {
      parseRouteClause(ctx, config);
    } else if (ctx.match('offline')) {
      parseOfflineClause(ctx, config);
    } else {
      const tok = ctx.peek();
      throw new Error(
        `intercept: expected 'precache', 'on', 'offline', or 'end', got '${tok.value}'`
      );
    }
  }

  // Consume the terminating `end`.
  if (!ctx.match('end')) {
    throw new Error("intercept: missing 'end' terminator");
  }

  return {
    type: 'interceptFeature',
    config,
    start: startToken?.start ?? 0,
    end: ctx.getPosition().end,
    line: startToken?.line,
    column: startToken?.column,
  } as InterceptFeatureNode;
}

function parsePrecacheClause(ctx: ParserCtx, config: InterceptConfig): void {
  const urls: string[] = [];
  urls.push(consumeString(ctx, 'precache URL'));
  while (matchComma(ctx)) urls.push(consumeString(ctx, 'precache URL'));

  let version: string | null = null;
  if (ctx.match('as')) version = consumeString(ctx, 'precache version');

  config.precache = { urls, version };
}

function parseRouteClause(ctx: ParserCtx, config: InterceptConfig): void {
  const patterns: string[] = [];
  patterns.push(consumeString(ctx, 'route pattern'));
  while (matchComma(ctx)) patterns.push(consumeString(ctx, 'route pattern'));

  if (!ctx.match('use')) {
    throw new Error("intercept: expected 'use' after route patterns");
  }

  const strategy = consumeStrategy(ctx);
  config.routes.push({ patterns, strategy });
}

function parseOfflineClause(ctx: ParserCtx, config: InterceptConfig): void {
  if (!ctx.match('fallback')) {
    throw new Error("intercept: expected 'fallback' after 'offline'");
  }
  config.offlineFallback = consumeString(ctx, 'offline fallback URL');
}

function consumeStrategy(ctx: ParserCtx): Strategy {
  // Strategies are hyphenated identifiers. The tokenizer emits each segment
  // as a separate identifier (with '-' as an operator between), so we
  // reconstruct the name by joining identifier-operator-identifier sequences.
  const first = ctx.peek();
  if (first.kind !== 'identifier') {
    throw new Error(`intercept: expected strategy name, got ${first.kind} '${first.value}'`);
  }
  let name = first.value;
  ctx.advance();
  while (ctx.matchOperator('-')) {
    const next = ctx.peek();
    if (next.kind !== 'identifier') {
      throw new Error(`intercept: malformed strategy name near '${next.value}'`);
    }
    name += '-' + next.value;
    ctx.advance();
  }
  if (!(VALID_STRATEGIES as readonly string[]).includes(name)) {
    throw new Error(
      `intercept: unknown strategy '${name}'. Expected one of: ${VALID_STRATEGIES.join(', ')}`
    );
  }
  return name as Strategy;
}

/**
 * Build an evaluator for `interceptFeature` nodes. The evaluator is a thin
 * wrapper around `registerSW` — it extracts the config from the AST node and
 * fires the SW registration. Returns `undefined` (no value).
 *
 * `swUrl` is captured at plugin-install time so each plugin instance can
 * target a different location if needed.
 */
export function makeEvaluateInterceptFeature(
  swUrl: string
): (node: ASTNode, ctx: unknown) => unknown | Promise<unknown> {
  return async function evaluateInterceptFeature(node, _ctx) {
    const n = node as InterceptFeatureNode;
    void (_ctx as ExecutionContext); // reserved for future use (logging, etc.)
    await registerSW(n.config, swUrl);
    return undefined;
  };
}
