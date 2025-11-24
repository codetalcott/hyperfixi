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
import type { ASTNode, CommandNode, Token } from '../../types/core';
import { CommandNodeBuilder } from '../command-node-builder';
import { TokenType } from '../tokenizer';
import { debug } from '../../utils/debug';

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

/**
 * Parse repeat command
 *
 * Syntax:
 *   - repeat for <var> in <collection> ... end
 *   - repeat in <collection> ... end (variable defaults to 'it')
 *   - repeat <n> times ... end
 *   - repeat while <condition> ... end
 *   - repeat until <condition> ... end
 *   - repeat until event <eventName> from <target> ... end
 *   - repeat forever ... end
 *
 * This command creates various types of loops with support for:
 * - Collection iteration (for/in loops)
 * - Conditional loops (while/until)
 * - Event-driven loops (until event)
 * - Fixed iteration count (times)
 * - Infinite loops (forever)
 * - Optional index tracking
 *
 * Examples:
 *   - repeat for item in items ... end
 *   - repeat 5 times ... end
 *   - repeat while count < 10 ... end
 *   - repeat until event click from <button/> ... end
 *   - repeat for item in items with index ... end
 *
 * @param ctx - Parser context providing access to parser state and methods
 * @param commandToken - The 'repeat' command token
 * @returns CommandNode representing the repeat command
 *
 * Phase 9-3b: Extracted from Parser.parseRepeatCommand
 */
export function parseRepeatCommand(
  ctx: ParserContext,
  commandToken: Token
): CommandNode {
  const args: ASTNode[] = [];
  let loopType: string = 'forever';
  let eventName: string | null = null;
  let eventTarget: ASTNode | null = null;
  let condition: ASTNode | null = null;
  let collection: ASTNode | null = null;
  let variable: string | null = null;
  let times: ASTNode | null = null;

  // Parse repeat type
  if (ctx.check('for')) {
    ctx.advance(); // consume 'for'
    loopType = 'for';

    // Parse: for <identifier> in <expression>
    const identToken = ctx.peek();
    if (identToken.type === TokenType.IDENTIFIER) {
      variable = identToken.value;
      ctx.advance();
    }

    if (ctx.check('in')) {
      ctx.advance(); // consume 'in'
      collection = ctx.parseExpression();
    }
  } else if (ctx.check('in')) {
    ctx.advance(); // consume 'in'
    loopType = 'for';
    variable = 'it';
    collection = ctx.parseExpression();
  } else if (ctx.check('while')) {
    ctx.advance(); // consume 'while'
    loopType = 'while';
    condition = ctx.parseExpression();
  } else if (ctx.check('until')) {
    ctx.advance(); // consume 'until'
    loopType = 'until';

    // Check for event-driven loop: until event <eventName> from <target>
    if (ctx.check('event')) {
      ctx.advance(); // consume 'event'
      loopType = 'until-event';

      // Parse event name (dotOrColonPath in _hyperscript)
      const eventToken = ctx.peek();
      debug.parse('📍 Parsing event name, current token:', {
        value: eventToken.value,
        type: eventToken.type,
      });
      if (eventToken.type === TokenType.IDENTIFIER) {
        eventName = eventToken.value;
        ctx.advance();
        debug.parse('✅ Got event name:', eventName, 'Next token:', ctx.peek().value);
      } else {
        throw new Error('Expected event name after "event"');
      }

      // Parse optional 'from <target>'
      debug.parse('🔍 Checking for "from", current token:', ctx.peek().value);
      if (ctx.check('from')) {
        debug.parse('✅ Found "from", advancing...');
        ctx.advance(); // consume 'from'
        debug.parse('📍 After consuming "from", current token:', ctx.peek().value);
        // Parse the target - use parsePrimary to avoid consuming too much
        // This handles "from document" or "from the document" or "from #element"
        if (ctx.check('the')) {
          debug.parse('✅ Found "the", advancing...');
          ctx.advance(); // consume 'the'
        }
        // Debug: log current token before calling parsePrimary
        const beforePrimary = ctx.peek();
        debug.parse('🔍 Before parsePrimary for event target:', {
          value: beforePrimary.value,
          type: beforePrimary.type,
          position: beforePrimary.start,
        });
        eventTarget = ctx.parsePrimary();
        debug.parse('✅ After parsePrimary, eventTarget:', eventTarget);
      } else {
        debug.parse('❌ No "from" found, skipping target parsing');
      }
    } else {
      // Regular until with condition
      condition = ctx.parseExpression();
    }
  } else if (ctx.check('forever')) {
    ctx.advance(); // consume 'forever'
    loopType = 'forever';
  } else {
    // Parse: repeat <n> times
    times = ctx.parseExpression();
    if (ctx.check('times')) {
      ctx.advance(); // consume 'times'
      loopType = 'times';
    }
  }

  // Parse optional index variable
  // Supports both "index" and "with index" syntax
  let indexVariable: string | null = null;
  if (ctx.check('with')) {
    // Peek ahead to verify this is "with index" pattern
    const nextToken =
      ctx.current + 1 < ctx.tokens.length ? ctx.tokens[ctx.current + 1] : null;
    if (nextToken && nextToken.value.toLowerCase() === 'index') {
      ctx.advance(); // consume 'with'
      ctx.advance(); // consume 'index'
      indexVariable = 'index'; // default variable name
    }
    // Otherwise leave 'with' alone - might be for something else (like transition timing)
  } else if (ctx.check('index')) {
    ctx.advance(); // consume 'index'
    const indexToken = ctx.peek();
    if (indexToken.type === TokenType.IDENTIFIER) {
      indexVariable = indexToken.value;
      ctx.advance();
    } else {
      indexVariable = 'index'; // default if no variable name provided
    }
  }

  // Parse command block until 'end'
  // Use parseCommandList helper to handle the command sequence
  const commands: ASTNode[] = ctx.parseCommandListUntilEnd();

  // Build args array based on loop type
  args.push({
    type: 'identifier',
    name: loopType,
    start: commandToken.start,
    end: commandToken.end,
    line: commandToken.line,
    column: commandToken.column,
  } as IdentifierNode);

  if (variable) {
    args.push({
      type: 'string',
      value: variable,
      start: commandToken.start,
      end: commandToken.end,
      line: commandToken.line,
      column: commandToken.column,
    } as any);
  }

  if (collection) args.push(collection);
  if (condition) args.push(condition);
  if (times) args.push(times);

  if (eventName) {
    args.push({
      type: 'string',
      value: eventName,
      start: commandToken.start,
      end: commandToken.end,
      line: commandToken.line,
      column: commandToken.column,
    } as any);
  }

  if (eventTarget) args.push(eventTarget);

  if (indexVariable) {
    args.push({
      type: 'string',
      value: indexVariable,
      start: commandToken.start,
      end: commandToken.end,
      line: commandToken.line,
      column: commandToken.column,
    } as any);
  }

  // Add commands as a block
  args.push({
    type: 'block',
    commands: commands,
    start: commandToken.start,
    end: commandToken.end || 0,
    line: commandToken.line,
    column: commandToken.column,
  } as any);

  // Phase 2 Refactoring: Use CommandNodeBuilder for consistent node construction
  return CommandNodeBuilder.from(commandToken)
    .withArgs(...args)
    .endingAt(ctx.getPosition())
    .build();
}
