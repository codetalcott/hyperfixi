/**
 * Async Command Parsers
 *
 * Pure function implementations of async-related command parsers.
 * These functions use ParserContext for dependency injection, enabling
 * clean separation from the Parser class.
 *
 * Phase 9-3b: Command Extraction (Batch 2)
 * @module parser/command-parsers/async-commands
 */

import type { ParserContext, IdentifierNode, LiteralNode } from '../parser-types';
import type { ASTNode, ExpressionNode, Token } from '../../types/core';
import { TokenType } from '../tokenizer';
import { CommandNodeBuilder } from '../command-node-builder';

/**
 * Parse wait command
 *
 * Syntax:
 *   - wait <time>
 *   - wait for <event> [from <target>]
 *   - wait for <event1> or <event2> [from <target>]
 *   - wait for <event>(<param1>, <param2>) [from <target>]
 *
 * This command waits for either a time duration or event(s) to occur.
 * Supports multiple events with 'or' and optional event parameters.
 *
 * Examples:
 *   - wait 1s
 *   - wait for click
 *   - wait for click or keydown from <button/>
 *   - wait for custom(value, index) from the window
 *
 * @param ctx - Parser context providing access to parser state and methods
 * @param commandToken - The 'wait' command token
 * @returns CommandNode representing the wait command
 *
 * Phase 9-3b: Extracted from Parser.parseWaitCommand
 */
export function parseWaitCommand(
  ctx: ParserContext,
  commandToken: Token
) {
  const args: ASTNode[] = [];

  // Check if this is a simple time-based wait (e.g., "wait 1s")
  if (ctx.checkTokenType(TokenType.TIME_EXPRESSION) || ctx.checkTokenType(TokenType.NUMBER)) {
    // Simple wait with time
    const timeExpr = ctx.parsePrimary();
    args.push(timeExpr);

    return {
      type: 'command',
      name: 'wait',
      args: args as ExpressionNode[],
      isBlocking: true,
      start: commandToken.start || 0,
      end: ctx.getPosition().end,
      line: commandToken.line || 1,
      column: commandToken.column || 1,
    };
  }

  // Check for 'for' keyword (event-based wait)
  if (ctx.check('for')) {
    ctx.advance(); // consume 'for'

    // Parse event specifications (can be multiple with 'or')
    const events: Array<{ name: string; params: string[] }> = [];

    do {
      // Parse event name
      const eventToken = ctx.peek();
      if (eventToken.type !== TokenType.IDENTIFIER) {
        throw new Error('Expected event name after "for"');
      }
      const eventName = eventToken.value;
      ctx.advance();

      // Parse optional parameters: (param1, param2)
      const eventParams: string[] = [];
      if (ctx.check('(')) {
        ctx.advance(); // consume '('

        // Parse parameter list
        while (!ctx.isAtEnd() && !ctx.check(')')) {
          const paramToken = ctx.peek();
          if (paramToken.type === TokenType.IDENTIFIER) {
            eventParams.push(paramToken.value);
            ctx.advance();

            // Check for comma separator
            if (ctx.check(',')) {
              ctx.advance();
            }
          } else {
            break;
          }
        }

        // Consume closing parenthesis
        if (!ctx.check(')')) {
          throw new Error('Expected ")" after event parameters');
        }
        ctx.advance();
      }

      events.push({ name: eventName, params: eventParams });

      // Check for 'or' to continue with more events
      if (ctx.check('or')) {
        ctx.advance(); // consume 'or'
        continue;
      } else {
        break;
      }
    } while (!ctx.isAtEnd());

    // Parse optional 'from <target>' clause
    let eventTarget: ASTNode | null = null;
    if (ctx.check('from')) {
      ctx.advance(); // consume 'from'

      // Optional 'the' before target
      if (ctx.check('the')) {
        ctx.advance();
      }

      // Parse the target expression
      eventTarget = ctx.parsePrimary();
    }

    // Build args array
    // Format: [eventList, target?]
    args.push({
      type: 'arrayLiteral',
      elements: events.map(
        event =>
          ({
            type: 'objectLiteral',
            properties: [
              {
                key: { type: 'identifier', name: 'name' } as IdentifierNode,
                value: {
                  type: 'literal',
                  value: event.name,
                  raw: `"${event.name}"`,
                } as LiteralNode,
              },
              {
                key: { type: 'identifier', name: 'args' } as IdentifierNode,
                value: {
                  type: 'arrayLiteral',
                  elements: event.params.map(
                    param =>
                      ({
                        type: 'literal',
                        value: param,
                        raw: `"${param}"`,
                      }) as LiteralNode
                  ),
                } as any,
              },
            ],
          }) as any
      ),
      start: commandToken.start,
      end: ctx.getPosition().end,
      line: commandToken.line,
      column: commandToken.column,
    } as any);

    if (eventTarget) {
      args.push(eventTarget);
    }
  }

  // Phase 2 Refactoring: Use CommandNodeBuilder for consistent node construction
  return CommandNodeBuilder.from(commandToken)
    .withArgs(...args)
    .blocking() // wait is a blocking command
    .endingAt(ctx.getPosition())
    .build();
}
