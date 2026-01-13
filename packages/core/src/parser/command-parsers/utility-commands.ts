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
import { isKeyword, isCommandBoundary } from '../helpers/parsing-helpers';
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

  // Skip tokens until 'end' keyword to find the end position
  while (!ctx.check(KEYWORDS.END) && !ctx.isAtEnd()) {
    ctx.advance();
  }

  // Get the 'end' token's start position to know where JS code ends
  const endToken = ctx.peek();
  const jsCodeEnd = endToken.start;

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
