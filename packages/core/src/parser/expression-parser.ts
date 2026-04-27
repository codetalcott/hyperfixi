/**
 * Expression Parser Integration
 * Bridges string input to expression evaluation via AST parsing
 */

import { debug } from '../utils/debug';
import type { ExecutionContext, TypedExecutionContext, ASTNode } from '../types/base-types';
import { tokenize } from './tokenizer';
import type { Token } from './tokenizer';
import {
  mergeFragments,
  CORE_FRAGMENT,
  PARSER_COMPARISON_FRAGMENT,
  STOP_TOKENS as PRATT_STOP_TOKENS,
  STOP_DELIMITERS as PRATT_STOP_DELIMITERS,
  type BindingPowerFragment,
  type BindingPowerEntry,
  leftAssoc,
  prefix,
} from './pratt-parser';
// Phase 7: Import token predicates for full TokenType removal
import {
  isIdentifierLike,
  isSelector,
  isBasicSelector,
  isLiteral,
  isOperator,
  isReference,
  isSymbol,
  isLogicalOperator,
  isComparisonOperator,
  hasValue,
  isDot,
  isOptionalChain,
  isOpenBracket,
  isOpenParen,
  isPossessive,
  // Specific type predicates
  isIdentifier,
  isString,
  isNumber,
  isBoolean,
  isTemplateLiteral,
  isQueryReference,
  isIdSelector,
  isClassSelector,
  isContextVar,
  isKeyword,
  isGlobalVar,
  isBasicOperator,
} from './token-predicates';

// Import enhanced expression implementations
import { comparisonExpressions } from '../expressions/comparison/index';
import { mathematicalExpressions } from '../expressions/mathematical/index';
import { propertyExpressions } from '../expressions/property/index';
import { positionalExpressions } from '../expressions/positional/index';
import { logicalExpressions } from '../expressions/logical/index';
import { referencesExpressions } from '../expressions/references/index';
import {
  isElement,
  getElementProperty,
  accessAttribute,
} from '../expressions/property-access-utils';

// Import legacy conversion system for Date conversion compatibility
import { conversionExpressions as legacyConversionExpressions } from '../expressions/conversion/index';

// Keep comparison alias for backward compatibility (logicalExpressions is now imported directly)
const specialExpressions = mathematicalExpressions;
// propertyExpressions already imported with correct name
const conversionExpressions = legacyConversionExpressions; // Use legacy system for Date conversion
// positionalExpressions already imported with correct name

// Helper function to convert ExecutionContext to TypedExecutionContext
// Note: Returns any to avoid type conflicts between base-types and unified-types definitions
function toTypedContext(context: ExecutionContext): any {
  return {
    ...context,
    evaluationHistory: (context as unknown as Record<string, unknown>).evaluationHistory || [],
  };
}

/** Access string property from an ASTNode via index signature (avoids `as any`) */
function nodeStr(node: ASTNode, key: string): string | undefined {
  return (node as Record<string, unknown>)[key] as string | undefined;
}

// Helper function to process escape sequences in strings
function processEscapeSequences(str: string): string {
  return str.replace(/\\(.)/g, (_match, char) => {
    switch (char) {
      case 'n':
        return '\n';
      case 't':
        return '\t';
      case 'r':
        return '\r';
      case 'b':
        return '\b';
      case 'f':
        return '\f';
      case 'v':
        return '\v';
      case '0':
        return '\0';
      case '\\':
        return '\\';
      case '"':
        return '"';
      case "'":
        return "'";
      case '`':
        return '`';
      default:
        return char; // For any other escaped char, just return the char
    }
  });
}

// Helper function to extract value from TypedResult objects
async function extractValue(result: any): Promise<any> {
  // If it's already a primitive value, return as-is
  if (typeof result !== 'object' || result === null) {
    return result;
  }

  // If it's a Promise, await it first
  if (result && typeof result.then === 'function') {
    result = await result;
  }

  // If it's a TypedResult object, extract the value
  if (result && typeof result === 'object' && 'success' in result && 'value' in result) {
    if (result.success) {
      return result.value;
    } else {
      // If the result failed, throw an error
      const errors = result.errors || [];
      const errorMessage = errors.length > 0 ? errors[0].message : 'Expression evaluation failed';
      throw new Error(errorMessage);
    }
  }

  // Otherwise, return the result as-is
  return result;
}

// Helper to create identifier AST nodes
function createIdentifierNode(name: string, token: { start?: number; end?: number }): ASTNode {
  return {
    type: 'identifier',
    name,
    ...(token.start !== undefined && { start: token.start }),
    ...(token.end !== undefined && { end: token.end }),
  };
}

// Helper to create literal AST nodes
function createLiteralNode(
  value: any,
  valueType: string,
  token: { start?: number; end?: number }
): ASTNode {
  return {
    type: 'literal',
    value,
    valueType,
    ...(token.start !== undefined && { start: token.start }),
    ...(token.end !== undefined && { end: token.end }),
  };
}

/**
 * Parse comma-separated arguments until closing parenthesis
 *
 * @param state - Parser state
 * @returns Array of parsed argument nodes
 */
function parseArguments(state: ParseState): ASTNode[] {
  const args: ASTNode[] = [];
  let currentToken = peek(state);
  while (currentToken && currentToken.value !== ')') {
    const arg = prattParseExpr(state, 0);
    args.push(arg);
    currentToken = peek(state);
    if (currentToken && currentToken.value === ',') {
      advance(state);
      currentToken = peek(state);
    } else {
      break;
    }
  }
  return args;
}

/**
 * Check if a value is empty
 *
 * Empty values: null, undefined, empty string, empty array, empty object, empty NodeList
 * NOT empty: false, 0 (these are valid values, just falsy)
 *
 * @param value - Value to check
 * @returns true if the value is empty
 */
function isEmpty(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.length === 0;
  if (Array.isArray(value)) return value.length === 0;
  // NodeList/HTMLCollection check
  if (
    value &&
    typeof value === 'object' &&
    'length' in value &&
    typeof (value as { length: number }).length === 'number'
  ) {
    return (value as { length: number }).length === 0;
  }
  if (typeof value === 'object' && value !== null) return Object.keys(value).length === 0;
  // For booleans and numbers, they are NOT empty - they have a value
  return false;
}

// Expression implementations would be imported when needed for evaluation

interface ParseState {
  tokens: Token[];
  position: number;
}

export class ExpressionParseError extends Error {
  constructor(message: string, position?: number) {
    super(position !== undefined ? `${message} at position ${position}` : message);
    this.name = 'ExpressionParseError';
  }
}

/**
 * Main entry point: Parse and evaluate a hyperscript expression from string
 */
export async function parseAndEvaluateExpression(
  expressionString: string,
  context: ExecutionContext
): Promise<any> {
  try {
    // Step 1: Tokenize the input
    const tokens = tokenize(expressionString);

    // Step 2: Parse tokens into AST
    const ast = parseExpression(tokens);

    // Step 3: Evaluate AST using our expression system
    return await evaluateASTNode(ast, context);
  } catch (error) {
    if (error instanceof ExpressionParseError) {
      throw error;
    }
    throw new ExpressionParseError(`Failed to parse expression: ${error}`);
  }
}

/**
 * Parse tokens into an AST node
 */
function parseExpression(tokens: Token[]): ASTNode {
  const state: ParseState = { tokens, position: 0 };

  if (tokens.length === 0) {
    throw new ExpressionParseError('Empty expression');
  }

  const ast = prattParseExpr(state, 0);

  // Ensure we've consumed all tokens
  if (state.position < tokens.length) {
    throw new ExpressionParseError(
      `Unexpected token: ${tokens[state.position].value}`,
      state.position
    );
  }

  return ast;
}

// =============================================================================
// Pratt Expression Parser (Phase 2.2b)
// Replaces ~250 lines of precedence climbing with a single data-driven loop.
// =============================================================================

/**
 * Expression-parser binding power table.
 * Extends CORE + PARSER_COMPARISON with a custom 'as' handler for parameterized types.
 */
const EXPR_AS_FRAGMENT: BindingPowerFragment = new Map<string, BindingPowerEntry>([
  [
    'as',
    leftAssoc(70, (left, _token, ctx) => {
      const readTypeName = (): { name: string; end: number | undefined } => {
        const typeToken = ctx.advance();
        if (!typeToken) {
          throw new ExpressionParseError('Expected type after "as"');
        }
        // Handle parameterized types like "Fixed:2"
        let typeName = typeToken.value;
        let end = typeToken.end;
        if (ctx.peek()?.value === ':') {
          ctx.advance(); // consume ':'
          const paramToken = ctx.advance();
          if (paramToken) {
            typeName += ':' + paramToken.value;
            end = paramToken.end;
          }
        }
        return { name: typeName, end };
      };

      const first = readTypeName();
      let node: Record<string, unknown> = {
        type: 'asExpression',
        expression: left,
        targetType: first.name,
        ...(left.start !== undefined && { start: left.start }),
        end: first.end,
      };

      // Pipe operator `|` chains conversions left-to-right (upstream 0.9.90).
      // `form as Values | FormEncoded` parses as
      // `(form as Values) as FormEncoded`.
      while (ctx.peek()?.value === '|') {
        ctx.advance(); // consume '|'
        const next = readTypeName();
        node = {
          type: 'asExpression',
          expression: node,
          targetType: next.name,
          ...(node.start !== undefined && { start: node.start }),
          end: next.end,
        };
      }

      return node as never;
    }) as BindingPowerEntry,
  ],
]);

/** Positional prefix fragment for expression-parser (first/last with argument handling). */
/**
 * Build a positional prefix handler (`first` / `last`) that scopes its operand
 * to a *primary* expression so trailing possessives apply to the positional
 * result rather than being eaten by it.
 *
 * `first .test-item's textContent` parses as `(first .test-item)'s textContent`,
 * not `first (.test-item's textContent)` — which would degenerate to picking
 * the first character of the textContent string.
 *
 * Calling `ctx.parseExpr(85)` here fell through to `parsePossessiveExpression`
 * (the NUD fallback in `prattParseExpr`), which is not bp-aware and consumed
 * the whole possessive chain. We instead call `ctx.parsePrimary()` and then
 * re-attach any trailing `'s` chain on the outside.
 */
function makePositionalHandler(_bp: number) {
  return (token: Token, ctx: any) => {
    const nextToken = ctx.peek();
    if (!nextToken) {
      return {
        type: 'positionalExpression',
        operator: token.value,
        argument: null,
        start: token.start,
        end: token.end,
      };
    }
    const operand = ctx.parsePrimary() as ASTNode;
    let node: ASTNode = {
      type: 'positionalExpression',
      operator: token.value,
      argument: operand,
      start: token.start,
      ...(operand.end !== undefined && { end: operand.end }),
    } as ASTNode;

    // Re-attach trailing possessive so `(first X)'s prop` parses correctly.
    while (ctx.checkPossessive()) {
      ctx.advance(); // consume 's
      const property = ctx.parsePrimary() as ASTNode;
      node = {
        type: 'possessiveExpression',
        object: node,
        property,
        ...(node.start !== undefined && { start: node.start }),
        ...(property.end !== undefined && { end: property.end }),
      } as ASTNode;
    }
    return node;
  };
}

const EXPR_POSITIONAL_FRAGMENT: BindingPowerFragment = new Map<string, BindingPowerEntry>([
  ['first', prefix(85, makePositionalHandler(85)) as BindingPowerEntry],
  ['last', prefix(85, makePositionalHandler(85)) as BindingPowerEntry],
]);

const EXPR_TABLE = mergeFragments(
  CORE_FRAGMENT,
  PARSER_COMPARISON_FRAGMENT,
  EXPR_AS_FRAGMENT,
  EXPR_POSITIONAL_FRAGMENT
);

/**
 * Pratt expression parser for standalone expression evaluation.
 * Replaces the cascading parseLogicalExpression → parseComparisonExpression →
 * parseArithmeticExpression → parseAsExpression chain.
 *
 * @param state - Parser state (tokens + position)
 * @param minBp - Minimum binding power to continue parsing infix operators
 */
function prattParseExpr(state: ParseState, minBp: number): ASTNode {
  // --- NUD (prefix / atom) ---
  const firstToken = peek(state);
  if (!firstToken) {
    throw new ExpressionParseError('Unexpected end of expression');
  }

  const prefixEntry = EXPR_TABLE.get(firstToken.value);
  let left: ASTNode;

  if (prefixEntry?.prefix) {
    advance(state); // consume the prefix operator

    // Create a PrattContext adapter for the handler
    const ctx = makePrattCtx(state);
    left = prefixEntry.prefix.handler(firstToken, ctx);
  } else {
    // Fallback: possessive chain → primary expression (atoms + postfix)
    left = parsePossessiveExpression(state);
  }

  // --- LED (infix) loop ---
  while (state.position < state.tokens.length) {
    const nextToken = state.tokens[state.position];

    // Check infix table first (handles 'in' dual role)
    const infixEntry = EXPR_TABLE.get(nextToken.value);
    if (!infixEntry?.infix) {
      // Not an operator — stop at delimiters
      if (PRATT_STOP_DELIMITERS.has(nextToken.value)) break;
      break;
    }

    const [leftBp] = infixEntry.infix.bp;
    if (leftBp < minBp) break;

    advance(state); // consume the infix operator

    const ctx = makePrattCtx(state);
    left = infixEntry.infix.handler(left, nextToken, ctx);
  }

  return left;
}

/** Create a PrattContext adapter that bridges ParseState to the Pratt handler interface. */
function makePrattCtx(state: ParseState) {
  return {
    peek: () => peek(state),
    advance: () => advance(state)!,
    parseExpr: (bp: number) => prattParseExpr(state, bp),
    /** Parse a primary expression (atoms only) — no possessive chaining. */
    parsePrimary: () => parsePrimaryExpression(state),
    isStopToken: () => {
      const t = peek(state);
      if (!t) return true;
      return PRATT_STOP_TOKENS.has(t.value) || PRATT_STOP_DELIMITERS.has(t.value);
    },
    atEnd: () => state.position >= state.tokens.length,
    /** Check whether the current token is the possessive `'s` operator. */
    checkPossessive: () => {
      const t = peek(state);
      return t ? isPossessive(t) : false;
    },
  };
}

/**
 * Parse possessive expressions (obj's property, my property, its property)
 */
function parsePossessiveExpression(state: ParseState): ASTNode {
  let left = parsePrimaryExpression(state);

  while (state.position < state.tokens.length) {
    const token = state.tokens[state.position];

    // Handle possessive syntax with apostrophe (obj's property) - supports chaining
    // Phase 6: Using predicate for possessive operator check
    if (isPossessive(token)) {
      state.position++; // consume "'s" operator

      // Check for CSS property syntax: *property (e.g., #element's *opacity)
      let property: ASTNode;
      const nextToken = peek(state);

      if (nextToken && isBasicOperator(nextToken) && nextToken.value === '*') {
        // Consume the * operator
        state.position++;
        const cssPropertyStart = nextToken.start;

        // Parse the property name after *
        const propertyName = parsePrimaryExpression(state);

        // Create identifier with * prefix
        property = createIdentifierNode(
          '*' + (nodeStr(propertyName, 'name') || nodeStr(propertyName, 'value')),
          { start: cssPropertyStart, end: propertyName.end }
        );
      } else {
        // Normal property access
        property = parsePrimaryExpression(state);
      }

      left = {
        type: 'possessiveExpression',
        object: left,
        property,
        ...(left.start !== undefined && { start: left.start }),
        ...(property.end !== undefined && { end: property.end }),
      };
      // Continue loop to handle chained possessive (obj's prop1's prop2)
      continue;
    }
    // Handle context possessive syntax (my property, its property, your property)
    else if (
      left.type === 'identifier' &&
      ['my', 'its', 'your'].includes(nodeStr(left, 'name') ?? '') &&
      (isIdentifier(token) || isContextVar(token))
    ) {
      const property = parsePrimaryExpression(state);

      left = {
        type: 'contextPossessive',
        contextType: nodeStr(left, 'name'),
        property,
        ...(left.start !== undefined && { start: left.start }),
        ...(property.end !== undefined && { end: property.end }),
      };
      // Continue loop to handle chained possessive (my prop's subprop)
      continue;
    }
    // Handle "the X of Y" pattern (the property of element)
    else if (left.type === 'identifier' && nodeStr(left, 'name') === 'the' && isIdentifier(token)) {
      // Lookahead to check if this is actually a "the X of Y" pattern
      // before consuming the property token
      const nextToken = peek(state);
      const tokenAfterNext =
        state.position + 1 < state.tokens.length ? state.tokens[state.position + 1] : null;

      // Only proceed if we have "X of Y" pattern
      if (nextToken && tokenAfterNext && tokenAfterNext.value === 'of') {
        const property = parsePrimaryExpression(state); // property name

        // Check for "of" keyword (should always be true due to lookahead)
        const ofToken = peek(state);
        if (ofToken && isKeyword(ofToken) && ofToken.value === 'of') {
          state.position++; // consume 'of'

          const target = parsePrimaryExpression(state); // target element

          left = {
            type: 'propertyOfExpression',
            property,
            target,
            ...(left.start !== undefined && { start: left.start }),
            ...(target.end !== undefined && { end: target.end }),
          };
        } else {
          // This shouldn't happen due to lookahead, but handle anyway
          throw new ExpressionParseError('Expected "of" after property in "the X of Y" pattern');
        }
      } else {
        // No "of" pattern — treat "the" as an article prefix (syntactic sugar).
        // This handles "the event.dataTransfer.effectAllowed", "the event.target", etc.
        const articleTarget = parsePrimaryExpression(state);
        // Guard against "the the" infinite loop
        if (nodeStr(articleTarget, 'name') !== 'the') {
          left = articleTarget;
          continue; // Continue loop so .Y can be parsed as property access
        }
        // else: double "the" — fall through to break
      }
    }
    // Handle dot notation property access (obj.property)
    // Phase 6: Using predicate for dot operator check
    else if (isDot(token)) {
      state.position++; // consume '.'

      // Next token should be an identifier for the property name
      const propertyToken = advance(state);
      if (!propertyToken || !isIdentifier(propertyToken)) {
        throw new ExpressionParseError('Expected property name after "."');
      }

      // Map possessive pronouns to their context variables for dot notation
      // This enables my.textContent, its.value, your.name as alternatives to
      // me.textContent, it.value, you.name
      let object = left;
      if (left.type === 'identifier') {
        const name = nodeStr(left, 'name');
        if (name === 'my' || name === 'its' || name === 'your') {
          const mappedName = name === 'my' ? 'me' : name === 'its' ? 'it' : 'you';
          object = createIdentifierNode(mappedName, left);
        }
      }

      left = {
        type: 'propertyAccess',
        object,
        property: createIdentifierNode(propertyToken.value, propertyToken),
        ...(left.start !== undefined && { start: left.start }),
        end: propertyToken.end,
      };
      // Continue loop to handle chained property access (obj.prop1.prop2)
      continue;
    }
    // Handle optional chaining (obj?.property)
    // Phase 6: Using predicate for optional chaining check
    else if (isOptionalChain(token)) {
      state.position++; // consume '?.'

      // Next token should be an identifier for the property name
      const propertyToken = advance(state);
      if (!propertyToken || !isIdentifier(propertyToken)) {
        throw new ExpressionParseError('Expected property name after "?."');
      }

      // Map possessive pronouns to their context variables for optional chaining
      // This enables my?.value, its?.value, your?.value
      let object = left;
      if (left.type === 'identifier') {
        const name = nodeStr(left, 'name');
        if (name === 'my' || name === 'its' || name === 'your') {
          const mappedName = name === 'my' ? 'me' : name === 'its' ? 'it' : 'you';
          object = createIdentifierNode(mappedName, left);
        }
      }

      left = {
        type: 'optionalChain',
        object,
        property: createIdentifierNode(propertyToken.value, propertyToken),
        optional: true,
        ...(left.start !== undefined && { start: left.start }),
        end: propertyToken.end,
      };
      // Continue loop to handle chained access (obj?.prop1?.prop2)
      continue;
    }
    // Handle array access (arr[index])
    // Phase 6: Using predicate for open bracket check
    else if (isOpenBracket(token)) {
      state.position++; // consume '['

      // Check for range syntax: [..end], [start..end], [start..]
      const nextToken = peek(state);

      // Handle [..end] - first N elements
      if (nextToken && nextToken.value === '..') {
        // Consume '..' token
        advance(state);

        // Parse end index (or could be ']' for [..])
        const checkBracket = peek(state);
        if (checkBracket && checkBracket.value === ']') {
          // [..] - all elements (same as no index)
          advance(state); // consume ']'
          left = {
            type: 'arrayRangeAccess',
            object: left,
            startExpr: undefined,
            endExpr: undefined,
          } as ASTNode;
          continue;
        }

        const endIndex = prattParseExpr(state, 0);
        const closeToken = advance(state);
        if (!closeToken || closeToken.value !== ']') {
          throw new ExpressionParseError('Expected closing bracket after range');
        }

        left = {
          type: 'arrayRangeAccess',
          object: left,
          startExpr: undefined,
          endExpr: endIndex,
        } as ASTNode;
        continue;
      }

      // Parse potential start index
      const startIndex = prattParseExpr(state, 0);

      // Check for '..' after start index
      const afterStart = peek(state);
      if (afterStart && afterStart.value === '..') {
        // Consume '..' token
        advance(state);

        // Check if followed by ']' for [start..]
        const checkEnd = peek(state);
        if (checkEnd && checkEnd.value === ']') {
          advance(state); // consume ']'
          left = {
            type: 'arrayRangeAccess',
            object: left,
            startExpr: startIndex,
            endExpr: undefined,
          } as ASTNode;
          continue;
        }

        // Parse end index for [start..end]
        const endIndex = prattParseExpr(state, 0);
        const closeToken = advance(state);
        if (!closeToken || closeToken.value !== ']') {
          throw new ExpressionParseError('Expected closing bracket after range');
        }

        left = {
          type: 'arrayRangeAccess',
          object: left,
          startExpr: startIndex,
          endExpr: endIndex,
        } as ASTNode;
        continue;
      }

      // Not a range, just regular array access
      const closeToken = advance(state);
      if (!closeToken || closeToken.value !== ']') {
        throw new ExpressionParseError('Expected closing bracket after array index');
      }

      left = {
        type: 'arrayAccess',
        object: left,
        index: startIndex,
        ...(left.start !== undefined && { start: left.start }),
        end: closeToken.end,
      };
      // Continue loop to handle chained array access (arr[0][1])
      continue;
    }
    // Handle method calls (obj.method())
    // Phase 6: Using predicate for function call check
    else if (isOpenParen(token)) {
      state.position++; // consume '('
      const args = parseArguments(state);

      // Consume closing paren
      const closeParen = advance(state);
      if (!closeParen || closeParen.value !== ')') {
        throw new ExpressionParseError('Expected closing parenthesis');
      }

      left = {
        type: 'callExpression',
        callee: left,
        arguments: args,
        ...(left.start !== undefined && { start: left.start }),
        end: closeParen.end,
      };
      // Continue loop to handle chained method calls (obj.method().another())
      continue;
    } else {
      break;
    }
  }

  return left;
}

/**
 * Parse primary expressions (literals, identifiers, parentheses)
 */
function parsePrimaryExpression(state: ParseState): ASTNode {
  const token = peek(state);

  if (!token) {
    throw new ExpressionParseError('Unexpected end of expression');
  }

  // NOTE: Unary prefix operators (not, no, !, -, +) and positional expressions
  // (first, last) are now handled by the Pratt NUD phase in prattParseExpr().
  // parsePrimaryExpression is only reached for atoms (literals, identifiers, selectors, etc.)

  // Parenthesized expressions
  if (token.value === '(') {
    state.position++; // consume '('
    const expr = prattParseExpr(state, 0);
    const closeToken = advance(state);
    if (!closeToken || closeToken.value !== ')') {
      throw new ExpressionParseError('Expected closing parenthesis');
    }
    return expr;
  }

  // String literals
  if (isString(token)) {
    advance(state);
    // Remove quotes and process escape sequences
    const rawValue = token.value.slice(1, -1);
    const value = processEscapeSequences(rawValue);
    return createLiteralNode(value, 'string', token);
  }

  // Template literals
  if (isTemplateLiteral(token)) {
    advance(state);
    return {
      type: 'templateLiteral',
      value: token.value,
      start: token.start,
      end: token.end,
    };
  }

  // Number literals
  if (isNumber(token)) {
    advance(state);
    // Use parseFloat for all numbers to handle scientific notation (1e10) correctly
    // parseInt stops at 'e', but parseFloat handles it properly
    const floatValue = parseFloat(token.value);
    const value =
      Number.isInteger(floatValue) && !token.value.toLowerCase().includes('e')
        ? parseInt(token.value, 10)
        : floatValue;
    return createLiteralNode(value, 'number', token);
  }

  // Boolean literals
  if (isBoolean(token)) {
    advance(state);
    let value: any;
    let valueType: string;

    switch (token.value) {
      case 'true':
        value = true;
        valueType = 'boolean';
        break;
      case 'false':
        value = false;
        valueType = 'boolean';
        break;
      case 'null':
        value = null;
        valueType = 'null';
        break;
      case 'undefined':
        value = undefined;
        valueType = 'undefined';
        break;
      default:
        value = token.value === 'true';
        valueType = 'boolean';
    }

    return createLiteralNode(value, valueType, token);
  }

  // CSS ID selector (#id)
  // Phase 6: Using predicate - isIdSelector(token)
  if (isIdSelector(token)) {
    advance(state);
    return {
      type: 'cssSelector',
      selectorType: 'id',
      selector: token.value,
      start: token.start,
      end: token.end,
    };
  }

  // CSS class selector (.class)
  if (isClassSelector(token)) {
    advance(state);
    return {
      type: 'cssSelector',
      selectorType: 'class',
      selector: token.value,
      start: token.start,
      end: token.end,
    };
  }

  // Query reference (<selector/>)
  if (isQueryReference(token)) {
    advance(state);
    return {
      type: 'queryReference',
      selector: token.value,
      start: token.start,
      end: token.end,
    };
  }

  // Object literals ({key: value, ...})
  if (token.value === '{') {
    advance(state); // consume '{'

    const properties: { key: ASTNode; value: ASTNode }[] = [];

    // Handle empty object {}
    if (peek(state)?.value === '}') {
      advance(state); // consume '}'
      return {
        type: 'objectLiteral',
        properties,
        start: token.start,
        end: state.tokens[state.position - 1].end,
      };
    }

    // Parse object properties
    do {
      // Parse key (can be identifier or string)
      const keyToken = peek(state);
      if (!keyToken) {
        throw new ExpressionParseError('Expected property key in object literal');
      }

      let key: ASTNode;
      if (isIdentifier(keyToken)) {
        advance(state);
        key = createIdentifierNode(keyToken.value, keyToken);
      } else if (isString(keyToken)) {
        advance(state);
        key = createLiteralNode(keyToken.value.slice(1, -1), 'string', keyToken);
      } else {
        throw new ExpressionParseError(`Expected property key, got: ${keyToken.kind}`);
      }

      // Expect colon
      const colonToken = advance(state);
      if (!colonToken || colonToken.value !== ':') {
        throw new ExpressionParseError('Expected ":" after property key');
      }

      // Parse value
      const value = prattParseExpr(state, 0);

      properties.push({ key, value });

      // Check for comma or closing brace
      const nextToken = peek(state);
      if (nextToken?.value === ',') {
        advance(state); // consume ','
      } else if (nextToken?.value === '}') {
        break;
      } else {
        throw new ExpressionParseError('Expected "," or "}" in object literal');
      }
    } while (peek(state) && peek(state)!.value !== '}');

    // Consume closing brace
    const closeToken = advance(state);
    if (!closeToken || closeToken.value !== '}') {
      throw new ExpressionParseError('Expected closing brace "}" in object literal');
    }

    return {
      type: 'objectLiteral',
      properties,
      start: token.start,
      end: closeToken.end,
    };
  }

  // Array literals and bracket notation
  if (token.value === '[') {
    advance(state); // consume '['

    // Check if this is attribute syntax [@attr]
    const nextToken = peek(state);
    if (nextToken?.value === '@') {
      advance(state); // consume '@'
      const attrToken = advance(state);
      if (!attrToken || !isIdentifier(attrToken)) {
        throw new ExpressionParseError('Expected attribute name after @');
      }

      const closeToken = advance(state);
      if (!closeToken || closeToken.value !== ']') {
        throw new ExpressionParseError('Expected closing bracket after attribute name');
      }

      return {
        type: 'attributeAccess',
        attributeName: attrToken.value,
        start: token.start,
        end: closeToken.end,
      };
    } else {
      // Check if this is a standalone attribute selector [attr] or [attr="value"]
      const currentPos = state.position;
      const isAttributeSelector = looksLikeAttributeSelector(state, currentPos);

      if (isAttributeSelector) {
        // Parse as CSS attribute selector
        return parseAttributeSelector(state, token);
      }

      // Check if this is an array literal by looking for array-like patterns
      // Array literal if: [], [expr], [expr, expr], etc.
      let isArrayLiteral = false;

      // If immediately followed by ], it's an empty array
      if (nextToken?.value === ']') {
        isArrayLiteral = true;
      } else {
        // Look ahead to see if there are commas (array) or no commas (bracket expression)
        let lookahead = currentPos;
        let bracketDepth = 1;
        let foundComma = false;

        while (lookahead < state.tokens.length && bracketDepth > 0) {
          const tok = state.tokens[lookahead];
          if (tok.value === '[') bracketDepth++;
          if (tok.value === ']') bracketDepth--;
          if (tok.value === ',' && bracketDepth === 1) {
            foundComma = true;
            break;
          }
          lookahead++;
        }

        // If we found a comma at the top level, it's an array literal
        if (foundComma) {
          isArrayLiteral = true;
        }
      }

      if (isArrayLiteral) {
        // Parse as array literal
        const elements: ASTNode[] = [];

        // Handle empty array
        if (peek(state)?.value === ']') {
          advance(state); // consume ']'
          return {
            type: 'arrayLiteral',
            elements,
            start: token.start,
            end: state.tokens[state.position - 1].end,
          };
        }

        // Parse array elements
        do {
          elements.push(prattParseExpr(state, 0));

          if (peek(state)?.value === ',') {
            advance(state); // consume ','
          } else {
            break;
          }
        } while (peek(state) && peek(state)!.value !== ']');

        const closeToken = advance(state);
        if (!closeToken || closeToken.value !== ']') {
          throw new ExpressionParseError('Expected closing bracket in array literal');
        }

        return {
          type: 'arrayLiteral',
          elements,
          start: token.start,
          end: closeToken.end,
        };
      } else {
        // Handle as bracket expression [expr]
        const expr = prattParseExpr(state, 0);
        const closeToken = advance(state);
        if (!closeToken || closeToken.value !== ']') {
          throw new ExpressionParseError('Expected closing bracket');
        }

        return {
          type: 'bracketExpression',
          expression: expr,
          start: token.start,
          end: closeToken.end,
        };
      }
    }
  }

  // Global variables ($identifier)
  if (isGlobalVar(token)) {
    const globalToken = advance(state)!;
    return {
      type: 'globalVariable',
      name: globalToken.value, // e.g., "$global"
      start: globalToken.start,
      end: globalToken.end,
    };
  }

  // Context variables, identifiers, and keywords (keywords can be used as identifiers in expression contexts)
  if (
    isContextVar(token) ||
    isIdentifier(token) ||
    (isKeyword(token) &&
      // Exclude keywords with special handling
      token.value !== 'new' &&
      token.value !== 'null' &&
      token.value !== 'undefined')
  ) {
    const identifierToken = advance(state)!;

    // Check for function call syntax: identifier()
    const nextToken = peek(state);
    if (nextToken && nextToken.value === '(') {
      advance(state); // consume '('
      const args = parseArguments(state);

      // Consume closing paren
      const closeParen = peek(state);
      if (!closeParen || closeParen.value !== ')') {
        throw new ExpressionParseError('Expected closing parenthesis');
      }
      advance(state);

      return {
        type: 'callExpression',
        callee: createIdentifierNode(identifierToken.value, identifierToken),
        arguments: args,
        start: identifierToken.start,
        end: closeParen.end,
      };
    }

    // Handle special literal identifiers
    if (identifierToken.value === 'null') {
      return createLiteralNode(null, 'null', identifierToken);
    }

    if (identifierToken.value === 'undefined') {
      return createLiteralNode(undefined, 'undefined', identifierToken);
    }

    // Regular identifier
    return createIdentifierNode(identifierToken.value, identifierToken);
  }

  // Handle constructor calls with 'new' keyword
  if (isKeyword(token) && token.value === 'new') {
    debug.parse('EXPR: Found constructor call, parsing...', {
      token: token.value,
      kind: token.kind,
    });
    const newToken = advance(state); // consume 'new'
    const constructorToken = peek(state);
    debug.parse('EXPR: Constructor token:', {
      token: constructorToken?.value,
      kind: constructorToken?.kind,
    });

    if (!constructorToken || !isIdentifier(constructorToken)) {
      throw new ExpressionParseError('Expected constructor name after "new"');
    }

    advance(state); // consume constructor name

    // Expect opening parenthesis
    const openParen = peek(state);
    if (!openParen || openParen.value !== '(') {
      throw new ExpressionParseError('Expected "(" after constructor name');
    }

    advance(state); // consume '('

    // Parse arguments (for now, support empty argument list)
    const args: ASTNode[] = [];

    // Check for closing parenthesis (empty args)
    const closeParen = peek(state);
    if (!closeParen || closeParen.value !== ')') {
      throw new ExpressionParseError(
        'Expected ")" after constructor arguments (argument parsing not yet implemented)'
      );
    }

    advance(state); // consume ')'

    return {
      type: 'constructorCall',
      constructor: constructorToken.value,
      arguments: args,
      start: newToken!.start,
      end: closeParen.end,
    };
  }

  // Debug: Check if we're hitting this case for constructor calls
  if (isIdentifier(token) && token.value === 'Date') {
    debug.parse(
      'EXPR: Date token reached unexpected case - this suggests constructor parsing failed earlier'
    );
    debug.parse(
      'EXPR: Previous tokens:',
      state.tokens
        .slice(Math.max(0, state.position - 3), state.position)
        .map(t => ({ kind: t.kind, value: t.value }))
    );
  }

  // Handle standalone attribute reference syntax (@attribute)
  // Phase 6: Using predicate for symbol check
  if (isSymbol(token) && typeof token.value === 'string' && token.value.startsWith('@')) {
    advance(state); // consume @attribute token
    const attributeName = token.value.substring(1); // Remove '@' prefix
    return {
      type: 'attributeAccess',
      attributeName,
      start: token.start,
      end: token.end,
    };
  }

  // Enhanced debugging for other unexpected tokens
  debug.parse('EXPR: Unexpected token debug info:', {
    token: { kind: token.kind, value: token.value },
    position: state.position,
    allTokens: state.tokens
      .slice(Math.max(0, state.position - 2), state.position + 3)
      .map(t => ({ kind: t.kind, value: t.value })),
  });

  throw new ExpressionParseError(
    `Unexpected token: ${token.value} (kind: ${token.kind}) at position ${state.position}`,
    state.position
  );
}

/**
 * Peek at current token without consuming it
 */
function peek(state: ParseState): Token | undefined {
  return state.tokens[state.position];
}

/**
 * Consume and return current token
 */
function advance(state: ParseState): Token | undefined {
  return state.tokens[state.position++];
}

/**
 * Evaluate an AST node using our expression system
 */
async function evaluateASTNode(node: ASTNode, context: ExecutionContext): Promise<any> {
  switch (node.type) {
    case 'literal':
      return node.value;

    case 'templateLiteral':
      return evaluateTemplateLiteral(node, context);

    case 'identifier':
      return resolveIdentifier(String(node.name), context);

    case 'binaryExpression':
      return evaluateBinaryExpression(node, context);

    case 'possessiveExpression':
      return evaluatePossessiveExpression(node, context);

    case 'contextPossessive':
      return evaluateContextPossessive(node, context);

    case 'propertyOfExpression':
      return evaluatePropertyOfExpression(node, context);

    case 'constructorCall':
      return evaluateConstructorCall(node, context);

    case 'propertyAccess':
      return evaluatePropertyAccess(node, context);

    case 'optionalChain':
      return evaluateOptionalChain(node, context);

    case 'asExpression':
      return evaluateAsExpression(node, context);

    case 'cssSelector':
      return evaluateCSSSelector(node, context);

    case 'queryReference':
      return evaluateQueryReference(node, context);

    case 'attributeSelector':
      return evaluateAttributeSelector(node, context);

    case 'unaryExpression':
      return evaluateUnaryExpression(node, context);

    case 'attributeAccess':
      return evaluateAttributeAccess(node, context);

    case 'bracketExpression':
      return evaluateBracketExpression(node, context);

    case 'callExpression':
      return evaluateCallExpression(node, context);

    case 'arrayLiteral':
      return evaluateArrayLiteral(node, context);

    case 'objectLiteral':
      return evaluateObjectLiteral(node, context);

    case 'arrayAccess':
      return evaluateArrayAccess(node, context);

    case 'arrayRangeAccess':
      return evaluateArrayRangeAccess(node, context);

    case 'positionalExpression':
      return evaluatePositionalExpression(node, context);

    case 'globalVariable':
      return evaluateGlobalVariable(node, context);

    default:
      throw new ExpressionParseError(`Unknown AST node type: ${(node as { type: string }).type}`);
  }
}

/**
 * Resolve identifier to its value in context
 */
function resolveIdentifier(name: string, context: ExecutionContext): any {
  // Official _hyperscript variable resolution order: Meta → Local → Element → Global

  // 1. Meta scope - template variables and internal hyperscript state
  if (context.meta && typeof context.meta === 'object') {
    if (context.meta.hasOwnProperty(name)) {
      return context.meta[name];
    }
  }

  // 2. Local scope - variables from template arguments and function parameters
  if (context.locals && context.locals.has(name)) {
    return context.locals.get(name);
  }

  // 3. Element scope - context variables (me, I, you, it, result)
  // Note: 'I' is a _hyperscript alias for 'me' (case-sensitive to avoid conflict with loop var 'i')
  if (name === 'me' || name === 'I') return context.me;
  if (name === 'you') return context.you;
  if (name === 'it') return context.it;
  if (name === 'result') return context.result;

  // 4. Global scope - global variables
  if (context.globals && context.globals.has(name)) {
    return context.globals.get(name);
  }

  // 5. JavaScript global objects (Date, Math, Object, Array, etc.)
  if (typeof globalThis !== 'undefined' && name in globalThis) {
    return (globalThis as Record<string, unknown>)[name];
  }

  // Return undefined for unknown identifiers
  return undefined;
}

/**
 * Evaluate binary expressions using our expression implementations
 */
async function evaluateBinaryExpression(node: any, context: ExecutionContext): Promise<any> {
  const operator = node.operator;

  // Handle 'has'/'have' operator for CSS class checking (e.g., "me has .active" or "I have .active")
  if (operator === 'has' || operator === 'have') {
    const left = await evaluateASTNode(node.left, context);
    // Check if left is an Element and right is a class selector
    if (left instanceof Element) {
      // Handle both 'cssSelector' and 'selector' node types
      if (node.right.type === 'cssSelector' && node.right.selectorType === 'class') {
        const className = node.right.selector?.startsWith('.')
          ? node.right.selector.slice(1)
          : node.right.selector || '';
        return left.classList.contains(className);
      } else if (
        node.right.type === 'selector' &&
        typeof node.right.value === 'string' &&
        node.right.value.startsWith('.')
      ) {
        return left.classList.contains(node.right.value.slice(1));
      }
    }
    return false;
  }

  // Special handling for 'in' operator with positionalExpression wrapping a selector
  // e.g., "first .item in me" or "last <.item/> in me"
  // Scope the selector query to the right operand, then apply first/last
  if (
    operator === 'in' &&
    node.left?.type === 'positionalExpression' &&
    node.left.argument &&
    (node.left.argument.type === 'queryReference' || node.left.argument.type === 'cssSelector')
  ) {
    let selector: string;
    if (node.left.argument.type === 'queryReference') {
      selector = node.left.argument.selector;
      if (selector.startsWith('<') && selector.endsWith('/>')) {
        selector = selector.slice(1, -2).trim();
      }
    } else {
      selector = node.left.argument.selector;
    }

    const contextElement = await evaluateASTNode(node.right, context);
    if (!contextElement || typeof contextElement.querySelectorAll !== 'function') {
      throw new ExpressionParseError(
        `'in' operator requires a DOM element as the right operand (got: ${typeof contextElement})`
      );
    }

    const scopedResults = Array.from(contextElement.querySelectorAll(selector));
    const position = node.left.operator;

    if (position === 'first') {
      return scopedResults.length > 0 ? scopedResults[0] : null;
    } else if (position === 'last') {
      return scopedResults.length > 0 ? scopedResults[scopedResults.length - 1] : null;
    }

    return scopedResults;
  }

  // Special handling for 'in' operator with queryReference (e.g., <button/> in closest nav)
  // Don't evaluate the left side first - use it as a selector within the context element
  if (operator === 'in' && node.left?.type === 'queryReference') {
    // Convert hyperscript selector <tag/> to CSS selector (tag)
    let selector = node.left.selector;
    if (selector.startsWith('<') && selector.endsWith('/>')) {
      selector = selector.slice(1, -2).trim(); // Remove '<' and '/>' and whitespace
    }
    const contextElement = await evaluateASTNode(node.right, context);

    if (!contextElement || typeof contextElement.querySelectorAll !== 'function') {
      throw new ExpressionParseError(
        `'in' operator requires a DOM element as the right operand (got: ${typeof contextElement})`
      );
    }

    return Array.from(contextElement.querySelectorAll(selector));
  }

  const left = await evaluateASTNode(node.left, context);
  const right = await evaluateASTNode(node.right, context);

  // Map operators to our expression implementations
  switch (operator) {
    case 'and':
    case '&&':
      return left && right;
    case 'or':
    case '||':
      return left || right;
    case 'is':
    case 'equals':
    case '==':
      return await extractValue(
        logicalExpressions.equals.evaluate(toTypedContext(context), left, right)
      );
    case 'is not':
    case '!=':
      return await extractValue(
        logicalExpressions.notEquals.evaluate(toTypedContext(context), left, right)
      );
    case '===':
      return left === right;
    case '!==':
      return left !== right;
    case '>':
      return await extractValue(
        logicalExpressions.greaterThan.evaluate(toTypedContext(context), left, right)
      );
    case '<':
      return await extractValue(
        logicalExpressions.lessThan.evaluate(toTypedContext(context), left, right)
      );
    case '>=':
      return await extractValue(
        logicalExpressions.greaterThanOrEqual.evaluate(toTypedContext(context), left, right)
      );
    case '<=':
      return await extractValue(
        logicalExpressions.lessThanOrEqual.evaluate(toTypedContext(context), left, right)
      );
    case '+':
      return evaluateAddition(left, right);
    case '-':
      return await extractValue(
        specialExpressions.subtraction.evaluate(toTypedContext(context), { left, right })
      );
    case '*':
      return await extractValue(
        specialExpressions.multiplication.evaluate(toTypedContext(context), { left, right })
      );
    case '/':
      return await extractValue(
        specialExpressions.division.evaluate(toTypedContext(context), { left, right })
      );
    case '%':
    case 'mod':
      return await extractValue(
        specialExpressions.modulo.evaluate(toTypedContext(context), { left, right })
      );
    case '^':
    case '**':
      return Math.pow(Number(left), Number(right));
    case 'match':
    case 'matches':
      // Use the CSS-aware matches expression from logicalExpressions
      // This handles both DOM element CSS matching and string pattern matching
      return logicalExpressions.matches.evaluate(context, left, right);
    case 'contains':
    case 'include':
    case 'includes':
      return String(left).includes(String(right));
    case 'in':
      return evaluateInOperator(left, right, context);
    case 'does not contain':
      return !String(left).includes(String(right));
    case 'does not include':
      return !String(left).includes(String(right));
    case 'exists':
      return left != null;
    case 'is empty':
      return isEmpty(left);
    case 'is not empty':
      return !isEmpty(left);
    case 'is in':
      return String(right).includes(String(left)); // Note: reversed args for membership
    case 'is not in':
      return !String(right).includes(String(left)); // Note: reversed args

    // English-style comparison operators
    case 'is equal to':
      // Loose equality (coercive)
      return left == right;
    case 'is really equal to':
    case 'really equals':
      // Strict equality
      return left === right;
    case 'is not equal to':
      // Loose inequality
      return left != right;
    case 'is not really equal to':
      // Strict inequality
      return left !== right;
    case 'is greater than':
      return left > right;
    case 'is less than':
      return left < right;
    case 'is greater than or equal to':
      return left >= right;
    case 'is less than or equal to':
      return left <= right;

    default:
      throw new ExpressionParseError(`Unknown binary operator: ${operator}`);
  }
}

/**
 * Hyperscript-compatible addition that handles both numbers and string concatenation
 */
function evaluateAddition(left: any, right: any): string | number {
  // If either operand is a string, concatenate
  if (typeof left === 'string' || typeof right === 'string') {
    return String(left) + String(right);
  }

  // Otherwise, try to add as numbers
  const leftNum = typeof left === 'number' ? left : parseFloat(left);
  const rightNum = typeof right === 'number' ? right : parseFloat(right);

  if (isNaN(leftNum) || isNaN(rightNum)) {
    // If we can't convert to numbers, concatenate as strings
    return String(left) + String(right);
  }

  return leftNum + rightNum;
}

/**
 * Evaluate possessive expressions using our property access implementation
 */
async function evaluatePossessiveExpression(node: any, context: ExecutionContext): Promise<any> {
  const object = await evaluateASTNode(node.object, context);
  const propertyNode = node.property;

  // Handle different types of property access
  if (propertyNode.type === 'identifier') {
    const propertyName = propertyNode.name;

    // Get element (handle NodeList/arrays by taking first element)
    let element = object;
    if (
      object &&
      typeof object === 'object' &&
      'length' in object &&
      typeof object[0] !== 'undefined'
    ) {
      element = object[0];
    }

    // Use getElementProperty for comprehensive property/attribute access
    // This handles @attributes (with boolean support), *css-properties, special DOM properties, etc.
    if (isElement(element)) {
      return getElementProperty(element, propertyName);
    }

    // For non-element objects, use the expression system
    return await extractValue(
      propertyExpressions.its.evaluate(toTypedContext(context), {
        target: object,
        property: propertyName,
      })
    );
  } else if (propertyNode.type === 'attributeAccess') {
    // Handle @attr syntax - access attribute on the object
    const attributeName = propertyNode.attributeName;

    // Get element (handle NodeList/arrays by taking first element)
    let element = object;
    if (
      object &&
      typeof object === 'object' &&
      'length' in object &&
      typeof object[0] !== 'undefined'
    ) {
      element = object[0];
    }

    // Use duck-typing for Element check (cross-realm compatible with Happy-DOM)
    if (element && typeof element === 'object' && typeof element.getAttribute === 'function') {
      return accessAttribute(element as Element, attributeName);
    }
    return null;
  } else if (propertyNode.type === 'bracketExpression') {
    // Handle [expr] syntax - evaluate expression as property key
    const propertyKey = await evaluateASTNode(propertyNode.expression, context);
    return await extractValue(
      propertyExpressions.its.evaluate(toTypedContext(context), {
        target: object,
        property: String(propertyKey),
      })
    );
  } else {
    throw new ExpressionParseError(`Unsupported property access type: ${propertyNode.type}`);
  }
}

/**
 * Evaluate context possessive expressions (my property, its property, your property)
 */
async function evaluateContextPossessive(node: any, context: ExecutionContext): Promise<any> {
  const contextType = node.contextType;
  const propertyNode = node.property;

  // Extract property name
  let propertyName: string;
  if (propertyNode.type === 'identifier') {
    propertyName = propertyNode.name;
  } else {
    throw new ExpressionParseError('Property name must be an identifier');
  }

  // Use our context-specific expressions
  switch (contextType) {
    case 'my':
      return await extractValue(
        propertyExpressions.my.evaluate(toTypedContext(context), { property: propertyName })
      );
    case 'its':
      // 'its' refers to the 'result' context variable (or 'it' if no result)
      const itsTarget = context.result || context.it;
      return await extractValue(
        propertyExpressions.its.evaluate(toTypedContext(context), {
          target: itsTarget,
          property: propertyName,
        })
      );
    case 'your':
      return await extractValue(
        propertyExpressions.its.evaluate(toTypedContext(context), {
          target: context.you,
          property: propertyName,
        })
      );
    default:
      throw new ExpressionParseError(`Unknown context type: ${contextType}`);
  }
}

/**
 * Evaluate "the X of Y" property access (the property of element)
 */
async function evaluatePropertyOfExpression(node: any, context: ExecutionContext): Promise<any> {
  // Extract property name
  const propertyNode = node.property;
  let propertyName: string;
  if (propertyNode.type === 'identifier') {
    propertyName = propertyNode.name;
  } else {
    throw new ExpressionParseError('Property name must be an identifier in "the X of Y" pattern');
  }

  // Evaluate target element
  const target = await evaluateASTNode(node.target, context);

  // Handle null/undefined targets gracefully
  if (target === null || target === undefined) {
    throw new ExpressionParseError(`Cannot access property "${propertyName}" of ${target}`);
  }

  // For DOM elements, use our property expressions system
  if (target && typeof target === 'object' && target.nodeType === Node.ELEMENT_NODE) {
    return await extractValue(
      propertyExpressions.its.evaluate(toTypedContext(context), {
        target: target,
        property: propertyName,
      })
    );
  }

  // For other objects, use standard JavaScript property access
  try {
    const value = target[propertyName];

    // Handle method calls - if it's a function, bind it to the target
    if (typeof value === 'function') {
      return value.bind(target);
    }

    return value;
  } catch (error) {
    throw new ExpressionParseError(
      `Failed to access property "${propertyName}" on target: ${error}`
    );
  }
}

/**
 * Evaluate optional chaining expressions (obj?.property)
 * Returns undefined if the object is null/undefined instead of throwing
 */
async function evaluateOptionalChain(node: any, context: ExecutionContext): Promise<any> {
  const object = await evaluateASTNode(node.object, context);

  // If object is null/undefined, return undefined (don't throw)
  if (object === null || object === undefined) {
    return undefined;
  }

  // Otherwise access the property normally
  const propertyNode = node.property;
  const propertyName = propertyNode.name || propertyNode.value;

  try {
    const value = object[propertyName];

    // Handle method calls - if it's a function, bind it to the object
    if (typeof value === 'function') {
      return value.bind(object);
    }

    return value;
  } catch {
    // If property access fails for any reason, return undefined
    return undefined;
  }
}

/**
 * Evaluate dot notation property access (obj.property)
 */
async function evaluatePropertyAccess(node: any, context: ExecutionContext): Promise<any> {
  const object = await evaluateASTNode(node.object, context);
  const propertyNode = node.property;

  // Handle null/undefined objects gracefully
  if (object === null || object === undefined) {
    throw new ExpressionParseError(`Cannot access property "${propertyNode.name}" of ${object}`);
  }

  // Extract property name
  if (propertyNode.type !== 'identifier') {
    throw new ExpressionParseError('Property name must be an identifier');
  }

  const propertyName = propertyNode.name;

  // Use DOM-aware property access for elements, standard JavaScript for others
  try {
    let value: unknown;
    if (isElement(object)) {
      // Use DOM-aware property access for elements (handles value, checked, etc.)
      value = getElementProperty(object, propertyName);
    } else {
      value = object[propertyName];
    }

    // Handle method calls - if it's a function, bind it to the object
    if (typeof value === 'function') {
      return value.bind(object);
    }

    return value;
  } catch (error) {
    throw new ExpressionParseError(`Error accessing property "${propertyName}": ${error}`);
  }
}

/**
 * Evaluate 'as' type conversion expressions
 */
async function evaluateAsExpression(node: any, context: ExecutionContext): Promise<any> {
  const value = await evaluateASTNode(node.expression, context);
  const targetType = normalizeAsTargetType(node.targetType);

  // Use our legacy conversion system which directly returns the converted value
  return await conversionExpressions.as.evaluate(context, value, targetType);
}

/**
 * Normalize an `as` target type to a string. The Pratt parser emits the type
 * as an AST node ({ type: 'identifier', name: 'Int' }) while the standalone
 * expression-parser fragment emits it as a raw string ('Int', 'Fixed:2').
 * The downstream `asExpression` evaluator requires a string.
 */
function normalizeAsTargetType(target: unknown): string {
  if (typeof target === 'string') return target;
  if (target && typeof target === 'object') {
    const t = target as { name?: unknown; value?: unknown };
    if (typeof t.name === 'string') return t.name;
    if (typeof t.value === 'string') return t.value;
  }
  return String(target);
}

/**
 * Evaluate CSS selector expressions (#id, .class)
 */
async function evaluateCSSSelector(node: any, _context: ExecutionContext): Promise<any> {
  const selector = node.selector;

  if (node.selectorType === 'id') {
    // ID selector returns single element or null
    // Remove the '#' prefix since getElementById expects just the ID
    const id = selector.startsWith('#') ? selector.slice(1) : selector;
    return document.getElementById(id);
  } else if (node.selectorType === 'class') {
    // Class selector returns array of elements (consistent with _hyperscript collections)
    // Escape colons and other CSS special characters for compatibility
    const escapedSelector = selector.replace(/:/g, '\\:');
    return Array.from(document.querySelectorAll(escapedSelector));
  }

  throw new ExpressionParseError(`Unknown CSS selector type: ${node.selectorType}`);
}

/**
 * Evaluate query reference expressions (<selector/>)
 */
async function evaluateQueryReference(node: any, _context: ExecutionContext): Promise<NodeList> {
  const selector = node.selector;

  // Remove the < and /> wrapper to get the actual selector
  // Also trim to handle optional space before /> (e.g., <form /> vs <form/>)
  let cleanSelector = selector.slice(1, -2).trim(); // Remove '<' and '/>' and whitespace

  // Escape colons in class names (e.g., .foo:bar -> .foo\:bar)
  // BUT preserve CSS pseudo-classes like :hover, :not(), :first-child, etc.
  // Use negative lookahead to avoid escaping known pseudo-class patterns
  const pseudoClasses =
    'hover|active|focus|visited|link|focus-within|focus-visible|' +
    'first-child|last-child|only-child|nth-child|nth-last-child|nth-of-type|nth-last-of-type|' +
    'first-of-type|last-of-type|only-of-type|empty|root|target|lang|dir|' +
    'not|has|is|where|matches|' +
    'before|after|first-letter|first-line|selection|placeholder|marker|backdrop|' +
    'enabled|disabled|checked|indeterminate|required|optional|valid|invalid|in-range|out-of-range|read-only|read-write|' +
    'default|defined|fullscreen|modal|picture-in-picture|autofill';
  const pseudoRegex = new RegExp(
    `(\\.[a-zA-Z0-9_-]+):(?!(${pseudoClasses})(?![a-zA-Z0-9_-]))`,
    'g'
  );
  cleanSelector = cleanSelector.replace(pseudoRegex, '$1\\:');

  // Query references ALWAYS return NodeList (not arrays)
  // This is the key difference from other CSS selector expressions
  try {
    return document.querySelectorAll(cleanSelector);
  } catch (error) {
    // If CSS selector is invalid, return empty NodeList instead of throwing
    // Create a mock empty NodeList for compatibility
    const emptyNodeList = document.createDocumentFragment().childNodes;
    return emptyNodeList;
  }
}

/**
 * Evaluate unary expressions (not operand)
 */
async function evaluateUnaryExpression(node: any, context: ExecutionContext): Promise<any> {
  const operand = await evaluateASTNode(node.operand, context);
  const operator = node.operator;

  switch (operator) {
    case 'not':
      // Fallback implementation for logical not
      return !operand;
    case 'no':
      // 'no' returns true for "absence of value":
      // - null/undefined: true (no value)
      // - false: true (boolean false is "no value" in _hyperscript)
      // - empty arrays/NodeLists: true (empty collections)
      // - everything else: false (including empty strings, 0, objects)
      if (operand == null) return true;
      if (operand === false) return true;
      if (Array.isArray(operand)) return operand.length === 0;
      if (operand && typeof operand === 'object' && 'length' in operand) {
        return (operand as { length: number }).length === 0; // NodeList/HTMLCollection
      }
      return false;
    case 'exists':
      // Fallback implementation for existence check
      return operand !== null && operand !== undefined;
    case 'does not exist':
      // Fallback implementation for non-existence check
      return operand === null || operand === undefined;
    case 'is empty':
      return isEmpty(operand);
    case 'is not empty':
      return !isEmpty(operand);
    case '!':
      // JavaScript-style logical negation
      return !operand;
    case '-':
      // Unary minus: negate the number
      const negativeValue = typeof operand === 'number' ? operand : parseFloat(operand);
      return isNaN(negativeValue) ? 0 : -negativeValue;
    case '+':
      // Unary plus: convert to number
      const positiveValue = typeof operand === 'number' ? operand : parseFloat(operand);
      return isNaN(positiveValue) ? 0 : positiveValue;
    default:
      throw new ExpressionParseError(`Unknown unary operator: ${operator}`);
  }
}

/**
 * Evaluate attribute access expressions [@data-foo]
 */
async function evaluateAttributeAccess(node: any, context: ExecutionContext): Promise<any> {
  const attributeName = node.attributeName;

  // Use the current context element (usually 'me') or return the attribute name for further processing
  if (context.me && context.me instanceof Element) {
    return context.me.getAttribute(attributeName);
  }

  // Return as attribute reference for possessive evaluation
  return `@${attributeName}`;
}

/**
 * Evaluate bracket expressions [expr]
 */
async function evaluateBracketExpression(node: any, context: ExecutionContext): Promise<any> {
  // Evaluate the inner expression
  return await evaluateASTNode(node.expression, context);
}

/**
 * Evaluate call expressions (function calls)
 */
async function evaluateCallExpression(node: any, context: ExecutionContext): Promise<any> {
  // Handle special hyperscript navigation functions (closest, previous, next)
  // These need identifier args to be treated as tag selectors, not variables
  if (node.callee?.type === 'identifier') {
    const funcName = node.callee.name;

    if (['closest', 'previous', 'next'].includes(funcName)) {
      const args = await Promise.all(
        node.arguments.map(async (arg: ASTNode) => {
          // If arg is an identifier, use the name as a tag selector
          if (arg.type === 'identifier' && nodeStr(arg, 'name')) {
            return nodeStr(arg, 'name');
          }
          // If arg is a selector, use the value
          if (arg.type === 'selector' && nodeStr(arg, 'value')) {
            return nodeStr(arg, 'value');
          }
          // If arg is a queryReference like <form/>, extract the selector
          if (arg.type === 'queryReference' && nodeStr(arg, 'selector')) {
            let selector = nodeStr(arg, 'selector')!;
            if (selector.startsWith('<') && selector.endsWith('/>')) {
              selector = selector.slice(1, -2).trim();
            }
            return selector;
          }
          return evaluateASTNode(arg, context);
        })
      );

      switch (funcName) {
        case 'closest':
          return referencesExpressions.closest.evaluate(context, ...args);
        case 'previous':
          return positionalExpressions.previous.evaluate(context, ...args);
        case 'next':
          return positionalExpressions.next.evaluate(context, ...args);
      }
    }
  }

  // Evaluate the function (callee)
  const func = await evaluateASTNode(node.callee, context);

  if (typeof func !== 'function') {
    throw new ExpressionParseError(`Cannot call non-function value: ${typeof func}`);
  }

  // Evaluate arguments
  const args = [];
  for (const arg of node.arguments) {
    const value = await evaluateASTNode(arg, context);
    args.push(value);
  }

  // Call the function
  const result = func(...args);

  // Handle async functions
  if (result && typeof result.then === 'function') {
    return await result;
  }

  return result;
}

/**
 * Evaluate array literal expressions [1, 2, 3]
 */
async function evaluateArrayLiteral(node: any, context: ExecutionContext): Promise<any[]> {
  const elements = [];

  for (const element of node.elements) {
    const value = await evaluateASTNode(element, context);
    elements.push(value);
  }

  return elements;
}

/**
 * Evaluate global variable references ($identifier)
 */
function evaluateGlobalVariable(node: any, context: ExecutionContext): any {
  const name = node.name; // e.g., "$global"
  const varName = name.startsWith('$') ? name.slice(1) : name;

  // Look up in globals context
  if (context.globals) {
    // Handle Map-style globals
    if (context.globals instanceof Map) {
      // Try with $ prefix first (as specified in test)
      if (context.globals.has(name)) {
        return context.globals.get(name);
      }
      // Then try without $ prefix
      if (context.globals.has(varName)) {
        return context.globals.get(varName);
      }
    }
    // Handle plain object globals
    else if (typeof context.globals === 'object') {
      if (name in context.globals) {
        return (context.globals as Record<string, unknown>)[name];
      }
      if (varName in context.globals) {
        return (context.globals as Record<string, unknown>)[varName];
      }
    }
  }

  // Also check window/global scope for compatibility
  if (typeof globalThis !== 'undefined' && varName in globalThis) {
    return (globalThis as Record<string, unknown>)[varName];
  }

  return undefined;
}

/**
 * Evaluate object literal expressions {key: value, ...}
 */
async function evaluateObjectLiteral(
  node: any,
  context: ExecutionContext
): Promise<Record<string, any>> {
  const result: Record<string, any> = {};

  for (const property of node.properties) {
    // Evaluate the key
    let key: string;
    if (property.key.type === 'identifier') {
      key = property.key.name;
    } else if (property.key.type === 'literal' && property.key.valueType === 'string') {
      key = property.key.value;
    } else {
      // For computed keys, evaluate them
      const keyValue = await evaluateASTNode(property.key, context);
      key = String(keyValue);
    }

    // Evaluate the value
    const value = await evaluateASTNode(property.value, context);

    result[key] = value;
  }

  return result;
}

/**
 * Evaluate array access expressions arr[index]
 */
async function evaluateArrayAccess(node: any, context: ExecutionContext): Promise<any> {
  const object = await evaluateASTNode(node.object, context);
  const index = await evaluateASTNode(node.index, context);

  // Handle null/undefined objects gracefully
  if (object === null || object === undefined) {
    throw new ExpressionParseError(`Cannot access index "${index}" of ${object}`);
  }

  // Handle array access
  if (Array.isArray(object)) {
    let numIndex = typeof index === 'number' ? index : parseInt(index, 10);
    if (isNaN(numIndex)) {
      throw new ExpressionParseError(`Array index must be a number, got: ${typeof index}`);
    }
    // Support negative indexing: arr[-1] returns last element
    if (numIndex < 0) {
      numIndex = object.length + numIndex;
    }
    return object[numIndex];
  }

  // Handle object property access with bracket notation
  if (typeof object === 'object') {
    return object[String(index)];
  }

  // Handle string character access
  if (typeof object === 'string') {
    const numIndex = typeof index === 'number' ? index : parseInt(index, 10);
    if (isNaN(numIndex)) {
      throw new ExpressionParseError(`String index must be a number, got: ${typeof index}`);
    }
    return object[numIndex];
  }

  throw new ExpressionParseError(`Cannot access property of ${typeof object}`);
}

/**
 * Evaluate array range access expressions arr[start..end]
 * Supports: [..end], [start..end], [start..]
 */
async function evaluateArrayRangeAccess(node: any, context: ExecutionContext): Promise<any> {
  const object = await evaluateASTNode(node.object, context);

  // Handle null/undefined objects gracefully
  if (object === null || object === undefined) {
    throw new ExpressionParseError(`Cannot access range of ${object}`);
  }

  // Range syntax only works on arrays and strings
  if (!Array.isArray(object) && typeof object !== 'string') {
    throw new ExpressionParseError(
      `Range syntax only works on arrays and strings, got: ${typeof object}`
    );
  }

  // Evaluate start and end indices
  const startNode = node.start;
  const endNode = node.end;

  let startIndex: number;
  let endIndex: number;

  // Handle [..end] - from start to end (inclusive)
  if (startNode === null || startNode === undefined) {
    startIndex = 0;
  } else {
    const startValue = await evaluateASTNode(startNode, context);
    startIndex = typeof startValue === 'number' ? startValue : parseInt(startValue, 10);
    if (isNaN(startIndex)) {
      throw new ExpressionParseError(
        `Range start index must be a number, got: ${typeof startValue}`
      );
    }
  }

  // Handle [start..] - from start to end of array
  if (endNode === null || endNode === undefined) {
    endIndex = object.length;
  } else {
    const endValue = await evaluateASTNode(endNode, context);
    endIndex = typeof endValue === 'number' ? endValue : parseInt(endValue, 10);
    if (isNaN(endIndex)) {
      throw new ExpressionParseError(`Range end index must be a number, got: ${typeof endValue}`);
    }
    // End index is inclusive in _hyperscript, so we add 1 for slice()
    endIndex = endIndex + 1;
  }

  // Return the sliced array or string
  return object.slice(startIndex, endIndex);
}

/**
 * Evaluate 'in' operator for membership testing
 */
async function evaluateInOperator(
  item: any,
  collection: any,
  _context: ExecutionContext
): Promise<boolean> {
  // Handle array membership
  if (Array.isArray(collection)) {
    return collection.includes(item);
  }

  // Handle object property membership
  if (typeof collection === 'object' && collection !== null) {
    // Convert item to string for property name comparison
    const propertyName = String(item);
    return propertyName in collection;
  }

  // Handle string containment (if needed)
  if (typeof collection === 'string') {
    return collection.includes(String(item));
  }

  throw new ExpressionParseError(`Cannot use 'in' operator with ${typeof collection}`);
}

/**
 * Evaluate CSS attribute selector - returns NodeList of matching elements
 */
async function evaluateAttributeSelector(node: any, _context: ExecutionContext): Promise<NodeList> {
  // Build CSS selector string
  let selectorStr = `[${node.attribute}`;

  if (node.operator && node.value !== null) {
    selectorStr += `${node.operator}"${node.value}"`;
  }

  selectorStr += ']';

  // Use DOM querySelectorAll to find matching elements
  if (typeof document !== 'undefined') {
    return document.querySelectorAll(selectorStr);
  } else {
    // In non-DOM environments, return empty NodeList-like object
    return [] as unknown as NodeList;
  }
}

/**
 * Check if bracket content looks like an attribute selector
 */
function looksLikeAttributeSelector(state: ParseState, position: number): boolean {
  let pos = position;

  // Look for pattern: identifier (optionally followed by operator and value)
  const firstToken = state.tokens[pos];
  if (!firstToken || !isIdentifier(firstToken)) {
    return false;
  }

  pos++; // Move past identifier

  // Check what comes next
  const nextToken = state.tokens[pos];
  if (!nextToken) return false;

  // If directly followed by ], it's a simple attribute selector [attr]
  if (nextToken.value === ']') {
    return true;
  }

  // If followed by =, ~=, |=, ^=, $=, *=, it's an attribute selector with value
  if (
    nextToken.value === '=' ||
    nextToken.value === '~=' ||
    nextToken.value === '|=' ||
    nextToken.value === '^=' ||
    nextToken.value === '$=' ||
    nextToken.value === '*='
  ) {
    return true;
  }

  return false;
}

/**
 * Parse CSS attribute selector [attr] or [attr="value"]
 */
function parseAttributeSelector(state: ParseState, openBracket: Token): ASTNode {
  // Parse attribute name
  const attrToken = advance(state);
  if (!attrToken || !isIdentifier(attrToken)) {
    throw new ExpressionParseError('Expected attribute name in selector');
  }

  let operator = null;
  let value = null;

  // Check for operator
  const nextToken = peek(state);
  if (nextToken && ['=', '~=', '|=', '^=', '$=', '*='].includes(nextToken.value)) {
    operator = advance(state)!.value;

    // Parse value
    const valueToken = advance(state);
    if (!valueToken) {
      throw new ExpressionParseError('Expected value after attribute operator');
    }

    if (isString(valueToken)) {
      value = valueToken.value.slice(1, -1); // Remove quotes
    } else if (isIdentifier(valueToken) || isNumber(valueToken)) {
      value = valueToken.value;
    } else {
      throw new ExpressionParseError(`Unexpected token in attribute selector: ${valueToken.value}`);
    }
  }

  // Consume closing bracket
  const closeToken = advance(state);
  if (!closeToken || closeToken.value !== ']') {
    throw new ExpressionParseError('Expected closing bracket in attribute selector');
  }

  return {
    type: 'attributeSelector',
    attribute: attrToken.value,
    operator,
    value,
    start: openBracket.start,
    end: closeToken.end,
  };
}

/**
 * Evaluate template literal expressions
 */
async function evaluateTemplateLiteral(node: any, context: ExecutionContext): Promise<string> {
  let template = node.value;

  // First handle $variable patterns (like $1, $window.foo)
  template = await replaceAsyncBatch(
    template,
    /\$([a-zA-Z_$][a-zA-Z0-9_.$]*|\d+)/g,
    async (_match: string, varName: string) => {
      try {
        // Handle numeric literals like $1, $2 (return the number as string)
        if (/^\d+$/.test(varName)) {
          return varName;
        }

        // Handle property access like $window.foo
        if (varName.includes('.')) {
          const parts = varName.split('.');
          let value = resolveVariable(parts[0], context);

          for (let i = 1; i < parts.length; i++) {
            if (value == null) break;
            value = value[parts[i]];
          }

          return String(value ?? '');
        }

        // Handle simple variables
        const value = resolveVariable(varName, context);
        return String(value ?? '');
      } catch (error) {
        // Return empty string for failed lookups (hyperscript behavior)
        return '';
      }
    }
  );

  // Then handle ${expression} and $(expression) patterns
  // Both syntaxes are supported: ${expr} (JavaScript-style) and $(expr) (Make/shell-style)
  template = await replaceAsyncBatch(
    template,
    /\$(?:\{([^}]+)\}|\(([^)]+)\))/g,
    async (_match: string, braceExpr: string, parenExpr: string) => {
      const expr = braceExpr || parenExpr;
      try {
        // Recursively parse and evaluate the interpolated expression
        const result = await parseAndEvaluateExpression(expr, context);
        return String(result);
      } catch (error) {
        // On error, return the literal expression or 'undefined'
        return 'undefined';
      }
    }
  );

  return template;
}

/**
 * Evaluate positional expressions (first, last)
 */
async function evaluatePositionalExpression(node: any, context: ExecutionContext): Promise<any> {
  const operator = node.operator; // 'first' or 'last'

  // If there's an argument, evaluate it to get the collection
  let collection;
  if (node.argument) {
    collection = await evaluateASTNode(node.argument, context);
  } else {
    // No argument - use context.it
    collection = context.it;
  }

  // Get the appropriate positional expression implementation
  if (operator === 'first') {
    return positionalExpressions.first.evaluate(toTypedContext(context), collection);
  } else if (operator === 'last') {
    return positionalExpressions.last.evaluate(toTypedContext(context), collection);
  } else {
    throw new ExpressionParseError(`Unknown positional operator: ${operator}`);
  }
}

/**
 * Helper function to resolve variables from execution context
 */
function resolveVariable(varName: string, context: ExecutionContext): any {
  // Check locals first
  if (context.locals?.has(varName)) {
    return context.locals.get(varName);
  }

  // Check context properties
  if (varName === 'me' && context.me) return context.me;
  if (varName === 'you' && context.you) return context.you;
  if (varName === 'it' && context.it) return context.it;
  if (varName === 'result' && context.result) return context.result;

  // Check globals (including window)
  if (typeof window !== 'undefined' && varName === 'window') {
    return window;
  }

  if (context.globals?.has(varName)) {
    return context.globals.get(varName);
  }

  return undefined;
}

/**
 * Helper function to perform async replacements on a string
 */
async function replaceAsyncBatch(
  str: string,
  regex: RegExp,
  replacer: (match: string, ...args: any[]) => Promise<string>
): Promise<string> {
  const matches = [];
  let match;

  // Find all matches
  while ((match = regex.exec(str)) !== null) {
    matches.push({
      match: match[0],
      index: match.index,
      length: match[0].length,
      replacement: await replacer(match[0], ...match.slice(1)),
    });
  }

  // Replace from end to start to preserve indices
  let result = str;
  for (let i = matches.length - 1; i >= 0; i--) {
    const m = matches[i];
    result = result.substring(0, m.index) + m.replacement + result.substring(m.index + m.length);
  }

  return result;
}

/**
 * Evaluate constructor calls (new ConstructorName())
 */
async function evaluateConstructorCall(node: any, _context: ExecutionContext): Promise<any> {
  const constructorName = node.constructor;

  try {
    // Try to resolve the constructor from global context
    const globalObj =
      typeof globalThis !== 'undefined'
        ? globalThis
        : typeof window !== 'undefined'
          ? window
          : global;

    const Constructor = (globalObj as Record<string, unknown>)[constructorName];
    if (typeof Constructor === 'function') {
      // For now, only support constructors with no arguments
      const result = new (Constructor as new () => unknown)();
      return result;
    } else {
      throw new ExpressionParseError(
        `Constructor "${constructorName}" not found or is not a function`
      );
    }
  } catch (error) {
    throw new ExpressionParseError(
      `Failed to call constructor "${constructorName}": ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
