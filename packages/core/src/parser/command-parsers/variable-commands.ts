/**
 * Variable Command Parsers
 *
 * Pure function implementations of variable assignment command parsers.
 * These functions use ParserContext for dependency injection, enabling
 * clean separation from the Parser class.
 *
 * Phase 9-3b: Command Extraction (Batch 2)
 * @module parser/command-parsers/variable-commands
 */

import type { ParserContext, IdentifierNode } from '../parser-types';
import type { ASTNode, ExpressionNode, Token } from '../../types/core';
import { KEYWORDS } from '../parser-constants';
// Phase 4: TokenType import removed - using value-based checks instead

/**
 * Parse set command
 *
 * Syntax:
 *   - set <variable> to <value>
 *   - set :localVar to <value>
 *   - set ::globalVar to <value>
 *   - set global <variable> to <value>
 *   - set local <variable> to <value>
 *   - set the <property> of <target> to <value>
 *
 * This command assigns values to variables with support for:
 * - Local scope (colon-variable or local variable)
 * - Global scope (double-colon-variable or global variable)
 * - Property assignment (the X of Y)
 * - Complex expression targets and values
 *
 * Examples:
 *   - set count to 0
 *   - set :localVar to "hello"
 *   - set ::globalConfig to { enabled: true }
 *   - set the textContent of #counter to count + 1
 *
 * @param ctx - Parser context providing access to parser state and methods
 * @param identifierNode - The 'set' identifier node
 * @returns CommandNode representing the set command, or null on error
 *
 * Phase 9-3b: Extracted from Parser.parseSetCommand
 */
export function parseSetCommand(
  ctx: ParserContext,
  identifierNode: IdentifierNode
) {
  const startPosition = ctx.current;
  let targetExpression: ASTNode | null = null;

  try {
    // Check for global variable prefix double-colon or local prefix colon FIRST
    if (ctx.check(':')) {
      ctx.advance();

      if (ctx.check(':')) {
        // This is double-colon-variable (explicit global scope)
        ctx.advance();
        const varToken = ctx.advance();
        targetExpression = {
          type: 'identifier',
          name: varToken.value,
          scope: 'global',
          start: varToken.start - 2,
          end: varToken.end,
        } as any;
      } else {
        // This is colon-variable (local scope)
        const varToken = ctx.advance();
        targetExpression = {
          type: 'identifier',
          name: varToken.value,
          scope: 'local',
          start: varToken.start - 1,
          end: varToken.end,
        } as any;
      }
    }
    // Check for scope modifiers (global/local) first
    else if (ctx.check(KEYWORDS.GLOBAL) || ctx.check(KEYWORDS.LOCAL)) {
      const scopeToken = ctx.advance();
      const variableToken = ctx.advance();

      targetExpression = {
        type: 'identifier',
        name: variableToken.value,
        scope: scopeToken.value,
        start: scopeToken.start,
        end: variableToken.end,
      } as any;
    } else if (ctx.check(KEYWORDS.THE)) {
      const thePosition = ctx.current;
      ctx.advance();

      const nextToken = ctx.peek();
      const tokenAfterNext =
        ctx.current + 1 < ctx.tokens.length ? ctx.tokens[ctx.current + 1] : null;

      if (nextToken && tokenAfterNext && tokenAfterNext.value === KEYWORDS.OF) {
        const propertyToken = ctx.advance();

        if (ctx.check(KEYWORDS.OF)) {
          ctx.advance();

          const targetToken = ctx.advance();

          // Phase 4: Using value-based check instead of TokenType
          // ID selectors start with '#', class selectors with '.', CSS selectors in '<>'
          const isIdSelector = targetToken.value.startsWith('#');
          targetExpression = {
            type: 'propertyOfExpression',
            property: {
              type: 'identifier',
              name: propertyToken.value,
              start: propertyToken.start,
              end: propertyToken.end,
            },
            target: {
              type: isIdSelector ? 'idSelector' : 'cssSelector',
              value: targetToken.value,
              start: targetToken.start,
              end: targetToken.end,
            },
            start: startPosition,
            end: ctx.current,
          };
        } else {
          ctx.current = startPosition;
          targetExpression = null;
        }
      } else if (nextToken && tokenAfterNext && tokenAfterNext.value === KEYWORDS.TO) {
        // Handle "the X to Y" syntax - "the X" is the variable name, strip the article
        // e.g., "set the dragHandle to me" -> variable name is "dragHandle"
        const variableToken = ctx.advance();
        targetExpression = {
          type: 'identifier',
          name: variableToken.value,
          start: variableToken.start,
          end: variableToken.end,
        } as any;
      } else {
        ctx.current = thePosition;
        targetExpression = null;
      }
    } else {
      targetExpression = ctx.parseExpression();
    }
  } catch (error) {
    ctx.current = startPosition;
    targetExpression = null;
  }

  const targetTokens: ASTNode[] = [];
  if (!targetExpression) {
    if (ctx.match(':')) {
      const varToken = ctx.advance();
      targetExpression = {
        type: 'identifier',
        name: varToken.value,
        scope: 'local',
        start: varToken.start,
        end: varToken.end,
      } as any;
    } else {
      while (
        !ctx.isAtEnd() &&
        !ctx.check(KEYWORDS.TO) &&
        !ctx.check(KEYWORDS.THEN) &&
        !ctx.check(KEYWORDS.AND) &&
        !ctx.check(KEYWORDS.ELSE) &&
        !ctx.check(KEYWORDS.END)
      ) {
        const token = ctx.parsePrimary();
        targetTokens.push(token);
      }
    }

    if (targetTokens.length > 0) {
      if (
        targetTokens.length >= 4 &&
        (targetTokens[0] as any).value === KEYWORDS.THE &&
        (targetTokens[2] as any).value === KEYWORDS.OF
      ) {
        targetExpression = {
          type: 'propertyOfExpression',
          property: {
            type: 'identifier',
            name: (targetTokens[1] as any).value || (targetTokens[1] as any).name,
            start: (targetTokens[1] as any).start,
            end: (targetTokens[1] as any).end,
          },
          target: {
            type: (targetTokens[3] as any).type === 'idSelector' ? 'idSelector' : 'cssSelector',
            value: (targetTokens[3] as any).value || (targetTokens[3] as any).name,
            start: (targetTokens[3] as any).start,
            end: (targetTokens[3] as any).end,
          },
          start: (targetTokens[0] as any).start,
          end: (targetTokens[3] as any).end,
        };
      } else if (targetTokens.length === 1) {
        targetExpression = targetTokens[0];
      } else {
        targetExpression = null;
      }
    }
  }

  if (!ctx.check(KEYWORDS.TO)) {
    const found = ctx.isAtEnd() ? 'end of input' : ctx.peek().value;
    throw new Error(`Expected 'to' in set command, found: ${found}`);
  }

  ctx.advance();

  const valueTokens: ASTNode[] = [];
  const expr = ctx.parseExpression();
  if (expr) {
    valueTokens.push(expr);
  } else {
    const primary = ctx.parsePrimary();
    if (primary) {
      valueTokens.push(primary);
    }
  }

  const finalArgs: ASTNode[] = [];

  if (targetExpression) {
    finalArgs.push(targetExpression);
  } else if (targetTokens.length > 0) {
    finalArgs.push(...targetTokens);
  }

  finalArgs.push(ctx.createIdentifier(KEYWORDS.TO));

  if (valueTokens.length > 0) {
    finalArgs.push(...valueTokens);
  }

  const result = {
    type: 'command' as const,
    name: identifierNode.name,
    args: finalArgs as ExpressionNode[],
    isBlocking: false,
    start: identifierNode.start || 0,
    end: ctx.getPosition().end,
    line: identifierNode.line || 1,
    column: identifierNode.column || 1,
  };

  return result;
}

/**
 * Parse increment or decrement command
 *
 * Syntax:
 *   - increment <variable>
 *   - increment <variable> by <amount>
 *   - increment global <variable>
 *   - increment global <variable> by <amount>
 *   - decrement <variable>
 *   - decrement <variable> by <amount>
 *   - decrement global <variable>
 *   - decrement global <variable> by <amount>
 *
 * This command increments or decrements a variable's value with support for:
 * - Global scope modifier
 * - Custom increment/decrement amount via 'by' keyword
 * - Default increment/decrement of 1
 *
 * Examples:
 *   - increment count
 *   - increment count by 5
 *   - increment global counter
 *   - decrement value by 2
 *
 * @param ctx - Parser context providing access to parser state and methods
 * @param commandToken - The 'increment' or 'decrement' command token
 * @returns CommandNode representing the increment/decrement command
 *
 * Phase 9-3b: Extracted from Parser.parseCommand (special handling section)
 */
export function parseIncrementDecrementCommand(
  ctx: ParserContext,
  commandToken: Token
) {
  const args: ASTNode[] = [];
  const commandName = commandToken.value;

  // Check for 'global' keyword first
  let hasGlobal = false;
  if (ctx.check(KEYWORDS.GLOBAL)) {
    hasGlobal = true;
    ctx.advance(); // consume 'global'
  }

  // Parse the target (variable name or element reference)
  const target = ctx.parseExpression();
  if (target) {
    args.push(target);
  }

  // Check for 'by' keyword followed by amount
  if (ctx.check(KEYWORDS.BY)) {
    ctx.advance(); // consume 'by'
    const amount = ctx.parseExpression();
    if (amount) {
      args.push(amount);
    }
  }

  // Add global scope indicator if present
  if (hasGlobal) {
    args.push({
      type: 'literal',
      value: KEYWORDS.GLOBAL,
      dataType: 'string',
      start: commandToken.start,
      end: commandToken.end,
      line: commandToken.line,
      column: commandToken.column,
      raw: 'global',
    } as any);
  }

  return {
    type: 'command' as const,
    name: commandName,
    args: args as ExpressionNode[],
    isBlocking: false,
    start: commandToken.start,
    end: ctx.previous().end,
    line: commandToken.line,
    column: commandToken.column,
  };
}
