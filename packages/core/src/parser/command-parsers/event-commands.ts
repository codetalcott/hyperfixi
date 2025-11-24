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
import { TokenType } from '../tokenizer';
import { CommandNodeBuilder } from '../command-node-builder';

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
  // Use the same flexible approach as put/set commands
  const allArgs: ASTNode[] = [];

  while (
    !ctx.isAtEnd() &&
    !ctx.check('then') &&
    !ctx.check('and') &&
    !ctx.check('else') &&
    !ctx.check('end') &&
    !ctx.checkTokenType(TokenType.COMMAND)
  ) {
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
    finalArgs.push(ctx.createIdentifier('on', ctx.getPosition()));
    finalArgs.push(...targetArgs);
  }

  // Use CommandNodeBuilder for consistent node construction
  return CommandNodeBuilder.fromIdentifier(identifierNode)
    .withArgs(...finalArgs)
    .endingAt(ctx.getPosition())
    .build();
}
