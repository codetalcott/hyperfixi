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
import { isCommandBoundary, isKeyword, parseHyphenatedName } from '../helpers/parsing-helpers';
import { isComment } from '../token-predicates';
import { toLegacyExpression } from '../../ast/legacy';
import type { SlotMap } from '../../ast/command-slots';

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
  const modifiers: SlotMap<'measure'> = {};

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

  const builder = CommandNodeBuilder.fromIdentifier<'measure'>(identifierNode)
    .withArgs(...args)
    .endingAt(ctx.getPosition());

  if (Object.keys(modifiers).length > 0) {
    builder.withModifiers(modifiers);
  }

  return builder.build();
}

/**
 * A name that is the OWNER of a property, never a property itself: `transition
 * me *opacity to 0` is the space-separated owner form, not a CSS property
 * called `me`.
 */
const CONTEXT_REFS = new Set(['me', 'it', 'you', 'result']);

/** One `<property> [from <value>] to <value>` of a transition. */
interface TransitionPair {
  owner: ASTNode | null;
  property: ASTNode;
  from: ASTNode | null;
  to: ASTNode;
}

/**
 * Parse transition command
 *
 * Upstream's syntax (TransitionCommand in _hyperscript 0.9.93):
 *
 *   transition <property> [from <value>] to <value> [<property> … to <value>]…
 *              [over <duration> | using <css transition>]
 *
 * Each <property> is an EXPRESSION naming a style on an owner:
 *
 *   *opacity, opacity                   → on `me`
 *   the *opacity                        → `the` is an article
 *   my *opacity, #a's *opacity,         → a possessive, whose owner may be any
 *   next .panel's *max-height,            expression: positional, queried or
 *   (next .panel)'s *max-height           parenthesized
 *   *max-height of #panel               → the `of` form
 *
 * Each pair's owner is its own, as upstream's: `*width of #a to 10px *height
 * to 5px` moves #a's width and `me`'s height.
 *
 * Two hyperfixi extensions upstream rejects stay: a space-separated owner
 * (`#a *opacity`, the `measure` shape) and `with <timing-function>`.
 *
 * Emits the first pair in the shape every consumer reads: `args: [owner,
 * property]` or `[property]`, with `to` (and `from`) as modifiers. Each later
 * pair is an `objectLiteral` (`property`, `to`, and `owner` / `from` when
 * given) in the `pairs` slot.
 *
 * History: before 2026-07-31 only the bare form parsed. Before 2026-09-25 a
 * positional or parenthesized owner, `the`, `of`, `from`, `using` and a
 * second property were all rejected, and the second property's `*` read as
 * MULTIPLICATION: `*width to 100px *height to 50px` became `to: 100px *
 * height`, silently at top level. (docs-internal/PARSER_NEXT_STEPS.md)
 *
 * @param ctx - Parser context providing access to parser state and methods
 * @param commandToken - The 'transition' command token
 * @returns CommandNode representing the transition command
 */
export function parseTransitionCommand(ctx: ParserContext, commandToken: Token) {
  const pairs: TransitionPair[] = [];
  do {
    pairs.push(parseTransitionPair(ctx));
  } while (startsAnotherPair(ctx));

  const [first, ...rest] = pairs as [TransitionPair, ...TransitionPair[]];
  const args: ASTNode[] = first.owner ? [first.owner, first.property] : [first.property];
  const modifiers: SlotMap<'transition'> = { to: first.to as ExpressionNode };
  if (first.from) modifiers['from'] = first.from as ExpressionNode;
  if (rest.length > 0) modifiers['pairs'] = pairsNode(rest) as ExpressionNode;

  // `over <duration>` and upstream's `using <css transition>`, plus hyperfixi's
  // `with <timing-function>`, in any order.
  //
  // `parseExpression` for the duration, not `parsePrimary`: `500ms` arrives as
  // one token, but `2 * delay` or `(base + 100) ms` do not.
  for (let i = 0; i < 3 && !ctx.isAtEnd(); i++) {
    if (ctx.check('over') && !modifiers['over']) {
      ctx.advance();
      modifiers['over'] = ctx.parseExpression() as ExpressionNode;
    } else if (ctx.check('using') && !modifiers['using']) {
      ctx.advance();
      modifiers['using'] = ctx.parseExpression() as ExpressionNode;
    } else if (ctx.check(KEYWORDS.WITH) && !modifiers['with']) {
      ctx.advance();
      modifiers['with'] = ctx.parsePrimary() as ExpressionNode;
    } else {
      break;
    }
  }

  return CommandNodeBuilder.from<'transition'>(commandToken)
    .withArgs(...args)
    .withModifiers(modifiers)
    .endingAt(ctx.getPosition())
    .build();
}

function parseTransitionPair(ctx: ParserContext): TransitionPair {
  const { owner, property } = parseTransitionProperty(ctx);

  let from: ASTNode | null = null;
  if (ctx.check('from')) {
    ctx.advance();
    from = ctx.parseExpression();
  }

  if (!ctx.check(KEYWORDS.TO)) {
    throw new Error('Expected "to" keyword after property in transition command');
  }
  ctx.advance(); // consume 'to'

  // `parseExpression`, not `parsePrimary`: a CSS value is routinely a NUMBER
  // PLUS A UNIT, and `100px` is two tokens — the engine already models that as
  // a `stringPostfix` node (`Parser.tryParseStringPostfix`, mirroring upstream's
  // StringPostfixExpression over the 15 CSS length units and `%`), but only the
  // pratt path builds it. `parsePrimary` stops at the literal, so
  // `transition left to 100px` silently became `to: 100` — an animation to a
  // UNITLESS length, i.e. to nothing — with `px` discarded. Same for
  // `transition *width to 50%`. Upstream parses this value with
  // `requireElement("expression")`. The expression ends before the next
  // property's `*`: see `Parser.isSpacedStyleRef`.
  const to = ctx.parseExpression();
  return { owner, property, from, to };
}

/**
 * The property of one pair and, when one is named, its owner.
 *
 * Parsed as an expression and taken apart, as upstream parses it, so every
 * owner an expression can spell is accepted. Anything that names no property
 * is the space-separated owner form (`#a *opacity`), and the property follows.
 */
function parseTransitionProperty(ctx: ParserContext): { owner: ASTNode | null; property: ASTNode } {
  const lead = ctx.peek();
  // `transition to 1`: no property at all, rather than a property named `to`.
  if (!lead || isKeyword(lead, [KEYWORDS.TO, 'from'])) {
    throw new Error('Transition command requires a CSS property');
  }
  const expr = ctx.parseExpression();
  const split = splitStyleExpression(expr);
  if (split) return { owner: split.owner, property: propertyNode(split.name, lead, ctx) };

  let name = '';
  if (ctx.check('*')) {
    name = '*';
    ctx.advance();
  }
  const hyphenated = parseHyphenatedName(ctx);
  if (!hyphenated) throw new Error('Transition command requires a CSS property');
  return { owner: expr, property: propertyNode(name + hyphenated, lead, ctx) };
}

/**
 * The style an expression names, and its owner: `*opacity` and `opacity` (no
 * owner), a possessive or member access (`#a's *opacity`, `my *opacity`), the
 * `of` form (`*opacity of #a`) and `the opacity of #a`. Null when the
 * expression names no style.
 */
function splitStyleExpression(node: ASTNode): { owner: ASTNode | null; name: string } | null {
  const n = node as ASTNode & {
    value?: unknown;
    name?: unknown;
    object?: ASTNode;
    property?: { name?: unknown };
    computed?: boolean;
    operator?: string;
    left?: ASTNode;
    right?: ASTNode;
    target?: ASTNode;
  };
  switch (n.type) {
    case 'selector':
      return typeof n.value === 'string' && n.value.startsWith('*')
        ? { owner: null, name: n.value }
        : null;
    case 'identifier':
      return typeof n.name === 'string' && !CONTEXT_REFS.has(n.name)
        ? { owner: null, name: n.name }
        : null;
    case 'possessiveExpression':
    case 'memberExpression':
      return !n.computed && n.object && typeof n.property?.name === 'string'
        ? { owner: n.object, name: n.property.name }
        : null;
    case 'binaryExpression': {
      if (n.operator !== 'of' || !n.left || !n.right) return null;
      const inner = splitStyleExpression(n.left);
      return inner && !inner.owner ? { owner: n.right, name: inner.name } : null;
    }
    case 'propertyOfExpression':
      return n.target && typeof n.property?.name === 'string'
        ? { owner: n.target, name: n.property.name }
        : null;
    default:
      return null;
  }
}

function propertyNode(name: string, lead: Token, ctx: ParserContext): ASTNode {
  return {
    type: 'string',
    value: name,
    start: lead.start || 0,
    end: ctx.getPosition().end,
    line: lead.line,
    column: lead.column,
  };
}

/**
 * Another pair follows unless the command ends here: at a boundary, at the
 * `over` / `using` / `with` tail, or at a comment. Upstream's loop is the same
 * (`while (!commandBoundary && not over && not using)`).
 */
function startsAnotherPair(ctx: ParserContext): boolean {
  if (ctx.isAtEnd() || isComment(ctx.peek())) return false;
  if (isKeyword(ctx.peek(), ['over', 'using', KEYWORDS.WITH])) return false;
  return !isCommandBoundary(ctx, ['catch', 'finally', 'on']);
}

/** The pairs after the first, as an `arrayLiteral` of `objectLiteral`s. */
function pairsNode(pairs: TransitionPair[]): ASTNode {
  const field = (name: string, value: ASTNode) => ({
    key: {
      type: 'identifier',
      name,
      start: value.start,
      end: value.end,
      line: value.line,
      column: value.column,
    } as ASTNode,
    value,
  });
  const elements = pairs.map(pair => {
    const properties = [field('property', pair.property), field('to', pair.to)];
    if (pair.owner) properties.push(field('owner', pair.owner));
    if (pair.from) properties.push(field('from', pair.from));
    return {
      type: 'objectLiteral',
      properties,
      start: (pair.owner ?? pair.property).start,
      end: pair.to.end,
      line: (pair.owner ?? pair.property).line,
      column: (pair.owner ?? pair.property).column,
    } as ASTNode;
  });
  const firstEl = elements[0]!;
  const lastEl = elements[elements.length - 1]!;
  return {
    type: 'arrayLiteral',
    elements,
    start: firstEl.start,
    end: lastEl.end,
    line: firstEl.line,
    column: firstEl.column,
  } as ASTNode;
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

  const modifiers: SlotMap<'start'> = {};

  // Optional `using <name>` — sets the view-transition-name CSS property.
  if (ctx.match('using')) {
    const nameExpr = ctx.parsePrimary();
    modifiers.transitionName = nameExpr as ExpressionNode;
  }

  // Body: sequence of commands terminated by `end`.
  const body = ctx.parseCommandListUntilEnd('start view transition');

  return CommandNodeBuilder.fromIdentifier<'start'>(identifierNode)
    .withArgs(...body)
    .withModifiers(modifiers)
    .endingAt(ctx.getPosition())
    .build();
}
