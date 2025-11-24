/**
 * Control Flow Command Parsers
 *
 * Pure function implementations of control-flow-related command parsers.
 * These functions use ParserContext for dependency injection, enabling
 * clean separation from the Parser class.
 *
 * Phase 9-3b: Command Extraction (Batch 2)
 * @module parser/command-parsers/control-flow-commands
 */

import type { ParserContext, IdentifierNode } from '../parser-types';
import type { ASTNode, CommandNode } from '../../types/core';
import { CommandNodeBuilder } from '../command-node-builder';

/**
 * Parse halt command
 *
 * Syntax: halt [the event]
 *
 * This command stops execution, optionally halting event propagation.
 * The "the event" tokens are kept separate for proper adapter handling.
 *
 * Examples:
 *   - halt
 *   - halt the event
 *
 * @param ctx - Parser context providing access to parser state and methods
 * @param identifierNode - The 'halt' identifier node
 * @returns CommandNode representing the halt command
 *
 * Phase 9-3b: Extracted from Parser.parseHaltCommand
 */
export function parseHaltCommand(
  ctx: ParserContext,
  identifierNode: IdentifierNode
): CommandNode | null {
  // Parse "halt" or "halt the event"
  // We need to keep "the" and "event" as separate tokens for the command adapter
  const args: ASTNode[] = [];

  // Check if next tokens are "the event"
  if (ctx.check('the')) {
    const theToken = ctx.advance();
    args.push({
      type: 'identifier',
      name: 'the',
      start: theToken.start,
      end: theToken.end,
      line: theToken.line,
      column: theToken.column,
    } as IdentifierNode);

    // Check if followed by "event"
    if (ctx.check('event')) {
      const eventToken = ctx.advance();
      args.push({
        type: 'identifier',
        name: 'event',
        start: eventToken.start,
        end: eventToken.end,
        line: eventToken.line,
        column: eventToken.column,
      } as IdentifierNode);
    }
  }

  // Use CommandNodeBuilder for consistent node construction
  return CommandNodeBuilder.fromIdentifier(identifierNode)
    .withArgs(...args)
    .endingAt(ctx.getPosition())
    .build();
}
