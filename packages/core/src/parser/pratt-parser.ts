/**
 * Pratt Parser for Expression Parsing
 *
 * A top-down operator precedence parser (Pratt parser) that replaces the
 * cascading `parseLogicalOr → parseLogicalAnd → ... → parsePrimary` chain.
 *
 * The binding power table defines operator precedence:
 * - Higher binding power = tighter binding
 * - Left-associative: left bp < right bp (e.g., 10, 11)
 * - Right-associative: left bp > right bp (e.g., 61, 60)
 *
 * Canonical precedence (10 tiers):
 *   Tier  1 (bp 10): or, ||
 *   Tier  2 (bp 20): and, &&
 *   Tier  3 (bp 30): ==, !=, <, >, <=, >=, is, is not, exists, matches, etc.
 *   Tier  4 (bp 40): +, - (binary)
 *   Tier  5 (bp 50): *, /, %, mod
 *   Tier  6 (bp 60): ^, ** (right-associative)
 *   Tier  7 (bp 70): as (type conversion)
 *   Tier  8 (bp 80): not, !, -, +, no (unary prefix)
 *   Tier  9 (bp 85): first, last (positional prefix)
 *   Tier 10 (bp 90): 's, ., ?., [], () (property access / calls)
 */

import type { Token } from '../types/core';
import type { ASTNode } from '../types/base-types';

// =============================================================================
// Types
// =============================================================================

/**
 * Binding power pair: [left, right].
 * For left-associative: left < right (e.g., [10, 11])
 * For right-associative: left > right (e.g., [61, 60])
 */
export type BindingPower = [left: number, right: number];

/** Handler for prefix (nud) operators — invoked when token appears at start of expression. */
export type PrefixHandler = (token: Token, ctx: PrattContext) => ASTNode;

/** Handler for infix (led) operators — invoked when token appears between expressions. */
export type InfixHandler = (left: ASTNode, token: Token, ctx: PrattContext) => ASTNode;

/**
 * Entry in the binding power table.
 * At most one of `prefix` or `infix` is expected per token value,
 * though some tokens (like `-`) can have both.
 */
export interface BindingPowerEntry {
  /** Prefix (nud) handler and binding power for unary prefix operators. */
  prefix?: { bp: number; handler: PrefixHandler };
  /** Infix (led) handler and binding power pair for binary operators. */
  infix?: { bp: BindingPower; handler: InfixHandler };
}

/**
 * A fragment of the binding power table.
 * Fragments are composable — merge them for different bundle tiers:
 *   core.ts (math + logic), blocks.ts (control flow), positional.ts, full.ts
 */
export type BindingPowerFragment = Map<string, BindingPowerEntry>;

/**
 * Runtime context for the Pratt parser loop.
 * Provides token access and recursive parsing.
 */
export interface PrattContext {
  /** Look at the current token without consuming it. */
  peek(): Token | undefined;
  /** Consume and return the current token, advancing position. */
  advance(): Token;
  /** Recursively parse an expression with the given minimum binding power. */
  parseExpr(minBp: number): ASTNode;
  /** Check if the current token is a stop token that terminates expression parsing. */
  isStopToken(): boolean;
  /** Check if we're at the end of the token stream. */
  atEnd(): boolean;
}

// =============================================================================
// Stop Tokens
// =============================================================================

/**
 * Tokens that terminate expression parsing.
 * Without this set, `set x to 1 + 2 then toggle .active` would consume
 * `then toggle .active` as part of the arithmetic expression.
 */
export const STOP_TOKENS = new Set([
  'then',
  'end',
  'to',
  'into',
  'on',
  'with',
  'from',
  'in',
  'by',
  'for',
  'while',
  'until',
  'unless',
  'else',
  'catch',
  'finally',
]);

/**
 * Delimiter tokens that also terminate expression parsing.
 */
export const STOP_DELIMITERS = new Set([')', ']', '}', ',']);

// =============================================================================
// Fragment Merging
// =============================================================================

/**
 * Merge multiple binding power fragments into a single table.
 * Later fragments override earlier ones for the same token.
 */
export function mergeFragments(...fragments: BindingPowerFragment[]): BindingPowerFragment {
  const merged = new Map<string, BindingPowerEntry>();
  for (const fragment of fragments) {
    for (const [key, entry] of fragment) {
      const existing = merged.get(key);
      if (existing) {
        // Merge prefix/infix — later fragments win
        merged.set(key, {
          prefix: entry.prefix ?? existing.prefix,
          infix: entry.infix ?? existing.infix,
        });
      } else {
        merged.set(key, { ...entry });
      }
    }
  }
  return merged;
}

// =============================================================================
// Core Pratt Loop
// =============================================================================

/**
 * Create a Pratt expression parser from a binding power table.
 *
 * @param table - The binding power table (merged fragments)
 * @param parsePrimary - Fallback handler for tokens not in the table (literals, identifiers, etc.)
 * @returns A function that parses an expression from a token stream
 */
export function createPrattParser(table: BindingPowerFragment, parsePrimary: PrefixHandler) {
  /**
   * Parse an expression with the given minimum binding power.
   *
   * This is the core ~30-line Pratt loop:
   * 1. Parse a prefix expression (nud)
   * 2. While the next token's left binding power > minBp:
   *    a. Consume it
   *    b. Parse an infix expression (led) with the right binding power
   *
   * @param tokens - Token stream
   * @param pos - Current position (mutated)
   * @param minBp - Minimum binding power to continue parsing
   */
  function parse(tokens: Token[], pos: { value: number }, minBp: number = 0): ASTNode {
    const ctx: PrattContext = {
      peek: () => (pos.value < tokens.length ? tokens[pos.value] : undefined),
      advance: () => {
        const token = tokens[pos.value];
        pos.value++;
        return token;
      },
      parseExpr: (bp: number) => parse(tokens, pos, bp),
      isStopToken: () => {
        const t = tokens[pos.value];
        if (!t) return true;
        return STOP_TOKENS.has(t.value) || STOP_DELIMITERS.has(t.value);
      },
      atEnd: () => pos.value >= tokens.length,
    };

    // --- NUD (prefix / atom) ---
    const firstToken = ctx.peek();
    if (!firstToken) {
      throw new Error('Unexpected end of expression');
    }

    const prefixEntry = table.get(firstToken.value);
    let left: ASTNode;

    if (prefixEntry?.prefix) {
      const token = ctx.advance();
      left = prefixEntry.prefix.handler(token, ctx);
    } else {
      // Fallback to primary handler (literals, identifiers, selectors, etc.)
      left = parsePrimary(firstToken, ctx);
    }

    // --- LED (infix) loop ---
    // Matklad assertion: the loop must advance on every iteration
    while (!ctx.atEnd() && !ctx.isStopToken()) {
      const nextToken = ctx.peek();
      if (!nextToken) break;

      const infixEntry = table.get(nextToken.value);
      if (!infixEntry?.infix) break;

      const [leftBp] = infixEntry.infix.bp;
      if (leftBp < minBp) break;

      const opToken = ctx.advance();
      const [, rightBp] = infixEntry.infix.bp;
      left = infixEntry.infix.handler(left, opToken, ctx);

      // The handler is responsible for calling ctx.parseExpr(rightBp)
      // to parse the right-hand side. But if it doesn't advance,
      // we have an infinite loop — break defensively.
      void rightBp; // used by handlers via ctx.parseExpr(rightBp)
    }

    return left;
  }

  return parse;
}

// =============================================================================
// Standard Operator Handlers
// =============================================================================

/** Standard binary infix handler — produces a BinaryExpression AST node. */
export function binaryHandler(left: ASTNode, token: Token, ctx: PrattContext): ASTNode {
  // The right bp is encoded in the table entry; handlers access it via closure
  // For now, the handler itself calls ctx.parseExpr with the right bp
  // This is handled by the caller — see createInfixEntry()
  return {
    type: 'binaryExpression',
    operator: token.value,
    left,
    right: ctx.parseExpr(0), // right bp should be passed; see createInfixEntry
    start: (left as any).start,
    end: (ctx.peek() as any)?.start,
  };
}

/** Standard unary prefix handler — produces a UnaryExpression AST node. */
export function unaryHandler(token: Token, ctx: PrattContext): ASTNode {
  const operand = ctx.parseExpr(0); // bp should be passed; see createPrefixEntry
  return {
    type: 'unaryExpression',
    operator: token.value,
    operand,
    start: token.start,
    end: (operand as any).end,
  };
}

// =============================================================================
// Fragment Builders
// =============================================================================

/**
 * Create a left-associative binary infix entry.
 * @param bp - Base binding power (left = bp, right = bp + 1)
 */
export function leftAssoc(bp: number, handler?: InfixHandler): Pick<BindingPowerEntry, 'infix'> {
  return {
    infix: {
      bp: [bp, bp + 1],
      handler:
        handler ??
        ((left, token, ctx) => ({
          type: 'binaryExpression',
          operator: token.value,
          left,
          right: ctx.parseExpr(bp + 1),
          start: (left as any).start,
        })),
    },
  };
}

/**
 * Create a right-associative binary infix entry.
 * @param bp - Base binding power (left = bp + 1, right = bp)
 */
export function rightAssoc(bp: number, handler?: InfixHandler): Pick<BindingPowerEntry, 'infix'> {
  return {
    infix: {
      bp: [bp + 1, bp],
      handler:
        handler ??
        ((left, token, ctx) => ({
          type: 'binaryExpression',
          operator: token.value,
          left,
          right: ctx.parseExpr(bp),
          start: (left as any).start,
        })),
    },
  };
}

/**
 * Create a unary prefix entry.
 * @param bp - Binding power for the prefix operator
 */
export function prefix(bp: number, handler?: PrefixHandler): Pick<BindingPowerEntry, 'prefix'> {
  return {
    prefix: {
      bp,
      handler:
        handler ??
        ((token, ctx) => ({
          type: 'unaryExpression',
          operator: token.value,
          operand: ctx.parseExpr(bp),
          start: token.start,
        })),
    },
  };
}

// =============================================================================
// Core Fragment (Tier 1-6: math + logic + comparison)
// =============================================================================

/**
 * Core expression fragment — covers arithmetic, logic, and comparison operators.
 * This is included in all bundle tiers.
 */
export const CORE_FRAGMENT: BindingPowerFragment = new Map<string, BindingPowerEntry>([
  // Tier 1: Logical OR (bp 10)
  ['or', leftAssoc(10) as BindingPowerEntry],
  ['||', leftAssoc(10) as BindingPowerEntry],

  // Tier 2: Logical AND (bp 20)
  ['and', leftAssoc(20) as BindingPowerEntry],
  ['&&', leftAssoc(20) as BindingPowerEntry],

  // Tier 3: Comparison (bp 30)
  ['==', leftAssoc(30) as BindingPowerEntry],
  ['!=', leftAssoc(30) as BindingPowerEntry],
  ['<', leftAssoc(30) as BindingPowerEntry],
  ['>', leftAssoc(30) as BindingPowerEntry],
  ['<=', leftAssoc(30) as BindingPowerEntry],
  ['>=', leftAssoc(30) as BindingPowerEntry],
  ['is', leftAssoc(30) as BindingPowerEntry],
  ['matches', leftAssoc(30) as BindingPowerEntry],
  ['contains', leftAssoc(30) as BindingPowerEntry],

  // Tier 4: Addition/Subtraction (bp 40)
  ['+', { ...(leftAssoc(40) as BindingPowerEntry), ...(prefix(80) as BindingPowerEntry) }],
  ['-', { ...(leftAssoc(40) as BindingPowerEntry), ...(prefix(80) as BindingPowerEntry) }],

  // Tier 5: Multiplication/Division (bp 50)
  ['*', leftAssoc(50) as BindingPowerEntry],
  ['/', leftAssoc(50) as BindingPowerEntry],
  ['%', leftAssoc(50) as BindingPowerEntry],
  ['mod', leftAssoc(50) as BindingPowerEntry],

  // Tier 6: Exponentiation (bp 60, right-associative)
  ['^', rightAssoc(60) as BindingPowerEntry],
  ['**', rightAssoc(60) as BindingPowerEntry],

  // Tier 7: Type conversion (bp 70)
  [
    'as',
    leftAssoc(70, (left, _token, ctx) => ({
      type: 'asExpression',
      expression: left,
      targetType: ctx.parseExpr(71),
      start: (left as any).start,
    })) as BindingPowerEntry,
  ],

  // Tier 8: Unary prefix (bp 80)
  ['not', prefix(80) as BindingPowerEntry],
  ['!', prefix(80) as BindingPowerEntry],
  ['no', prefix(80) as BindingPowerEntry],
]);

/**
 * Positional fragment — first/last prefix operators.
 * Included in positional+ bundle tiers.
 */
export const POSITIONAL_FRAGMENT: BindingPowerFragment = new Map<string, BindingPowerEntry>([
  // Tier 9: Positional prefix (bp 85)
  [
    'first',
    prefix(85, (token, ctx) => ({
      type: 'positionalExpression',
      position: 'first',
      operand: ctx.parseExpr(85),
      start: token.start,
    })) as BindingPowerEntry,
  ],
  [
    'last',
    prefix(85, (token, ctx) => ({
      type: 'positionalExpression',
      position: 'last',
      operand: ctx.parseExpr(85),
      start: token.start,
    })) as BindingPowerEntry,
  ],
]);

/**
 * Property access fragment — 's, ., ?., [], ()
 * Included in full bundle tiers.
 */
export const PROPERTY_FRAGMENT: BindingPowerFragment = new Map<string, BindingPowerEntry>([
  // Tier 10: Property access (bp 90)
  [
    '.',
    {
      infix: {
        bp: [90, 91],
        handler: (left, _token, ctx) => {
          const propToken = ctx.advance();
          return {
            type: 'propertyAccess',
            object: left,
            property: propToken.value,
            start: (left as any).start,
          };
        },
      },
    },
  ],
  [
    '?.',
    {
      infix: {
        bp: [90, 91],
        handler: (left, _token, ctx) => {
          const propToken = ctx.advance();
          return {
            type: 'optionalChain',
            object: left,
            property: propToken.value,
            start: (left as any).start,
          };
        },
      },
    },
  ],
  [
    "'s",
    {
      infix: {
        bp: [95, 96],
        handler: (left, _token, ctx) => {
          // Possessive: constrain RHS to a single identifier (not recursive parse)
          const propToken = ctx.advance();
          return {
            type: 'possessiveExpression',
            object: left,
            property: propToken.value,
            start: (left as any).start,
          };
        },
      },
    },
  ],
]);

/**
 * Parser-specific comparison fragment — extends CORE_FRAGMENT with all comparison
 * operators from the existing parser (multi-word operators, postfix operators, etc.).
 * These are tokenized as single tokens by the tokenizer's compound operator handling.
 */
export const PARSER_COMPARISON_FRAGMENT: BindingPowerFragment = new Map<string, BindingPowerEntry>([
  // Strict equality
  ['===', leftAssoc(30) as BindingPowerEntry],
  ['!==', leftAssoc(30) as BindingPowerEntry],

  // Multi-word comparison operators (tokenized as single tokens)
  ['is not', leftAssoc(30) as BindingPowerEntry],
  ['is a', leftAssoc(30) as BindingPowerEntry],
  ['is an', leftAssoc(30) as BindingPowerEntry],
  ['is not a', leftAssoc(30) as BindingPowerEntry],
  ['is not an', leftAssoc(30) as BindingPowerEntry],
  ['is in', leftAssoc(30) as BindingPowerEntry],
  ['is not in', leftAssoc(30) as BindingPowerEntry],

  // English-style comparison operators
  ['has', leftAssoc(30) as BindingPowerEntry],
  ['have', leftAssoc(30) as BindingPowerEntry],
  ['match', leftAssoc(30) as BindingPowerEntry],
  ['include', leftAssoc(30) as BindingPowerEntry],
  ['includes', leftAssoc(30) as BindingPowerEntry],
  ['equals', leftAssoc(30) as BindingPowerEntry],
  ['does not contain', leftAssoc(30) as BindingPowerEntry],
  ['does not include', leftAssoc(30) as BindingPowerEntry],

  // Equality-level keywords from parseEquality
  ['in', leftAssoc(30) as BindingPowerEntry],
  ['of', leftAssoc(30) as BindingPowerEntry],
  ['really', leftAssoc(30) as BindingPowerEntry],

  // Postfix unary operators — consume operator, no right-hand side
  [
    'exists',
    {
      prefix: {
        bp: 80,
        handler: (token, ctx) => ({
          type: 'unaryExpression',
          operator: token.value,
          operand: ctx.parseExpr(80),
          start: token.start,
        }),
      },
      infix: {
        bp: [30, 31],
        handler: (left, token) => ({
          type: 'unaryExpression',
          operator: token.value,
          operand: left,
          prefix: false,
          start: (left as any).start,
        }),
      },
    },
  ],
  [
    'does not exist',
    {
      infix: {
        bp: [30, 31],
        handler: (left, token) => ({
          type: 'unaryExpression',
          operator: token.value,
          operand: left,
          prefix: false,
          start: (left as any).start,
        }),
      },
    },
  ],
  [
    'is empty',
    {
      infix: {
        bp: [30, 31],
        handler: (left, token) => ({
          type: 'unaryExpression',
          operator: token.value,
          operand: left,
          prefix: false,
          start: (left as any).start,
        }),
      },
    },
  ],
  [
    'is not empty',
    {
      infix: {
        bp: [30, 31],
        handler: (left, token) => ({
          type: 'unaryExpression',
          operator: token.value,
          operand: left,
          prefix: false,
          start: (left as any).start,
        }),
      },
    },
  ],

  // Prefix unary: 'some' (from parseUnary)
  ['some', prefix(80) as BindingPowerEntry],
]);

/**
 * Assignment fragment — right-associative assignment operator.
 * Kept separate for bundle tiers that don't need assignment.
 */
export const ASSIGNMENT_FRAGMENT: BindingPowerFragment = new Map<string, BindingPowerEntry>([
  ['=', rightAssoc(5) as BindingPowerEntry],
]);

/**
 * Full binding power table — merges all fragments.
 */
export const FULL_TABLE = mergeFragments(CORE_FRAGMENT, POSITIONAL_FRAGMENT, PROPERTY_FRAGMENT);

/**
 * Parser expression table — CORE + PARSER_COMPARISON + ASSIGNMENT.
 * Used by the Parser class for full expression parsing.
 * Does NOT include POSITIONAL or PROPERTY — those are handled by
 * parseCall() and parsePrimary() for now.
 */
export const PARSER_TABLE = mergeFragments(
  CORE_FRAGMENT,
  PARSER_COMPARISON_FRAGMENT,
  ASSIGNMENT_FRAGMENT
);
