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
import { createSelector, createLiteral, createReference } from '../types';

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
   * Match a role pattern token (captures a semantic value).
   */
  private matchRoleToken(
    tokens: TokenStream,
    patternToken: PatternToken & { type: 'role' },
    captured: Map<SemanticRole, SemanticValue>
  ): boolean {
    const token = tokens.peek();
    if (!token) {
      return patternToken.optional || false;
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
        return createLiteral(token.value);

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
