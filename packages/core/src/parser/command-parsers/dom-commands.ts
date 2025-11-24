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
import { KEYWORDS } from '../parser-constants';

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
