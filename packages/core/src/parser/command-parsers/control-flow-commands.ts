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
import { debug } from '../../utils/debug';
import { KEYWORDS } from '../parser-constants';
// Phase 4: Import token predicates for direct token checks
import { isIdentifierLike, isEvent } from '../token-predicates';

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
  if (ctx.check(KEYWORDS.THE)) {
    const theToken = ctx.advance();
    args.push({
      type: 'identifier',
      name: KEYWORDS.THE,
      start: theToken.start,
      end: theToken.end,
      line: theToken.line,
      column: theToken.column,
    } as IdentifierNode);

    // Check if followed by "event"
    if (ctx.check(KEYWORDS.EVENT)) {
      const eventToken = ctx.advance();
      args.push({
        type: 'identifier',
        name: KEYWORDS.EVENT,
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
export function parseRepeatCommand(ctx: ParserContext, commandToken: Token): CommandNode {
  const args: ASTNode[] = [];
  let loopType: string = 'forever';
  let eventName: string | null = null;
  let eventTarget: ASTNode | null = null;
  let condition: ASTNode | null = null;
  let collection: ASTNode | null = null;
  let variable: string | null = null;
  let times: ASTNode | null = null;

  // Parse repeat type
  if (ctx.check(KEYWORDS.FOR)) {
    ctx.advance(); // consume 'for'
    loopType = KEYWORDS.FOR;

    // Parse: for <identifier> in <expression>
    // Phase 4: Using predicate for direct token check
    const identToken = ctx.peek();
    if (isIdentifierLike(identToken)) {
      variable = identToken.value;
      ctx.advance();
    }

    if (ctx.check(KEYWORDS.IN)) {
      ctx.advance(); // consume 'in'
      collection = ctx.parseExpression();
    }
  } else if (ctx.check(KEYWORDS.IN)) {
    ctx.advance(); // consume 'in'
    loopType = KEYWORDS.FOR;
    variable = 'it';
    collection = ctx.parseExpression();
  } else if (ctx.check(KEYWORDS.WHILE)) {
    ctx.advance(); // consume 'while'
    loopType = KEYWORDS.WHILE;
    condition = ctx.parseExpression();
  } else if (ctx.check(KEYWORDS.UNTIL)) {
    ctx.advance(); // consume 'until'
    loopType = KEYWORDS.UNTIL;

    // Check for event-driven loop: until event <eventName> from <target>
    if (ctx.check(KEYWORDS.EVENT)) {
      ctx.advance(); // consume 'event'
      loopType = 'until-event';

      // Parse event name (dotOrColonPath in _hyperscript)
      const eventToken = ctx.peek();
      debug.parse('📍 Parsing event name, current token:', {
        value: eventToken.value,
        kind: eventToken.kind,
      });
      // Accept both IDENTIFIER and EVENT token types for the event name
      // (tokenizer marks known DOM events like 'mouseup', 'click' as EVENT type)
      // Phase 4: Using predicates for direct token checks
      if (isIdentifierLike(eventToken) || isEvent(eventToken)) {
        eventName = eventToken.value;
        ctx.advance();
        debug.parse('✅ Got event name:', eventName, 'Next token:', ctx.peek().value);
      } else {
        throw new Error('Expected event name after "event"');
      }

      // Parse optional 'from <target>'
      debug.parse('🔍 Checking for "from", current token:', ctx.peek().value);
      if (ctx.check(KEYWORDS.FROM)) {
        debug.parse('✅ Found "from", advancing...');
        ctx.advance(); // consume 'from'
        debug.parse('📍 After consuming "from", current token:', ctx.peek().value);
        // Parse the target - use parsePrimary to avoid consuming too much
        // This handles "from document" or "from the document" or "from #element"
        if (ctx.check(KEYWORDS.THE)) {
          debug.parse('✅ Found "the", advancing...');
          ctx.advance(); // consume 'the'
        }
        // Debug: log current token before calling parsePrimary
        const beforePrimary = ctx.peek();
        debug.parse('🔍 Before parsePrimary for event target:', {
          value: beforePrimary.value,
          kind: beforePrimary.kind,
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
  } else if (ctx.check(KEYWORDS.FOREVER)) {
    ctx.advance(); // consume 'forever'
    loopType = KEYWORDS.FOREVER;
  } else {
    // Parse: repeat <n> times
    times = ctx.parseExpression();
    if (ctx.check(KEYWORDS.TIMES)) {
      ctx.advance(); // consume 'times'
      loopType = KEYWORDS.TIMES;
    }
  }

  // Parse optional index variable
  // Supports both "index" and "with index" syntax
  let indexVariable: string | null = null;
  if (ctx.check(KEYWORDS.WITH)) {
    // Peek ahead to verify this is "with index" pattern
    const nextToken = ctx.current + 1 < ctx.tokens.length ? ctx.tokens[ctx.current + 1] : null;
    if (nextToken && nextToken.value.toLowerCase() === KEYWORDS.INDEX) {
      ctx.advance(); // consume 'with'
      ctx.advance(); // consume 'index'
      indexVariable = KEYWORDS.INDEX; // default variable name
    }
    // Otherwise leave 'with' alone - might be for something else (like transition timing)
  } else if (ctx.check(KEYWORDS.INDEX)) {
    ctx.advance(); // consume 'index'
    const indexToken = ctx.peek();
    // Phase 4: Using predicate for direct token check
    if (isIdentifierLike(indexToken)) {
      indexVariable = indexToken.value;
      ctx.advance();
    } else {
      indexVariable = KEYWORDS.INDEX; // default if no variable name provided
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
export function parseIfCommand(ctx: ParserContext, commandToken: Token): CommandNode {
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
    if (token.value === KEYWORDS.THEN) {
      hasThen = true;
      break;
    }
    // Stop at structural boundaries
    if (
      token.value === KEYWORDS.END ||
      token.value === KEYWORDS.BEHAVIOR ||
      token.value === KEYWORDS.DEF ||
      token.value === KEYWORDS.ON
    ) {
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
        tokenValue === KEYWORDS.BEHAVIOR ||
        tokenValue === KEYWORDS.DEF ||
        tokenValue === KEYWORDS.ON
      ) {
        break;
      }

      // If we see 'else' or 'end', this must be multi-line form even on same line
      // e.g., "if x > 3 set y to 1 else set y to 2 end" requires multi-line parsing
      if (tokenValue === KEYWORDS.ELSE || tokenValue === KEYWORDS.END) {
        hasImplicitMultiLineEnd = true;
        break;
      }

      // When we find the FIRST command, check its line position
      // Phase 4: Using predicate method
      if (ctx.checkIsCommand() || ctx.isCommand(tokenValue)) {
        // If first command is on a DIFFERENT line than if, it's multi-line
        // If first command is on the SAME line as if, it's single-line
        if (token.line !== undefined && token.line !== ifStatementLine) {
          hasImplicitMultiLineEnd = true;
          break;
        }
        // Don't break - continue scanning to find 'else' or 'end' on same line
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

    // Phase 4: Using predicate method
    while (
      !ctx.isAtEnd() &&
      !ctx.checkIsCommand() &&
      !ctx.isCommand(ctx.peek().value) &&
      !ctx.check(KEYWORDS.THEN) &&
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
    while (!ctx.isAtEnd() && !ctx.check(KEYWORDS.ELSE) && !ctx.check(KEYWORDS.END)) {
      // Phase 4: Using predicate method
      if (ctx.checkIsCommand() || ctx.isCommand(ctx.peek().value)) {
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
    // Track if we consumed 'else if' (nested if handles its own 'end')
    let consumedElseIf = false;

    if (ctx.check(KEYWORDS.ELSE)) {
      ctx.advance(); // consume 'else'

      // Check for 'else if' continuation (if is a KEYWORD token)
      // Phase 4: Simplified check - ctx.check() already handles the KEYWORD case
      if (ctx.check(KEYWORDS.IF)) {
        // This is 'else if' - recursively parse as a nested if command
        // The nested if will consume its own 'end', which serves as the end for the entire chain
        const ifToken = ctx.peek();
        ctx.advance(); // consume 'if'
        const elseIfCommand = parseIfCommand(ctx, ifToken);

        // Add the else-if as the else block (it's a nested if that shares our 'end')
        args.push({
          type: 'block',
          commands: [elseIfCommand],
          start: ifToken.start,
          end: ctx.getPosition().end,
          line: ifToken.line,
          column: ifToken.column,
        } as any);

        consumedElseIf = true;
      } else {
        // Regular else block
        const elseCommands: ASTNode[] = [];
        while (!ctx.isAtEnd() && !ctx.check(KEYWORDS.END)) {
          // Phase 4: Using predicate method
          if (ctx.checkIsCommand() || ctx.isCommand(ctx.peek().value)) {
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
    }

    // Consume 'end' for multi-line form
    // Skip if we consumed 'else if' because the nested if already consumed 'end'
    if (!consumedElseIf) {
      ctx.consume(KEYWORDS.END, "Expected 'end' after if block");
    }
  } else {
    // Single-line form: if condition command
    // Parse exactly one command (no 'end' expected)
    // Phase 4: Using predicate method
    if (ctx.checkIsCommand() || ctx.isCommand(ctx.peek().value)) {
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

/**
 * Parse for command (standalone for-in loop)
 *
 * Syntax:
 *   - for <var> in <collection> ... end
 *   - for each <var> in <collection> ... end
 *
 * This command creates a for-in loop, which is equivalent to `repeat for <var> in <collection>`.
 * The standalone `for` syntax is more natural for Python users and matches _hyperscript.
 *
 * Examples:
 *   - for item in items log item end
 *   - for each entry in :history put entry into #list end
 *   - for user in users
 *       log user's name
 *     end
 *
 * @param ctx - Parser context providing access to parser state and methods
 * @param commandToken - The 'for' command token
 * @returns CommandNode representing the for command (uses 'repeat' internally for execution)
 *
 * Natural English support: "for each item in the list"
 */
export function parseForCommand(ctx: ParserContext, commandToken: Token): CommandNode {
  const args: ASTNode[] = [];
  let variable: string | null = null;
  let collection: ASTNode | null = null;

  // Support optional 'each' keyword: "for each item in items"
  if (ctx.check(KEYWORDS.EACH)) {
    ctx.advance(); // consume 'each'
  }

  // Parse: <identifier> in <expression>
  // Phase 4: Using predicate for direct token check
  const identToken = ctx.peek();
  if (isIdentifierLike(identToken)) {
    variable = identToken.value;
    ctx.advance();
  } else {
    throw new Error('Expected variable name after "for"');
  }

  // Expect 'in' keyword
  if (!ctx.check(KEYWORDS.IN)) {
    throw new Error('Expected "in" after variable name in for loop');
  }
  ctx.advance(); // consume 'in'

  // Parse collection expression
  collection = ctx.parseExpression();
  if (!collection) {
    throw new Error('Expected collection expression after "in"');
  }

  // Parse optional index variable (same as repeat)
  let indexVariable: string | null = null;
  if (ctx.check(KEYWORDS.WITH)) {
    const nextToken = ctx.current + 1 < ctx.tokens.length ? ctx.tokens[ctx.current + 1] : null;
    if (nextToken && nextToken.value.toLowerCase() === KEYWORDS.INDEX) {
      ctx.advance(); // consume 'with'
      ctx.advance(); // consume 'index'
      indexVariable = KEYWORDS.INDEX;
    }
  } else if (ctx.check(KEYWORDS.INDEX)) {
    ctx.advance(); // consume 'index'
    const indexToken = ctx.peek();
    // Phase 4: Using predicate for direct token check
    if (isIdentifierLike(indexToken)) {
      indexVariable = indexToken.value;
      ctx.advance();
    } else {
      indexVariable = KEYWORDS.INDEX;
    }
  }

  // Parse command block until 'end'
  const commands: ASTNode[] = ctx.parseCommandListUntilEnd();

  // Build args array to match repeat command's 'for' loop type structure:
  // args[0] = loop type identifier ('for')
  // args[1] = variable name (string)
  // args[2] = collection expression
  // args[3] = index variable (optional)
  // args[last] = commands block

  args.push({
    type: 'identifier',
    name: 'for',
    start: commandToken.start,
    end: commandToken.end,
    line: commandToken.line,
    column: commandToken.column,
  } as IdentifierNode);

  args.push({
    type: 'string',
    value: variable,
    start: commandToken.start,
    end: commandToken.end,
    line: commandToken.line,
    column: commandToken.column,
  } as any);

  args.push(collection);

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

  // Create command node with 'repeat' as the command name
  // This allows reuse of the existing RepeatCommand implementation
  return CommandNodeBuilder.from({
    ...commandToken,
    value: 'repeat', // Use 'repeat' so RepeatCommand handles execution
  })
    .withArgs(...args)
    .endingAt(ctx.getPosition())
    .build();
}
