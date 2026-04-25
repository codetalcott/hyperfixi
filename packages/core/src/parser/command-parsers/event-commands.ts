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
 * Parse trigger/send command
 *
 * Syntax:
 *   trigger <event> on <target>
 *   send <event> to <target>
 *
 * This command fires an event on a target element. It collects all arguments
 * until a command boundary, then restructures them around the 'on' or 'to' keyword.
 *
 * Examples:
 *   - trigger click on <button/>
 *   - trigger customEvent on #myElement
 *   - send hello to #target-form
 *   - send customEvent to <form/>
 *   - send filterByCategory(category: someValue) to me
 *   - trigger update(count: 42, label: "test") on #target
 *
 * @param ctx - Parser context providing access to parser state and methods
 * @param identifierNode - The 'trigger' or 'send' identifier node
 * @returns CommandNode representing the trigger/send command
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
  const eventStart = ctx.peek().start || 0;
  const eventLine = ctx.peek().line || 1;
  const eventColumn = ctx.peek().column || 1;

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

    // Check for event detail parameters: eventName(key: value, ...)
    if (ctx.check('(')) {
      ctx.advance(); // consume '('

      const detailArgs: ASTNode[] = [];

      while (!ctx.isAtEnd() && !ctx.check(')')) {
        // Check if this is a named parameter (identifier followed by ':')
        const checkpoint = ctx.savePosition();
        let paramName: string | undefined;

        if (ctx.checkIdentifierLike()) {
          const possibleName = ctx.peek().value;
          ctx.advance(); // consume identifier

          if (ctx.check(':')) {
            ctx.advance(); // consume ':'
            paramName = possibleName;
          } else {
            // Not a named parameter, rewind
            ctx.restorePosition(checkpoint);
          }
        }

        const value = ctx.parseExpression();

        if (paramName !== undefined) {
          // Named param: wrap as objectLiteral so evaluator produces {name: value}
          detailArgs.push({
            type: 'objectLiteral',
            properties: [
              {
                key: { type: 'identifier', name: paramName } as ASTNode,
                value: value,
              },
            ],
            start: value.start,
            end: value.end,
            line: value.line,
            column: value.column,
          } as ASTNode);
        } else {
          detailArgs.push(value);
        }

        if (ctx.check(',')) {
          ctx.advance();
        } else if (!ctx.check(')')) {
          break;
        }
      }

      // Consume closing parenthesis
      if (ctx.check(')')) {
        ctx.advance();
      }

      // Create a functionCall node instead of a plain string
      allArgs.push({
        type: 'functionCall',
        name: eventName,
        args: detailArgs,
        start: eventStart,
        end: ctx.getPosition().end,
        line: eventLine,
        column: eventColumn,
      } as ASTNode);
    } else {
      // No parameters - create a string literal node for the event name
      allArgs.push({
        type: 'string',
        value: eventName,
        start: eventStart,
        end: ctx.getPosition().end,
        line: eventLine,
        column: eventColumn,
      } as ASTNode);
    }
  }

  // Parse optional target: "on <target>" (trigger) or "to <target>" (send)
  // Must check explicitly rather than delegating to parsePrimary(),
  // because parsePrimary() interprets 'on' as event handler start.
  const finalArgs: ASTNode[] = [...allArgs];

  if (ctx.check('on') || ctx.check('to')) {
    const keyword = ctx.advance().value; // consume 'on' or 'to'
    finalArgs.push(ctx.createIdentifier(keyword));

    // Parse target expression(s)
    while (!isCommandBoundary(ctx)) {
      finalArgs.push(ctx.parsePrimary());
    }
  }

  // Use CommandNodeBuilder for consistent node construction
  return CommandNodeBuilder.fromIdentifier(identifierNode)
    .withArgs(...finalArgs)
    .endingAt(ctx.getPosition())
    .build();
}
