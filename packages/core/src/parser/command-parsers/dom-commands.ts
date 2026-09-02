/**
 * DOM Command Parsers
 *
 * Pure function implementations of DOM manipulation command parsers.
 * These functions use ParserContext for dependency injection, enabling
 * clean separation from the Parser class.
 *
 * @module parser/command-parsers/dom-commands
 */

import type { ParserContext, IdentifierNode } from '../parser-types';
import type { ASTNode, ExpressionNode, Token } from '../../types/core';
import { CommandNodeBuilder } from '../command-node-builder';
import { KEYWORDS, PUT_OPERATIONS, PUT_OPERATION_KEYWORDS } from '../parser-constants';
import { isIdentifierLike } from '../token-predicates';
import {
  isCommandBoundary,
  parseOneArgument,
  consumeKeywordToArgs,
  consumeOneOfKeywordsToArgs,
  consumeOptionalKeyword,
} from '../helpers/parsing-helpers';
import { toLegacyExpression } from '../../ast/legacy';

/**
 * A `literal` node in the slot `withModifiers` types as `ExpressionNode`.
 *
 * `ExpressionNode` is pinned to `type: 'expression'`, so no literal is
 * assignable to it and every modifier carrying a plain string needs the same
 * hatch. One helper rather than one cast per site: this is the only place in
 * this module that asserts the shape, and the assertion is honest — the
 * builder's parameter type is narrower than what the AST actually holds in
 * `modifiers`, which is a `types/base-types.ts` question, not a parser one.
 *
 * Literal rather than identifier because the runtime EVALUATES these modifiers:
 * an identifier node would be looked up as a variable and come back undefined.
 */
function literalModifier(value: string): ExpressionNode {
  return toLegacyExpression({ type: 'literal', value, raw: value });
}

/**
 * Consume `toggle`'s optional temporal tail into MODIFIERS.
 *
 * `for <duration>` and `until <event> [from <target>]` are both accepted by the
 * real `hyperscript.org` engine, and `toggle .loading for 2s` is ToggleCommand's
 * own documented example — but neither was consumed here. The `for` tail was
 * left for the next parse round, which read it as the start of a `for` LOOP and
 * failed with `Expected variable name after "for"`; the `until` tail was dropped
 * in silence.
 *
 * Modifiers, not args, because that is where the runtime reads them:
 * `commands/dom/toggle.ts` `parseTemporalModifiers` takes `modifiers.for` and
 * `modifiers.until`, and `commands/helpers/temporal-modifiers.ts` already
 * implements both reversions — that machinery was simply unreachable.
 */
function parseTemporalTail(ctx: ParserContext): Record<string, ExpressionNode> {
  const modifiers: Record<string, ExpressionNode> = {};

  if (consumeOptionalKeyword(ctx, KEYWORDS.FOR)) {
    const duration = ctx.parseExpression();
    if (duration) modifiers['for'] = duration as ExpressionNode;
    return modifiers;
  }

  if (!ctx.check(KEYWORDS.UNTIL)) return modifiers;
  ctx.advance();

  const eventToken = ctx.peek();
  if (!eventToken || !isIdentifierLike(eventToken)) return modifiers;
  ctx.advance();

  // Colon-qualified names (`htmx:afterOnLoad`) tokenize as three tokens —
  // identifier, `:` operator, identifier — so rejoin them here.
  let eventName = eventToken.value;
  if (ctx.check(':')) {
    ctx.advance();
    const suffix = ctx.peek();
    if (suffix && isIdentifierLike(suffix)) {
      ctx.advance();
      eventName = `${eventName}:${suffix.value}`;
    }
  }

  // A literal, not an identifier node: ToggleCommand EVALUATES `modifiers.until`
  // and wants the event NAME, where an identifier would resolve as a variable
  // lookup and come back undefined.
  modifiers['until'] = literalModifier(eventName);

  // `until <event> from <target>` — upstream reverts on the event reaching
  // another element. ToggleCommand's `setupEventReversion` listens on the
  // toggled element only, so this is carried but not yet honoured; consuming it
  // is still required, or the trailing `from` becomes a parse error the moment
  // the `until` tail above is consumed.
  if (consumeOptionalKeyword(ctx, KEYWORDS.FROM)) {
    const target = parseOneArgument(ctx);
    if (target) modifiers['from'] = target as ExpressionNode;
  }

  return modifiers;
}

/**
 * Parse remove command
 *
 * Syntax: remove <class> from <target>
 *
 * This command removes a class from a target element. It expects:
 * 1. Class name to remove
 * 2. 'from' keyword
 * 3. Target element
 *
 * Examples:
 *   - remove .active from <button/>
 *   - remove "selected" from <div/>
 *
 * @param ctx - Parser context providing access to parser state and methods
 * @param identifierNode - The 'remove' identifier node
 * @returns CommandNode representing the remove command
 */
export function parseRemoveCommand(ctx: ParserContext, identifierNode: IdentifierNode) {
  const args: ASTNode[] = [];

  // Parse: remove <class> from <target>
  // First argument: class (stops at 'from' boundary)
  const classArg = parseOneArgument(ctx, [KEYWORDS.FROM]);
  if (classArg) {
    args.push(classArg);
  }

  // Consume 'from' keyword and add to args
  consumeKeywordToArgs(ctx, KEYWORDS.FROM, args);

  // Parse target argument
  const targetArg = parseOneArgument(ctx);
  if (targetArg) {
    args.push(targetArg);
  }

  return CommandNodeBuilder.fromIdentifier(identifierNode)
    .withArgs(...args)
    .endingAt(ctx.getPosition())
    .build();
}

/**
 * Parse toggle command
 *
 * Syntax:
 *   - toggle <class> from <target> OR toggle <class> on <target>
 *   - toggle between <classA> and <classB> [on <target>]
 *
 * This command toggles a class on/off for a target element. It supports
 * both 'from' (HyperFixi) and 'on' (official _hyperscript) for compatibility.
 *
 * The 'between' syntax switches mutually exclusive classes:
 *   - If element has classA, switches to classB
 *   - If element has classB, switches to classA
 *
 * Examples:
 *   - toggle .active from <button/>
 *   - toggle "selected" on <div/>
 *   - toggle between .on and .off on #target
 *
 * @param ctx - Parser context providing access to parser state and methods
 * @param identifierNode - The 'toggle' identifier node
 * @returns CommandNode representing the toggle command
 */
/** `modal` / `non-modal` from an asExpression's target type (a node or a bare string). */
function dialogModeOf(targetType: unknown): string | undefined {
  const name =
    typeof targetType === 'string'
      ? targetType
      : (targetType as { name?: unknown } | undefined)?.name;
  return name === 'modal' || name === 'non-modal' ? name : undefined;
}

export function parseToggleCommand(ctx: ParserContext, identifierNode: IdentifierNode) {
  const args: ASTNode[] = [];
  const modifiers: Record<string, ExpressionNode> = {};

  // Every SYNTACTIC decision toggle has is made here and carried as a slot
  // (Arc 3 step 3, toggle PR B): the `between A and B` pair is
  // `modifiers.between` (an arrayLiteral of the two), the dialog mode of
  // `as modal` / bare `modal` is `modifiers.as`, and the destination is
  // `modifiers.on` (PR A). ToggleCommand.parseInput no longer rediscovers any
  // of them by evaluating an argument and string-comparing the result. What it
  // still decides — element vs class from the evaluated first value, the
  // dialog/details/select dispatch by element type — is VALUE work, and stays.

  if (ctx.check(KEYWORDS.BETWEEN)) {
    ctx.advance(); // consume 'between'
    // `parseOneArgument` uses the full expression parser, which treats `and`
    // as a logical operator — so `.on and .off` comes back as one binary
    // `and` expression. Split it into the pair; otherwise parse the pair
    // around the keyword.
    const pair: ASTNode[] = [];
    const firstArg = parseOneArgument(ctx, [KEYWORDS.AND]) as
      (ASTNode & { type?: string; operator?: string; left?: ASTNode; right?: ASTNode }) | undefined;
    if (firstArg && firstArg.type === 'binaryExpression' && firstArg.operator === 'and') {
      if (firstArg.left) pair.push(firstArg.left);
      if (firstArg.right) pair.push(firstArg.right);
    } else {
      if (firstArg) pair.push(firstArg);
      consumeOptionalKeyword(ctx, KEYWORDS.AND);
      const secondArg = parseOneArgument(ctx, [KEYWORDS.FROM, KEYWORDS.ON, KEYWORDS.FOR]);
      if (secondArg) pair.push(secondArg);
    }
    const first = pair[0];
    const last = pair[pair.length - 1];
    modifiers['between'] = toLegacyExpression({
      type: 'arrayLiteral',
      elements: pair as never,
      ...(first?.start !== undefined ? { start: first.start } : {}),
      ...(last?.end !== undefined ? { end: last.end } : {}),
      ...(first?.line !== undefined ? { line: first.line } : {}),
      ...(first?.column !== undefined ? { column: first.column } : {}),
    });
  } else {
    // Standard syntax: toggle <class|attr|element> [as modal|non-modal] [on|from <target>].
    // The argument stops before `as` so that `as modal` is read as the mode
    // slot rather than folded into an `asExpression` the command would have
    // to unwrap.
    // `as` is an expression operator, so `#dlg as modal` comes back from the
    // expression parser as ONE asExpression; unwrap it here, once, into the
    // target plus the mode slot. (Stopping the argument before `as` would not
    // help — `parseOneArgument` only refuses to START at a boundary.)
    const classArg = parseOneArgument(ctx, [KEYWORDS.FROM, KEYWORDS.ON]) as
      (ASTNode & { expression?: ASTNode; targetType?: unknown }) | undefined;
    const mode = classArg?.type === 'asExpression' ? dialogModeOf(classArg.targetType) : undefined;
    if (classArg && mode !== undefined && classArg.expression) {
      args.push(classArg.expression);
      modifiers['as'] = literalModifier(mode);
    } else if (classArg) {
      args.push(classArg);
    }
    if (mode === undefined && ctx.check('modal')) {
      ctx.advance();
      modifiers['as'] = literalModifier('modal');
    }
  }

  // `on <target>` / `from <target>` — the destination slot (PR A). `from` is
  // the HyperFixi spelling, `on` upstream's; they mean the same thing here.
  if (consumeOptionalKeyword(ctx, KEYWORDS.FROM) || consumeOptionalKeyword(ctx, KEYWORDS.ON)) {
    const targetArg = parseOneArgument(ctx);
    if (targetArg) modifiers['on'] = targetArg as ExpressionNode;
  }

  return CommandNodeBuilder.fromIdentifier(identifierNode)
    .withArgs(...args)
    .withModifiers({ ...modifiers, ...parseTemporalTail(ctx) })
    .endingAt(ctx.getPosition())
    .build();
}

/**
 * Parse take command
 *
 * Syntax: take <class|@attr|property> [from <source>] [for <recipient>]
 *
 * `take` had no case in `parseCompoundCommand`, so it fell to
 * `parseRegularCommand` — which cannot consume a `for` tail. Upstream's
 * classic tab idiom `take .active from .tab for me` therefore failed exactly
 * the way `toggle … for 2s` did before #846: the unconsumed `for` was read as
 * the head of a `for` LOOP by the next parse round (`Expected "in" after
 * variable name in for loop`). Both `from` and `for` tails are accepted by the
 * real `hyperscript.org` engine.
 *
 * Shapes match the neighbours deliberately: `from` stays in the flat
 * `[what, 'from', source]` args shape `parseRemoveCommand` uses, and the
 * `for` recipient goes to MODIFIERS the way `toggle`'s temporal tail does —
 * `TakeCommand.parseInput` reads `modifiers.for`, and the semantic path
 * already produces the modifier shape (`modifiers.from`).
 *
 * Upstream's `with <classRef>` / `giving <expr>` replacement forms remain
 * unsupported (they error rather than mis-parse).
 *
 * @param ctx - Parser context providing access to parser state and methods
 * @param identifierNode - The 'take' identifier node
 * @returns CommandNode representing the take command
 */
export function parseTakeCommand(ctx: ParserContext, identifierNode: IdentifierNode) {
  const args: ASTNode[] = [];
  const modifiers: Record<string, ExpressionNode> = {};

  // First argument: what to take (stops at 'from'/'for' boundaries)
  const whatArg = parseOneArgument(ctx, [KEYWORDS.FROM, KEYWORDS.FOR]);
  if (whatArg) {
    args.push(whatArg);
  }

  // Optional `from <source>` — flat args, same shape as remove
  if (ctx.check(KEYWORDS.FROM)) {
    consumeKeywordToArgs(ctx, KEYWORDS.FROM, args);
    const sourceArg = parseOneArgument(ctx, [KEYWORDS.FOR]);
    if (sourceArg) {
      args.push(sourceArg);
    }
  }

  // Optional `for <recipient>` — must be consumed here or the next parse
  // round reads it as a `for` loop head
  if (consumeOptionalKeyword(ctx, KEYWORDS.FOR)) {
    const recipient = parseOneArgument(ctx);
    if (recipient) {
      modifiers['for'] = recipient as ExpressionNode;
    }
  }

  return CommandNodeBuilder.fromIdentifier(identifierNode)
    .withArgs(...args)
    .withModifiers(modifiers)
    .endingAt(ctx.getPosition())
    .build();
}

/**
 * Consume the optional `using view transition` tail shared by `swap` and
 * `process`.
 *
 * Both commands declare the tail in their own `commandMeta` syntax and both
 * runtimes already read it — `SwapCommand.parseInput` and
 * `ProcessPartialsCommand.parseInput` each scan the flat args for
 * `using` … `view` … `transition` — but neither parser consumed it. Since
 * `transition` is a COMMAND token, the unconsumed tail was re-parsed as a
 * fresh `transition` command and both forms died with
 * `Transition command requires a CSS property`. An unconsumed tail is never
 * inert: this is the same defect class as `toggle … for 2s` (#846) and
 * `take … for me` (#859).
 *
 * Flat identifier args, not modifiers, because that is the shape both
 * runtimes already read (and the shape the existing process unit fixtures
 * are written in).
 *
 * @param ctx - Parser context providing access to parser state and methods
 * @param args - Argument array to append the three tail keywords to
 * @returns True if a tail was present and consumed
 */
function consumeViewTransitionTail(ctx: ParserContext, args: ASTNode[]): boolean {
  if (!ctx.check('using')) {
    return false;
  }
  ctx.advance(); // consume 'using'
  if (!ctx.match('view')) {
    throw new Error("expected 'view transition' after 'using'");
  }
  if (!ctx.match('transition')) {
    throw new Error("expected 'transition' after 'using view'");
  }
  args.push(ctx.createIdentifier('using'));
  args.push(ctx.createIdentifier('view'));
  args.push(ctx.createIdentifier('transition'));
  return true;
}

/**
 * Parse process command
 *
 * Syntax: process partials in <content> [using view transition]
 *
 * `process` was in COMPOUND_COMMANDS with no case in `parseCompoundCommand`,
 * so it fell to `parseRegularCommand` — exactly the state `take` was in before
 * #859. Two things broke as a result, both on the traditional path:
 *
 * 1. The generic arg loop stops at `in` (an operator token), so
 *    `process partials in it` reached the runtime as the single arg
 *    `[partials]` with the content dropped, and threw
 *    `process command expects "partials" keyword` — an error message naming
 *    the one keyword that WAS supplied.
 * 2. The loop also stops at the `transition` COMMAND token, so
 *    `using view transition` was re-parsed as a fresh `transition` command:
 *    `Transition command requires a CSS property`.
 *
 * `partials` and `in` stay in the flat args (the shape
 * `ProcessPartialsCommand.parseInput` reads, and the shape its existing unit
 * fixtures build) rather than being dropped as pure syntax, so the runtime
 * can still tell the traditional shape from the semantic one — the semantic
 * schema is patient-only and hands over a bare `[content]`.
 *
 * Returns null when the next token is not `partials`, leaving the caller to
 * fall back to `parseRegularCommand`; that keeps malformed input reporting the
 * runtime's own keyword error instead of a parse error.
 *
 * @param ctx - Parser context providing access to parser state and methods
 * @param identifierNode - The 'process' identifier node
 * @returns CommandNode for the partials form, or null to fall back
 */
export function parseProcessCommand(ctx: ParserContext, identifierNode: IdentifierNode) {
  if (!ctx.check('partials')) {
    return null;
  }

  const args: ASTNode[] = [];
  consumeKeywordToArgs(ctx, 'partials', args);

  // `in <content>` — the keyword must be consumed here; the generic loop
  // treats it as a boundary and silently dropped everything after it.
  if (consumeKeywordToArgs(ctx, KEYWORDS.IN, args)) {
    const contentArg = parseOneArgument(ctx, ['using']);
    if (contentArg) {
      args.push(contentArg);
    }
  }

  consumeViewTransitionTail(ctx, args);

  return CommandNodeBuilder.fromIdentifier(identifierNode)
    .withArgs(...args)
    .endingAt(ctx.getPosition())
    .build();
}

/**
 * Parse add command
 *
 * Syntax:
 *   - add <class> [to <target>]
 *   - add { css-property: value } [to <target>]
 *
 * This command adds a class to a target element or applies inline styles
 * using CSS-style object literal syntax.
 *
 * Examples:
 *   - add .active to <button/>
 *   - add "highlight"
 *   - add { left: ${x}px; top: ${y}px; } to <div/>
 *
 * @param ctx - Parser context providing access to parser state and methods
 * @param commandToken - The 'add' command token
 * @returns CommandNode representing the add command
 */
export function parseAddCommand(ctx: ParserContext, commandToken: Token) {
  const args: ASTNode[] = [];

  // Parse first argument - can be classes (string/identifier) or CSS object literal
  if (ctx.match('{')) {
    // Parse CSS-style object literal for inline styles
    // Syntax: { left: ${x}px; top: ${y}px; }
    args.push(ctx.parseCSSObjectLiteral());
  } else {
    // Parse regular class expression (stops at 'to' boundary)
    const classArg = parseOneArgument(ctx, [KEYWORDS.TO]);
    if (classArg) {
      args.push(classArg);
    }
  }

  // Parse optional 'to <target>'
  if (ctx.check(KEYWORDS.TO)) {
    ctx.advance(); // consume 'to'

    // Parse target element
    const targetArg = parseOneArgument(ctx);
    if (targetArg) {
      args.push(targetArg);
    }
  }

  return CommandNodeBuilder.from(commandToken)
    .withArgs(...args)
    .endingAt(ctx.getPosition())
    .build();
}

/**
 * Parse put command
 *
 * Syntax:
 *   - put <content> into <target>
 *   - put <content> before <target>
 *   - put <content> after <target>
 *   - put <content> at start of <target>
 *   - put <content> at end of <target>
 *   - put <content> at <position>
 *
 * This command inserts content into the DOM at various positions relative
 * to a target element. It handles complex expressions for both content and target.
 *
 * Examples:
 *   - put (#count's textContent as Int) + 1 into #count
 *   - put <div>Hello</div> before <button/>
 *   - put "text" at end of <p/>
 *
 * @param ctx - Parser context providing access to parser state and methods
 * @param identifierNode - The 'put' identifier node
 * @returns CommandNode representing the put command, or null on error
 */
export function parsePutCommand(ctx: ParserContext, identifierNode: IdentifierNode) {
  // Parse the content expression (everything before operation keyword)
  const contentExpr = ctx.parseExpression();

  if (!contentExpr) {
    ctx.addError('Put command requires content expression');
    return null;
  }

  // Look for operation keyword (into, before, after, at)
  const currentToken = ctx.peek();

  if (
    !currentToken ||
    !(PUT_OPERATION_KEYWORDS as readonly string[]).includes(currentToken.value)
  ) {
    ctx.addError(
      `Expected operation keyword (${PUT_OPERATION_KEYWORDS.join(', ')}) after put expression, got: ${currentToken?.value}`
    );
    return null;
  }

  let operation = ctx.advance().value; // consume 'into', 'before', 'after', 'at', or compound keyword

  // Handle compound keywords from tokenizer (e.g., "at start of", "at the start of")
  // These are tokenized as single keywords, so we just need to normalize them
  const operationLower = operation.toLowerCase();
  if (operationLower === 'at start of' || operationLower === 'at the start of') {
    operation = PUT_OPERATIONS.AT_START_OF;
  } else if (operationLower === 'at end of' || operationLower === 'at the end of') {
    operation = PUT_OPERATIONS.AT_END_OF;
  } else if (operation === PUT_OPERATIONS.AT) {
    // Fallback: Handle separate tokens for backwards compatibility
    // This handles cases where tokenizer produces individual tokens
    if (ctx.check(KEYWORDS.START) || ctx.check(KEYWORDS.THE)) {
      consumeOptionalKeyword(ctx, KEYWORDS.THE);
      if (ctx.check(KEYWORDS.START)) {
        ctx.advance(); // consume 'start'
        if (ctx.check(KEYWORDS.OF)) {
          ctx.advance(); // consume 'of'
          operation = PUT_OPERATIONS.AT_START_OF;
        }
      }
    } else if (ctx.check(KEYWORDS.END)) {
      ctx.advance(); // consume 'end'
      if (ctx.check(KEYWORDS.OF)) {
        ctx.advance(); // consume 'of'
        operation = PUT_OPERATIONS.AT_END_OF;
      }
    }
  }

  // Parse the target expression
  const targetExpr = ctx.parseExpression();

  if (!targetExpr) {
    ctx.addError('Put command requires target expression after operation keyword');
    return null;
  }

  // Create command node using builder pattern
  return CommandNodeBuilder.fromIdentifier(identifierNode)
    .withArgs(contentExpr, ctx.createIdentifier(operation), targetExpr)
    .endingAt(ctx.getPosition())
    .build();
}

/**
 * Swap strategy keywords that indicate a specific swap strategy
 */
const SWAP_STRATEGY_KEYWORDS = [
  'innerhtml',
  'outerhtml',
  'into',
  'over',
  'delete',
  'morph',
  'morphouter',
];

/**
 * Parse swap command
 *
 * Syntax patterns:
 *   - swap #target with <content>                → strategy=morph (default)
 *   - swap innerHTML of #target with <content>  → strategy=innerHTML
 *   - swap into #target with <content>          → strategy=innerHTML
 *   - swap over #target with <content>          → strategy=outerHTML
 *   - swap delete #target                       → strategy=delete
 *
 * @param ctx - Parser context providing access to parser state and methods
 * @param identifierNode - The 'swap' identifier node
 * @returns CommandNode representing the swap command
 */
export function parseSwapCommand(ctx: ParserContext, identifierNode: IdentifierNode) {
  const args: ASTNode[] = [];

  // Check for strategy keyword first (innerHTML, outerHTML, into, over, delete)
  let strategyKeyword: string | null = null;

  if (!ctx.isAtEnd()) {
    const current = ctx.peek();
    if (current && current.value) {
      const lowerValue = current.value.toLowerCase();
      if (SWAP_STRATEGY_KEYWORDS.includes(lowerValue)) {
        strategyKeyword = lowerValue;
        ctx.advance(); // consume the strategy keyword
        args.push(ctx.createIdentifier(strategyKeyword));
      }
    }
  }

  // Handle 'delete' strategy (no content needed)
  if (strategyKeyword === 'delete') {
    // Parse target: swap delete #target
    const targetExpr = ctx.parseExpression();
    if (targetExpr) {
      args.push(targetExpr);
    }
    return CommandNodeBuilder.fromIdentifier(identifierNode)
      .withArgs(...args)
      .endingAt(ctx.getPosition())
      .build();
  }

  // Check for 'of' keyword after strategy (e.g., "innerHTML of #target")
  if (!ctx.isAtEnd() && ctx.check(KEYWORDS.OF)) {
    ctx.advance(); // consume 'of'
    args.push(ctx.createIdentifier('of'));
  }

  // Parse target expression
  const targetExpr = ctx.parseExpression();
  if (targetExpr) {
    args.push(targetExpr);
  }

  // Check for 'with' keyword - use KEYWORDS.WITH constant
  if (!ctx.isAtEnd() && ctx.check(KEYWORDS.WITH)) {
    ctx.advance(); // consume 'with'
    args.push(ctx.createIdentifier('with'));

    // Parse content expression
    const contentExpr = ctx.parseExpression();
    if (contentExpr) {
      args.push(contentExpr);
    }
  }

  // Optional `using view transition` — declared by SwapCommand's own
  // commandMeta and already read by its runtime, but never consumed here.
  consumeViewTransitionTail(ctx, args);

  return CommandNodeBuilder.fromIdentifier(identifierNode)
    .withArgs(...args)
    .endingAt(ctx.getPosition())
    .build();
}

/**
 * Parse show/hide.
 *
 * Syntax: `show|hide [<target>] [with <strategy>] [when|where <condition>]`
 *
 * Both are `COMPOUND_COMMANDS` members that had **no case in
 * `parseCompoundCommand`**, so they fell to `parseRegularCommand` — a loop of
 * `parsePrimary()` calls, which parses one operand and cannot see an operator.
 * Three consequences, all measured on `main`:
 *
 *   - `show <blockquote/> in the next <div/>` kept only `<blockquote/>`. The
 *     `in` scope operator is a perfectly ordinary binary expression here — the
 *     identical `log <blockquote/> in the next <div/>` parses it — but
 *     `parsePrimary` stops before the operator, so the scope was dropped.
 *   - `show <target> when <cond>` swallowed the bare word `when` as an
 *     ARGUMENT, which hid the trailing guard from `Parser.parseCommand`'s
 *     central `when`/`where` capture and dropped the condition with it.
 *   - `show #modal with *opacity` dropped the strategy the same way.
 *
 * The shipped `examples/behaviors/recipes.html` search filter is the first two
 * together: `show <blockquote/> in the next <div/> when its textContent
 * contains my value` shows EVERY blockquote where `hyperscript.org` — which
 * accepts this source — filters them.
 *
 * The target is therefore a full `parseExpression()`, and the tail keywords are
 * consumed explicitly so nothing is left for the statement loop to discard.
 * `when`/`where` is left in the stream on purpose: `Parser.parseCommand`
 * attaches it as `modifiers.when` for every command centrally, and duplicating
 * that here would be a second mechanism for one shape.
 *
 * `with <strategy>` is CONSUMED but not yet honoured — upstream's
 * display/visibility/opacity strategies are a separate, filed gap
 * (`docs-internal/MULTILINGUAL_NEXT_STEPS.md`: "show/hide style role is
 * uncaptured in EVERY language including en"). Consuming it is not optional
 * cosmetics: since #1026 the parser REPORTS what it cannot place, so leaving
 * the tail would turn a silent drop into a diagnostic on every
 * `show … with …` source. The name is stored as a LITERAL with any leading
 * `*` stripped, exactly as upstream stores it, rather than as the selector
 * node `*opacity` tokenizes to.
 */
export function parseShowHideCommand(ctx: ParserContext, identifierNode: IdentifierNode) {
  const args: ASTNode[] = [];
  const modifiers: Record<string, ExpressionNode> = {};

  // A bare `show` / `show when <cond>` / `show with <strategy>` has no target;
  // the runtime defaults to `me`. No implicit node is forged here — a runtime
  // default does not need an AST representation (ENGINE_MIGRATION_PLAN.md).
  if (
    !isCommandBoundary(ctx, ['catch', 'finally']) &&
    !ctx.check(KEYWORDS.WHEN) &&
    !ctx.check('where') &&
    !ctx.check(KEYWORDS.WITH)
  ) {
    const target = ctx.parseExpression();
    if (target) args.push(target);
  }

  if (consumeOptionalKeyword(ctx, KEYWORDS.WITH)) {
    const strategy = ctx.parseExpression();
    const name = strategyName(strategy);
    if (name !== null) {
      modifiers['with'] = literalModifier(name);
    }
  }

  const builder = CommandNodeBuilder.fromIdentifier(identifierNode)
    .withArgs(...args)
    .endingAt(ctx.getPosition());
  if (Object.keys(modifiers).length > 0) builder.withModifiers(modifiers);
  return builder.build();
}

/**
 * The strategy NAME behind whatever node `with <strategy>` parsed to.
 *
 * `*opacity` tokenizes as a style-ref selector and a bare `opacity` as an
 * identifier, so both shapes have to be read; upstream strips the leading `*`
 * and keeps the name.
 */
function strategyName(node: ASTNode | null | undefined): string | null {
  if (!node) return null;
  const raw =
    typeof node.name === 'string' ? node.name : typeof node.value === 'string' ? node.value : null;
  return raw === null ? null : raw.replace(/^\*/, '');
}
