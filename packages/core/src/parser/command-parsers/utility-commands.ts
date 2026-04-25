/**
 * Utility Command Parsers
 *
 * Pure function implementations of general utility command parsers.
 * These functions use ParserContext for dependency injection, enabling
 * clean separation from the Parser class.
 *
 * Phase 9-3b: Command Extraction (Batch 2)
 * @module parser/command-parsers/utility-commands
 */

import type { ParserContext, IdentifierNode } from '../parser-types';
import type { ASTNode, Token, ExpressionNode, CommandNode } from '../../types/core';
import { CommandNodeBuilder } from '../command-node-builder';
import { isKeyword, isCommandBoundary, consumeOptionalKeyword } from '../helpers/parsing-helpers';
import { KEYWORDS } from '../parser-constants';
// Phase 4: TokenType import removed - using predicate methods instead

// Import command parsers from other modules for compound command routing
import * as eventCommands from './event-commands';
import * as controlFlowCommands from './control-flow-commands';
import * as animationCommands from './animation-commands';
import * as domCommands from './dom-commands';
import * as variableCommands from './variable-commands';

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
 * @returns CommandNode representing the command, or result of parseRegularCommand for unknown commands
 *
 * Phase 9-3b: Extracted from Parser.parseCompoundCommand
 */
export function parseCompoundCommand(
  ctx: ParserContext,
  identifierNode: IdentifierNode
): CommandNode | null {
  const commandName = identifierNode.name.toLowerCase();

  switch (commandName) {
    case 'put':
      return domCommands.parsePutCommand(ctx, identifierNode);
    case 'trigger':
    case 'send':
      return eventCommands.parseTriggerCommand(ctx, identifierNode);
    case 'remove':
      return domCommands.parseRemoveCommand(ctx, identifierNode);
    case 'toggle':
      return domCommands.parseToggleCommand(ctx, identifierNode);
    case 'set':
      return variableCommands.parseSetCommand(ctx, identifierNode);
    case 'halt':
      return controlFlowCommands.parseHaltCommand(ctx, identifierNode);
    case 'measure':
      return animationCommands.parseMeasureCommand(ctx, identifierNode);
    case 'js':
      return parseJsCommand(ctx, identifierNode);
    case 'tell':
      return parseTellCommand(ctx, identifierNode);
    case 'swap':
    case 'morph':
      return domCommands.parseSwapCommand(ctx, identifierNode);
    default:
      // Fallback to regular parsing
      return parseRegularCommand(ctx, identifierNode);
  }
}

/**
 * Parse regular command
 *
 * Generic command parser that collects space-separated arguments until
 * a command boundary is reached. This is used for commands that don't
 * have special parsing requirements.
 *
 * Arguments are collected until one of these boundaries:
 * - 'then', 'and', 'else', 'end' keywords
 * - Another command token
 * - End of input
 *
 * Examples:
 *   - log "message" value
 *   - call myFunction(arg1, arg2)
 *   - send customEvent to <button/>
 *
 * @param ctx - Parser context providing access to parser state and methods
 * @param identifierNode - The command identifier node
 * @returns CommandNode representing the command
 *
 * Phase 9-3b: Extracted from Parser.parseRegularCommand
 */
export function parseRegularCommand(ctx: ParserContext, identifierNode: IdentifierNode) {
  const args: ASTNode[] = [];

  // Parse command arguments (space-separated, not comma-separated)
  // Phase 4: Using predicate methods instead of direct TokenType checks
  while (!isCommandBoundary(ctx, ['catch', 'finally'])) {
    // Include EVENT tokens to allow DOM event names as arguments (e.g., 'send reset to #element')
    // checkIdentifierLike() covers: IDENTIFIER, CONTEXT_VAR, KEYWORD, COMMAND, EVENT
    // checkSelector() covers: CSS_SELECTOR, ID_SELECTOR, CLASS_SELECTOR
    // checkLiteral() covers: STRING, NUMBER, BOOLEAN, TEMPLATE_LITERAL
    if (
      ctx.checkIdentifierLike() ||
      ctx.checkSelector() ||
      ctx.checkLiteral() ||
      ctx.checkTimeExpression() ||
      ctx.match('<')
    ) {
      args.push(ctx.parsePrimary());
    } else {
      break;
    }
  }

  // Phase 2 Refactoring: Use CommandNodeBuilder for consistent node construction
  return CommandNodeBuilder.fromIdentifier(identifierNode)
    .withArgs(...args)
    .endingAt(ctx.getPosition())
    .build();
}

/**
 * Parse multi-word command with modifiers
 *
 * Syntax: <command> <args> <keyword> <value> [<keyword> <value>...]
 *
 * This parser handles commands with keyword-based modifiers like:
 * - append X to Y
 * - fetch URL as json
 * - set $x to 5
 *
 * The parser:
 * 1. Gets the multi-word pattern for the command (defines valid keywords)
 * 2. Parses primary arguments until hitting a keyword or boundary
 * 3. Parses modifiers (keyword + value pairs)
 *
 * IMPORTANT: Uses parsePrimary() for arguments to avoid consuming modifiers.
 * For example, "fetch URL as json" should NOT parse "URL as json" as one expression.
 *
 * Examples:
 *   - append <div/> to <body/>
 *   - fetch "/api/data" as json
 *   - set $counter to 0
 *
 * @param ctx - Parser context providing access to parser state and methods
 * @param commandToken - The command token
 * @param commandName - The command name (for pattern lookup)
 * @returns CommandNode representing the multi-word command, or null if no pattern found
 *
 * Phase 9-3b: Extracted from Parser.parseMultiWordCommand
 */
export function parseMultiWordCommand(
  ctx: ParserContext,
  commandToken: Token,
  commandName: string
) {
  const pattern = ctx.getMultiWordPattern(commandName);
  if (!pattern) return null;

  const args: ASTNode[] = [];
  const modifiers: Record<string, ExpressionNode> = {};

  // Parse primary arguments (before any keywords)
  // IMPORTANT: Use parsePrimary() instead of parseExpression() to avoid consuming modifiers
  // For example, "fetch URL as json" should NOT parse "URL as json" as one expression
  while (
    !isCommandBoundary(ctx, ['catch', 'finally', ...pattern.keywords]) &&
    !isKeyword(ctx.peek(), pattern.keywords)
  ) {
    // Use parsePrimary() to parse just the value, not full expressions
    // This prevents "URL as json" from being parsed as one expression
    const expr = ctx.parsePrimary();
    if (expr) {
      args.push(expr);
    } else {
      break;
    }

    // Handle comma-separated arguments
    if (ctx.match(',')) {
      continue;
    }

    // Check if we're at a modifier keyword
    if (isKeyword(ctx.peek(), pattern.keywords)) {
      break;
    }
  }

  // Parse modifiers (keywords + their arguments)
  while (!ctx.isAtEnd() && isKeyword(ctx.peek(), pattern.keywords)) {
    const keyword = ctx.advance().value;

    // Parse the expression after the keyword
    const modifierValue = ctx.parseExpression();
    if (modifierValue) {
      modifiers[keyword] = modifierValue as ExpressionNode;
    }

    // Check for more modifiers
    if (!isKeyword(ctx.peek(), pattern.keywords)) {
      break;
    }
  }

  // Phase 2 Refactoring: Use CommandNodeBuilder for consistent node construction
  const builder = CommandNodeBuilder.from(commandToken)
    .withArgs(...args)
    .endingAt(ctx.getPosition());

  if (Object.keys(modifiers).length > 0) {
    builder.withModifiers(modifiers);
  }

  return builder.build();
}

/**
 * Check if the current token terminates a bare URL path in a fetch command.
 * URL paths end before modifiers (as, with), braces, command boundaries, etc.
 */
function isFetchURLTerminator(ctx: ParserContext): boolean {
  if (ctx.isAtEnd()) return true;
  const val = ctx.peek().value;
  return (
    ['as', 'with', '{', 'then', 'end', 'else', 'otherwise', ')'].includes(val) ||
    isCommandBoundary(ctx)
  );
}

/**
 * Parse a bare (unquoted) URL path starting with '/' (e.g. /api/data, /users/123).
 * Collects `/`, identifier, and other non-terminator tokens into a string literal.
 * Returns null if the path can't be reconstructed.
 */
function parseBareURLPath(ctx: ParserContext): ASTNode | null {
  const startPos = ctx.savePosition();
  let path = '';

  while (!ctx.isAtEnd() && !isFetchURLTerminator(ctx)) {
    path += ctx.advance().value;
  }

  if (!path || path === '/') {
    ctx.restorePosition(startPos);
    return null;
  }

  return {
    type: 'literal',
    value: path,
    raw: path,
    start: startPos,
    end: ctx.savePosition(),
  } as ASTNode;
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

  // Step 1: Parse URL — check for bare path starting with '/' first, then fall back to parsePrimary
  let url: ASTNode | null = null;
  if (!ctx.isAtEnd() && ctx.check('/')) {
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
        modifiers['doNotThrow'] = {
          type: 'literal',
          value: true,
          start: doToken.start,
          end: throwToken.end,
          line: doToken.line,
          column: doToken.column,
        } as unknown as ExpressionNode;
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
      // Phase 4: Using predicate methods - checkIdentifierLike() covers both IDENTIFIER and CONTEXT_VAR
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

  // Debug logging for development
  // console.log('[parseJsCommand] jsCodeStart:', jsCodeStart, 'jsCodeEnd:', jsCodeEnd, 'rawSlice:', JSON.stringify(rawSlice), 'code:', JSON.stringify(code));

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

      // Handle 'and' between commands (tell x add .a and add .b)
      if (ctx.match(KEYWORDS.AND)) {
        continue;
      }

      // Check for control flow boundaries after parsing a command
      if (ctx.check(KEYWORDS.THEN) || ctx.check(KEYWORDS.ELSE) || ctx.check(KEYWORDS.END)) {
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
