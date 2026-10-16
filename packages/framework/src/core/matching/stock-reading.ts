/**
 * Reading a domain value at a role slot: the value reading framework's old
 * matcher (`core/pattern-matching/`) did, moved here so the stock reader on the
 * matcher's skeleton (`stock-reader.ts`, domains rethink Phase 4.7) and the old
 * matcher run the same code until Phase 6 deletes the old one.
 *
 * In order: an English noise word before a selector (`the`), then the
 * multi-token forms (a possessive, `my value`; a method call,
 * `#dialog.showModal()`; a possessive selector, `#el's *opacity`; a property
 * access, `user.name`; a selector and its property, `#out.innerText`), then one
 * token by its kind (a selector, a quoted string, a number, a boolean, a
 * duration, a URL, an identifier). Each is checked against the slot's
 * expected types.
 */

import type {
  PatternToken,
  ReferenceValue,
  SemanticRole,
  SemanticValue,
  TokenStream,
  LanguageToken,
} from '../types';
import { createSelector, createLiteral, createReference, createPropertyPath } from '../types';
import { isTypeCompatible } from '../pattern-matching/utils/type-validation';
import { getPossessiveReference } from '../pattern-matching/utils/possessive-keywords';

/** What value reading needs of a language profile: its code, and its possessive words. */
export interface ReadingProfile {
  readonly code: string;
  readonly possessive?: {
    readonly keywords?: Record<string, string>;
  };
}

function isValidReference(_value: string): boolean {
  // In generic framework, no built-in references
  // Identifiers should be expressions
  return false;
}

/**
 * Safely convert a value to lowercase string.
 * Provides protection against non-string values at runtime.
 */
/** `value` lower-cased, whatever it is (the old matcher's keyword compare uses it too). */
export function safeToLowerCase(value: unknown): string {
  if (typeof value === 'string') {
    return value.toLowerCase();
  }
  if (value === null || value === undefined) {
    return '';
  }
  return String(value).toLowerCase();
}

/**
 * Match a role pattern token (captures a semantic value).
 * Handles multi-token expressions like:
 * - 'my value' (possessive keyword + property)
 * - '#dialog.showModal()' (method call)
 * - "#element's *opacity" (possessive selector + property)
 */
/**
 * Read a value for `patternToken`'s role at the stream's position into
 * `captured`, and advance past it. False when the slot does not match; an
 * optional slot whose value does not fit returns true and captures nothing.
 */
export function readRoleValue(
  tokens: TokenStream,
  patternToken: PatternToken & { type: 'role' },
  captured: Map<SemanticRole, SemanticValue>,
  profile?: ReadingProfile
): boolean {
  // Skip noise words like "the" before selectors (English idiom support)
  skipNoiseWords(tokens);

  const token = tokens.peek();
  if (!token) {
    return patternToken.optional || false;
  }

  // Check for possessive expression (e.g., 'my value', 'its innerHTML')
  const possessiveValue = tryMatchPossessiveExpression(tokens, profile);
  if (possessiveValue) {
    // Validate expected types if specified
    if (patternToken.expectedTypes && patternToken.expectedTypes.length > 0) {
      if (!isTypeCompatible(possessiveValue.type, patternToken.expectedTypes)) {
        return patternToken.optional || false;
      }
    }
    captured.set(patternToken.role, possessiveValue);
    return true;
  }

  // Check for method call expression (e.g., '#dialog.showModal()')
  const methodCallValue = tryMatchMethodCallExpression(tokens);
  if (methodCallValue) {
    if (patternToken.expectedTypes && patternToken.expectedTypes.length > 0) {
      if (!isTypeCompatible(methodCallValue.type, patternToken.expectedTypes)) {
        return patternToken.optional || false;
      }
    }
    captured.set(patternToken.role, methodCallValue);
    return true;
  }

  // Check for possessive selector expression (e.g., "#element's *opacity")
  const possessiveSelectorValue = tryMatchPossessiveSelectorExpression(tokens);
  if (possessiveSelectorValue) {
    if (patternToken.expectedTypes && patternToken.expectedTypes.length > 0) {
      // property-path is compatible with selector, reference, and expression
      if (!isTypeCompatible(possessiveSelectorValue.type, patternToken.expectedTypes)) {
        return patternToken.optional || false;
      }
    }
    captured.set(patternToken.role, possessiveSelectorValue);
    return true;
  }

  // Check for property access expression (e.g., 'userData.name', 'it.data')
  const propertyAccessValue = tryMatchPropertyAccessExpression(tokens);
  if (propertyAccessValue) {
    if (patternToken.expectedTypes && patternToken.expectedTypes.length > 0) {
      if (!isTypeCompatible(propertyAccessValue.type, patternToken.expectedTypes)) {
        return patternToken.optional || false;
      }
    }
    captured.set(patternToken.role, propertyAccessValue);
    return true;
  }

  // Check for selector + property expression (e.g., '#output.innerText')
  // This handles cases where the tokenizer produces two selector tokens
  const selectorPropertyValue = tryMatchSelectorPropertyExpression(tokens);
  if (selectorPropertyValue) {
    if (patternToken.expectedTypes && patternToken.expectedTypes.length > 0) {
      if (!isTypeCompatible(selectorPropertyValue.type, patternToken.expectedTypes)) {
        return patternToken.optional || false;
      }
    }
    captured.set(patternToken.role, selectorPropertyValue);
    return true;
  }

  // Try to extract a semantic value from the token
  const value = tokenToSemanticValue(token);
  if (!value) {
    return patternToken.optional || false;
  }

  // Validate expected types if specified
  if (patternToken.expectedTypes && patternToken.expectedTypes.length > 0) {
    if (!isTypeCompatible(value.type, patternToken.expectedTypes)) {
      return patternToken.optional || false;
    }
  }

  captured.set(patternToken.role, value);
  tokens.advance();
  return true;
}

/**
 * Try to match a possessive expression like 'my value' or 'its innerHTML'.
 * Returns the PropertyPathValue if matched, or null if not.
 */
function tryMatchPossessiveExpression(
  tokens: TokenStream,
  profile: ReadingProfile | undefined
): SemanticValue | null {
  const token = tokens.peek();
  if (!token) return null;

  // Use profile-based possessive keyword lookup
  if (!profile) return null;

  const tokenValue = token.normalized || token.value;
  const tokenLower = safeToLowerCase(tokenValue);
  const baseRef = getPossessiveReference(profile, tokenLower);

  if (!baseRef) return null;

  // We have a possessive keyword, look ahead for property name
  const mark = tokens.mark();
  tokens.advance();

  const propertyToken = tokens.peek();
  if (!propertyToken) {
    // Just the possessive keyword, no property - revert
    tokens.reset(mark);
    return null;
  }

  // Property should be an identifier, keyword (not structural), or selector (for style/dot/attr)
  // Examples: "my value", "my innerHTML", "my *background", "my *opacity", "my @data-count"
  // Also handles dot-property access: "my.textContent" tokenized as "my" + ".textContent"
  if (
    propertyToken.kind === 'identifier' ||
    (propertyToken.kind === 'keyword' && !isStructuralKeyword(propertyToken.value)) ||
    (propertyToken.kind === 'selector' && propertyToken.value.startsWith('*')) ||
    (propertyToken.kind === 'selector' && propertyToken.value.startsWith('@')) ||
    (propertyToken.kind === 'selector' &&
      propertyToken.value.startsWith('.') &&
      /^\.[a-zA-Z_]\w*/.test(propertyToken.value))
  ) {
    tokens.advance();

    // For dot-property selectors (.textContent), strip the leading dot
    let propertyName = propertyToken.value;
    if (
      propertyToken.kind === 'selector' &&
      propertyName.startsWith('.') &&
      /^\.[a-zA-Z_]\w*/.test(propertyName)
    ) {
      propertyName = propertyName.substring(1);
    }

    // Consume chained dot-property access (.parentElement.style.display)
    let chainedProps = propertyName;
    while (
      tokens.peek()?.kind === 'selector' &&
      tokens.peek()!.value.startsWith('.') &&
      /^\.[a-zA-Z_]\w*/.test(tokens.peek()!.value)
    ) {
      chainedProps += tokens.peek()!.value; // keep the dots for chaining
      tokens.advance();
    }

    // Check for method call — next token is '(' in the value (e.g., .getAttribute("data-id"))
    const nextPeek = tokens.peek();
    if (nextPeek?.kind === 'literal' && nextPeek.value.startsWith('(')) {
      // Consume method args
      chainedProps += nextPeek.value;
      tokens.advance();
    }

    // Create property-path: my value -> { object: me, property: 'value' }
    // baseRef from getPossessiveReference is always a valid reference ('me', 'you', 'it', etc.)
    return createPropertyPath(createReference(baseRef as ReferenceValue['value']), chainedProps);
  }

  // Not a valid property, revert
  tokens.reset(mark);
  return null;
}

/**
 * Check if a keyword is a structural keyword (preposition, control flow, etc.)
 * that shouldn't be consumed as a property name.
 */
function isStructuralKeyword(value: string): boolean {
  const structural = new Set([
    // Prepositions
    'into',
    'in',
    'to',
    'from',
    'at',
    'by',
    'with',
    'without',
    'before',
    'after',
    'of',
    'as',
    'on',
    // Control flow
    'then',
    'end',
    'else',
    'if',
    'repeat',
    'while',
    'for',
    // Commands (shouldn't be property names)
    'toggle',
    'add',
    'remove',
    'put',
    'set',
    'show',
    'hide',
    'increment',
    'decrement',
    'send',
    'trigger',
    'call',
  ]);
  return structural.has(value.toLowerCase());
}

/**
 * Try to match a method call expression like '#dialog.showModal()'.
 * Pattern: selector + '.' + identifier + '(' + [args] + ')'
 * Returns an expression value if matched, or null if not.
 */
function tryMatchMethodCallExpression(tokens: TokenStream): SemanticValue | null {
  const token = tokens.peek();
  if (!token || token.kind !== 'selector') return null;

  // Look ahead for: . identifier (
  const mark = tokens.mark();
  tokens.advance(); // consume selector

  const dotToken = tokens.peek();
  if (!dotToken || dotToken.kind !== 'operator' || dotToken.value !== '.') {
    tokens.reset(mark);
    return null;
  }
  tokens.advance(); // consume .

  const methodToken = tokens.peek();
  if (!methodToken || methodToken.kind !== 'identifier') {
    tokens.reset(mark);
    return null;
  }
  tokens.advance(); // consume method name

  const openParen = tokens.peek();
  if (!openParen || openParen.kind !== 'punctuation' || openParen.value !== '(') {
    tokens.reset(mark);
    return null;
  }
  tokens.advance(); // consume (

  // Consume arguments until we find ) (with depth limit for security)
  const args: string[] = [];
  while (!tokens.isAtEnd() && args.length < MAX_METHOD_ARGS) {
    const argToken = tokens.peek();
    if (!argToken) break;
    if (argToken.kind === 'punctuation' && argToken.value === ')') {
      tokens.advance(); // consume )
      break;
    }
    // Skip commas
    if (argToken.kind === 'punctuation' && argToken.value === ',') {
      tokens.advance();
      continue;
    }
    // Collect arg value
    args.push(argToken.value);
    tokens.advance();
  }

  // Create expression value: #dialog.showModal()
  const methodCall = `${token.value}.${methodToken.value}(${args.join(', ')})`;
  return {
    type: 'expression',
    raw: methodCall,
  } as SemanticValue;
}

/**
 * Try to match a property access expression like 'userData.name' or 'it.data'.
 * Pattern: (identifier | keyword) + '.' + identifier [+ '.' + identifier ...]
 * Returns an expression value if matched, or null if not.
 */
function tryMatchPropertyAccessExpression(tokens: TokenStream): SemanticValue | null {
  const token = tokens.peek();
  if (!token) return null;

  // Must start with an identifier or keyword reference
  if (token.kind !== 'identifier' && token.kind !== 'keyword') return null;

  // Look ahead for: . identifier
  const mark = tokens.mark();
  tokens.advance(); // consume first token

  const dotToken = tokens.peek();
  if (!dotToken || dotToken.kind !== 'operator' || dotToken.value !== '.') {
    tokens.reset(mark);
    return null;
  }
  tokens.advance(); // consume .

  const propertyToken = tokens.peek();
  if (!propertyToken || propertyToken.kind !== 'identifier') {
    tokens.reset(mark);
    return null;
  }
  tokens.advance(); // consume property name

  // Build the property chain
  let chain = `${token.value}.${propertyToken.value}`;
  let depth = 1; // Already have one property access

  // Continue for nested property access (e.g., userData.address.city)
  // With depth limit for security
  while (!tokens.isAtEnd() && depth < MAX_PROPERTY_DEPTH) {
    const nextDot = tokens.peek();
    if (!nextDot || nextDot.kind !== 'operator' || nextDot.value !== '.') {
      break;
    }
    tokens.advance(); // consume .

    const nextProp = tokens.peek();
    if (!nextProp || nextProp.kind !== 'identifier') {
      // Dot without property - put the dot back and stop
      // Can't easily put a single token back, so we'll include it
      break;
    }
    tokens.advance(); // consume property
    chain += `.${nextProp.value}`;
    depth++;
  }

  // Check for method call: chain + '(' + args + ')'
  // e.g., me.insertBefore(draggedItem, dropTarget)
  const openParen = tokens.peek();
  if (openParen && openParen.kind === 'punctuation' && openParen.value === '(') {
    tokens.advance(); // consume (

    // Collect arguments (comma-separated values)
    const args: string[] = [];
    let argDepth = 0; // Track nested parentheses
    while (!tokens.isAtEnd() && args.length < MAX_METHOD_ARGS) {
      const argToken = tokens.peek();
      if (!argToken) break;

      // Handle close paren - respecting nesting
      if (argToken.kind === 'punctuation' && argToken.value === ')') {
        if (argDepth === 0) {
          tokens.advance(); // consume )
          break;
        }
        argDepth--;
      }
      // Track nested open parens
      if (argToken.kind === 'punctuation' && argToken.value === '(') {
        argDepth++;
      }
      // Skip commas between arguments
      if (argToken.kind === 'punctuation' && argToken.value === ',') {
        tokens.advance();
        continue;
      }
      // Collect arg value
      args.push(argToken.value);
      tokens.advance();
    }

    // Create expression value with method call: me.insertBefore(a, b)
    const methodCall = `${chain}(${args.join(', ')})`;
    return {
      type: 'expression',
      raw: methodCall,
    } as SemanticValue;
  }

  // Create expression value: userData.name
  return {
    type: 'expression',
    raw: chain,
  } as SemanticValue;
}

/**
 * Try to match a possessive selector expression like "#element's *opacity".
 * Pattern: selector + "'s" + (selector | identifier)
 * Returns a property-path value if matched, or null if not.
 */
function tryMatchPossessiveSelectorExpression(tokens: TokenStream): SemanticValue | null {
  const token = tokens.peek();
  if (!token || token.kind !== 'selector') return null;

  // Look ahead for: 's (possessive marker)
  const mark = tokens.mark();
  tokens.advance(); // consume selector

  const possessiveToken = tokens.peek();
  if (
    !possessiveToken ||
    possessiveToken.kind !== 'punctuation' ||
    possessiveToken.value !== "'s"
  ) {
    tokens.reset(mark);
    return null;
  }
  tokens.advance(); // consume 's

  const propertyToken = tokens.peek();
  if (!propertyToken) {
    tokens.reset(mark);
    return null;
  }

  // Property can be a selector (*opacity) or identifier
  if (propertyToken.kind !== 'selector' && propertyToken.kind !== 'identifier') {
    tokens.reset(mark);
    return null;
  }
  tokens.advance(); // consume property

  // Create property-path: #element's *opacity
  return createPropertyPath(createSelector(token.value), propertyToken.value);
}

/**
 * Try to match a selector + property expression like "#output.innerText".
 * This handles cases where the tokenizer produces two selector tokens:
 * - #output (id selector)
 * - .innerText (looks like class selector, but is actually property)
 *
 * Pattern: id-selector + class-selector-that-is-actually-property
 * Returns a property-path value if matched, or null if not.
 */
function tryMatchSelectorPropertyExpression(tokens: TokenStream): SemanticValue | null {
  const token = tokens.peek();
  if (!token || token.kind !== 'selector') return null;

  // Must be an ID selector (starts with #)
  if (typeof token.value !== 'string' || !token.value.startsWith('#')) return null;

  // Look ahead for: selector that looks like a property (.something)
  const mark = tokens.mark();
  tokens.advance(); // consume first selector

  const propertyToken = tokens.peek();
  if (!propertyToken || propertyToken.kind !== 'selector') {
    tokens.reset(mark);
    return null;
  }

  // Second token must look like a class selector (starts with .)
  // but we interpret it as a property access
  if (!propertyToken.value.startsWith('.')) {
    tokens.reset(mark);
    return null;
  }

  // Verify the next token is not a selector (to avoid consuming too many)
  // This helps distinguish "#output.innerText" from "#box .child"
  const peek2 = tokens.peek(1);
  if (peek2 && peek2.kind === 'selector') {
    // Could be a compound selector chain - only take first two
  }

  tokens.advance(); // consume property selector

  // Create property-path: #output.innerText
  // Extract property name without the leading dot
  const propertyName = propertyToken.value.slice(1);

  return createPropertyPath(createSelector(token.value), propertyName);
}

/** Maximum depth for nested property access (e.g., a.b.c.d...) */
const MAX_PROPERTY_DEPTH = 10;

/** Maximum number of arguments in method calls */
const MAX_METHOD_ARGS = 20;

/**
 * Convert a language token to a semantic value.
 */
function tokenToSemanticValue(token: LanguageToken): SemanticValue | null {
  switch (token.kind) {
    case 'selector':
      return createSelector(token.value);

    case 'literal':
      return parseLiteralValue(token.value);

    case 'keyword': {
      // Keywords might be references or values
      const tokenValue = token.normalized || token.value;
      const lower = safeToLowerCase(tokenValue);
      if (isValidReference(lower)) {
        return createReference(lower);
      }
      return createLiteral(token.normalized || token.value);
    }

    case 'identifier': {
      // Check if it's a variable reference (:varname)
      // Note: :varname doesn't match the ReferenceValue union but is used as a
      // reference token downstream — this cast preserves existing behavior
      if (typeof token.value === 'string' && token.value.startsWith(':')) {
        return createReference(token.value as ReferenceValue['value']);
      }
      // Check if it's a built-in reference
      const identLower = safeToLowerCase(token.value);
      if (isValidReference(identLower)) {
        return createReference(identLower);
      }
      // Regular identifiers are variable references - use 'expression' type
      // which gets converted to 'identifier' AST nodes by semantic-integration.ts
      return { type: 'expression', raw: token.value } as const;
    }

    case 'url':
      // URLs are treated as string literals (paths/URLs for navigation/fetch)
      return createLiteral(token.value, 'string');

    default:
      return null;
  }
}

/**
 * Parse a literal value (string, number, boolean).
 */
function parseLiteralValue(value: string): SemanticValue {
  // String literal
  if (
    value.startsWith('"') ||
    value.startsWith("'") ||
    value.startsWith('`') ||
    value.startsWith('「')
  ) {
    const inner = value.slice(1, -1);
    return createLiteral(inner, 'string');
  }

  // Boolean
  if (value === 'true') return createLiteral(true, 'boolean');
  if (value === 'false') return createLiteral(false, 'boolean');

  // Duration (number with suffix)
  const durationMatch = value.match(/^(\d+(?:\.\d+)?)(ms|s|m|h)?$/);
  if (durationMatch) {
    const num = parseFloat(durationMatch[1]);
    const unit = durationMatch[2];
    if (unit) {
      return createLiteral(value, 'duration');
    }
    return createLiteral(num, 'number');
  }

  // Plain number
  const num = parseFloat(value);
  if (!isNaN(num)) {
    return createLiteral(num, 'number');
  }

  // Default to string
  return createLiteral(value, 'string');
}

/**
 * Noise words that can be skipped in English for more natural syntax.
 * - "the" before selectors: "toggle the .active" → "toggle .active"
 * - "class" after class selectors: "add the .visible class" → "add .visible"
 */
const ENGLISH_NOISE_WORDS = new Set(['the', 'a', 'an']);

/**
 * Skip noise words like "the" before selectors.
 * This enables more natural English syntax like "toggle the .active".
 */
function skipNoiseWords(tokens: TokenStream): void {
  const token = tokens.peek();
  if (!token) return;

  const tokenLower = safeToLowerCase(token.value);

  // Check if current token is a noise word (like "the")
  if (ENGLISH_NOISE_WORDS.has(tokenLower)) {
    // Look ahead to see if the next token is a selector
    const mark = tokens.mark();
    tokens.advance();
    const nextToken = tokens.peek();

    if (nextToken && nextToken.kind === 'selector') {
      // Keep the position after "the" - effectively skipping it
      return;
    }

    // Not followed by a selector, revert
    tokens.reset(mark);
  }

  // Also handle "class" after class selectors: ".visible class" → ".visible"
  // This is handled when the selector has already been consumed,
  // so we check if current token is "class" and skip it
  if (tokenLower === 'class') {
    // Skip "class" as it's just noise after a class selector
    tokens.advance();
  }
}
