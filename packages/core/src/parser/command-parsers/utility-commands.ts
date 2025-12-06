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
import { TokenType } from '../tokenizer';
import { CommandNodeBuilder } from '../command-node-builder';
import { isKeyword } from '../helpers/parsing-helpers';
import { KEYWORDS } from '../parser-constants';

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
 *
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
  console.log('[PARSER DEBUG] parseCompoundCommand called with:', commandName);

  switch (commandName) {
    case 'put':
      return domCommands.parsePutCommand(ctx, identifierNode);
    case 'trigger':
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
export function parseRegularCommand(
  ctx: ParserContext,
  identifierNode: IdentifierNode
) {
  const args: ASTNode[] = [];

  // Parse command arguments (space-separated, not comma-separated)
  while (
    !ctx.isAtEnd() &&
    !ctx.check(KEYWORDS.THEN) &&
    !ctx.check(KEYWORDS.AND) &&
    !ctx.check(KEYWORDS.ELSE) &&
    !ctx.check(KEYWORDS.END) &&
    !ctx.check('catch') &&
    !ctx.check('finally') &&
    !ctx.checkTokenType(TokenType.COMMAND)
  ) {
    // Include EVENT tokens to allow DOM event names as arguments (e.g., 'send reset to #element')
    if (
      ctx.checkTokenType(TokenType.CONTEXT_VAR) ||
      ctx.checkTokenType(TokenType.IDENTIFIER) ||
      ctx.checkTokenType(TokenType.KEYWORD) ||
      ctx.checkTokenType(TokenType.EVENT) ||
      ctx.checkTokenType(TokenType.CSS_SELECTOR) ||
      ctx.checkTokenType(TokenType.ID_SELECTOR) ||
      ctx.checkTokenType(TokenType.CLASS_SELECTOR) ||
      ctx.checkTokenType(TokenType.STRING) ||
      ctx.checkTokenType(TokenType.NUMBER) ||
      ctx.checkTokenType(TokenType.TIME_EXPRESSION) ||
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
    !ctx.isAtEnd() &&
    !isKeyword(ctx.peek(), pattern.keywords) &&
    !ctx.check(KEYWORDS.THEN) &&
    !ctx.check(KEYWORDS.AND) &&
    !ctx.check(KEYWORDS.ELSE) &&
    !ctx.check(KEYWORDS.END) &&
    !ctx.check('catch') &&
    !ctx.check('finally') &&
    !ctx.checkTokenType(TokenType.COMMAND)
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
export function parseJsCommand(
  ctx: ParserContext,
  identifierNode: IdentifierNode
): CommandNode {
  const parameters: string[] = [];

  // Check for optional parameters: js(param1, param2)
  if (ctx.match('(')) {
    while (!ctx.check(')') && !ctx.isAtEnd()) {
      // Collect parameter names as identifier strings
      if (ctx.checkTokenType(TokenType.IDENTIFIER)) {
        parameters.push(ctx.advance().value);
      } else if (ctx.checkTokenType(TokenType.CONTEXT_VAR)) {
        // Also allow context vars like 'me', 'it', etc.
        parameters.push(ctx.advance().value);
      }
      // Skip commas between parameters
      ctx.match(',');
    }
    ctx.consume(')', 'Expected ) after js parameters');
  }

  // Collect tokens until 'end' keyword and reconstruct code
  const codeTokens: string[] = [];
  while (!ctx.check(KEYWORDS.END) && !ctx.isAtEnd()) {
    const token = ctx.advance();
    // Token values already include quotes for strings, so use directly
    codeTokens.push(token.value);
  }
  ctx.consume(KEYWORDS.END, 'Expected end after js code body');

  const code = codeTokens.join(' ');

  // Build args: first arg is code string, second is parameters array
  const codeNode: ASTNode = {
    type: 'literal',
    value: code,
    start: identifierNode.start,
    end: ctx.getPosition().end,
  };

  const paramsNode: ASTNode = {
    type: 'arrayLiteral',
    elements: parameters.map((p) => ({
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
