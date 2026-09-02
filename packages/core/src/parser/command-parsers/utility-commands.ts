/**
 * Utility Command Parsers
 *
 * Pure function implementations of general utility command parsers.
 * These functions use ParserContext for dependency injection, enabling
 * clean separation from the Parser class.
 *
 * @module parser/command-parsers/utility-commands
 */

import type { ParserContext, IdentifierNode } from '../parser-types';
import type { ASTNode, Token, ExpressionNode, CommandNode } from '../../types/core';
import { CommandNodeBuilder } from '../command-node-builder';
import { isKeyword, isCommandBoundary, consumeOptionalKeyword } from '../helpers/parsing-helpers';
import { KEYWORDS } from '../parser-constants';

// Import command parsers from other modules for compound command routing
import * as eventCommands from './event-commands';
import * as controlFlowCommands from './control-flow-commands';
import * as animationCommands from './animation-commands';
import * as domCommands from './dom-commands';
import * as variableCommands from './variable-commands';
import * as navigationCommands from './navigation-commands';
import { toLegacyExpression } from '../../ast/legacy';
import { parseDeclaredCommand } from './declared-commands';
import type { CommandGrammar } from '../command-grammar';

/**
 * Parse compound command
 *
 * Syntax: <command-name> [args...]
 *
 * This is a dispatcher function that routes specific command names to their
 * specialized parsers. Compound commands have special parsing logic beyond
 * simple argument collection.
 *
 * Supported commands:
 * - put: DOM insertion operations (into, before, after, at start/end of)
 * - trigger: Event dispatching
 * - remove: Class removal
 * - toggle: Class toggling
 * - set: Variable assignment with scoping
 * - halt: Control flow interruption
 * - measure: Element property measurement
 * Examples:
 *   - put <div/> into <body/>
 *   - trigger click on <button/>
 *   - set :localVar to "value"
 *   - measure <#element/> width
 *
 * @param ctx - Parser context providing access to parser state and methods
 * @param identifierNode - The command identifier node
 * @returns CommandNode representing the command, or null for a name with no row commands
 */
type DedicatedCommandParser = (
  ctx: ParserContext,
  identifierNode: IdentifierNode
) => CommandNode | null;

/**
 * The commands with a hand-written parser, keyed by name — ONE table.
 *
 * This used to be two things that had to agree by hand: a `COMPOUND_COMMANDS`
 * set in `parser-constants.ts` (membership routed a command here) and a
 * `switch` in this function (which parser it got). A member with no case fell
 * through to a second generic argument loop — `take`, `process`,
 * `show`/`hide`, `push`/`replace` were all found in that state, each by a
 * behaviour bug. The set is retired (Arc 3 step 5); a command is dedicated
 * iff it has a row here, and a row is the parser it gets.
 */
export const COMPOUND_COMMAND_PARSERS: ReadonlyMap<string, DedicatedCommandParser> = new Map<
  string,
  DedicatedCommandParser
>([
  ['put', domCommands.parsePutCommand],
  ['trigger', eventCommands.parseTriggerCommand],
  ['send', eventCommands.parseTriggerCommand],
  ['remove', domCommands.parseRemoveCommand],
  ['take', domCommands.parseTakeCommand],
  ['toggle', domCommands.parseToggleCommand],
  ['set', variableCommands.parseSetCommand],
  // `add` reaches parseCommandCore's own keyword branch first; the row keeps
  // the manifest's `multiword` mirror and the coverage probe honest.
  ['add', (ctx, id) => domCommands.parseAddCommand(ctx, identifierToToken(id))],
  ['halt', controlFlowCommands.parseHaltCommand],
  ['measure', animationCommands.parseMeasureCommand],
  ['js', parseJsCommand],
  ['go', navigationCommands.parseGoCommand],
  ['push', navigationCommands.parsePushCommand],
  ['replace', navigationCommands.parsePushCommand],
  // Falls back for the `scroll <dir> by <n>` branch, which has no runtime
  // here and keeps the generic path.
  [
    'scroll',
    (ctx, id) => navigationCommands.parseScrollCommand(ctx, id) ?? parseGenericFallback(ctx, id),
  ],
  ['tell', parseTellCommand],
  ['pick', parsePickCommand],
  ['start', animationCommands.parseStartCommand],
  ['swap', domCommands.parseSwapCommand],
  ['morph', domCommands.parseSwapCommand],
  ['show', domCommands.parseShowHideCommand],
  ['hide', domCommands.parseShowHideCommand],
  // Falls back for non-`partials` input so the runtime keeps reporting its
  // own keyword error rather than a parse error.
  [
    'process',
    (ctx, id) => domCommands.parseProcessCommand(ctx, id) ?? parseGenericFallback(ctx, id),
  ],
]);

/** The names in the table — what `COMPOUND_COMMANDS` used to list by hand. */
export const COMPOUND_COMMAND_NAMES: ReadonlySet<string> = new Set(COMPOUND_COMMAND_PARSERS.keys());

function identifierToToken(node: IdentifierNode): Token {
  return {
    kind: 'identifier',
    value: node.name,
    start: node.start ?? 0,
    end: node.end ?? 0,
    line: node.line ?? 0,
    column: node.column ?? 0,
  };
}

/**
 * Parse a command that has a dedicated parser (see {@link COMPOUND_COMMAND_PARSERS}).
 * Returns null for a name with no row; callers check membership first.
 */
export function parseCompoundCommand(
  ctx: ParserContext,
  identifierNode: IdentifierNode
): CommandNode | null {
  const parse = COMPOUND_COMMAND_PARSERS.get(identifierNode.name.toLowerCase());
  return parse ? parse(ctx, identifierNode) : null;
}

/**
 * The row a dedicated parser hands malformed or lenient input to: every
 * primary up to the boundary, no marker slots — exactly what the deleted
 * `parseRegularCommand` loop collected (`primary`, not `expression`, so a
 * trailing adverb like `scroll #panel smoothly` keeps its `smoothly`).
 */
const GENERIC_FALLBACK_GRAMMAR: CommandGrammar = {
  positional: 'primary',
  markers: [],
  syntax: '<command> [<primary> …]',
};

/**
 * Parse with {@link GENERIC_FALLBACK_GRAMMAR}. This is what
 * `parseRegularCommand` — the second copy of the generic argument loop — used
 * to be; Arc 3 step 5 deleted the copy so there is one generic parser.
 */
function parseGenericFallback(ctx: ParserContext, identifierNode: IdentifierNode): CommandNode {
  return parseDeclaredCommand(
    ctx,
    identifierToToken(identifierNode),
    identifierNode.name.toLowerCase(),
    GENERIC_FALLBACK_GRAMMAR
  ) as CommandNode;
}

/**
 * A naked URL begins with `/`, or with a scheme — an identifier immediately
 * followed by `:` (`https:`, `http:`, `mailto:`). Adjacency matters: the tokens
 * must touch, so `foo : bar` and a `key: value` pair are not mistaken for one.
 *
 * Shared by the `fetch` and `go` parsers. `fetch` recognised only the leading-`/`
 * form, so `fetch https://host/path` fell through to `parsePrimary()`, which
 * consumed just the identifier `https` — the URL evaluated to `undefined` at
 * runtime and any trailing `as <type>` modifier was silently dropped.
 */
export function isNakedURLStart(ctx: ParserContext): boolean {
  const tok = ctx.peek();
  if (tok.value === '/') return true;
  if (ctx.checkIdentifierLike()) {
    const next = ctx.peekAt(1);
    return !!next && next.value === ':' && next.start === tok.end;
  }
  return false;
}

/**
 * Punctuation that ends a naked URL even with no whitespace before it.
 *
 * Upstream _hyperscript ends a naked URL at whitespace and nothing else
 * (`parseURLOrExpression` → `consumeUntilWhitespace` → `NakedString`). We keep
 * two of the old terminator set's entries:
 *   `{` — load-bearing: the brace-without-`with` options form,
 *         `fetch /api/data{method:"POST"}`, which upstream does not have
 *   `)` — carried over from the old set as a no-regression measure. Nothing
 *         reaches it today, because a run can only START at `/` or a scheme
 *         (`isNakedURLStart`), so `fetch (/a/b)` goes to `parsePrimary` and
 *         fails there exactly as it did before this change.
 *
 * `[` and `]` are deliberately NOT stops (`?ids[]=1` and `http://[::1]/x` are
 * real URLs), and neither is `,` (`?ids=1,2,3` is a real query string).
 */
const URL_HARD_STOPS = new Set(['{', ')']);

/**
 * Parse a naked (unquoted) URL — `/api/data`, `https://host/path`.
 *
 * Termination is by ADJACENCY, which is upstream's whitespace rule expressed in
 * the only terms available here: the tokenizer discards whitespace, but every
 * token carries character offsets, so `tok.start === prev.end` means "nothing
 * came between them". That covers spaces and newlines alike.
 *
 * The old rule stopped at `isCommandBoundary`, i.e. at any of ~60 command words,
 * so a URL whose path contained one was truncated:
 *
 *     fetch /api/put/1 as json   ->  url "/api/", a bogus `partial` `put`
 *                                    command in the sequence, `as json` dropped
 *
 * and `parse()` still reported success. `go` never had the bug precisely because
 * it did not use the command-word stop; both now share this one routine, as they
 * do upstream.
 *
 * A `${…}` interpolation span is carried whole — its own `{` is not an options
 * brace, and the space in `${my value}` is part of the URL — and is reproduced
 * verbatim from source, because joining token values would collapse it to
 * `${myvalue}`. When the result contains `${`, the node is a `templateLiteral`
 * so the evaluator actually interpolates it; adjacency swallows `${id}` into the
 * URL either way, so emitting a plain literal would guarantee a 404. A bare `$`
 * (`/api/$filter`) is not interpolation and stays a literal.
 */
export function parseBareURLPath(ctx: ParserContext): ASTNode | null {
  const startPos = ctx.savePosition();
  const firstTok = ctx.peek();
  let path = '';
  let prev: Token | null = null;

  while (!ctx.isAtEnd()) {
    const tok = ctx.peek();

    // Whitespace (or a newline) ended the URL.
    if (prev && tok.start !== prev.end) break;

    // `${…}` span — checked before URL_HARD_STOPS so the span's own braces are
    // not mistaken for the options-brace form.
    if (tok.value === '$' && ctx.peekAt(1)?.value === '{') {
      ctx.advance(); // $
      let last = ctx.advance(); // {
      let depth = 1;
      while (!ctx.isAtEnd() && depth > 0) {
        last = ctx.advance();
        if (last.value === '{') depth++;
        else if (last.value === '}') depth--;
      }
      // Verbatim from source: token values alone would drop the whitespace.
      path += ctx.getInputSlice(tok.start, last.end);
      prev = last;
      continue;
    }

    if (URL_HARD_STOPS.has(tok.value)) break;

    prev = ctx.advance();
    path += prev.value;
  }

  if (!path || path === '/') {
    ctx.restorePosition(startPos);
    return null;
  }

  // Character offsets, like every other node. This used to write
  // ctx.savePosition() — a TOKEN INDEX — into start/end, which
  // ast-utils/interchange/from-core.ts copies straight through and
  // ctx.getInputSlice() would have sliced garbage from.
  const span = {
    start: firstTok.start,
    end: prev ? prev.end : firstTok.end,
    line: firstTok.line,
    column: firstTok.column,
  };

  if (path.includes('${')) {
    return { type: 'templateLiteral', value: path, ...span } as ASTNode;
  }
  return { type: 'literal', value: path, raw: path, ...span } as ASTNode;
}

/**
 * Parse fetch command with extended syntax support
 *
 * Supports original _hyperscript-compatible syntax:
 *   fetch /api/data                                (bare URL path — no quotes required)
 *   fetch /api/data as json                        (bare path + modifier)
 *   fetch URL                                      (quoted string or expression)
 *   fetch URL as json
 *   fetch URL as Object                            (Object alias for json)
 *   fetch URL as a Object | as an Object           (optional article)
 *   fetch URL {method:"POST"}                      (object literal without 'with')
 *   fetch URL with method:"POST", headers:{...}    (naked named args after 'with')
 *   fetch URL with {method:"POST"} as json         (as after with — flexible order)
 *   fetch URL as json with {method:"POST"}         (as before with — existing)
 *
 * @param ctx - Parser context providing access to parser state and methods
 * @param commandToken - The command token (already consumed by caller)
 * @returns CommandNode representing the fetch command
 */
export function parseFetchCommand(ctx: ParserContext, commandToken: Token): CommandNode {
  const modifiers: Record<string, ExpressionNode> = {};

  // Step 1: Parse URL — reassemble a naked URL (`/api/data`, `https://host/path`)
  // into one string literal first, then fall back to parsePrimary for quoted
  // strings and expressions.
  let url: ASTNode | null = null;
  if (!ctx.isAtEnd() && isNakedURLStart(ctx)) {
    url = parseBareURLPath(ctx);
  }
  if (!url) {
    url = ctx.parsePrimary();
  }
  if (!url) {
    ctx.addError('fetch requires a URL');
    return CommandNodeBuilder.from(commandToken).endingAt(ctx.getPosition()).build();
  }

  // Step 2: Check for object literal directly after URL (no 'with' keyword)
  // e.g., fetch /url {method:"POST"}
  if (!ctx.isAtEnd() && ctx.check('{')) {
    modifiers['with'] = ctx.parsePrimary() as ExpressionNode;
  }

  // Step 3: Parse 'as', 'with', and 'do not throw' modifiers in any order.
  for (let i = 0; i < 3 && !ctx.isAtEnd(); i++) {
    if (ctx.check('as') && !modifiers['as']) {
      ctx.advance(); // consume 'as'
      // Skip optional articles: 'a' or 'an' (e.g., "as a Object", "as an Object")
      if (!ctx.isAtEnd()) {
        consumeOptionalKeyword(ctx, 'a') || consumeOptionalKeyword(ctx, 'an');
      }
      modifiers['as'] = ctx.parsePrimary() as ExpressionNode;
      continue;
    }

    if (ctx.check('with') && !modifiers['with']) {
      ctx.advance(); // consume 'with'
      if (isFetchNakedNamedArgStart(ctx)) {
        modifiers['with'] = parseFetchNakedNamedArgs(ctx) as ExpressionNode;
      } else {
        modifiers['with'] = ctx.parsePrimary() as ExpressionNode;
      }
      continue;
    }

    // `do not throw` — suppresses the default throw-on-non-2xx behavior
    // introduced in upstream _hyperscript 0.9.90.
    if (ctx.check('do') && !modifiers['doNotThrow']) {
      const n1 = ctx.peekAt(1);
      const n2 = ctx.peekAt(2);
      if (n1?.value === 'not' && n2?.value === 'throw') {
        const doToken = ctx.advance(); // consume 'do'
        ctx.advance(); // consume 'not'
        const throwToken = ctx.advance(); // consume 'throw'
        modifiers['doNotThrow'] = toLegacyExpression({
          type: 'literal',
          value: true,
          start: doToken.start,
          end: throwToken.end,
          line: doToken.line,
          column: doToken.column,
        });
        continue;
      }
    }

    break; // Not a fetch modifier — stop
  }

  const builder = CommandNodeBuilder.from(commandToken).withArgs(url).endingAt(ctx.getPosition());

  if (Object.keys(modifiers).length > 0) {
    builder.withModifiers(modifiers);
  }

  return builder.build();
}

/**
 * Check if the current position starts a naked named argument list.
 * Naked named args look like: method:"POST", headers:{...}
 * (identifier followed by colon, without surrounding braces)
 */
function isFetchNakedNamedArgStart(ctx: ParserContext): boolean {
  if (ctx.check('{')) return false; // Object literal, not naked args
  if (!ctx.checkIdentifierLike()) return false;
  const next = ctx.peekAt(1);
  return next !== null && next.value === ':';
}

/**
 * Parse a naked named argument list into an objectLiteral AST node.
 * e.g., method:"POST", headers:{...}, body:data
 *
 * Produces the same AST shape as parseObjectLiteral() so the fetch
 * command implementation handles it identically.
 */
function parseFetchNakedNamedArgs(ctx: ParserContext): ASTNode {
  const properties: Array<{ key: ASTNode; value: ASTNode }> = [];
  const startPos = ctx.getPosition();

  do {
    if (!ctx.checkIdentifierLike()) break;

    const keyToken = ctx.advance();
    const key: ASTNode = {
      type: 'identifier',
      name: keyToken.value,
      start: keyToken.start,
      end: keyToken.end,
      line: keyToken.line,
      column: keyToken.column,
    };

    ctx.consume(':', "Expected ':' after property name in fetch named arguments");

    // Use parsePrimary to avoid consuming 'as'/'then' as binary operators
    const value = ctx.parsePrimary();
    if (value) {
      properties.push({ key, value });
    }
  } while (ctx.match(',') && !ctx.isAtEnd());

  const endPos = ctx.getPosition();
  return {
    type: 'objectLiteral',
    properties,
    start: startPos.start,
    end: endPos.end,
    line: startPos.line,
    column: startPos.column,
  } as ASTNode;
}

/**
 * Parse js command
 *
 * Syntax:
 *   js <code> end
 *   js(param1, param2, ...) <code> end
 *
 * This parser handles the inline JavaScript command which allows executing
 * raw JavaScript code with access to hyperscript context variables.
 *
 * When parameters are specified, they are extracted as identifier names (strings)
 * and their values are looked up from context.locals at runtime.
 *
 * The JavaScript code body is reconstructed from tokens until 'end' keyword.
 *
 * Examples:
 *   - js console.log("Hello") end
 *   - js(x, y) return x + y end
 *   - js(element) element.classList.add("active") end
 *
 * @param ctx - Parser context providing access to parser state and methods
 * @param identifierNode - The command identifier node
 * @returns CommandNode representing the js command
 */

/**
 * Scan raw input to find the `end` keyword that terminates a js() block,
 * respecting JavaScript strings (single, double, template) and comments.
 * This avoids the tokenizer's possessive-detection logic which mishandles
 * single-quoted strings inside JS code.
 */
function findJsEndBoundary(ctx: ParserContext, startPos: number): number {
  const input = ctx.getInputSlice(startPos);
  if (!input) {
    // Fallback: return startPos so the caller gets an empty body
    return startPos;
  }

  let i = 0;
  while (i < input.length) {
    const ch = input[i];

    // Skip single-quoted strings
    if (ch === "'" || ch === '\u2019' || ch === '\u2018') {
      i++;
      while (i < input.length && input[i] !== ch) {
        if (input[i] === '\\') i++; // skip escaped char
        i++;
      }
      i++; // closing quote
      continue;
    }

    // Skip double-quoted strings
    if (ch === '"') {
      i++;
      while (i < input.length && input[i] !== '"') {
        if (input[i] === '\\') i++;
        i++;
      }
      i++;
      continue;
    }

    // Skip template literals
    if (ch === '`') {
      i++;
      while (i < input.length && input[i] !== '`') {
        if (input[i] === '\\') i++;
        i++;
      }
      i++;
      continue;
    }

    // Skip single-line comments
    if (ch === '/' && i + 1 < input.length && input[i + 1] === '/') {
      i += 2;
      while (i < input.length && input[i] !== '\n') i++;
      continue;
    }

    // Skip multi-line comments
    if (ch === '/' && i + 1 < input.length && input[i + 1] === '*') {
      i += 2;
      while (
        i < input.length &&
        !(input[i] === '*' && i + 1 < input.length && input[i + 1] === '/')
      )
        i++;
      i += 2; // skip */
      continue;
    }

    // Check for 'end' at a word boundary
    if (
      (ch === 'e' || ch === 'E') &&
      i + 3 <= input.length &&
      input.slice(i, i + 3).toLowerCase() === 'end'
    ) {
      // Verify word boundary before: start of input or non-alphanumeric
      const before = i === 0 || !/[a-zA-Z0-9_]/.test(input[i - 1]);
      // Verify word boundary after: end of input or non-alphanumeric
      const after = i + 3 >= input.length || !/[a-zA-Z0-9_]/.test(input[i + 3]);
      if (before && after) {
        return startPos + i;
      }
    }

    i++;
  }

  // 'end' not found — return end of input (caller will report error)
  return startPos + input.length;
}

export function parseJsCommand(ctx: ParserContext, identifierNode: IdentifierNode): CommandNode {
  const parameters: string[] = [];

  // Check for optional parameters: js(param1, param2)
  if (ctx.match('(')) {
    while (!ctx.check(')') && !ctx.isAtEnd()) {
      // Collect parameter names as identifier strings
      if (ctx.checkIdentifierLike()) {
        parameters.push(ctx.advance().value);
      }
      // Skip commas between parameters
      ctx.match(',');
    }
    ctx.consume(')', 'Expected ) after js parameters');
  }

  // Record the start position of JS code (current token's start)
  const jsCodeStart = ctx.peek().start;

  // Find 'end' keyword by scanning raw input, respecting JS strings and comments.
  // The tokenizer processes js() body as hyperscript, which breaks on single-quoted
  // strings (possessive detection), template literals, and other JS constructs.
  // Raw scanning avoids these issues entirely.
  const jsCodeEnd = findJsEndBoundary(ctx, jsCodeStart);

  // Advance the token stream past the 'end' keyword.
  // Tokens were already created by the tokenizer, so skip them until we reach
  // or pass the 'end' position, then consume 'end'.
  while (!ctx.isAtEnd() && !ctx.check(KEYWORDS.END)) {
    // Safety: if current token starts at or after jsCodeEnd, the 'end' must be next
    if (ctx.peek().start >= jsCodeEnd) break;
    ctx.advance();
  }
  ctx.consume(KEYWORDS.END, 'Expected end after js code body');

  // Extract raw JavaScript code from original input (preserves regex, whitespace, etc.)
  const rawSlice = ctx.getInputSlice(jsCodeStart, jsCodeEnd);
  const code = rawSlice.trim();

  // Build args: first arg is code string, second is parameters array
  const codeNode: ASTNode = {
    type: 'literal',
    value: code,
    start: identifierNode.start,
    end: ctx.getPosition().end,
  };

  const paramsNode: ASTNode = {
    type: 'arrayLiteral',
    elements: parameters.map(p => ({
      type: 'literal',
      value: p,
      start: identifierNode.start,
      end: identifierNode.end,
    })),
    start: identifierNode.start,
    end: ctx.getPosition().end,
  };

  return CommandNodeBuilder.fromIdentifier(identifierNode)
    .withArgs(codeNode, paramsNode)
    .endingAt(ctx.getPosition())
    .build();
}

/**
 * Parse tell command
 *
 * Syntax:
 *   tell <target> <command> [<command> ...]
 *
 * The tell command executes one or more commands in the context of target elements.
 * Within the command body, 'you' refers to the current target element.
 *
 * Examples:
 *   - tell <p/> in me add .highlight
 *   - tell <details /> in #article2 set you.open to false
 *   - tell first <li/> in #list add .active
 *
 * @param ctx - Parser context providing access to parser state and methods
 * @param identifierNode - The command identifier node
 * @returns CommandNode representing the tell command
 */
export function parseTellCommand(ctx: ParserContext, identifierNode: IdentifierNode): CommandNode {
  // Parse target expression (e.g., <p/> in me, <details /> in #article2)
  const target = ctx.parseExpression();

  if (!target) {
    throw new Error('tell command requires a target expression');
  }

  // Optional `to` between target and body: `tell #modal to show`. Upstream
  // REJECTS this form loudly (`Expected 'end' but found 'to'`), but hyperfixi
  // cannot afford to throw here: inside a handler body,
  // parseCommandWithErrorRecovery swallows any command-parser throw and the
  // stranded body re-parses as top-level commands — so `on click tell #modal
  // to show` parsed CLEAN with no tell node and `show` silently ran against
  // the handler's `me` instead of #modal (the measured table in
  // PARSER_NEXT_STEPS.md). Consuming the word honors the author's evident
  // intent and is the only fix that cannot be silently un-fixed by the
  // recovery machinery. Deliberate superset of upstream grammar, same as
  // pick's legacy forms.
  if (ctx.check(KEYWORDS.TO)) {
    ctx.advance();
  }

  // Parse the command(s) to execute on each target
  const commands: ASTNode[] = [];

  // Parse at least one command - the command keyword (e.g., "add") is expected
  // Note: parseCommand() expects the command token to have been consumed already,
  // so we must call advance() before calling parseCommand().
  while (!ctx.isAtEnd()) {
    // Check if current token is a command - if so, parse it
    if (ctx.checkIsCommand()) {
      try {
        // IMPORTANT: parseCommand() uses previous() to get the command token,
        // so we must advance first to consume the command token
        ctx.advance();
        const cmd = ctx.parseCommand();
        if (cmd) {
          commands.push(cmd);
        } else {
          break;
        }
      } catch {
        break;
      }

      // Separator between two commands in the tell body (tell x add .a and add .b,
      // tell x add .a then add .b). Upstream's TellCommand.parse takes a
      // `commandList` for its body, and every commandList consumes a joining
      // `then` — so a `then`-joined command belongs INSIDE the tell (running once
      // per target), not after it. Breaking here let it escape the body.
      if (ctx.match(KEYWORDS.AND) || ctx.match(KEYWORDS.THEN)) {
        continue;
      }

      // Check for control flow boundaries after parsing a command.
      //
      // `else` belongs to an enclosing `if` — leave it. A directly-following
      // `end` is tell's OWN terminator and is CONSUMED, matching upstream
      // (TellCommand.parse calls `requireToken("end")` unless at a feature
      // start). Merely breaking on it — the previous behavior — left the `end`
      // for whatever enclosed us, which mis-attributed everything after it:
      // `on click if true tell #modal show end log "x" end` gave the leftover
      // `end` to the IF, so `log` escaped the conditional and ran
      // unconditionally (upstream keeps it inside; same shape with `repeat`,
      // where the trailing command ran once instead of per-iteration). At
      // handler level the leftover was absorbed harmlessly, which is why the
      // gap looked cosmetic when probed casually. Measured tables in
      // docs-internal/PARSER_NEXT_STEPS.md.
      if (ctx.check(KEYWORDS.ELSE)) {
        break;
      }
      if (ctx.check(KEYWORDS.END)) {
        ctx.advance();
        break;
      }

      // If next token is also a command, continue parsing
      if (ctx.checkIsCommand()) {
        continue;
      }

      // Otherwise, we're done with tell's commands
      break;
    } else {
      // Not a command token - stop parsing
      break;
    }
  }

  if (commands.length === 0) {
    throw new Error('tell command requires at least one command after the target');
  }

  return CommandNodeBuilder.fromIdentifier(identifierNode)
    .withArgs(target, ...commands)
    .endingAt(ctx.getPosition())
    .build();
}

/**
 * Parse pick command (upstream _hyperscript 5 variants + legacy hyperfixi forms)
 *
 * Variants:
 *   - pick first <count> [of|from] <expr>       — first N elements
 *   - pick last <count> [of|from] <expr>        — last N elements
 *   - pick random [<count>] [of|from] <expr>    — random N (single if no count)
 *   - pick item(s)|character(s) [at|from] <i> [to|.. <j>|end] [inclusive|exclusive] [of|from] <expr>
 *     — slice range (default exclusive end like Array.slice)
 *   - pick match|matches of <regex>[|<flags>] [of|from] <expr> — regex single/all
 *
 * Legacy fallback (hyperfixi):
 *   - pick from <expr>                          — single random element
 *   - pick <a>, <b>, <c>                        — single random from inline items
 *
 * The variant is recorded as a literal node in modifiers.variant; supporting
 * data goes into modifiers.count / modifiers.from / modifiers.rangeStart /
 * modifiers.rangeEnd / modifiers.rangeMode / modifiers.regex / modifiers.flags.
 */
export function parsePickCommand(ctx: ParserContext, identifierNode: IdentifierNode): CommandNode {
  const builder = CommandNodeBuilder.fromIdentifier(identifierNode);

  // Optional "the": `pick the first 3 of arr`
  consumeOptionalKeyword(ctx, KEYWORDS.THE);

  const variantToken = ctx.peek();
  const variantName = variantToken.value;

  // Helper: build a literal-value modifier node (variant tags).
  const makeStringLiteral = (value: string): ExpressionNode =>
    toLegacyExpression({
      type: 'literal',
      value,
      start: identifierNode.start,
      end: identifierNode.end,
    });

  // Helper: consume `of` or `from` and parse the source expression.
  const consumeSource = (): ASTNode => {
    if (!ctx.match('of', 'from')) {
      throw new Error(`pick: expected 'of' or 'from' before source expression`);
    }
    return ctx.parseExpression();
  };

  // --- Variant: first N ---
  if (variantName === 'first') {
    ctx.advance();
    // parsePrimary keeps the count tight (just a literal or identifier) so the
    // trailing `of <expr>` isn't swallowed as a binary expression — `of` is a
    // registered Pratt operator and parseExpression would consume it.
    const count = ctx.parsePrimary();
    const source = consumeSource();
    return builder
      .withArgs(source)
      .withModifier('variant', makeStringLiteral('first'))
      .withModifier('count', count as ExpressionNode)
      .endingAt(ctx.getPosition())
      .build();
  }

  // --- Variant: last N ---
  if (variantName === 'last') {
    ctx.advance();
    const count = ctx.parsePrimary();
    const source = consumeSource();
    return builder
      .withArgs(source)
      .withModifier('variant', makeStringLiteral('last'))
      .withModifier('count', count as ExpressionNode)
      .endingAt(ctx.getPosition())
      .build();
  }

  // --- Variant: random [N] ---
  if (variantName === 'random') {
    ctx.advance();
    // Optional count: present iff next token is a NUMBER literal (or, in
    // practice, any literal expression — we check for `of`/`from` as the
    // source-separator instead of probing token kind, which keeps us decoupled
    // from token-kind naming).
    let countNode: ExpressionNode | undefined;
    if (!ctx.check('of') && !ctx.check('from')) {
      countNode = ctx.parsePrimary() as ExpressionNode;
    }
    const source = consumeSource();
    const b = builder.withArgs(source).withModifier('variant', makeStringLiteral('random'));
    if (countNode) b.withModifier('count', countNode);
    return b.endingAt(ctx.getPosition()).build();
  }

  // --- Variant: item(s) / character(s) — range slice ---
  if (
    variantName === 'item' ||
    variantName === 'items' ||
    variantName === 'character' ||
    variantName === 'characters'
  ) {
    ctx.advance();
    // Optional `at` / `from` preceding the start index.
    ctx.match('at', 'from');

    // Start: `start` keyword → 0, else tight primary expression.
    let rangeStart: ExpressionNode;
    if (ctx.match('start')) {
      rangeStart = makeStringLiteral('start');
    } else {
      rangeStart = ctx.parsePrimary() as ExpressionNode;
    }

    // Optional `to <end>` or `..<end>` — end can be `end` keyword too.
    let rangeEnd: ExpressionNode | undefined;
    let endIsEndKeyword = false;
    if (ctx.match('to') || ctx.match('..')) {
      if (ctx.match('end')) {
        endIsEndKeyword = true;
      } else {
        rangeEnd = ctx.parsePrimary() as ExpressionNode;
      }
    }

    // Modes: default = include start, exclude end (Array.slice semantics).
    // `inclusive` → include end too; `exclusive` → exclude start.
    let mode = 'default';
    if (ctx.match('inclusive')) mode = 'inclusive';
    else if (ctx.match('exclusive')) mode = 'exclusive';

    const source = consumeSource();
    const b = builder
      .withArgs(source)
      .withModifier('variant', makeStringLiteral('range'))
      .withModifier('rangeStart', rangeStart)
      .withModifier('rangeMode', makeStringLiteral(mode));
    if (endIsEndKeyword) {
      b.withModifier('rangeEnd', makeStringLiteral('end'));
    } else if (rangeEnd) {
      b.withModifier('rangeEnd', rangeEnd);
    }
    return b.endingAt(ctx.getPosition()).build();
  }

  // --- Variants: match / matches (regex) ---
  if (variantName === 'match' || variantName === 'matches') {
    ctx.advance();
    ctx.match('of'); // optional separator before the regex
    const regex = ctx.parsePrimary() as ExpressionNode;

    let flags: string | undefined;
    if (ctx.matchOperator('|')) {
      flags = ctx.advance().value;
    }

    const source = consumeSource();
    const b = builder
      .withArgs(source)
      .withModifier('variant', makeStringLiteral(variantName === 'match' ? 'match' : 'matches'))
      .withModifier('regex', regex);
    if (flags) b.withModifier('flags', makeStringLiteral(flags));
    return b.endingAt(ctx.getPosition()).build();
  }

  // --- Legacy fallback: `pick from <expr>` or `pick a, b, c` ---
  return parseGenericFallback(ctx, identifierNode);
}
