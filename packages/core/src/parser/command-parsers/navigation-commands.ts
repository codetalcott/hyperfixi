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
import { parseBareURLPath } from './utility-commands';

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

/**
 * Tokens that terminate a naked-URL run. Unlike the fetch terminator this does
 * NOT stop on arbitrary command tokens, so path segments that happen to be
 * command words (`/get`, `/add`) stay part of the URL; it stops at `in`
 * (→ `in new window`) and the command-sequence boundaries.
 */
const GO_URL_STOP = new Set([
  'in',
  'then',
  'and',
  'else',
  'end',
  'otherwise',
  'when',
  'where',
  'catch',
  'finally',
]);

function isGoURLTerminator(ctx: ParserContext): boolean {
  return ctx.isAtEnd() || GO_URL_STOP.has(ctx.peek().value);
}

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

/** A naked URL begins with `/`, or a scheme (identifier immediately followed by `:`). */
function isNakedURLStart(ctx: ParserContext): boolean {
  const tok = ctx.peek();
  if (tok.value === '/') return true;
  if (ctx.checkIdentifierLike()) {
    const next = ctx.peekAt(1);
    return !!next && next.value === ':' && next.start === tok.end;
  }
  return false;
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
    if (isNakedURLStart(ctx)) {
      const url = parseBareURLPath(ctx, isGoURLTerminator);
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
