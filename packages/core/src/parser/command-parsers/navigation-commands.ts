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
import {
  isCommandBoundary,
  consumeOptionalKeyword,
  parseOneArgument,
} from '../helpers/parsing-helpers';
import type { ExpressionNode } from '../../types/core';
import { parseBareURLPath, isNakedURLStart } from './utility-commands';
import type { SlotMap } from '../command-slots';
import { toLegacyExpression } from '../../ast/legacy';

/**
 * Keywords that structure a `go` command. Matched value-first (via
 * `resolveKeyword` for multilingual input) and emitted as `string` nodes.
 */
const GO_POSITIONS = new Set(['top', 'middle', 'bottom', 'left', 'center', 'right', 'nearest']);

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
/**
 * A `go` destination is a PRIMARY — a selector, a URL, an identifier, a
 * string — never a folded expression: `#el + 50` is a target and an offset,
 * `myUrl in new window` a target and a window clause.
 */
function goTarget(ctx: ParserContext): ASTNode | undefined {
  if (ctx.isAtEnd()) return undefined;
  const before = ctx.current;
  const node = ctx.parsePrimary();
  return ctx.current === before ? undefined : node;
}

export function parseGoCommand(
  ctx: ParserContext,
  identifierNode: IdentifierNode
): CommandNode | null {
  const args: ASTNode[] = [];
  const modifiers: SlotMap<'go'> = {};
  while (!isCommandBoundary(ctx, ['when', 'where', 'catch', 'finally'])) {
    const tok = ctx.peek();
    const word = ctx.resolveKeyword(tok.value).toLowerCase();
    if (word === 'to' || word === 'the') {
      ctx.advance();
      continue;
    }
    if ((word === 'back' || word === 'forward') && args.length === 0 && !modifiers.url) {
      ctx.advance();
      modifiers[word] = stringNode(word, tok) as ExpressionNode;
      continue;
    }
    if (word === 'url') {
      ctx.advance();
      const url = isNakedURLStart(ctx) ? parseBareURLPath(ctx) : goTarget(ctx);
      if (url) modifiers.url = url as ExpressionNode;
      continue;
    }
    if (word === 'in') {
      // `in new window`
      ctx.advance();
      const first = ctx.peek();
      const parts: string[] = [];
      while (!ctx.isAtEnd() && ['new', 'window'].includes(ctx.peek().value.toLowerCase())) {
        parts.push(ctx.advance().value.toLowerCase());
      }
      modifiers.in = stringNode(parts.join(' ') || first.value, first) as ExpressionNode;
      continue;
    }
    if (GO_POSITIONS.has(word) && !modifiers.position) {
      ctx.advance();
      modifiers.position = stringNode(word, tok) as ExpressionNode;
      continue;
    }
    if (word === 'of') {
      ctx.advance();
      if (ctx.resolveKeyword(ctx.peek().value).toLowerCase() === 'the') ctx.advance();
      const target = goTarget(ctx);
      if (target) modifiers.of = target as ExpressionNode;
      continue;
    }
    if (word === 'smoothly' || word === 'instantly') {
      ctx.advance();
      modifiers.behavior = stringNode(
        word === 'smoothly' ? 'smooth' : 'instant',
        tok
      ) as ExpressionNode;
      continue;
    }
    if (tok.value === '+' || tok.value === '-' || tok.kind === 'number') {
      let sign = 1;
      if (tok.value === '+' || tok.value === '-') {
        ctx.advance();
        if (tok.value === '-') sign = -1;
      }
      const numTok = ctx.peek();
      if (numTok.kind !== 'number') break;
      ctx.advance();
      let end = numTok.end;
      const next = ctx.peek();
      if (!ctx.isAtEnd() && next.value === 'px' && next.start === numTok.end)
        end = ctx.advance().end;
      modifiers.by = toLegacyExpression({
        type: 'literal',
        value: sign * Number(numTok.value),
        raw: numTok.value,
        start: tok.start,
        end,
        line: tok.line,
        column: tok.column,
      });
      continue;
    }
    if (args.length === 0 && !modifiers.of && !modifiers.url) {
      if (isNakedURLStart(ctx)) {
        const url = parseBareURLPath(ctx);
        if (url) {
          args.push(url);
          continue;
        }
      }
      const target = goTarget(ctx);
      if (target) {
        args.push(target);
        continue;
      }
    }
    break;
  }
  return CommandNodeBuilder.fromIdentifier<'go'>(identifierNode)
    .withArgs(...args)
    .withModifiers(modifiers)
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

/**
 * Structural keywords in the scrollBy form,
 * `scroll [<target>] [up|down|left|right] by <n> [px] [smoothly|instantly]`
 * — upstream's non-`to` branch. `up`/`down`/`by` are meaningful only here.
 */

/**
 * Words that end the lookahead for a `by` — the DEFAULT_BOUNDARY_KEYWORDS the
 * arg loop stops at, plus the additional boundaries `parseScrollCommand`
 * passes it. (A false claim past a boundary the scan cannot see, e.g. a
 * newline-led next command, is harmless: the arg loop still stops at the real
 * boundary and the runtime keys the scrollBy form on `by` being IN the args.)
 */
const SCROLL_BY_SCAN_BOUNDARY = new Set([
  'then',
  'and',
  'else',
  'end',
  'when',
  'where',
  'catch',
  'finally',
]);

/** Does a `by` introduce an offset before the next command boundary? */
function hasScrollByAhead(ctx: ParserContext): boolean {
  for (let i = 0; i < 12; i++) {
    const tok = ctx.peekAt(i);
    if (!tok) return false;
    const canonical = ctx.resolveKeyword(tok.value).toLowerCase();
    if (canonical === 'by') return true;
    if (SCROLL_BY_SCAN_BOUNDARY.has(canonical)) return false;
  }
  return false;
}

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
 * The non-`to` branch handles upstream's scrollBy form,
 * `scroll [<target>] [up|down|left|right] by <n> [px]` — claimed only when a
 * `by` is genuinely ahead, so the lenient bare `scroll <target>` keeps the
 * generic path it has today. ScrollCommand executes it via `scrollBy`
 * (vertical for `up`/`down`, horizontal for `left`/`right`).
 */
export function parseScrollCommand(
  ctx: ParserContext,
  identifierNode: IdentifierNode
): CommandNode | null {
  if (ctx.isAtEnd()) return null;
  if (ctx.resolveKeyword(ctx.peek().value).toLowerCase() === 'to') {
    return parseScrollTo(ctx, identifierNode);
  }
  if (hasScrollByAhead(ctx)) {
    return parseScrollBy(ctx, identifierNode);
  }
  return null;
}

const SCROLL_POSITIONS = new Set(['top', 'middle', 'bottom', 'left', 'center', 'right', 'nearest']);
const SCROLL_DIRECTIONS = new Set(['up', 'down', 'left', 'right']);
const SCROLL_STOP = ['of', 'smoothly', 'instantly', 'by', 'up', 'down', 'left', 'right'];

/** Consume a trailing `smoothly` / `instantly`, as the `behavior` slot. */
function takeScrollBehavior(ctx: ParserContext, modifiers: SlotMap<'scroll'>): boolean {
  const tok = ctx.peek();
  const word = ctx.resolveKeyword(tok.value).toLowerCase();
  if (word !== 'smoothly' && word !== 'instantly') return false;
  ctx.advance();
  modifiers.behavior = stringNode(
    word === 'smoothly' ? 'smooth' : 'instant',
    tok
  ) as ExpressionNode;
  return true;
}

/**
 * `scroll to [the] [<position>] [of] <target> [smoothly|instantly]`
 *
 * Every word is a slot (Arc 3 step 3): `position` (the logical position
 * word), `of` (the target it introduces), `behavior`; the target is the one
 * positional argument when it is not introduced by `of` — a whole
 * expression, so `last <.message/> in #chat` stays one positional `in`
 * expression as upstream reads it. Nothing is pushed as a string for the
 * command to match by value.
 */
function parseScrollTo(ctx: ParserContext, identifierNode: IdentifierNode): CommandNode {
  const args: ASTNode[] = [];
  const modifiers: SlotMap<'scroll'> = {};
  ctx.advance(); // `to`
  while (!isCommandBoundary(ctx, ['when', 'where', 'catch', 'finally'])) {
    const tok = ctx.peek();
    const word = ctx.resolveKeyword(tok.value).toLowerCase();
    if (word === 'the') {
      ctx.advance();
      continue;
    }
    if (SCROLL_POSITIONS.has(word) && !modifiers.position) {
      ctx.advance();
      modifiers.position = stringNode(word, tok) as ExpressionNode;
      continue;
    }
    if (word === 'of') {
      ctx.advance();
      const target = parseOneArgument(ctx, SCROLL_STOP);
      if (target) modifiers.of = target as ExpressionNode;
      continue;
    }
    if (takeScrollBehavior(ctx, modifiers)) continue;
    if (args.length === 0 && !modifiers.of) {
      const target = parseOneArgument(ctx, SCROLL_STOP);
      if (target) {
        args.push(target);
        continue;
      }
    }
    break;
  }
  return CommandNodeBuilder.fromIdentifier<'scroll'>(identifierNode)
    .withArgs(...args)
    .withModifiers(modifiers)
    .endingAt(ctx.getPosition())
    .build();
}

/**
 * `scroll [<target>] [up|down|left|right] by [+|-]<n>[px] [smoothly|instantly]`
 * — `direction`, `by` (a signed literal; `px` is consumed) and `behavior`
 * are slots, the target the one positional argument.
 */
function parseScrollBy(ctx: ParserContext, identifierNode: IdentifierNode): CommandNode {
  const args: ASTNode[] = [];
  const modifiers: SlotMap<'scroll'> = {};
  while (!isCommandBoundary(ctx, ['when', 'where', 'catch', 'finally'])) {
    const tok = ctx.peek();
    const word = ctx.resolveKeyword(tok.value).toLowerCase();
    if (SCROLL_DIRECTIONS.has(word)) {
      ctx.advance();
      modifiers.direction = stringNode(word, tok) as ExpressionNode;
      continue;
    }
    if (word === 'by') {
      ctx.advance();
      let sign = 1;
      const signTok = ctx.peek();
      if (signTok.value === '+' || signTok.value === '-') {
        ctx.advance();
        if (signTok.value === '-') sign = -1;
      }
      const numTok = ctx.peek();
      if (numTok.kind === 'number') {
        ctx.advance();
        const next = ctx.peek();
        let end = numTok.end;
        if (!ctx.isAtEnd() && next.value === 'px' && next.start === numTok.end) {
          end = ctx.advance().end;
        }
        modifiers.by = toLegacyExpression({
          type: 'literal',
          value: sign * Number(numTok.value),
          raw: numTok.value,
          start: numTok.start,
          end,
          line: numTok.line,
          column: numTok.column,
        });
      } else {
        const offset = parseOneArgument(ctx, SCROLL_STOP);
        if (offset) modifiers.by = offset as ExpressionNode;
      }
      continue;
    }
    if (takeScrollBehavior(ctx, modifiers)) continue;
    if (args.length === 0) {
      const target = parseOneArgument(ctx, SCROLL_STOP);
      if (target) {
        args.push(target);
        continue;
      }
    }
    break;
  }
  return CommandNodeBuilder.fromIdentifier<'scroll'>(identifierNode)
    .withArgs(...args)
    .withModifiers(modifiers)
    .endingAt(ctx.getPosition())
    .build();
}

/**
 * `push url <url> [with title <title>]` / `replace url <url> [with title <title>]`.
 *
 * The URL is the one positional argument (a naked `/path` or any expression;
 * the leading `url` word is consumed, not emitted); `with title <title>` is
 * the `title` slot. Marker words never reach `args` (Arc 3 step 3). Both
 * spellings were COMPOUND_COMMANDS members with no case in
 * `parseCompoundCommand`, so they fell to `parseRegularCommand` and the
 * command re-derived the syntax from the words it found in `args` — the last
 * two commands in the repo doing so.
 */
export function parsePushCommand(ctx: ParserContext, identifierNode: IdentifierNode): CommandNode {
  const args: ASTNode[] = [];
  const modifiers: SlotMap<'push' | 'replace'> = {};
  consumeOptionalKeyword(ctx, 'url');
  if (!ctx.isAtEnd() && isNakedURLStart(ctx)) {
    const url = parseBareURLPath(ctx);
    if (url) args.push(url);
  } else {
    const url = parseOneArgument(ctx, ['with']);
    if (url) args.push(url);
  }
  if (consumeOptionalKeyword(ctx, 'with')) {
    consumeOptionalKeyword(ctx, 'title');
    const title = parseOneArgument(ctx);
    if (title) modifiers['title'] = title as ExpressionNode;
  }
  return CommandNodeBuilder.fromIdentifier<'push' | 'replace'>(identifierNode)
    .withArgs(...args)
    .withModifiers(modifiers)
    .endingAt(ctx.getPosition())
    .build();
}
