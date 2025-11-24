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

/**
 * Parse if command
 *
 * Syntax:
 *   - if <condition> then ... end (multi-line with explicit 'then')
 *   - if <condition> ... end (multi-line implicit, commands on different lines)
 *   - if <condition> <command> (single-line, command on same line)
 *   - if <condition> then ... else ... end (with else clause)
 *
 * This command creates conditional execution with support for:
 * - Single-line and multi-line forms
 * - Explicit 'then' keyword or implicit multi-line detection
 * - Optional 'else' clause
 * - Complex condition expressions
 * - Automatic form detection via line position analysis
 *
 * Examples:
 *   - if count > 10 then log 'high' end
 *   - if isActive log 'active'
 *   - if no dragHandle then set x to y else set x to z end
 *
 * @param ctx - Parser context providing access to parser state and methods
 * @param commandToken - The 'if' command token
 * @returns CommandNode representing the if command
 *
 * Phase 9-3b: Extracted from Parser.parseIfCommand
 */
export function parseIfCommand(
  ctx: ParserContext,
  commandToken: Token
): CommandNode {
  const args: ASTNode[] = [];

  // Check if this is multi-line:
  // 1. Explicit 'then' keyword: if <condition> then ... end
  // 2. Implicit multi-line (no 'then' but multiple commands on separate lines): if <condition>\n  <cmd>\n  <cmd>\n end
  // 3. Single-line (no 'then', single command on same line): if <condition> <command>

  // Look ahead to find 'then' keyword (not just check current token)
  let hasThen = false;
  const savedPosForThen = ctx.current;
  const maxThenLookahead = 500; // Increased to handle large conditional expressions
  for (let i = 0; i < maxThenLookahead && !ctx.isAtEnd(); i++) {
    const token = ctx.peek();
    if (token.value === 'then') {
      hasThen = true;
      break;
    }
    // Stop at structural boundaries
    if (token.value === 'end' || token.value === 'behavior' || token.value === 'def' || token.value === 'on') {
      break;
    }
    ctx.advance();
  }
  ctx.current = savedPosForThen;

  // Look ahead to check for multi-line form without 'then'
  // We need to distinguish:
  //   if no dragHandle set x to y    (single-line, command on SAME line as if)
  //   if no dragHandle               (multi-line, command on DIFFERENT line)
  //     log 'test'
  //   end
  // Key insight: Only check the FIRST command's line position
  let hasImplicitMultiLineEnd = false;
  if (!hasThen) {
    const savedPosition = ctx.current;
    const ifStatementLine = commandToken.line; // Line where 'if' keyword appears
    const maxLookahead = 100;

    // Scan forward to find the FIRST command after the condition
    while (!ctx.isAtEnd() && ctx.current - savedPosition < maxLookahead) {
      const token = ctx.peek();
      const tokenValue = token.value?.toLowerCase();

      // Stop at structural boundaries
      if (
        tokenValue === 'behavior' ||
        tokenValue === 'def' ||
        tokenValue === 'on' ||
        tokenValue === 'end'
      ) {
        break;
      }

      // When we find the FIRST command, check its line position
      if (ctx.checkTokenType(TokenType.COMMAND) || ctx.isCommand(tokenValue)) {
        // If first command is on a DIFFERENT line than if, it's multi-line
        // If first command is on the SAME line as if, it's single-line
        if (token.line !== undefined && token.line !== ifStatementLine) {
          hasImplicitMultiLineEnd = true;
        }
        // Found first command, stop scanning
        break;
      }

      ctx.advance();
    }

    ctx.current = savedPosition;
  }

  const isMultiLine = hasThen || hasImplicitMultiLineEnd;

  let condition: ASTNode;
  if (isMultiLine) {
    // Multi-line form: parse condition using standard expression parser
    // This works for both explicit (with 'then') and implicit (without 'then') forms
    // because parseExpression naturally stops at command boundaries
    condition = ctx.parseExpression();
  } else {
    // Single-line form: parse condition carefully, stopping at COMMAND tokens
    // Parse tokens until we hit a command token (which will be the action)
    const conditionTokens: ASTNode[] = [];
    const maxIterations = 20; // Safety limit to prevent infinite loops
    let iterations = 0;

    while (
      !ctx.isAtEnd() &&
      !ctx.checkTokenType(TokenType.COMMAND) &&
      !ctx.isCommand(ctx.peek().value) &&
      !ctx.check('then') &&
      iterations < maxIterations
    ) {
      const beforePos = ctx.current;
      // Use parseLogicalAnd() to handle binary operators like 'is a' and unary operators like 'not'
      // This is one level below parseLogicalOr() to avoid consuming 'or' which might be part of pattern syntax
      conditionTokens.push(ctx.parseLogicalAnd());

      // Safety check: ensure we're making progress
      if (ctx.current === beforePos) {
        // parseUnary didn't advance - manually advance to prevent infinite loop
        ctx.advance();
      }
      iterations++;
    }

    // Combine condition tokens into a single expression
    if (conditionTokens.length === 0) {
      throw new Error('Expected condition after if/unless');
    } else if (conditionTokens.length === 1) {
      condition = conditionTokens[0];
    } else {
      // Multiple tokens - create a compound expression
      condition = {
        type: 'expression',
        tokens: conditionTokens,
        start: conditionTokens[0].start,
        end: conditionTokens[conditionTokens.length - 1].end,
        line: commandToken.line,
        column: commandToken.column,
      } as any;
    }
  }

  args.push(condition);

  if (isMultiLine) {
    // Multi-line form: if condition then ... end (or if condition ... end)
    if (hasThen) {
      ctx.advance(); // consume 'then' if present
    }

    // Parse command block until 'else' or 'end'
    const thenCommands: ASTNode[] = [];
    while (!ctx.isAtEnd() && !ctx.check('else') && !ctx.check('end')) {
      if (ctx.checkTokenType(TokenType.COMMAND) || ctx.isCommand(ctx.peek().value)) {
        ctx.advance(); // consume command token
        const cmd = ctx.parseCommand();
        if (cmd) {
          thenCommands.push(cmd);
        }
      } else {
        break;
      }
    }

    // Validate: error if then block is empty and we're at end of input (incomplete statement)
    if (thenCommands.length === 0 && ctx.isAtEnd()) {
      throw new Error("Expected command after 'then' in if statement - incomplete conditional");
    }

    // Add then block
    args.push({
      type: 'block',
      commands: thenCommands,
      start: commandToken.start,
      end: ctx.getPosition().end,
      line: commandToken.line,
      column: commandToken.column,
    } as any);

    // Check for optional 'else' clause
    if (ctx.check('else')) {
      ctx.advance(); // consume 'else'

      const elseCommands: ASTNode[] = [];
      while (!ctx.isAtEnd() && !ctx.check('end')) {
        if (ctx.checkTokenType(TokenType.COMMAND) || ctx.isCommand(ctx.peek().value)) {
          ctx.advance(); // consume command token
          const cmd = ctx.parseCommand();
          if (cmd) {
            elseCommands.push(cmd);
          }
        } else {
          break;
        }
      }

      // Add else block
      args.push({
        type: 'block',
        commands: elseCommands,
        start: commandToken.start,
        end: ctx.getPosition().end,
        line: commandToken.line,
        column: commandToken.column,
      } as any);
    }

    // Consume 'end' for multi-line form
    ctx.consume('end', "Expected 'end' after if block");
  } else {
    // Single-line form: if condition command
    // Parse exactly one command (no 'end' expected)
    if (ctx.checkTokenType(TokenType.COMMAND) || ctx.isCommand(ctx.peek().value)) {
      ctx.advance(); // consume command token
      const singleCommand = ctx.parseCommand();

      // Wrap single command in a block for consistency
      args.push({
        type: 'block',
        commands: [singleCommand],
        start: commandToken.start,
        end: ctx.getPosition().end,
        line: commandToken.line,
        column: commandToken.column,
      } as any);
    } else {
      throw new Error('Expected command after if condition in single-line form');
    }
  }

  // Phase 2 Refactoring: Use CommandNodeBuilder for consistent node construction
  return CommandNodeBuilder.from(commandToken)
    .withArgs(...args)
    .endingAt(ctx.getPosition())
    .build();
}
