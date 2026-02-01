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

import type { ParserContext } from '../parser-types';
import type { ASTNode, Token } from '../../types/core';
import { CommandNodeBuilder } from '../command-node-builder';
import { KEYWORDS } from '../parser-constants';
import {
  createArrayLiteral,
  createObjectLiteral,
  createIdentifier,
  createLiteral,
} from '../helpers/ast-helpers';
// Phase 4: Import token predicates for direct token checks
import { isIdentifierLike } from '../token-predicates';

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
export function parseWaitCommand(ctx: ParserContext, commandToken: Token) {
  const args: ASTNode[] = [];

  // Check if this is a simple time-based wait (e.g., "wait 1s")
  // Phase 4: Using predicate methods
  if (ctx.checkTimeExpression() || ctx.checkLiteral()) {
    // Simple wait with time
    const timeExpr = ctx.parsePrimary();
    args.push(timeExpr);

    return CommandNodeBuilder.from(commandToken)
      .withArgs(...args)
      .blocking()
      .endingAt(ctx.getPosition())
      .build();
  }

  // Check for 'for' keyword (event-based wait)
  if (ctx.check('for')) {
    ctx.advance(); // consume 'for'

    // Parse event specifications (can be multiple with 'or')
    const events: Array<{ name: string; params: string[] }> = [];

    do {
      // Parse event name
      // Phase 4: Using predicate for direct token check
      const eventToken = ctx.peek();
      if (!isIdentifierLike(eventToken)) {
        throw new Error('Expected event name after "for"');
      }
      const eventName = eventToken.value;
      ctx.advance();

      // Parse optional parameters: (param1, param2)
      const eventParams: string[] = [];
      if (ctx.check('(')) {
        ctx.advance(); // consume '('

        // Parse parameter list
        // Phase 4: Using predicate for direct token check
        while (!ctx.isAtEnd() && !ctx.check(')')) {
          const paramToken = ctx.peek();
          if (isIdentifierLike(paramToken)) {
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
    if (ctx.check(KEYWORDS.FROM)) {
      ctx.advance(); // consume 'from'

      // Optional 'the' before target
      if (ctx.check(KEYWORDS.THE)) {
        ctx.advance();
      }

      // Parse the target expression
      eventTarget = ctx.parsePrimary();
    }

    // Build args array
    // Format: [eventList, target?]
    const eventPos = {
      start: commandToken.start,
      end: ctx.getPosition().end,
      line: commandToken.line,
      column: commandToken.column,
    };
    args.push(
      createArrayLiteral(
        events.map(event =>
          createObjectLiteral(
            [
              {
                key: createIdentifier('name', eventPos),
                value: createLiteral(event.name, `"${event.name}"`, eventPos),
              },
              {
                key: createIdentifier('args', eventPos),
                value: createArrayLiteral(
                  event.params.map(param => createLiteral(param, `"${param}"`, eventPos)),
                  eventPos
                ),
              },
            ],
            eventPos
          )
        ),
        eventPos
      )
    );

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

/**
 * Parse install command
 *
 * Syntax: install <behavior-name> [(<params>)]
 *
 * This command installs a behavior on the current element. Parameters can be
 * positional or named (name: value syntax).
 *
 * Examples:
 *   - install MyBehavior
 *   - install Draggable(axis: 'x')
 *   - install CustomBehavior(param1, param2, named: value)
 *
 * @param ctx - Parser context providing access to parser state and methods
 * @param commandToken - The 'install' command token
 * @returns CommandNode representing the install command
 *
 * Phase 9-3b: Extracted from Parser.parseInstallCommand
 */
export function parseInstallCommand(ctx: ParserContext, commandToken: Token) {
  const args: ASTNode[] = [];

  // Parse behavior name (identifier)
  // Phase 4: Using predicate method
  if (!ctx.checkIdentifierLike()) {
    throw new Error('Expected behavior name after "install"');
  }

  const behaviorName = ctx.advance().value;
  const prevToken = ctx.previous();
  args.push(
    createIdentifier(behaviorName, {
      start: prevToken.start,
      end: prevToken.end,
      line: prevToken.line,
      column: prevToken.column,
    })
  );

  // Check for parameter list
  if (ctx.check('(')) {
    ctx.advance(); // consume '('

    // Parse parameters (can be named or positional)
    const params: Array<{ name?: string; value: ASTNode }> = [];

    while (!ctx.isAtEnd() && !ctx.check(')')) {
      // Check if this is a named parameter (identifier followed by ':')
      const checkpoint = ctx.savePosition();
      let paramName: string | undefined;

      // Phase 4: Using predicate method
      if (ctx.checkIdentifierLike()) {
        const possibleName = ctx.peek().value;
        ctx.advance(); // consume identifier

        if (ctx.check(':')) {
          // This is a named parameter
          ctx.advance(); // consume ':'
          paramName = possibleName;
        } else {
          // Not a named parameter, rewind
          ctx.restorePosition(checkpoint);
        }
      }

      // Parse the parameter value
      const value = ctx.parseExpression();
      params.push(paramName !== undefined ? { name: paramName, value } : { value });

      // Check for comma separator
      if (ctx.check(',')) {
        ctx.advance();
      } else if (!ctx.check(')')) {
        // No comma and not at closing paren - might be end of params
        break;
      }
    }

    // Consume closing parenthesis
    if (!ctx.check(')')) {
      throw new Error('Expected ")" after behavior parameters');
    }
    ctx.advance();

    // Add parameters as an object literal node
    if (params.length > 0) {
      const paramPos = {
        start: commandToken.start,
        end: ctx.getPosition().end,
        line: commandToken.line,
        column: commandToken.column,
      };
      args.push(
        createObjectLiteral(
          params.map(param => ({
            key: param.name
              ? createIdentifier(param.name, paramPos)
              : createLiteral('_positional', '_positional', paramPos),
            value: param.value,
          })),
          paramPos
        )
      );
    }
  }

  // Phase 2 Refactoring: Use CommandNodeBuilder for consistent node construction
  return CommandNodeBuilder.from(commandToken)
    .withArgs(...args)
    .endingAt(ctx.getPosition())
    .build();
}
