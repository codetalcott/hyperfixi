/**
 * Control Flow Command Parsers
 *
 * Pure function implementations of control-flow-related command parsers.
 * These functions use ParserContext for dependency injection, enabling
 * clean separation from the Parser class.
 *
 * @module parser/command-parsers/control-flow-commands
 */

import type { ParserContext, IdentifierNode } from '../parser-types';
import type { ASTNode, CommandNode, ExpressionNode, Token } from '../../types/core';
import { CommandNodeBuilder } from '../command-node-builder';
import { createBlock, createStringLiteral } from '../helpers/ast-helpers';
import { debug } from '../../utils/debug';
import { KEYWORDS } from '../parser-constants';
import { consumeOptionalKeyword } from '../helpers/parsing-helpers';
import { isIdentifierLike, isEvent, isComment } from '../token-predicates';

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
        if (consumeOptionalKeyword(ctx, KEYWORDS.THE)) {
          debug.parse('✅ Found "the", advancing...');
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
    const nextToken = ctx.peekAt(1);
    if (nextToken && nextToken.value.toLowerCase() === KEYWORDS.INDEX) {
      ctx.advance(); // consume 'with'
      ctx.advance(); // consume 'index'
      indexVariable = KEYWORDS.INDEX; // default variable name
    }
    // Otherwise leave 'with' alone - might be for something else (like transition timing)
  } else if (ctx.check(KEYWORDS.INDEX)) {
    ctx.advance(); // consume 'index'
    const indexToken = ctx.peek();
    if (isIdentifierLike(indexToken)) {
      indexVariable = indexToken.value;
      ctx.advance();
    } else {
      indexVariable = KEYWORDS.INDEX; // default if no variable name provided
    }
  }

  // Parse command block.
  // - For bare `repeat` (loopType === 'forever') the body can terminate on
  //   `end`, `else`, `until`, or `while` — the last two introduce a
  //   bottom-tested loop (upstream `_hyperscript` controlflow.js:268-281).
  // - For any leading type-keyword form, only `end` or `else` are allowed.
  let commands: ASTNode[];
  let elseCommands: ASTNode[] | null = null;
  let bottomTested = false;

  if (loopType === KEYWORDS.FOREVER) {
    const result = ctx.parseRepeatBody();
    commands = result.commands;

    if (result.terminator === 'else') {
      ctx.advance(); // consume 'else'
      elseCommands = ctx.parseCommandListUntilEnd(); // consumes 'end'
    } else if (result.terminator === 'until' || result.terminator === 'while') {
      // Bottom-tested loop: body always runs once before condition checked.
      bottomTested = true;
      loopType = result.terminator; // 'until' or 'while'
      ctx.advance(); // consume 'until'/'while'
      condition = ctx.parseExpression();
      if (!ctx.check('end')) {
        throw new Error('Expected "end" to close repeat block');
      }
      ctx.advance(); // consume 'end'
    }
    // else: terminator === 'end', already consumed by parseRepeatBody
  } else {
    const result = ctx.parseCommandListUntilEndOrElse();
    commands = result.commands;
    if (result.hasElse) {
      ctx.advance(); // consume 'else'
      elseCommands = ctx.parseCommandListUntilEnd(); // consumes 'end'
    }
  }

  // Build args array based on loop type
  args.push({
    type: 'identifier',
    name: loopType,
    start: commandToken.start,
    end: commandToken.end,
    line: commandToken.line,
    column: commandToken.column,
  } as IdentifierNode);

  const pos = {
    start: commandToken.start,
    end: commandToken.end,
    line: commandToken.line,
    column: commandToken.column,
  };

  if (variable) {
    args.push(createStringLiteral(variable, pos));
  }

  if (collection) args.push(collection);
  if (condition) args.push(condition);
  if (times) args.push(times);

  if (eventName) {
    args.push(createStringLiteral(eventName, pos));
  }

  if (eventTarget) args.push(eventTarget);

  if (indexVariable) {
    args.push(createStringLiteral(indexVariable, pos));
  }

  // Add commands as a block
  args.push(createBlock(commands, { ...pos, end: pos.end || 0 }));

  // Optional else branch (executed when loop completes with 0 iterations)
  if (elseCommands !== null) {
    args.push(createBlock(elseCommands, { ...pos, end: pos.end || 0 }));
  }

  const builder = CommandNodeBuilder.from(commandToken).withArgs(...args);
  if (bottomTested) {
    builder.withModifier('bottomTested', {
      type: 'literal',
      value: true,
      ...pos,
    } as unknown as ExpressionNode);
  }
  return builder.endingAt(ctx.getPosition()).build();
}

/**
 * Parse the command list of one `if`/`unless` branch.
 *
 * `then`, `and` and `,` are command SEPARATORS, not block terminators — the same
 * rule the enclosing sequence loops use (parser.ts:3181, :2867) and the canonical
 * body loop uses (parser.ts:1130), and the same rule upstream applies uniformly
 * via its single recursive `parseCommandList`. Only `end` — and `else`, for the
 * then-branch — closes the block.
 *
 * Leaving a separator in the stream is what made a conditional body run
 * UNCONDITIONALLY: the loop broke at the body's `then`, `consume('end')` failed
 * (non-throwing, so `ok` stayed true), and the enclosing sequence loop — which
 * does consume `then` — picked up the rest of the body as SIBLINGS of the `if`.
 *
 * Deliberately NOT `ctx.parseCommandListUntilTerminator`: that helper swallows
 * errors raised while parsing body commands (parser.ts:1084-1105), including the
 * unclosed-paren errors `parseCommandSequence` explicitly preserves, and its
 * junk-skipping does not guard `on`/`catch`/`finally`.
 *
 * Uses check()+advance() rather than ctx.match(): the control-flow unit-test
 * mocks override check/advance/peek against their own cursor but inherit a
 * `match` bound to a different position counter
 * (__test-utils__/parser-context-mock.ts:40).
 */
function parseIfBranchCommands(ctx: ParserContext, stopAtElse: boolean): ASTNode[] {
  const commands: ASTNode[] = [];
  const atTerminator = (): boolean =>
    ctx.check(KEYWORDS.END) || (stopAtElse && ctx.check(KEYWORDS.ELSE));

  while (!ctx.isAtEnd() && !atTerminator()) {
    // Skip `--` comments, as every sibling body loop does (parser.ts:3277 for
    // def/init/catch/finally, and the junk-skip at :1117 for repeat/for). This
    // loop was the only one that did not, so a comment between two commands
    // broke the block and produced the same bogus "Expected 'end' after if
    // block" as the missing-separator defect — which is what was left of
    // examples/fetch-and-async/infinite-scroll.html once `then` was fixed.
    if (isComment(ctx.peek())) {
      ctx.advance();
      continue;
    }
    if (!ctx.checkIsCommand() && !ctx.isCommand(ctx.peek().value)) break;
    ctx.advance(); // parseCommand() reads the command token via previous()
    const cmd = ctx.parseCommand();
    if (cmd) {
      commands.push(cmd);
    }
    // Separator between two body commands. `and` and `,` are matched for parity
    // with the sibling loops; in practice neither reaches here today (the pratt
    // parser absorbs `and` as a binary operator, and `,` is taken by the
    // argument loop), so only `then` changes behaviour.
    if (ctx.check(KEYWORDS.THEN) || ctx.check(KEYWORDS.AND) || ctx.check(',')) {
      ctx.advance();
    }
  }

  return commands;
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
 */
/**
 * Operators/connectives whose FOLLOWING token is an expression operand, never a
 * command start. The token-level approximation of "command position": a command
 * name is only a command in command position, and after `is`/`not`/… it is an
 * identifier operand (`if x is set …` — `set` is a value, not the body).
 */
const OPERAND_INTRODUCERS = new Set([
  'is',
  'am',
  'are',
  'not',
  'no',
  'and',
  'or',
  '==',
  '===',
  '!=',
  '!==',
  '<',
  '>',
  '<=',
  '>=',
  '+',
  '-',
  '*',
  '/',
  'mod',
]);

/**
 * Would this token START a body command, given the token before it?
 *
 * `checkIsCommand()`/`isCommand()` alone answer "is this spelled like a
 * command?", which misclassifies two condition positions:
 *
 * 1. The FIRST token after `if`/`unless` — the condition is never empty, so the
 *    first token is always condition, even spelled like a command
 *    (`if log is 3 …`).
 * 2. A token right after an operator — it is an operand (`if x is set …`).
 *
 * Both misclassifications previously made the form-detection scans (and the
 * single-line condition loop) treat the condition's first word as the body,
 * failing shapes upstream accepts. See
 * docs-internal/archive/HANDOFF-command-word-in-if-condition.md.
 */
function isBodyCommandStart(ctx: ParserContext, prevToken: Token | null, token: Token): boolean {
  if (prevToken === null) {
    return false; // first token after if/unless — always condition
  }
  if (OPERAND_INTRODUCERS.has(prevToken.value?.toLowerCase?.() ?? '')) {
    return false; // operand position
  }
  return ctx.checkIsCommand() || ctx.isCommand(token.value?.toLowerCase());
}

export function parseIfCommand(ctx: ParserContext, commandToken: Token): CommandNode {
  const args: ASTNode[] = [];

  // Check if this is multi-line:
  // 1. Explicit 'then' keyword: if <condition> then ... end
  // 2. Implicit multi-line (no 'then' but multiple commands on separate lines): if <condition>\n  <cmd>\n  <cmd>\n end
  // 3. Single-line (no 'then', single command on same line): if <condition> <command>

  // Look ahead to find 'then' keyword (not just check current token).
  //
  // NOTE: this scan crosses newlines, so it can be set by a `then` that belongs
  // to a BODY command rather than to the `if` header. That is tolerated on
  // purpose: `hasThen` only feeds `isMultiLine`, and a body spanning lines is
  // multi-line either way, while the header-`then` consumption below now checks
  // the token instead of trusting this flag.
  //
  // The scan IS bounded, but by the COMMAND-CHAIN rule, not by
  // `commandToken.line`. #785 considered the plain line bound and rejected it;
  // that remains the right call, because a header `then` is allowed to sit on
  // the line AFTER the condition, so a line bound reclassifies that legitimate
  // form (parser-integration.test.ts:381, and the guard in
  // then-as-separator.test.ts).
  //
  // The rule: a `then` binds this `if` only while the scan has not crossed onto
  // a line that STARTS a new command. Commands on the `if`'s own line are the
  // single-line body — their joining `then`s bind (upstream keeps then-joined
  // commands in the body: `if c add .a then add .b` is BOTH conditional). A
  // command starting a LATER line begins a SIBLING, so a `then` beyond it is
  // that sibling's separator and must not make this `if` multi-line
  // (`if 1 is 1 log 'a'` newline `set x to 1 then log 'b'` — the second line
  // must stay outside the block). A pure first-command bound was tried and
  // over-corrected: it also broke at command-WORDS inside the condition
  // (`if log is 3 then …`, `if x is set then …`), failing shapes upstream
  // accepts — see docs-internal/archive/HANDOFF-command-word-in-if-condition.md.
  let hasThen = false;
  const savedPosForThen = ctx.savePosition();
  const maxThenLookahead = 500; // Increased to handle large conditional expressions
  let prevForThen: Token | null = null;
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
    // Chain-break bound: a command starting a LATER line begins a sibling.
    if (
      token.line !== undefined &&
      token.line !== commandToken.line &&
      isBodyCommandStart(ctx, prevForThen, token)
    ) {
      break;
    }
    if (!isComment(token)) {
      prevForThen = token;
    }
    ctx.advance();
  }
  ctx.restorePosition(savedPosForThen);

  // Look ahead to check for multi-line form without 'then'
  // We need to distinguish:
  //   if no dragHandle set x to y    (single-line, command on SAME line as if)
  //   if no dragHandle               (multi-line, command on DIFFERENT line)
  //     log 'test'
  //   end
  // Key insight: Only check the FIRST command's line position
  let hasImplicitMultiLineEnd = false;
  if (!hasThen) {
    const savedPosition = ctx.savePosition();
    const ifStatementLine = commandToken.line; // Line where 'if' keyword appears
    const maxLookahead = 100;
    // Set once the FIRST command is found on the `if`'s own line — i.e. the form
    // question is already answered as single-line. See the line-bound below.
    let firstCommandOnIfLine = false;
    // Previous non-comment token, for isBodyCommandStart: the first token after
    // `if` is always condition, and a token after an operator is an operand —
    // without those two exemptions a command-WORD in the condition
    // (`if log is 3 …`, `if x is set …`) was read as the body's first command
    // and the form detection collapsed. See
    // docs-internal/archive/HANDOFF-command-word-in-if-condition.md.
    let prevToken: Token | null = null;

    // Scan forward to find the FIRST command after the condition
    while (!ctx.isAtEnd() && ctx.current - savedPosition < maxLookahead) {
      const token = ctx.peek();
      const tokenValue = token.value?.toLowerCase();

      // Once the first command has been seen on the `if`'s own line, the only
      // reason to keep scanning is a same-line `else`/`end` (see below), so the
      // moment the scan leaves that line there is nothing left for it to find.
      //
      // Without this bound the scan ran on into the NEXT line, found the
      // following sibling command, and set `hasImplicitMultiLineEnd` — defeating
      // the "FIRST command" rule by the second command. `if 1 is 1 log 'a'` +
      // `log 'b'` on the next line swallowed `log 'b'` into the if-block, so it
      // stopped running whenever the condition was false, with only a recovered
      // "Expected 'end' after if block" (ok/success both stayed true) to show for
      // it. See docs-internal/archive/HANDOFF-implicit-multiline-if.md.
      if (firstCommandOnIfLine && token.line !== undefined && token.line !== ifStatementLine) {
        break;
      }

      // Stop at structural boundaries
      if (
        tokenValue === KEYWORDS.BEHAVIOR ||
        tokenValue === KEYWORDS.DEF ||
        tokenValue === KEYWORDS.ON
      ) {
        break;
      }

      // If we see 'else' or 'end' on the SAME line, this must be multi-line form
      // e.g., "if x > 3 set y to 1 else set y to 2 end" requires multi-line parsing
      // But if 'else' or 'end' is on a DIFFERENT line, it belongs to an outer block
      // e.g., in behaviors: "if no x set x to y" followed by "end" (closing init block)
      if (tokenValue === KEYWORDS.ELSE || tokenValue === KEYWORDS.END) {
        // Only treat as multi-line if on same line as if statement
        if (token.line === ifStatementLine) {
          hasImplicitMultiLineEnd = true;
        }
        break;
      }

      // When we find the FIRST command, check its line position
      if (isBodyCommandStart(ctx, prevToken, token)) {
        // If first command is on a DIFFERENT line than if, it's multi-line
        // If first command is on the SAME line as if, it's single-line
        if (token.line !== undefined && token.line !== ifStatementLine) {
          hasImplicitMultiLineEnd = true;
          break;
        }
        // Don't break - continue scanning to find 'else' or 'end' on same line
        firstCommandOnIfLine = true;
      }

      if (!isComment(token)) {
        prevToken = token;
      }
      ctx.advance();
    }

    ctx.restorePosition(savedPosition);
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

    // The FIRST expression parse is unguarded: the condition is never empty, so
    // the first token after `if` can never be the body command — even when it is
    // spelled like one (`if log is 3 add .a to #t` — the condition is
    // `log is 3`). With the guard applied from token 0, that shape parsed ZERO
    // condition tokens and died with "Expected condition after if/unless"
    // (silently, when inside a handler — see
    // docs-internal/archive/HANDOFF-command-word-in-if-condition.md). The command guard
    // applies from the second parse on, where a command token really does start
    // the body.
    let firstConditionParse = true;

    while (
      !ctx.isAtEnd() &&
      !ctx.check(KEYWORDS.THEN) &&
      (firstConditionParse || (!ctx.checkIsCommand() && !ctx.isCommand(ctx.peek().value))) &&
      iterations < maxIterations
    ) {
      firstConditionParse = false;
      const beforePos = ctx.savePosition();
      // Use parseLogicalAnd() to handle binary operators like 'is a' and unary operators like 'not'
      // This is one level below parseLogicalOr() to avoid consuming 'or' which might be part of pattern syntax
      conditionTokens.push(ctx.parseLogicalAnd());

      // Safety check: ensure we're making progress
      if (ctx.savePosition() === beforePos) {
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
    //
    // Consume the header `then` only if it is ACTUALLY the next token. `hasThen`
    // is a lookahead flag that can be set by a `then` belonging to a body command
    // (the scan above crosses newlines), and advancing on the flag alone deleted
    // the body's first token — that is why the reported repro produced an EMPTY
    // if-block with `get #username` missing from the AST entirely. Checking the
    // token also routes through the multilingual keyword resolver, which the raw
    // `token.value === KEYWORDS.THEN` comparison in the lookahead does not.
    consumeOptionalKeyword(ctx, KEYWORDS.THEN);

    // Parse command block until 'else' or 'end'
    const thenCommands: ASTNode[] = parseIfBranchCommands(ctx, true);

    // Validate: error if then block is empty and we're at end of input (incomplete statement)
    if (thenCommands.length === 0 && ctx.isAtEnd()) {
      throw new Error("Expected command after 'then' in if statement - incomplete conditional");
    }

    // Add then block
    args.push(
      createBlock(thenCommands, {
        start: commandToken.start,
        end: ctx.getPosition().end,
        line: commandToken.line,
        column: commandToken.column,
      })
    );

    // Check for optional 'else' clause
    // Track if we consumed 'else if' (nested if handles its own 'end')
    let consumedElseIf = false;

    if (ctx.check(KEYWORDS.ELSE)) {
      ctx.advance(); // consume 'else'

      // Check for 'else if' continuation (if is a KEYWORD token)
      if (ctx.check(KEYWORDS.IF)) {
        // This is 'else if' - recursively parse as a nested if command
        // The nested if will consume its own 'end', which serves as the end for the entire chain
        const ifToken = ctx.peek();
        ctx.advance(); // consume 'if'
        const elseIfCommand = parseIfCommand(ctx, ifToken);

        // Add the else-if as the else block (it's a nested if that shares our 'end')
        args.push(
          createBlock([elseIfCommand], {
            start: ifToken.start,
            end: ctx.getPosition().end,
            line: ifToken.line,
            column: ifToken.column,
          })
        );

        consumedElseIf = true;
      } else {
        // Regular else block
        const elseCommands: ASTNode[] = parseIfBranchCommands(ctx, false);

        // Add else block
        args.push(
          createBlock(elseCommands, {
            start: commandToken.start,
            end: ctx.getPosition().end,
            line: commandToken.line,
            column: commandToken.column,
          })
        );
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
    if (ctx.checkIsCommand() || ctx.isCommand(ctx.peek().value)) {
      ctx.advance(); // consume command token
      const singleCommand = ctx.parseCommand();

      // Wrap single command in a block for consistency
      args.push(
        createBlock([singleCommand], {
          start: commandToken.start,
          end: ctx.getPosition().end,
          line: commandToken.line,
          column: commandToken.column,
        })
      );
    } else {
      throw new Error('Expected command after if condition in single-line form');
    }
  }

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
    const nextToken = ctx.peekAt(1);
    if (nextToken && nextToken.value.toLowerCase() === KEYWORDS.INDEX) {
      ctx.advance(); // consume 'with'
      ctx.advance(); // consume 'index'
      indexVariable = KEYWORDS.INDEX;
    }
  } else if (ctx.check(KEYWORDS.INDEX)) {
    ctx.advance(); // consume 'index'
    const indexToken = ctx.peek();
    if (isIdentifierLike(indexToken)) {
      indexVariable = indexToken.value;
      ctx.advance();
    } else {
      indexVariable = KEYWORDS.INDEX;
    }
  }

  // Parse command block until 'end'
  const commands: ASTNode[] = ctx.parseCommandListUntilEnd('for');

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

  const forPos = {
    start: commandToken.start,
    end: commandToken.end,
    line: commandToken.line,
    column: commandToken.column,
  };

  args.push(createStringLiteral(variable, forPos));

  args.push(collection);

  if (indexVariable) {
    args.push(createStringLiteral(indexVariable, forPos));
  }

  // Add commands as a block
  args.push(createBlock(commands, { ...forPos, end: forPos.end || 0 }));

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
