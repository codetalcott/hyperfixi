/**
 * `intercept "<scope>" ... end` — top-level feature parser + evaluator.
 *
 * Grammar (v2.1):
 *
 *   intercept <scope>
 *     precache <url>[, <url>]* [as "<version>"]
 *     on <pattern>[, <pattern>]* use <strategy>
 *     on ...                                       (any number)
 *     offline fallback <url>
 *   end
 *
 * Where `<scope>`, `<url>`, `<pattern>` accept either a quoted string
 * (`"/api/*"`) or a naked path (`/api/*`). Naked paths are reassembled from
 * the underlying token stream within the intercept block — `/`, identifiers,
 * `.`, `*`, `-`, `_`. Path consumption stops at clause keywords (`as`, `use`,
 * `end`, `precache`, `on`, `offline`, `fallback`) and at the `,` separator.
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

/**
 * Operator tokens that can appear inside a naked path. Anything else (notably
 * `,`) ends the path and lets the surrounding clause continue.
 */
const PATH_OPERATORS = new Set(['/', '.', '*', '-', '_']);

/**
 * Identifier tokens that signal the end of a naked path — these are clause
 * keywords or block terminators, never path components.
 */
const PATH_STOP_IDENTS = new Set(['as', 'use', 'end', 'precache', 'on', 'offline', 'fallback']);

/**
 * Consume either a quoted string or a naked path token sequence and return
 * the URL/pattern as a single string. Naked paths look like `/api/*` —
 * a sequence of `/`, identifiers, `.`, `*`, `-`, `_` reassembled by their
 * raw token values.
 *
 * Two stop conditions:
 *   1. **Adjacency** — once consumption starts, the path continues only as
 *      long as the next token is positioned immediately after the previous
 *      one (no whitespace gap). Whitespace ends the path. This lets paths
 *      contain identifiers that happen to share names with clause keywords
 *      (e.g., `/offline.html`) without prematurely terminating.
 *   2. **First-token guard** — if the very first token is itself a clause
 *      keyword (`as`, `use`, `end`, `precache`, `on`, `offline`, `fallback`),
 *      we stop immediately so the surrounding parser can dispatch to the
 *      correct clause handler.
 */
function consumeStringOrPath(ctx: ParserCtx, role: string): string {
  const first = ctx.peek();
  if (first.kind === 'string') {
    ctx.advance();
    return unquote(first.value);
  }

  let path = '';
  let consumed = false;
  let lastEnd: number | undefined;

  while (!ctx.isAtEnd()) {
    const tok = ctx.peek();

    // Adjacency: once we've started, demand contiguous tokens. Tokens with
    // unspecified positions degrade gracefully (treated as adjacent).
    if (consumed && lastEnd !== undefined && tok.start !== undefined && tok.start !== lastEnd) {
      break;
    }

    if (tok.kind === 'identifier') {
      if (!consumed && PATH_STOP_IDENTS.has(tok.value.toLowerCase())) break;
      path += tok.value;
      ctx.advance();
      consumed = true;
      lastEnd = tok.end;
      continue;
    }
    if (tok.kind === 'operator') {
      if (!PATH_OPERATORS.has(tok.value)) break;
      path += tok.value;
      ctx.advance();
      consumed = true;
      lastEnd = tok.end;
      continue;
    }
    if (tok.kind === 'number') {
      path += tok.value;
      ctx.advance();
      consumed = true;
      lastEnd = tok.end;
      continue;
    }
    break;
  }
  if (!consumed) {
    throw new Error(
      `intercept: expected a quoted string or naked path (${role}), got ${first.kind} '${first.value}'`
    );
  }
  return path;
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

  // Scope — required first argument. Accepts string or naked path.
  const scope = consumeStringOrPath(ctx, 'scope');

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
  urls.push(consumeStringOrPath(ctx, 'precache URL'));
  while (matchComma(ctx)) urls.push(consumeStringOrPath(ctx, 'precache URL'));

  let version: string | null = null;
  // The version is always quoted — naked paths don't make sense here, and
  // restricting to strings keeps the grammar unambiguous after `as`.
  if (ctx.match('as')) version = consumeString(ctx, 'precache version');

  config.precache = { urls, version };
}

function parseRouteClause(ctx: ParserCtx, config: InterceptConfig): void {
  const patterns: string[] = [];
  patterns.push(consumeStringOrPath(ctx, 'route pattern'));
  while (matchComma(ctx)) patterns.push(consumeStringOrPath(ctx, 'route pattern'));

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
  config.offlineFallback = consumeStringOrPath(ctx, 'offline fallback URL');
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
