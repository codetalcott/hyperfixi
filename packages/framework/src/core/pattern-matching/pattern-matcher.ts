/**
 * Pattern Matcher
 *
 * Matches tokenized input against language patterns to extract semantic roles.
 * This is the core algorithm for multilingual parsing.
 */

import type {
  LanguagePattern,
  PatternToken,
  PatternMatchResult,
  ReferenceValue,
  SemanticRole,
  SemanticValue,
  TokenStream,
  LanguageToken,
} from '../types';
import { createSelector, createLiteral, createReference, createPropertyPath } from '../types';
import { createLogger } from '../logger';

/**
 * Helper to check if a value is a built-in reference.
 * In the generic framework, we don't assume any built-in references.
 * DSLs that need references (like hyperscript's 'me', 'it', 'you') should
 * handle them in their tokenizer or provide a custom reference validator.
 *
 * For generic DSLs, identifiers are treated as expressions by default.
 */
function isValidReference(_value: string): boolean {
  // In generic framework, no built-in references
  // Identifiers should be expressions
  return false;
}
import { isTypeCompatible } from './utils/type-validation';
import { getPossessiveReference } from './utils/possessive-keywords';

/**
 * Minimal profile interface needed by PatternMatcher.
 * DSLs can provide this to enable possessive handling and language-specific features.
 */
export interface PatternMatcherProfile {
  readonly code: string;
  readonly possessive?: {
    readonly keywords?: Record<string, string>;
  };
}

// =============================================================================
// Pattern Matcher
// =============================================================================

export class PatternMatcher {
  /** Debug logger */
  private logger = createLogger('pattern-matcher');

  /** Current language profile for the pattern being matched */
  private currentProfile: PatternMatcherProfile | undefined;

  /**
   * Safely convert a value to lowercase string.
   * Provides protection against non-string values at runtime.
   */
  private safeToLowerCase(value: unknown): string {
    if (typeof value === 'string') {
      return value.toLowerCase();
    }
    if (value === null || value === undefined) {
      return '';
    }
    return String(value).toLowerCase();
  }

  /**
   * Try to match a single pattern against the token stream.
   * Returns the match result or null if no match.
   *
   * @param tokens - Token stream to match against
   * @param pattern - Pattern to match
   * @param profile - Optional language profile for possessive handling
   */
  matchPattern(
    tokens: TokenStream,
    pattern: LanguagePattern,
    profile?: PatternMatcherProfile
  ): PatternMatchResult | null {
    const mark = tokens.mark();
    const captured = new Map<SemanticRole, SemanticValue>();

    // Debug logging
    this.logger.debug('========================================');
    this.logger.debug('matchPattern ENTRY');
    this.logger.debug('Pattern ID:', pattern.id);
    this.logger.debug('Pattern command:', pattern.command);
    this.logger.debug('Pattern language:', pattern.language);
    this.logger.debug('Pattern template:', JSON.stringify(pattern.template, null, 2));

    if (this.logger.isEnabled()) {
      const firstTokens = [];
      for (let i = 0; i < 10; i++) {
        const t = tokens.peek(i);
        if (t)
          firstTokens.push({
            type: (t as any).type,
            value: (t as any).value,
            kind: (t as any).kind,
          });
        else break;
      }
      this.logger.debug('Input tokens (first 10):', firstTokens);
      this.logger.debug('Profile code:', profile?.code);
    }

    // Use provided profile for possessive keyword lookup
    this.currentProfile = profile;

    // Reset match counters for this pattern
    this.stemMatchCount = 0;
    this.totalKeywordMatches = 0;

    this.logger.debug('--- Calling matchTokenSequence ---');
    this.logger.debug('Pattern tokens to match:', JSON.stringify(pattern.template.tokens, null, 2));
    const success = this.matchTokenSequence(tokens, pattern.template.tokens, captured);
    this.logger.debug('matchTokenSequence returned:', success);
    this.logger.debug(
      'Captured roles:',
      Array.from(captured.entries()).map(([k, v]) => [k, JSON.stringify(v)])
    );

    if (!success) {
      this.logger.debug('>>> MATCH FAILED - resetting token position');
      tokens.reset(mark);
      return null;
    }

    // Calculate confidence BEFORE applying defaults
    // This ensures defaulted roles don't artificially inflate confidence
    const confidence = this.calculateConfidence(pattern, captured);

    // Apply extraction rules to fill in any missing roles with defaults
    this.applyExtractionRules(pattern, captured);

    return {
      pattern,
      captured,
      consumedTokens: tokens.position() - mark.position,
      confidence,
    };
  }

  /**
   * Try to match multiple patterns, return the best match.
   *
   * @param tokens - Token stream to match against
   * @param patterns - Candidate patterns to try
   * @param profile - Optional language profile for possessive handling
   */
  matchBest(
    tokens: TokenStream,
    patterns: LanguagePattern[],
    profile?: PatternMatcherProfile
  ): PatternMatchResult | null {
    const matches: PatternMatchResult[] = [];

    for (const pattern of patterns) {
      const mark = tokens.mark();
      const result = this.matchPattern(tokens, pattern, profile);

      if (result) {
        matches.push(result);
      }

      tokens.reset(mark);
    }

    if (matches.length === 0) {
      return null;
    }

    // Sort by confidence and priority
    matches.sort((a, b) => {
      // First by priority
      const priorityDiff = b.pattern.priority - a.pattern.priority;
      if (priorityDiff !== 0) return priorityDiff;

      // Then by confidence
      const confidenceDiff = b.confidence - a.confidence;
      if (Math.abs(confidenceDiff) > 0.001) return confidenceDiff;

      // Then by tokens consumed (prefer more complete matches)
      return b.consumedTokens - a.consumedTokens;
    });

    // Re-consume tokens for the best match
    const best = matches[0];
    this.matchPattern(tokens, best.pattern);

    return best;
  }

  /**
   * Match a sequence of pattern tokens against the token stream.
   */
  private matchTokenSequence(
    tokens: TokenStream,
    patternTokens: PatternToken[],
    captured: Map<SemanticRole, SemanticValue>
  ): boolean {
    // Skip leading conjunctions for Arabic (proclitics: و, ف, ول, وب, etc.)
    // BUT NOT if the pattern explicitly expects a conjunction (proclitic patterns)
    const firstPatternToken = patternTokens[0];
    const patternExpectsConjunction =
      firstPatternToken?.type === 'literal' &&
      (firstPatternToken.value === 'and' ||
        firstPatternToken.value === 'then' ||
        firstPatternToken.alternatives?.includes('and') ||
        firstPatternToken.alternatives?.includes('then'));

    if (this.currentProfile?.code === 'ar' && !patternExpectsConjunction) {
      while (tokens.peek()?.kind === 'conjunction') {
        tokens.advance();
      }
    }

    for (const patternToken of patternTokens) {
      this.logger.debug('  >> Matching pattern token:', JSON.stringify(patternToken, null, 2));
      const currTok = tokens.peek();
      this.logger.debug(
        '  >> Current input token:',
        currTok
          ? JSON.stringify({
              type: (currTok as any).type,
              value: (currTok as any).value,
              kind: (currTok as any).kind,
            })
          : 'EOF'
      );
      const matched = this.matchPatternToken(tokens, patternToken, captured);
      this.logger.debug('  >> Match result:', matched);

      if (!matched) {
        this.logger.debug('  >> Token match FAILED');
        // If token is optional, continue
        if (this.isOptional(patternToken)) {
          continue;
        }
        return false;
      }
    }

    return true;
  }

  /**
   * Match a single pattern token against the current position in the stream.
   */
  private matchPatternToken(
    tokens: TokenStream,
    patternToken: PatternToken,
    captured: Map<SemanticRole, SemanticValue>
  ): boolean {
    switch (patternToken.type) {
      case 'literal':
        return this.matchLiteralToken(tokens, patternToken);

      case 'role':
        return this.matchRoleToken(tokens, patternToken, captured);

      case 'group':
        return this.matchGroupToken(tokens, patternToken, captured);

      default:
        return false;
    }
  }

  /**
   * Match a literal pattern token (keyword or particle).
   */
  private matchLiteralToken(
    tokens: TokenStream,
    patternToken: PatternToken & { type: 'literal' }
  ): boolean {
    const token = tokens.peek();
    this.logger.debug('    >>> matchLiteralToken: expecting', patternToken.value);
    this.logger.debug(
      '    >>> matchLiteralToken: got token',
      token
        ? JSON.stringify({
            type: (token as any).type,
            value: (token as any).value,
            kind: (token as any).kind,
          })
        : 'null'
    );
    if (!token) {
      this.logger.debug('    >>> matchLiteralToken: FAIL - no token');
      return false;
    }

    // Check main value
    const matchType = this.getMatchType(token, patternToken.value);
    this.logger.debug(
      '    >>> matchType for',
      token.value,
      'vs',
      patternToken.value,
      ':',
      matchType
    );
    if (matchType !== 'none') {
      this.totalKeywordMatches++;
      if (matchType === 'stem') {
        this.stemMatchCount++;
      }
      tokens.advance();
      return true;
    }

    // Check alternatives
    if (patternToken.alternatives) {
      for (const alt of patternToken.alternatives) {
        const altMatchType = this.getMatchType(token, alt);
        if (altMatchType !== 'none') {
          this.totalKeywordMatches++;
          if (altMatchType === 'stem') {
            this.stemMatchCount++;
          }
          tokens.advance();
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Match a role pattern token (captures a semantic value).
   * Handles multi-token expressions like:
   * - 'my value' (possessive keyword + property)
   * - '#dialog.showModal()' (method call)
   * - "#element's *opacity" (possessive selector + property)
   */
  private matchRoleToken(
    tokens: TokenStream,
    patternToken: PatternToken & { type: 'role' },
    captured: Map<SemanticRole, SemanticValue>
  ): boolean {
    this.logger.debug('    >>> matchRoleToken ENTRY: capturing role', patternToken.role);
    this.logger.debug('    >>> matchRoleToken: expected types', patternToken.expectedTypes);
    this.logger.debug('    >>> matchRoleToken: optional?', patternToken.optional);
    // Skip noise words like "the" before selectors (English idiom support)
    this.skipNoiseWords(tokens);

    const token = tokens.peek();
    this.logger.debug(
      '    >>> After skipNoiseWords, current token:',
      token ? JSON.stringify({ value: (token as any).value, kind: (token as any).kind }) : 'null'
    );
    if (!token) {
      return patternToken.optional || false;
    }

    // Check for possessive expression (e.g., 'my value', 'its innerHTML')
    const possessiveValue = this.tryMatchPossessiveExpression(tokens);
    if (possessiveValue) {
      // Validate expected types if specified
      if (patternToken.expectedTypes && patternToken.expectedTypes.length > 0) {
        if (
          !patternToken.expectedTypes.includes(possessiveValue.type) &&
          !patternToken.expectedTypes.includes('expression')
        ) {
          return patternToken.optional || false;
        }
      }
      captured.set(patternToken.role, possessiveValue);
      return true;
    }

    // Check for method call expression (e.g., '#dialog.showModal()')
    const methodCallValue = this.tryMatchMethodCallExpression(tokens);
    if (methodCallValue) {
      if (patternToken.expectedTypes && patternToken.expectedTypes.length > 0) {
        if (
          !patternToken.expectedTypes.includes(methodCallValue.type) &&
          !patternToken.expectedTypes.includes('expression')
        ) {
          return patternToken.optional || false;
        }
      }
      captured.set(patternToken.role, methodCallValue);
      return true;
    }

    // Check for possessive selector expression (e.g., "#element's *opacity")
    const possessiveSelectorValue = this.tryMatchPossessiveSelectorExpression(tokens);
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
    const propertyAccessValue = this.tryMatchPropertyAccessExpression(tokens);
    if (propertyAccessValue) {
      if (patternToken.expectedTypes && patternToken.expectedTypes.length > 0) {
        if (
          !patternToken.expectedTypes.includes(propertyAccessValue.type) &&
          !patternToken.expectedTypes.includes('expression')
        ) {
          return patternToken.optional || false;
        }
      }
      captured.set(patternToken.role, propertyAccessValue);
      return true;
    }

    // Check for selector + property expression (e.g., '#output.innerText')
    // This handles cases where the tokenizer produces two selector tokens
    const selectorPropertyValue = this.tryMatchSelectorPropertyExpression(tokens);
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
    this.logger.debug(
      '    >>> Trying tokenToSemanticValue for token:',
      token ? JSON.stringify({ value: (token as any).value, kind: (token as any).kind }) : 'null'
    );
    const value = this.tokenToSemanticValue(token);
    this.logger.debug(
      '    >>> tokenToSemanticValue returned:',
      value ? JSON.stringify(value) : 'null'
    );
    if (!value) {
      return patternToken.optional || false;
    }

    // Validate expected types if specified
    this.logger.debug(
      '    >>> Validating type:',
      value.type,
      'against expected:',
      patternToken.expectedTypes
    );
    if (patternToken.expectedTypes && patternToken.expectedTypes.length > 0) {
      if (!isTypeCompatible(value.type, patternToken.expectedTypes)) {
        this.logger.debug('    >>> TYPE MISMATCH - returning', patternToken.optional || false);
        return patternToken.optional || false;
      }
    }
    this.logger.debug('    >>> Type validation PASSED');

    captured.set(patternToken.role, value);
    tokens.advance();
    return true;
  }

  /**
   * Try to match a possessive expression like 'my value' or 'its innerHTML'.
   * Returns the PropertyPathValue if matched, or null if not.
   */
  private tryMatchPossessiveExpression(tokens: TokenStream): SemanticValue | null {
    const token = tokens.peek();
    if (!token) return null;

    // Use profile-based possessive keyword lookup
    if (!this.currentProfile) return null;

    const tokenValue = token.normalized || token.value;
    const tokenLower = this.safeToLowerCase(tokenValue);
    const baseRef = getPossessiveReference(this.currentProfile, tokenLower);

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
      (propertyToken.kind === 'keyword' && !this.isStructuralKeyword(propertyToken.value)) ||
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
  private isStructuralKeyword(value: string): boolean {
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
  private tryMatchMethodCallExpression(tokens: TokenStream): SemanticValue | null {
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
    while (!tokens.isAtEnd() && args.length < PatternMatcher.MAX_METHOD_ARGS) {
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
  private tryMatchPropertyAccessExpression(tokens: TokenStream): SemanticValue | null {
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
    while (!tokens.isAtEnd() && depth < PatternMatcher.MAX_PROPERTY_DEPTH) {
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
      while (!tokens.isAtEnd() && args.length < PatternMatcher.MAX_METHOD_ARGS) {
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
  private tryMatchPossessiveSelectorExpression(tokens: TokenStream): SemanticValue | null {
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
  private tryMatchSelectorPropertyExpression(tokens: TokenStream): SemanticValue | null {
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

  /**
   * Match a group pattern token (optional sequence).
   */
  private matchGroupToken(
    tokens: TokenStream,
    patternToken: PatternToken & { type: 'group' },
    captured: Map<SemanticRole, SemanticValue>
  ): boolean {
    const mark = tokens.mark();

    // Track which roles were captured before this group
    const capturedBefore = new Set(captured.keys());

    const success = this.matchTokenSequence(tokens, patternToken.tokens, captured);

    if (!success) {
      tokens.reset(mark);
      // Clear any roles that were partially captured during the failed group match
      for (const role of captured.keys()) {
        if (!capturedBefore.has(role)) {
          captured.delete(role);
        }
      }
      return patternToken.optional || false;
    }

    return true;
  }

  /**
   * Get the type of match for a token against a value.
   * Used for confidence calculation.
   */
  private getMatchType(
    token: LanguageToken,
    value: string
  ): 'exact' | 'normalized' | 'stem' | 'case-insensitive' | 'none' {
    // Exact match (highest confidence)
    if (token.value === value) return 'exact';

    // Explicit keyword map normalized match (high confidence)
    if (token.normalized === value) return 'normalized';

    // Morphologically normalized stem match (medium-high confidence)
    // Only accept if stem confidence is reasonable
    if (token.stem === value && token.stemConfidence !== undefined && token.stemConfidence >= 0.7) {
      return 'stem';
    }

    // Case-insensitive match for keywords (medium confidence)
    if (token.kind === 'keyword' && this.safeToLowerCase(token.value) === value.toLowerCase()) {
      return 'case-insensitive';
    }

    return 'none';
  }

  /**
   * Track stem matches for confidence calculation.
   * This is set during matching and read during confidence calculation.
   */
  private stemMatchCount: number = 0;
  private totalKeywordMatches: number = 0;

  // ==========================================================================
  // Depth Limits for Expression Parsing (security hardening)
  // ==========================================================================

  /** Maximum depth for nested property access (e.g., a.b.c.d...) */
  private static readonly MAX_PROPERTY_DEPTH = 10;

  /** Maximum number of arguments in method calls */
  private static readonly MAX_METHOD_ARGS = 20;

  /**
   * Convert a language token to a semantic value.
   */
  private tokenToSemanticValue(token: LanguageToken): SemanticValue | null {
    switch (token.kind) {
      case 'selector':
        return createSelector(token.value);

      case 'literal':
        return this.parseLiteralValue(token.value);

      case 'keyword':
        // Keywords might be references or values
        const tokenValue = token.normalized || token.value;
        const lower = this.safeToLowerCase(tokenValue);
        if (isValidReference(lower)) {
          return createReference(lower);
        }
        return createLiteral(token.normalized || token.value);

      case 'identifier':
        // Check if it's a variable reference (:varname)
        // Note: :varname doesn't match the ReferenceValue union but is used as a
        // reference token downstream — this cast preserves existing behavior
        if (typeof token.value === 'string' && token.value.startsWith(':')) {
          return createReference(token.value as ReferenceValue['value']);
        }
        // Check if it's a built-in reference
        const identLower = this.safeToLowerCase(token.value);
        if (isValidReference(identLower)) {
          return createReference(identLower);
        }
        // Regular identifiers are variable references - use 'expression' type
        // which gets converted to 'identifier' AST nodes by semantic-integration.ts
        return { type: 'expression', raw: token.value } as const;

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
  private parseLiteralValue(value: string): SemanticValue {
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
   * Apply extraction rules to fill in static values and defaults for missing roles.
   */
  private applyExtractionRules(
    pattern: LanguagePattern,
    captured: Map<SemanticRole, SemanticValue>
  ): void {
    for (const [role, rule] of Object.entries(pattern.extraction)) {
      if (!captured.has(role as SemanticRole)) {
        if (rule.value !== undefined) {
          // Static value extraction (e.g., action: { value: "toggle" })
          captured.set(role as SemanticRole, { type: 'literal', value: rule.value });
        } else if (rule.default) {
          captured.set(role as SemanticRole, rule.default);
        }
      }
    }
  }

  /**
   * Check if a pattern token is optional.
   */
  private isOptional(patternToken: PatternToken): boolean {
    return patternToken.type !== 'literal' && patternToken.optional === true;
  }

  /**
   * Calculate confidence score for a match (0-1).
   *
   * Confidence is reduced for:
   * - Stem matches (morphological normalization has inherent uncertainty)
   * - Missing optional roles (but less penalty if role has a default value)
   *
   * Confidence is increased for:
   * - VSO languages (Arabic) when pattern starts with a verb
   */
  private calculateConfidence(
    pattern: LanguagePattern,
    captured: Map<SemanticRole, SemanticValue>
  ): number {
    let score = 0;
    let maxScore = 0;

    // Helper to check if a role has a default value in extraction rules
    const hasDefault = (role: SemanticRole): boolean => {
      return pattern.extraction?.[role]?.default !== undefined;
    };

    // Score based on captured roles
    for (const token of pattern.template.tokens) {
      if (token.type === 'role') {
        maxScore += 1;
        if (captured.has(token.role)) {
          score += 1;
        }
      } else if (token.type === 'group') {
        // Group tokens are optional - weight depends on whether they have defaults
        for (const subToken of token.tokens) {
          if (subToken.type === 'role') {
            const roleHasDefault = hasDefault(subToken.role);
            const weight = 0.8; // Optional roles: 80% weight
            maxScore += weight;

            if (captured.has(subToken.role)) {
              // Role was explicitly provided by user
              score += weight;
            } else if (roleHasDefault) {
              // Role has a default - give 60% partial credit since command is semantically complete
              // This prevents penalizing common patterns like "toggle .active" (default: me)
              score += weight * 0.6;
            }
            // If no default and not captured, score += 0 (true penalty for missing info)
          }
        }
      }
    }

    let baseConfidence = maxScore > 0 ? score / maxScore : 1;

    // Apply penalty for stem matches
    // Each stem match reduces confidence slightly (e.g., 5% per stem match)
    // This ensures exact matches are preferred over morphological matches
    if (this.stemMatchCount > 0 && this.totalKeywordMatches > 0) {
      const stemPenalty = (this.stemMatchCount / this.totalKeywordMatches) * 0.15;
      baseConfidence = Math.max(0.5, baseConfidence - stemPenalty);
    }

    // Apply VSO confidence boost for Arabic verb-first patterns
    const vsoBoost = this.calculateVSOConfidenceBoost(pattern);
    baseConfidence = Math.min(1.0, baseConfidence + vsoBoost);

    // Apply preposition disambiguation adjustment for Arabic
    const prepositionAdjustment = this.arabicPrepositionDisambiguation(pattern, captured);
    baseConfidence = Math.max(0.0, Math.min(1.0, baseConfidence + prepositionAdjustment));

    return baseConfidence;
  }

  /**
   * Calculate confidence boost for VSO (Verb-Subject-Object) language patterns.
   * Arabic naturally uses VSO word order, so patterns that start with a verb
   * should receive a confidence boost.
   *
   * Returns +0.15 confidence boost if:
   * - Language is Arabic ('ar')
   * - Pattern's first token is a verb keyword
   *
   * @param pattern The language pattern being matched
   * @returns Confidence boost (0 or 0.15)
   */
  private calculateVSOConfidenceBoost(pattern: LanguagePattern): number {
    // Only apply to Arabic
    if (pattern.language !== 'ar') {
      return 0;
    }

    // Check if first token in pattern is a literal (keyword)
    const firstToken = pattern.template.tokens[0];
    if (!firstToken || firstToken.type !== 'literal') {
      return 0;
    }

    // List of Arabic verb keywords (command verbs)
    const ARABIC_VERBS = new Set([
      'بدل',
      'غير',
      'أضف',
      'أزل',
      'ضع',
      'اجعل',
      'عين',
      'زد',
      'انقص',
      'سجل',
      'أظهر',
      'أخف',
      'شغل',
      'أرسل',
      'ركز',
      'شوش',
      'توقف',
      'انسخ',
      'احذف',
      'اصنع',
      'انتظر',
      'انتقال',
      'أو',
    ]);

    // Check if first token value is a verb
    if (ARABIC_VERBS.has(firstToken.value)) {
      return 0.15;
    }

    // Check alternatives
    if (firstToken.alternatives) {
      for (const alt of firstToken.alternatives) {
        if (ARABIC_VERBS.has(alt)) {
          return 0.15;
        }
      }
    }

    return 0;
  }

  /**
   * Arabic preposition disambiguation for confidence adjustment.
   *
   * Different Arabic prepositions are more or less natural for different semantic roles:
   * - على (on/upon) is preferred for patient/target roles (element selectors)
   * - إلى (to) is preferred for destination roles
   * - من (from) is preferred for source roles
   * - في (in) is preferred for location roles
   *
   * This method analyzes the prepositions used with captured semantic roles and
   * adjusts confidence based on idiomaticity:
   * - +0.10 for highly idiomatic preposition choices
   * - -0.10 for less natural preposition choices
   *
   * @param pattern The language pattern being matched
   * @param captured The captured semantic values
   * @returns Confidence adjustment (-0.10 to +0.10)
   */
  private arabicPrepositionDisambiguation(
    pattern: LanguagePattern,
    captured: Map<SemanticRole, SemanticValue>
  ): number {
    // Only apply to Arabic
    if (pattern.language !== 'ar') {
      return 0;
    }

    let adjustment = 0;

    // Preferred prepositions for each semantic role
    // Only including roles that commonly use prepositions in Arabic
    const PREFERRED_PREPOSITIONS: Partial<Record<SemanticRole, string[]>> = {
      patient: ['على'], // element selectors prefer على (on/upon)
      destination: ['إلى', 'الى'], // destination prefers إلى (to)
      source: ['من'], // source prefers من (from)
      agent: ['من'], // agent/by prefers من (from/by)
      manner: ['ب'], // manner prefers ب (with/by)
      style: ['ب'], // style prefers ب (with)
      goal: ['إلى', 'الى'], // target state prefers إلى (to)
      method: ['ب'], // method prefers ب (with/by)
    };

    // Check each captured role for preposition metadata
    for (const [role, value] of captured.entries()) {
      // Skip if no preferred prepositions defined for this role
      const preferred = PREFERRED_PREPOSITIONS[role];
      if (!preferred || preferred.length === 0) {
        continue;
      }

      // Check if the value has preposition metadata (from Arabic tokenizer)
      // This metadata is attached when a preposition particle token is consumed
      const metadata =
        'metadata' in value ? (value as { metadata: Record<string, unknown> }).metadata : undefined;
      if (metadata && typeof metadata.prepositionValue === 'string') {
        const usedPreposition = metadata.prepositionValue;

        // Check if the used preposition is in the preferred list
        if (preferred.includes(usedPreposition)) {
          // Idiomatic choice - boost confidence
          adjustment += 0.1;
        } else {
          // Less natural choice - reduce confidence
          adjustment -= 0.1;
        }
      }
    }

    // Cap total adjustment at ±0.10 (even if multiple roles analyzed)
    return Math.max(-0.1, Math.min(0.1, adjustment));
  }

  // ===========================================================================
  // English Idiom Support - Noise Word Handling
  // ===========================================================================

  /**
   * Noise words that can be skipped in English for more natural syntax.
   * - "the" before selectors: "toggle the .active" → "toggle .active"
   * - "class" after class selectors: "add the .visible class" → "add .visible"
   */
  private static readonly ENGLISH_NOISE_WORDS = new Set(['the', 'a', 'an']);

  /**
   * Skip noise words like "the" before selectors.
   * This enables more natural English syntax like "toggle the .active".
   */
  private skipNoiseWords(tokens: TokenStream): void {
    const token = tokens.peek();
    if (!token) return;

    const tokenLower = this.safeToLowerCase(token.value);

    // Check if current token is a noise word (like "the")
    if (PatternMatcher.ENGLISH_NOISE_WORDS.has(tokenLower)) {
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

  /**
   * Extract event modifiers from the token stream.
   * Event modifiers are .once, .debounce(N), .throttle(N), .queue(strategy)
   * that can appear after event names.
   *
   * Returns EventModifiers object or undefined if no modifiers found.
   */
  extractEventModifiers(tokens: TokenStream): import('../types').EventModifiers | undefined {
    const modifiers: {
      once?: boolean;
      debounce?: number;
      throttle?: number;
      queue?: 'first' | 'last' | 'all' | 'none';
      from?: SemanticValue;
    } = {};

    let foundModifier = false;

    // Consume all consecutive event modifier tokens
    while (!tokens.isAtEnd()) {
      const token = tokens.peek();
      if (!token || token.kind !== 'event-modifier') {
        break;
      }

      const metadata = token.metadata as
        | { modifierName: string; value?: number | string }
        | undefined;
      if (!metadata) {
        break;
      }

      foundModifier = true;

      switch (metadata.modifierName) {
        case 'once':
          modifiers.once = true;
          break;
        case 'debounce':
          if (typeof metadata.value === 'number') {
            modifiers.debounce = metadata.value;
          }
          break;
        case 'throttle':
          if (typeof metadata.value === 'number') {
            modifiers.throttle = metadata.value;
          }
          break;
        case 'queue':
          if (
            metadata.value === 'first' ||
            metadata.value === 'last' ||
            metadata.value === 'all' ||
            metadata.value === 'none'
          ) {
            modifiers.queue = metadata.value;
          }
          break;
      }

      tokens.advance();
    }

    return foundModifier ? modifiers : undefined;
  }
}

// =============================================================================
// Convenience Functions
// =============================================================================

/**
 * Singleton pattern matcher instance.
 */
export const patternMatcher = new PatternMatcher();

/**
 * Match tokens against a pattern.
 */
export function matchPattern(
  tokens: TokenStream,
  pattern: LanguagePattern
): PatternMatchResult | null {
  return patternMatcher.matchPattern(tokens, pattern);
}

/**
 * Match tokens against multiple patterns, return best match.
 */
export function matchBest(
  tokens: TokenStream,
  patterns: LanguagePattern[]
): PatternMatchResult | null {
  return patternMatcher.matchBest(tokens, patterns);
}
