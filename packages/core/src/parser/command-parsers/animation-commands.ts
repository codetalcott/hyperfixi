/**
 * Animation Command Parsers
 *
 * Pure function implementations of animation-related command parsers.
 * These functions use ParserContext for dependency injection, enabling
 * clean separation from the Parser class.
 *
 * @module parser/command-parsers/animation-commands
 */

import type { ParserContext, IdentifierNode } from '../parser-types';
import type { ASTNode, ExpressionNode, Token } from '../../types/core';
import { CommandNodeBuilder } from '../command-node-builder';
import { KEYWORDS } from '../parser-constants';
import { parseHyphenatedName } from '../helpers/parsing-helpers';
import { isIdentifierLike } from '../token-predicates';
import { toLegacyExpression } from '../../ast/legacy';

/**
 * Parse measure command
 *
 * Syntax:
 *   - measure <property>
 *   - measure <target> <property>
 *   - measure <target> *<css-property>
 *   - measure <target> <property> and set <variable>
 *
 * This command measures properties of elements, supporting both standard
 * properties (width, height) and CSS properties (*opacity, *background-color).
 * Results can optionally be stored in a variable using the "and set" modifier.
 *
 * Examples:
 *   - measure width
 *   - measure <#element/> height
 *   - measure <button/> *opacity
 *   - measure <div/> width and set w
 *
 * @param ctx - Parser context providing access to parser state and methods
 * @param identifierNode - The 'measure' identifier node
 * @returns CommandNode representing the measure command
 */
export function parseMeasureCommand(ctx: ParserContext, identifierNode: IdentifierNode) {
  // Parse measure command with multi-argument syntax
  // Patterns:
  //   measure width                          → 1 arg (property)
  //   measure <#element/> width              → 2 args (target, property)
  //   measure <#element/> *opacity           → 2 args (target, CSS property)
  //   measure <#element/> *opacity and set x → 2 args + modifier
  const args: ASTNode[] = [];
  const modifiers: Record<string, ExpressionNode> = {};

  // Parse optional target (selector or expression)
  // If next token is a selector, identifier, or context var, parse it as target
  if (ctx.checkAnySelector() || ctx.checkContextVar() || ctx.match('<')) {
    // Parse the target element expression
    const target = ctx.parsePrimary();
    args.push(target);

    // After parsing target, check for property
    // Property can be:
    // - Simple identifier: width, height, top, left
    // - CSS property with *: *opacity, *background-color

    // Check for CSS property shorthand: * followed by identifier
    if (ctx.match('*')) {
      // Next token should be the CSS property name
      if (ctx.checkIdentifierLike()) {
        const propName = ctx.advance();
        // Create identifier node with * prefix
        args.push({
          type: 'identifier',
          name: '*' + propName.value,
          start: propName.start - 1, // Include the *
          end: propName.end,
          line: propName.line,
          column: propName.column,
        } as IdentifierNode);
      }
    } else if (ctx.checkIdentifierLike()) {
      const property = ctx.parsePrimary();
      args.push(property);
    }
  } else if (ctx.checkIdentifierLike()) {
    // Just a property name without target: "measure width"
    const property = ctx.parsePrimary();
    args.push(property);
  }

  // Parse optional "and set <variable>" modifier
  if (ctx.match('and')) {
    if (ctx.match('set')) {
      if (ctx.checkIdentifierLike()) {
        const variableName = ctx.advance();
        modifiers['set'] = toLegacyExpression({
          type: 'identifier',
          name: variableName.value,
          start: variableName.start,
          end: variableName.end,
          line: variableName.line,
          column: variableName.column,
        });
      }
    }
  }

  const builder = CommandNodeBuilder.fromIdentifier(identifierNode)
    .withArgs(...args)
    .endingAt(ctx.getPosition());

  if (Object.keys(modifiers).length > 0) {
    builder.withModifiers(modifiers);
  }

  return builder.build();
}

/**
 * Context possessives and the context variable each aliases. `parsePrimary`
 * turns `my *opacity` into `memberExpression(me, *opacity)` via
 * `parseContextPropertyAccess`, so these only need detecting, not decoding.
 */
const CONTEXT_POSSESSIVES = new Set(['my', 'its', 'your']);

/**
 * Parse transition command
 *
 * Syntax: transition [<target>] <property> to <value> [over <duration>] [with <timing-function>]
 *
 * This command transitions a CSS property to a target value with optional
 * duration and timing function. Supports hyphenated CSS properties.
 *
 * The target may be given four upstream-valid ways, all of which this parser
 * REJECTED before 2026-07-31 (docs-internal/PARSER_NEXT_STEPS.md — the bare
 * form was the only one that worked, and it is the narrower case; the
 * possessive is what the docs and the multilingual corpus render):
 *
 *   transition my *opacity to 0      → context possessive
 *   transition its *opacity to 0     → same
 *   transition #a's *opacity to 0    → selector possessive
 *   transition #a *opacity to 0      → space-separated (the `measure` shape)
 *
 * Two adjacent gaps, not one: `my`/`its` parsed as the PROPERTY (leaving `to`
 * unmatched → 'Expected "to" keyword after property'), while a leading
 * selector matched neither branch and left property null → 'Transition command
 * requires a CSS property'. Both messages named the thing that was in fact
 * supplied.
 *
 * Emits `args: [target, property]` — the two-arg shape
 * `TransitionCommand.parseInput` has always accepted (its target branch was
 * simply unreachable) — or `args: [property]` for the bare form.
 *
 * Examples:
 *   - transition opacity to 0.5
 *   - transition *background-color to 'red' over 2s
 *   - transition my *opacity to 0 over 200ms
 *   - transition #a's *opacity to 0 over 1s with ease-in-out
 *
 * @param ctx - Parser context providing access to parser state and methods
 * @param commandToken - The 'transition' command token
 * @returns CommandNode representing the transition command
 */
export function parseTransitionCommand(ctx: ParserContext, commandToken: Token) {
  const args: ASTNode[] = [];
  const modifiers: Record<string, ExpressionNode> = {};

  let property: ASTNode | null = null;
  let target: ASTNode | null = null;

  // Optional leading target. Mirrors `parseMeasureCommand`'s target detection
  // (same `<target> *property` shape) and adds the possessive forms.
  const leadToken = ctx.peek();
  const startsTarget =
    ctx.checkAnySelector() ||
    ctx.checkContextVar() ||
    ctx.check('<') ||
    (isIdentifierLike(leadToken) && CONTEXT_POSSESSIVES.has(leadToken.value));

  if (startsTarget) {
    // `parsePrimary` folds both possessive shapes into one node — `#a's
    // *opacity` to a possessiveExpression, `my *opacity` to a
    // memberExpression — so decompose rather than re-parsing the property.
    const parsed = ctx.parsePrimary() as ASTNode & {
      type?: string;
      object?: ASTNode;
      property?: { name?: string };
      computed?: boolean;
    };

    if (
      (parsed.type === 'possessiveExpression' ||
        (parsed.type === 'memberExpression' && !parsed.computed)) &&
      parsed.object &&
      parsed.property?.name
    ) {
      target = parsed.object;
      property = {
        type: 'string',
        value: parsed.property.name,
        start: leadToken.start || 0,
        end: ctx.getPosition().end,
        line: leadToken.line,
        column: leadToken.column,
      };
    } else {
      // Space-separated form: the target stands alone and the property
      // follows. A stray possessive marker (`#a's` with the property parsed
      // separately) is consumed here so it cannot reach the property parse.
      target = parsed;
      if (ctx.check("'s")) ctx.advance();
    }
  }

  // Parse property (required unless a possessive already supplied it)
  // Property can be:
  // - identifier (opacity, width, etc.)
  // - identifier with * prefix (*background-color)
  const firstToken = ctx.peek();

  if (!property && (isIdentifierLike(firstToken) || firstToken.value === '*')) {
    let propertyValue = '';

    // Handle wildcard prefix
    if (ctx.check('*')) {
      propertyValue = '*';
      ctx.advance();
    }

    // Get property name (supports hyphenated names like background-color)
    const hyphenatedName = parseHyphenatedName(ctx);
    if (hyphenatedName) {
      propertyValue += hyphenatedName;

      property = {
        type: 'string',
        value: propertyValue,
        start: firstToken.start || 0,
        end: ctx.getPosition().end,
        line: firstToken.line,
        column: firstToken.column,
      };
    }
  }

  if (!property) {
    throw new Error('Transition command requires a CSS property');
  }

  // `[target, property]` is the two-arg shape TransitionCommand.parseInput
  // already discriminates on; bare stays one-arg.
  if (target) args.push(target);
  args.push(property);

  // Parse 'to' keyword and value (required) - store in modifiers for V2 command
  if (!ctx.check(KEYWORDS.TO)) {
    throw new Error('Expected "to" keyword after property in transition command');
  }
  ctx.advance(); // consume 'to'

  // Parse target value (can be template string, number, color, etc.).
  //
  // `parseExpression`, not `parsePrimary`: a CSS value is routinely a NUMBER
  // PLUS A UNIT, and `100px` is two tokens — the engine already models that as
  // a `stringPostfix` node (`Parser.tryParseStringPostfix`, mirroring upstream's
  // StringPostfixExpression over the 15 CSS length units and `%`), but only the
  // pratt path builds it. `parsePrimary` stops at the literal, so
  // `transition left to 100px` silently became `to: 100` — an animation to a
  // UNITLESS length, i.e. to nothing — with `px` discarded. Same for
  // `transition *width to 50%`.
  //
  // It was invisible for two reasons at once: bare, the parser had nothing to
  // report the drop through, and the source is TransitionCommand's own
  // documented example, which no gate parsed until #1025. Upstream parses both
  // this value and the duration below with `requireElement("expression")`.
  const value = ctx.parseExpression();
  modifiers['to'] = value as ExpressionNode;

  // Parse optional 'over <duration>' - store in modifiers.
  //
  // `parseExpression` for the same reason, and it is not redundant with the
  // tokenizer's TIME handling: `500ms` arrives as one token, but `2 * delay`
  // or `(base + 100) ms` do not.
  if (ctx.check('over')) {
    ctx.advance(); // consume 'over'
    const duration = ctx.parseExpression();
    modifiers['over'] = duration as ExpressionNode;
  }

  // Parse optional 'with <timing-function>' - store in modifiers
  if (ctx.check(KEYWORDS.WITH)) {
    ctx.advance(); // consume 'with'
    const timingFunction = ctx.parsePrimary();
    modifiers['with'] = timingFunction as ExpressionNode;
  }

  return CommandNodeBuilder.from(commandToken)
    .withArgs(...args)
    .withModifiers(modifiers)
    .endingAt(ctx.getPosition())
    .build();
}

/**
 * Parse `start view transition [using <type>] <body> end`.
 *
 * Mirrors upstream `_hyperscript` ViewTransitionCommand (animations.js:298-372):
 * the body executes inside `document.startViewTransition()`. The body is a
 * sequence of commands terminated by `end`.
 *
 * AST shape:
 *   { name: 'start', args: <body commands>, modifiers: { transitionName?: literal } }
 *
 * The command implementation (commands/animation/start-view-transition.ts)
 * reads modifiers.transitionName and executes each body command sequentially
 * inside the view-transition callback. Currently only `start view transition`
 * is recognized; the `start` keyword could fan out to other variants later.
 */
export function parseStartCommand(
  ctx: ParserContext,
  identifierNode: IdentifierNode
): import('../../types/core').CommandNode {
  if (!ctx.match('view')) {
    throw new Error(
      "start: expected 'view transition' (only `start view transition ... end` is supported)"
    );
  }
  if (!ctx.match('transition')) {
    throw new Error("start view: expected 'transition'");
  }

  const modifiers: Record<string, ExpressionNode> = {};

  // Optional `using <name>` — sets the view-transition-name CSS property.
  if (ctx.match('using')) {
    const nameExpr = ctx.parsePrimary();
    modifiers.transitionName = nameExpr as ExpressionNode;
  }

  // Body: sequence of commands terminated by `end`.
  const body = ctx.parseCommandListUntilEnd('start view transition');

  return CommandNodeBuilder.fromIdentifier(identifierNode)
    .withArgs(...body)
    .withModifiers(modifiers)
    .endingAt(ctx.getPosition())
    .build();
}
