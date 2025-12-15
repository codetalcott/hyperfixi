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
  SemanticRole,
  SemanticValue,
  TokenStream,
  LanguageToken,
} from '../types';
import { createSelector, createLiteral, createReference, createPropertyPath } from '../types';

// =============================================================================
// Pattern Matcher
// =============================================================================

export class PatternMatcher {
  /**
   * Try to match a single pattern against the token stream.
   * Returns the match result or null if no match.
   */
  matchPattern(
    tokens: TokenStream,
    pattern: LanguagePattern
  ): PatternMatchResult | null {
    const mark = tokens.mark();
    const captured = new Map<SemanticRole, SemanticValue>();

    // Reset match counters for this pattern
    this.stemMatchCount = 0;
    this.totalKeywordMatches = 0;

    const success = this.matchTokenSequence(
      tokens,
      pattern.template.tokens,
      captured
    );

    if (!success) {
      tokens.reset(mark);
      return null;
    }

    // Apply extraction rules to fill in any missing roles
    this.applyExtractionRules(pattern, captured);

    return {
      pattern,
      captured,
      consumedTokens: tokens.position() - mark.position,
      confidence: this.calculateConfidence(pattern, captured),
    };
  }

  /**
   * Try to match multiple patterns, return the best match.
   */
  matchBest(
    tokens: TokenStream,
    patterns: LanguagePattern[]
  ): PatternMatchResult | null {
    const matches: PatternMatchResult[] = [];

    for (const pattern of patterns) {
      const mark = tokens.mark();
      const result = this.matchPattern(tokens, pattern);

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
      return b.confidence - a.confidence;
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
    for (const patternToken of patternTokens) {
      const matched = this.matchPatternToken(tokens, patternToken, captured);

      if (!matched) {
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
    if (!token) return false;

    // Check main value
    const matchType = this.getMatchType(token, patternToken.value);
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
   * Possessive keywords that indicate property access on an implicit object.
   * Maps possessive keyword to the reference it represents.
   */
  private static readonly POSSESSIVE_KEYWORDS: Record<string, string> = {
    'my': 'me',
    'your': 'you',
    'its': 'it',
    // Japanese possessive particles (の)
    '私の': 'me',
    // Spanish
    'mi': 'me',
    'tu': 'you',
    'su': 'it',
  };

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
    // Skip noise words like "the" before selectors (English idiom support)
    this.skipNoiseWords(tokens);

    const token = tokens.peek();
    if (!token) {
      return patternToken.optional || false;
    }

    // Check for possessive expression (e.g., 'my value', 'its innerHTML')
    const possessiveValue = this.tryMatchPossessiveExpression(tokens);
    if (possessiveValue) {
      // Validate expected types if specified
      if (patternToken.expectedTypes && patternToken.expectedTypes.length > 0) {
        if (!patternToken.expectedTypes.includes(possessiveValue.type) &&
            !patternToken.expectedTypes.includes('expression')) {
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
        if (!patternToken.expectedTypes.includes(methodCallValue.type) &&
            !patternToken.expectedTypes.includes('expression')) {
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
        if (!this.isTypeCompatible(possessiveSelectorValue.type, patternToken.expectedTypes)) {
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
        if (!patternToken.expectedTypes.includes(propertyAccessValue.type) &&
            !patternToken.expectedTypes.includes('expression')) {
          return patternToken.optional || false;
        }
      }
      captured.set(patternToken.role, propertyAccessValue);
      return true;
    }

    // Try to extract a semantic value from the token
    const value = this.tokenToSemanticValue(token);
    if (!value) {
      return patternToken.optional || false;
    }

    // Validate expected types if specified
    if (patternToken.expectedTypes && patternToken.expectedTypes.length > 0) {
      if (!patternToken.expectedTypes.includes(value.type)) {
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
  private tryMatchPossessiveExpression(tokens: TokenStream): SemanticValue | null {
    const token = tokens.peek();
    if (!token) return null;

    const tokenLower = (token.normalized || token.value).toLowerCase();
    const baseRef = PatternMatcher.POSSESSIVE_KEYWORDS[tokenLower];

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

    // Property should be an identifier or keyword (not a structural keyword like 'into')
    if (propertyToken.kind === 'identifier' ||
        (propertyToken.kind === 'keyword' && !this.isStructuralKeyword(propertyToken.value))) {
      tokens.advance();

      // Create property-path: my value -> { object: me, property: 'value' }
      return createPropertyPath(
        createReference(baseRef as any),
        propertyToken.value
      );
    }

    // Not a valid property, revert
    tokens.reset(mark);
    return null;
  }

  /**
   * Check if a value type is compatible with expected types.
   * property-path is compatible with selector, reference, and expression.
   * expression is compatible with any type.
   */
  private isTypeCompatible(
    actualType: string,
    expectedTypes: string[]
  ): boolean {
    // Direct match
    if (expectedTypes.includes(actualType)) return true;

    // expression is always compatible
    if (expectedTypes.includes('expression')) return true;

    // property-path is compatible with selector, reference, and expression
    if (actualType === 'property-path') {
      return expectedTypes.some(t => ['selector', 'reference', 'expression'].includes(t));
    }

    return false;
  }

  /**
   * Check if a keyword is a structural keyword (preposition, control flow, etc.)
   * that shouldn't be consumed as a property name.
   */
  private isStructuralKeyword(value: string): boolean {
    const structural = new Set([
      // Prepositions
      'into', 'in', 'to', 'from', 'at', 'by', 'with', 'without',
      'before', 'after', 'of', 'as', 'on',
      // Control flow
      'then', 'end', 'else', 'if', 'repeat', 'while', 'for',
      // Commands (shouldn't be property names)
      'toggle', 'add', 'remove', 'put', 'set', 'show', 'hide',
      'increment', 'decrement', 'send', 'trigger', 'call',
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

    // Consume arguments until we find )
    // For now, we just consume until closing paren (simple case)
    const args: string[] = [];
    while (!tokens.isAtEnd()) {
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

    // Continue for nested property access (e.g., userData.address.city)
    while (!tokens.isAtEnd()) {
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
    if (!possessiveToken || possessiveToken.kind !== 'punctuation' || possessiveToken.value !== "'s") {
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
    return createPropertyPath(
      createSelector(token.value),
      propertyToken.value
    );
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

    const success = this.matchTokenSequence(
      tokens,
      patternToken.tokens,
      captured
    );

    if (!success) {
      tokens.reset(mark);
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
    if (
      token.stem === value &&
      token.stemConfidence !== undefined &&
      token.stemConfidence >= 0.7
    ) {
      return 'stem';
    }

    // Case-insensitive match for keywords (medium confidence)
    if (
      token.kind === 'keyword' &&
      token.value.toLowerCase() === value.toLowerCase()
    ) {
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
        const lower = (token.normalized || token.value).toLowerCase();
        if (['me', 'you', 'it', 'result', 'event', 'target', 'body'].includes(lower)) {
          return createReference(lower as any);
        }
        return createLiteral(token.normalized || token.value);

      case 'identifier':
        // Check if it's a variable reference (:varname)
        if (token.value.startsWith(':')) {
          return createReference(token.value as any);
        }
        // Check if it's a built-in reference
        const identLower = token.value.toLowerCase();
        if (['me', 'you', 'it', 'result', 'event', 'target', 'body'].includes(identLower)) {
          return createReference(identLower as any);
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
    if (value.startsWith('"') || value.startsWith("'") || value.startsWith('`') || value.startsWith('「')) {
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
   * Apply extraction rules to fill in default values for missing roles.
   */
  private applyExtractionRules(
    pattern: LanguagePattern,
    captured: Map<SemanticRole, SemanticValue>
  ): void {
    for (const [role, rule] of Object.entries(pattern.extraction)) {
      if (!captured.has(role as SemanticRole) && rule.default) {
        captured.set(role as SemanticRole, rule.default);
      }
    }
  }

  /**
   * Check if a pattern token is optional.
   */
  private isOptional(patternToken: PatternToken): boolean {
    return (patternToken as any).optional === true;
  }

  /**
   * Calculate confidence score for a match (0-1).
   *
   * Confidence is reduced for:
   * - Stem matches (morphological normalization has inherent uncertainty)
   * - Missing optional roles
   */
  private calculateConfidence(
    pattern: LanguagePattern,
    captured: Map<SemanticRole, SemanticValue>
  ): number {
    let score = 0;
    let maxScore = 0;

    // Score based on captured roles
    for (const token of pattern.template.tokens) {
      if (token.type === 'role') {
        maxScore += 1;
        if (captured.has(token.role)) {
          score += 1;
        }
      } else if (token.type === 'group') {
        // Group tokens contribute to score
        for (const subToken of token.tokens) {
          if (subToken.type === 'role') {
            maxScore += 0.5; // Optional groups count less
            if (captured.has(subToken.role)) {
              score += 0.5;
            }
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

    return baseConfidence;
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

    const tokenLower = token.value.toLowerCase();

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
