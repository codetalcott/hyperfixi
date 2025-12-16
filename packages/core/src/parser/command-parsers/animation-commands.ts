/**
 * Animation Command Parsers
 *
 * Pure function implementations of animation-related command parsers.
 * These functions use ParserContext for dependency injection, enabling
 * clean separation from the Parser class.
 *
 * Phase 9-3b: Command Extraction (Batch 2)
 * @module parser/command-parsers/animation-commands
 */

import type { ParserContext, IdentifierNode } from '../parser-types';
import type { ASTNode, ExpressionNode, Token } from '../../types/core';
import { CommandNodeBuilder } from '../command-node-builder';
import { KEYWORDS } from '../parser-constants';
// Phase 4: Import token predicates for direct token checks
import { isIdentifierLike } from '../token-predicates';

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
 *
 * Phase 9-3b: Extracted from Parser.parseMeasureCommand
 */
export function parseMeasureCommand(
  ctx: ParserContext,
  identifierNode: IdentifierNode
) {
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
  // Phase 4: Using predicate methods instead of direct TokenType checks
  if (
    ctx.checkAnySelector() ||
    ctx.checkContextVar() ||
    ctx.match('<')
  ) {
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
      // Phase 4: Using predicate method
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
      // Phase 4: Combined IDENTIFIER/KEYWORD check into single predicate
      const property = ctx.parsePrimary();
      args.push(property);
    }
  } else if (ctx.checkIdentifierLike()) {
    // Phase 4: Combined IDENTIFIER/KEYWORD check into single predicate
    // Just a property name without target: "measure width"
    const property = ctx.parsePrimary();
    args.push(property);
  }

  // Parse optional "and set <variable>" modifier
  if (ctx.match('and')) {
    if (ctx.match('set')) {
      // Phase 4: Using predicate method for variable name check
      if (ctx.checkIdentifierLike()) {
        const variableName = ctx.advance();
        modifiers['set'] = {
          type: 'identifier',
          name: variableName.value,
          start: variableName.start,
          end: variableName.end,
          line: variableName.line,
          column: variableName.column,
        } as ExpressionNode;
      }
    }
  }

  // Phase 2 Refactoring: Use CommandNodeBuilder for consistent node construction
  const builder = CommandNodeBuilder.fromIdentifier(identifierNode)
    .withArgs(...args)
    .endingAt(ctx.getPosition());

  if (Object.keys(modifiers).length > 0) {
    builder.withModifiers(modifiers);
  }

  return builder.build();
}

/**
 * Parse transition command
 *
 * Syntax: transition <property> to <value> [over <duration>] [with <timing-function>]
 *
 * This command transitions a CSS property to a target value with optional
 * duration and timing function. Supports hyphenated CSS properties.
 *
 * Examples:
 *   - transition opacity to 0.5
 *   - transition *background-color to 'red' over 2s
 *   - transition width to 100px over 1s with ease-in-out
 *
 * @param ctx - Parser context providing access to parser state and methods
 * @param commandToken - The 'transition' command token
 * @returns CommandNode representing the transition command
 *
 * Phase 9-3b: Extracted from Parser.parseTransitionCommand
 */
export function parseTransitionCommand(
  ctx: ParserContext,
  commandToken: Token
) {
  const args: ASTNode[] = [];
  const modifiers: Record<string, ExpressionNode> = {};

  // Parse optional target (if it looks like a selector or identifier followed by a property)
  let property: ASTNode | null = null;

  // Look ahead to determine if first token is a target or property
  const firstToken = ctx.peek();

  // Parse property (required)
  // Property can be:
  // - identifier (opacity, width, etc.)
  // - identifier with * prefix (*background-color)
  // Phase 4: Using predicate for direct token check
  if (isIdentifierLike(firstToken) || firstToken.value === '*') {
    let propertyValue = '';

    // Handle wildcard prefix
    if (ctx.check('*')) {
      propertyValue = '*';
      ctx.advance();
    }

    // Get property name
    // Phase 4: Using predicate method for property name checks
    if (ctx.checkIdentifierLike()) {
      propertyValue += ctx.peek().value;
      ctx.advance();

      // Handle hyphenated properties (background-color)
      while (ctx.check('-') && !ctx.isAtEnd()) {
        propertyValue += '-';
        ctx.advance();
        if (ctx.checkIdentifierLike()) {
          propertyValue += ctx.peek().value;
          ctx.advance();
        }
      }

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

  args.push(property);

  // Parse 'to' keyword and value (required) - store in modifiers for V2 command
  if (!ctx.check(KEYWORDS.TO)) {
    throw new Error('Expected "to" keyword after property in transition command');
  }
  ctx.advance(); // consume 'to'

  // Parse target value (can be template string, number, color, etc.)
  const value = ctx.parsePrimary();
  modifiers['to'] = value as ExpressionNode;

  // Parse optional 'over <duration>' - store in modifiers
  if (ctx.check('over')) {
    ctx.advance(); // consume 'over'
    const duration = ctx.parsePrimary();
    modifiers['over'] = duration as ExpressionNode;
  }

  // Parse optional 'with <timing-function>' - store in modifiers
  if (ctx.check(KEYWORDS.WITH)) {
    ctx.advance(); // consume 'with'
    const timingFunction = ctx.parsePrimary();
    modifiers['with'] = timingFunction as ExpressionNode;
  }

  // Phase 2 Refactoring: Use CommandNodeBuilder for consistent node construction
  return CommandNodeBuilder.from(commandToken)
    .withArgs(...args)
    .withModifiers(modifiers)
    .endingAt(ctx.getPosition())
    .build();
}
