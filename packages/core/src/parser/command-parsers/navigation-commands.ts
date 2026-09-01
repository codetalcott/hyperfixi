/**
 * Navigation Command Parsers
 *
 * Dedicated parser for the `go` command. `go` has no continuation-keyword
 * context, so the generic command-arg loop drops its trailing destination
 * (`go to /page` → the URL is discarded) and folds scroll forms
 * (`go to top of #el`) into binary expressions. This parser instead emits
 * `go`'s arguments as a flat, ordered token list that the runtime
 * ([commands/navigation/go.ts]) consumes directly:
 *
 *   - structural keywords (`to`, `url`, `of`, `in new window`, scroll positions,
 *     `back`) as `string` nodes — they must evaluate to their own text, since an
 *     unbound identifier evaluates to `undefined` at runtime;
 *   - naked URLs (`/about`, `https://x.com`) reassembled into a single string
 *     literal (they don't survive expression parsing — a leading `/` is a binary
 *     operator);
 *   - everything else (quoted strings, template literals, variables, selectors)
 *     via `parsePrimary`.
 *
 * Supports the standard hyperscript grammar `go [to] <expression> [in new window]`
 * and `go back` (https://hyperscript.org/commands/go/), plus the deprecated
 * `go to url <expr>` and scroll-modifier forms (`go to the top of ... smoothly`)
 * for back-compat.
 *
 * @module parser/command-parsers/navigation-commands
 */

import type { ParserContext, IdentifierNode } from '../parser-types';
import type { ASTNode, CommandNode, Token } from '../../types/core';
import { CommandNodeBuilder } from '../command-node-builder';
import { isCommandBoundary } from '../helpers/parsing-helpers';
import { parseBareURLPath, isNakedURLStart } from './utility-commands';

/**
 * Keywords that structure a `go` command. Matched value-first (via
 * `resolveKeyword` for multilingual input) and emitted as `string` nodes.
 */
const GO_KEYWORDS = new Set([
  'to',
  'the',
  'url',
  'of',
  'in',
  'new',
  'window',
  'top',
  'middle',
  'bottom',
  'left',
  'center',
  'right',
  'smoothly',
  'instantly',
  'back',
  'forward',
]);

function stringNode(value: string, tok: Pick<Token, 'start' | 'end' | 'line' | 'column'>): ASTNode {
  return {
    type: 'string',
    value,
    start: tok.start,
    end: tok.end,
    line: tok.line,
    column: tok.column,
  } as ASTNode;
}

/**
 * Parse `go` command arguments as a flat token list.
 *
 * @param ctx - Parser context providing access to parser state and methods
 * @param identifierNode - The `go` identifier node
 * @returns CommandNode representing the go command
 */
export function parseGoCommand(
  ctx: ParserContext,
  identifierNode: IdentifierNode
): CommandNode | null {
  const args: ASTNode[] = [];

  while (!isCommandBoundary(ctx, ['when', 'where', 'catch', 'finally'])) {
    const tok = ctx.peek();
    const canonical = ctx.resolveKeyword(tok.value).toLowerCase();

    // 1. Structural go keyword → flat string arg.
    if (GO_KEYWORDS.has(canonical)) {
      ctx.advance();
      args.push(stringNode(canonical, tok));
      continue;
    }

    // 2. Naked URL (/path or scheme://…) → one reassembled string literal.
    //
    // The same routine `fetch` uses. `go` used to pass its own GO_URL_STOP set
    // (`in`, `then`, `and`, …), but every word in it is whitespace-separated in
    // the grammar, so adjacency subsumes the whole set: in `go to /x in new
    // window`, `x` ends at 8 and `in` starts at 9, so the URL stops on its own.
    if (isNakedURLStart(ctx)) {
      const url = parseBareURLPath(ctx);
      if (url) {
        args.push(url);
        continue;
      }
      // Pathological lone `/`: consume it so the loop makes progress.
      ctx.advance();
      args.push(stringNode(tok.value, tok));
      continue;
    }

    // 3. Scroll offset sign (`+ 50`, `- 50px`) → keep the sign as a string.
    if (tok.value === '+' || tok.value === '-') {
      ctx.advance();
      args.push(stringNode(tok.value, tok));
      continue;
    }

    // 4. Number, merging an immediately-adjacent `px` unit into "50px".
    if (tok.kind === 'number') {
      ctx.advance();
      const next = ctx.peek();
      if (!ctx.isAtEnd() && next.value === 'px' && next.start === tok.end) {
        const px = ctx.advance();
        args.push(stringNode(`${tok.value}px`, { ...tok, end: px.end }));
      } else {
        args.push({
          type: 'literal',
          value: Number(tok.value),
          raw: tok.value,
          start: tok.start,
          end: tok.end,
          line: tok.line,
          column: tok.column,
        } as ASTNode);
      }
      continue;
    }

    // 5. Anything else — quoted string, template literal, variable, selector,
    //    me/it, parenthesized expression — is a single primary atom.
    const before = ctx.current;
    args.push(ctx.parsePrimary());
    if (ctx.current === before) {
      // parsePrimary didn't consume (e.g. an error token) — stop rather than spin.
      break;
    }
  }

  return CommandNodeBuilder.fromIdentifier(identifierNode)
    .withArgs(...args)
    .endingAt(ctx.getPosition())
    .build();
}

/**
 * Structural keywords in `scroll to …`, mirroring upstream's
 * `_parseScrollModifiers`: `[the] [top|middle|bottom] [left|center|right] [of]
 * <target> [+|- <offset>] [px] [in <container>] [smoothly|instantly]`.
 *
 * `nearest` is hyperfixi's own (documented in `reference/index.ts` and accepted
 * by ScrollCommand.parsePosition); upstream has no such position word.
 */
const SCROLL_KEYWORDS = new Set([
  'to',
  'the',
  'of',
  'in',
  'top',
  'middle',
  'bottom',
  'left',
  'center',
  'right',
  'nearest',
  'px',
  'smoothly',
  'instantly',
]);

/**
 * Parse `scroll to <target>` as a flat, ordered token list — the same shape
 * `parseGoCommand` builds and the same shape [commands/navigation/scroll-to.ts]
 * already consumes (it skips the structural words and takes the first real
 * target).
 *
 * Without this, `scroll` fell to `parseCommandCore`'s generic argument loop,
 * which continues only across a fixed set of continuation keywords. Measured
 * against the real 0.9.93 engine, that cost two of `scroll`'s OWN documented
 * examples:
 *
 *   - `scroll to me smoothly` / `… instantly` — the adverb was discarded. The
 *     `instantly` case was the harmful one: ScrollCommand's default is
 *     `smooth = !args.includes('instantly')`, so a dropped `instantly` did not
 *     merely lose a hint, it inverted the request.
 *   - `scroll to bottom of #chat` — `bottom of #chat` folded into a binary
 *     `of` expression, so the runtime found neither the position nor the
 *     target and THREW `scroll: target element not found`. Every positional
 *     form (`top of`, `the bottom of`, `middle of`, `right of`) was dead.
 *
 * It also brings the container clause into line with upstream: `scroll to last
 * <.message/> in #chat` (a multilingual corpus row) now reads `in #chat` as
 * scroll's container, as `_parseScrollModifiers` does, rather than folding it
 * into the target expression. That row already RESOLVED correctly either way —
 * an early probe reported it throwing, but only because the scratch page it
 * ran on had no `.message` elements.
 *
 * Returns `null` for anything but the `to` branch, so upstream's
 * `scroll <up|down|left|right> by <n> [px]` keeps the generic path it has
 * today. That form has no runtime here either way (ScrollCommand models no
 * `scrollBy`); it is filed in `docs-internal/PARSER_NEXT_STEPS.md` rather than
 * half-built.
 */
export function parseScrollCommand(
  ctx: ParserContext,
  identifierNode: IdentifierNode
): CommandNode | null {
  if (ctx.isAtEnd()) return null;
  if (ctx.resolveKeyword(ctx.peek().value).toLowerCase() !== 'to') return null;

  const args: ASTNode[] = [];

  while (!isCommandBoundary(ctx, ['when', 'where', 'catch', 'finally'])) {
    const tok = ctx.peek();
    const canonical = ctx.resolveKeyword(tok.value).toLowerCase();

    // 1. Structural scroll keyword → flat string arg. String, not identifier:
    //    an unbound identifier evaluates to `undefined` at runtime, and the
    //    runtime matches these by their own text.
    if (SCROLL_KEYWORDS.has(canonical)) {
      ctx.advance();
      args.push(stringNode(canonical, tok));
      continue;
    }

    // 2. Offset sign (`scroll to me + 50 px`) → keep the sign as a string.
    if (tok.value === '+' || tok.value === '-') {
      ctx.advance();
      args.push(stringNode(tok.value, tok));
      continue;
    }

    // 3. Number, merging an immediately-adjacent `px` unit into "50px" — the
    //    same rule `go`'s scroll forms use.
    if (tok.kind === 'number') {
      ctx.advance();
      const next = ctx.peek();
      if (!ctx.isAtEnd() && next.value === 'px' && next.start === tok.end) {
        const px = ctx.advance();
        args.push(stringNode(`${tok.value}px`, { ...tok, end: px.end }));
      } else {
        args.push({
          type: 'literal',
          value: Number(tok.value),
          raw: tok.value,
          start: tok.start,
          end: tok.end,
          line: tok.line,
          column: tok.column,
        } as ASTNode);
      }
      continue;
    }

    // 4. The target (or container): selector, query reference, `me`/`it`,
    //    positional expression, variable, parenthesized expression.
    const before = ctx.current;
    args.push(ctx.parsePrimary());
    if (ctx.current === before) {
      // parsePrimary didn't consume — stop rather than spin.
      break;
    }
  }

  return CommandNodeBuilder.fromIdentifier(identifierNode)
    .withArgs(...args)
    .endingAt(ctx.getPosition())
    .build();
}
