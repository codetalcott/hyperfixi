/**
 * Event Command Parsers
 *
 * Pure function implementations of event-related command parsers.
 * These functions use ParserContext for dependency injection, enabling
 * clean separation from the Parser class.
 *
 * Phase 9-3a Day 3: Command Extraction
 * @module parser/command-parsers/event-commands
 */

import type { ParserContext, IdentifierNode } from '../parser-types';
import type { ASTNode, CommandNode } from '../../types/core';
import { CommandNodeBuilder } from '../command-node-builder';
import { KEYWORDS } from '../parser-constants';
import { isCommandBoundary } from '../helpers/parsing-helpers';
// Phase 4: TokenType import removed - using predicate methods instead

/**
 * Parse trigger command
 *
 * Syntax: trigger <event> on <target>
 *
 * This command fires an event on a target element. It collects all arguments
 * until a command boundary, then restructures them around the 'on' keyword.
 *
 * Examples:
 *   - trigger click on <button/>
 *   - trigger customEvent on #myElement
 *
 * @param ctx - Parser context providing access to parser state and methods
 * @param identifierNode - The 'trigger' identifier node
 * @returns CommandNode representing the trigger command
 *
 * Phase 9-3a: Extracted from Parser.parseTriggerCommand
 */
export function parseTriggerCommand(
  ctx: ParserContext,
  identifierNode: IdentifierNode
): CommandNode | null {
  // Special handling for event names with colons (e.g., "draggable:start")
  // The tokenizer splits these into: identifier, ':', identifier
  // We need to combine them into a single event name
  const allArgs: ASTNode[] = [];

  // First, parse the event name (may include colons)
  let eventName = '';
  let eventStart = ctx.peek().start || 0;
  let eventLine = ctx.peek().line || 1;
  let eventColumn = ctx.peek().column || 1;

  // Check if first token is an identifier (event name)
  // Phase 4: Using predicate method - checkIdentifierLike() covers IDENTIFIER and KEYWORD
  if (ctx.checkIdentifierLike()) {
    eventName = ctx.advance().value;

    // Check for colon-separated parts (e.g., "draggable:start")
    while (ctx.check(':') && !ctx.isAtEnd()) {
      ctx.advance(); // consume ':'
      eventName += ':';
      // Next part should be an identifier or keyword
      if (ctx.checkIdentifierLike()) {
        eventName += ctx.advance().value;
      }
    }

    // Create a string literal node for the combined event name
    allArgs.push({
      type: 'string',
      value: eventName,
      start: eventStart,
      end: ctx.getPosition().end,
      line: eventLine,
      column: eventColumn,
    } as ASTNode);
  }

  // Continue parsing remaining args (on, target, etc.)
  while (!isCommandBoundary(ctx)) {
    allArgs.push(ctx.parsePrimary());
  }

  // Find the 'on' keyword
  let operationIndex = -1;
  for (let i = 0; i < allArgs.length; i++) {
    const arg = allArgs[i];
    if (
      (arg.type === 'identifier' || arg.type === 'literal' || arg.type === 'keyword') &&
      ((arg as any).name === 'on' || (arg as any).value === 'on')
    ) {
      operationIndex = i;
      break;
    }
  }

  const finalArgs: ASTNode[] = [];

  if (operationIndex === -1) {
    // No "on" keyword found - use all args as-is
    finalArgs.push(...allArgs);
  } else {
    // Restructure: event + 'on' + target
    const eventArgs = allArgs.slice(0, operationIndex);
    const targetArgs = allArgs.slice(operationIndex + 1);

    finalArgs.push(...eventArgs);
    finalArgs.push(ctx.createIdentifier('on'));
    finalArgs.push(...targetArgs);
  }

  // Use CommandNodeBuilder for consistent node construction
  return CommandNodeBuilder.fromIdentifier(identifierNode)
    .withArgs(...finalArgs)
    .endingAt(ctx.getPosition())
    .build();
}
