/**
 * DOM Command Parsers
 *
 * Pure function implementations of DOM manipulation command parsers.
 * These functions use ParserContext for dependency injection, enabling
 * clean separation from the Parser class.
 *
 * Phase 9-3b: Command Extraction (Batch 2)
 * @module parser/command-parsers/dom-commands
 */

import type { ParserContext, IdentifierNode } from '../parser-types';
import type { ASTNode, Token } from '../../types/core';
import { CommandNodeBuilder } from '../command-node-builder';
import { KEYWORDS, PUT_OPERATIONS, PUT_OPERATION_KEYWORDS } from '../parser-constants';

/**
 * Parse remove command
 *
 * Syntax: remove <class> from <target>
 *
 * This command removes a class from a target element. It expects:
 * 1. Class name to remove
 * 2. 'from' keyword
 * 3. Target element
 *
 * Examples:
 *   - remove .active from <button/>
 *   - remove "selected" from <div/>
 *
 * @param ctx - Parser context providing access to parser state and methods
 * @param identifierNode - The 'remove' identifier node
 * @returns CommandNode representing the remove command
 *
 * Phase 9-3b: Extracted from Parser.parseRemoveCommand
 */
export function parseRemoveCommand(
  ctx: ParserContext,
  identifierNode: IdentifierNode
) {
  // Phase 1 Refactoring: Use constants and CommandNodeBuilder
  const args: ASTNode[] = [];

  // Parse: remove <class> from <target>
  // First argument: class
  if (!ctx.isAtEnd() && !ctx.check(KEYWORDS.FROM) && !ctx.check(KEYWORDS.END)) {
    args.push(ctx.parsePrimary());
  }

  // Expect 'from' keyword
  if (ctx.check(KEYWORDS.FROM)) {
    ctx.advance(); // consume 'from'
    args.push(ctx.createIdentifier(KEYWORDS.FROM, ctx.getPosition())); // Add 'from' as an argument
  }

  // Third argument: target
  if (
    !ctx.isAtEnd() &&
    !ctx.check(KEYWORDS.THEN) &&
    !ctx.check(KEYWORDS.AND) &&
    !ctx.check(KEYWORDS.ELSE) &&
    !ctx.check(KEYWORDS.END)
  ) {
    args.push(ctx.parsePrimary());
  }

  // Phase 1: Use CommandNodeBuilder
  return CommandNodeBuilder.fromIdentifier(identifierNode)
    .withArgs(...args)
    .endingAt(ctx.getPosition())
    .build();
}

/**
 * Parse toggle command
 *
 * Syntax: toggle <class> from <target> OR toggle <class> on <target>
 *
 * This command toggles a class on/off for a target element. It supports
 * both 'from' (HyperFixi) and 'on' (official _hyperscript) for compatibility.
 *
 * Examples:
 *   - toggle .active from <button/>
 *   - toggle "selected" on <div/>
 *
 * @param ctx - Parser context providing access to parser state and methods
 * @param identifierNode - The 'toggle' identifier node
 * @returns CommandNode representing the toggle command
 *
 * Phase 9-3b: Extracted from Parser.parseToggleCommand
 */
export function parseToggleCommand(
  ctx: ParserContext,
  identifierNode: IdentifierNode
) {
  const args: ASTNode[] = [];

  // Parse: toggle <class> from <target> OR toggle <class> on <target>
  // Support both 'from' (HyperFixi) and 'on' (official _hyperscript) for compatibility

  // Parse first argument (class) until 'from' or 'on'
  if (!ctx.isAtEnd() && !ctx.check('from') && !ctx.check('on') && !ctx.check('end')) {
    args.push(ctx.parsePrimary());
  }

  // Accept either 'from' or 'on' keyword for target specification
  // Note: We add the preposition as an argument for backwards compatibility
  if (ctx.check('from') || ctx.check('on')) {
    const preposition = ctx.peek().value; // 'from' or 'on'
    ctx.advance(); // consume the preposition
    args.push(ctx.createIdentifier(preposition, ctx.getPosition())); // Add preposition as an argument

    // Parse target
    if (
      !ctx.isAtEnd() &&
      !ctx.check('then') &&
      !ctx.check('and') &&
      !ctx.check('else') &&
      !ctx.check('end')
    ) {
      args.push(ctx.parsePrimary());
    }
  }

  // Phase 2 Refactoring: Use CommandNodeBuilder for consistent node construction
  return CommandNodeBuilder.fromIdentifier(identifierNode)
    .withArgs(...args)
    .endingAt(ctx.getPosition())
    .build();
}

/**
 * Parse add command
 *
 * Syntax:
 *   - add <class> [to <target>]
 *   - add { css-property: value } [to <target>]
 *
 * This command adds a class to a target element or applies inline styles
 * using CSS-style object literal syntax.
 *
 * Examples:
 *   - add .active to <button/>
 *   - add "highlight"
 *   - add { left: ${x}px; top: ${y}px; } to <div/>
 *
 * @param ctx - Parser context providing access to parser state and methods
 * @param commandToken - The 'add' command token
 * @returns CommandNode representing the add command
 *
 * Phase 9-3b: Extracted from Parser.parseAddCommand
 */
export function parseAddCommand(
  ctx: ParserContext,
  commandToken: Token
) {
  const args: ASTNode[] = [];

  // Parse first argument - can be classes (string/identifier) or CSS object literal
  if (ctx.match('{')) {
    // Parse CSS-style object literal for inline styles
    // Syntax: { left: ${x}px; top: ${y}px; }
    args.push(ctx.parseCSSObjectLiteral());
  } else if (!ctx.isAtEnd() && !ctx.check('to')) {
    // Parse regular class expression
    args.push(ctx.parsePrimary());
  }

  // Parse optional 'to <target>'
  if (ctx.check('to')) {
    ctx.advance(); // consume 'to'

    // Parse target element
    if (!ctx.isAtEnd() && !ctx.check('then') && !ctx.check('and')) {
      args.push(ctx.parsePrimary());
    }
  }

  // Phase 2 Refactoring: Use CommandNodeBuilder for consistent node construction
  return CommandNodeBuilder.from(commandToken)
    .withArgs(...args)
    .endingAt(ctx.getPosition())
    .build();
}

/**
 * Parse put command
 *
 * Syntax:
 *   - put <content> into <target>
 *   - put <content> before <target>
 *   - put <content> after <target>
 *   - put <content> at start of <target>
 *   - put <content> at end of <target>
 *   - put <content> at <position>
 *
 * This command inserts content into the DOM at various positions relative
 * to a target element. It handles complex expressions for both content and target.
 *
 * Examples:
 *   - put (#count's textContent as Int) + 1 into #count
 *   - put <div>Hello</div> before <button/>
 *   - put "text" at end of <p/>
 *
 * @param ctx - Parser context providing access to parser state and methods
 * @param identifierNode - The 'put' identifier node
 * @returns CommandNode representing the put command, or null on error
 *
 * Phase 9-3b: Extracted from Parser.parsePutCommand
 */
export function parsePutCommand(
  ctx: ParserContext,
  identifierNode: IdentifierNode
) {
  // Parse the content expression (everything before operation keyword)
  const contentExpr = ctx.parseExpression();

  if (!contentExpr) {
    ctx.addError('Put command requires content expression');
    return null;
  }

  // Look for operation keyword (into, before, after, at)
  const currentToken = ctx.peek();

  if (!currentToken || !PUT_OPERATION_KEYWORDS.includes(currentToken.value as any)) {
    ctx.addError(`Expected operation keyword (${PUT_OPERATION_KEYWORDS.join(', ')}) after put expression, got: ${currentToken?.value}`);
    return null;
  }

  let operation = ctx.advance().value;  // consume 'into', 'before', 'after', 'at', or compound keyword

  // Handle compound keywords from tokenizer (e.g., "at start of", "at the start of")
  // These are tokenized as single keywords, so we just need to normalize them
  const operationLower = operation.toLowerCase();
  if (operationLower === 'at start of' || operationLower === 'at the start of') {
    operation = PUT_OPERATIONS.AT_START_OF;
  } else if (operationLower === 'at end of' || operationLower === 'at the end of') {
    operation = PUT_OPERATIONS.AT_END_OF;
  } else if (operation === PUT_OPERATIONS.AT) {
    // Fallback: Handle separate tokens for backwards compatibility
    // This handles cases where tokenizer produces individual tokens
    if (ctx.check(KEYWORDS.START) || ctx.check(KEYWORDS.THE)) {
      if (ctx.check(KEYWORDS.THE)) {
        ctx.advance();  // consume 'the'
      }
      if (ctx.check(KEYWORDS.START)) {
        ctx.advance();  // consume 'start'
        if (ctx.check(KEYWORDS.OF)) {
          ctx.advance();  // consume 'of'
          operation = PUT_OPERATIONS.AT_START_OF;
        }
      }
    } else if (ctx.check(KEYWORDS.END)) {
      ctx.advance();  // consume 'end'
      if (ctx.check(KEYWORDS.OF)) {
        ctx.advance();  // consume 'of'
        operation = PUT_OPERATIONS.AT_END_OF;
      }
    }
  }

  // Parse the target expression
  const targetExpr = ctx.parseExpression();

  if (!targetExpr) {
    ctx.addError('Put command requires target expression after operation keyword');
    return null;
  }

  // Create command node using builder pattern
  const pos = ctx.getPosition();
  return CommandNodeBuilder.fromIdentifier(identifierNode)
    .withArgs(contentExpr, ctx.createIdentifier(operation, pos), targetExpr)
    .endingAt(pos)
    .build();
}
