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
import { createLogger } from '../logger';

/**
 * Helper to check if a value is a built-in reference.
 * In the generic framework, we don't assume any built-in references.
 * DSLs that need references (like hyperscript's 'me', 'it', 'you') should
 * handle them in their tokenizer or provide a custom reference validator.
 *
 * For generic DSLs, identifiers are treated as expressions by default.
 */
// A role's value is read by the code the stock reader runs too (core/matching/stock-reading.ts).
import { readRoleValue, safeToLowerCase } from '../matching/stock-reading';
import { stockConfidenceModel } from '../matching/stock-confidence';

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
  /** Maximum tokens to scan ahead when looking for a group's leading marker */
  private static readonly MAX_MARKER_SCAN = 3;

  /** Debug logger */
  private logger = createLogger('pattern-matcher');

  /** Current language profile for the pattern being matched */
  private currentProfile: PatternMatcherProfile | undefined;

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
    const confidence = stockConfidenceModel.calculate({
      pattern,
      captured,
      stemMatchCount: this.stemMatchCount,
      totalKeywordMatches: this.totalKeywordMatches,
    });

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
   *
   * Supports bounded single-step backtracking: if an optional role consumes
   * a token and the immediately following pattern token fails, the matcher
   * resets to before the optional role and retries the failed token.
   */
  private matchTokenSequence(
    tokens: TokenStream,
    patternTokens: PatternToken[],
    captured: Map<SemanticRole, SemanticValue>,
    parentStopMarkers?: Set<string>
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

    // Backtracking state: track the most recent optional role that consumed a token
    let prevOptionalMark: ReturnType<TokenStream['mark']> | null = null;
    let prevOptionalRole: SemanticRole | null = null;

    for (let i = 0; i < patternTokens.length; i++) {
      const patternToken = patternTokens[i];
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

      // Greedy role capture: consume all remaining tokens until the next
      // recognized marker keyword or end of input
      if (patternToken.type === 'role' && patternToken.greedy) {
        const stopMarkers = this.collectStopMarkers(patternTokens, i + 1);
        // Merge parent-level stop markers so greedy roles inside groups
        // know when to stop for tokens outside the group (e.g., SOV verb keywords)
        if (parentStopMarkers) {
          for (const m of parentStopMarkers) stopMarkers.add(m);
        }
        const values: string[] = [];
        while (!tokens.isAtEnd()) {
          const nextToken = tokens.peek();
          if (!nextToken) break;
          if (this.isStopMarker(nextToken, stopMarkers)) break;
          values.push(nextToken.value);
          tokens.advance();
        }
        if (values.length > 0) {
          captured.set(patternToken.role, { type: 'expression', raw: values.join(' ') });
          prevOptionalMark = null;
          prevOptionalRole = null;
          continue;
        } else if (patternToken.optional) {
          continue;
        } else {
          return false;
        }
      }

      // Group tokens: compute sibling stop markers and forward to inner matching
      if (patternToken.type === 'group') {
        const siblingStopMarkers = this.collectStopMarkers(patternTokens, i + 1);
        if (parentStopMarkers) {
          for (const m of parentStopMarkers) siblingStopMarkers.add(m);
        }
        const groupMatched = this.matchGroupToken(
          tokens,
          patternToken as PatternToken & { type: 'group' },
          captured,
          siblingStopMarkers
        );
        if (groupMatched) {
          prevOptionalMark = null;
          prevOptionalRole = null;
          continue;
        }
        if (this.isOptional(patternToken)) {
          continue;
        }
        return false;
      }

      // Save stream position before attempting optional roles
      const isOptionalRole = patternToken.type === 'role' && patternToken.optional === true;
      const markBefore = isOptionalRole ? tokens.mark() : null;

      // SOV marker-stealing guard: before matching a required role, check if
      // the current input token would match the immediately-following pattern
      // literal (the role's own postpositional marker). If so, skip consuming
      // this token as a role value — it should be matched as the literal instead.
      const isRoleToken = patternToken.type === 'role';
      if (isRoleToken && !isOptionalRole) {
        const nextPT = i + 1 < patternTokens.length ? patternTokens[i + 1] : null;
        if (nextPT?.type === 'literal') {
          const currentToken = tokens.peek();
          if (currentToken && this.getMatchType(currentToken, nextPT.value) !== 'none') {
            // Current token is the marker literal, not a role value — treat role as failed
            this.logger.debug(
              '  >> MARKER-STEAL GUARD: current token matches next literal, skipping role'
            );
            // Fall through to failure handling below
            // (which will trigger backtracking of previous optional role)

            // Match failed
            this.logger.debug('  >> Token match FAILED');

            if (this.isOptional(patternToken)) {
              continue;
            }

            // Required token failed — try backtracking over the previous optional role
            if (prevOptionalMark && prevOptionalRole) {
              this.logger.debug('  >> BACKTRACKING: undoing optional role', prevOptionalRole);
              tokens.reset(prevOptionalMark);
              captured.delete(prevOptionalRole);
              prevOptionalMark = null;
              prevOptionalRole = null;

              // Retry the current (failed) pattern token from the restored position
              const retryMatched = this.matchPatternToken(tokens, patternToken, captured);
              this.logger.debug('  >> Backtrack retry result:', retryMatched);
              if (retryMatched) {
                continue;
              }
            }

            return false;
          }
        }
      }

      const matched = this.matchPatternToken(tokens, patternToken, captured);
      this.logger.debug('  >> Match result:', matched);

      if (matched) {
        if (isOptionalRole) {
          // Track this consumption so we can undo it if the next token fails
          prevOptionalMark = markBefore;
          prevOptionalRole = patternToken.role;
        } else {
          // Non-optional succeeded — clear backtrack state
          prevOptionalMark = null;
          prevOptionalRole = null;
        }
        continue;
      }

      // Match failed
      this.logger.debug('  >> Token match FAILED');

      if (this.isOptional(patternToken)) {
        continue;
      }

      // Required token failed — try backtracking over the previous optional role
      if (prevOptionalMark && prevOptionalRole) {
        this.logger.debug('  >> BACKTRACKING: undoing optional role', prevOptionalRole);
        tokens.reset(prevOptionalMark);
        captured.delete(prevOptionalRole);
        prevOptionalMark = null;
        prevOptionalRole = null;

        // Retry the current (failed) pattern token from the restored position
        const retryMatched = this.matchPatternToken(tokens, patternToken, captured);
        this.logger.debug('  >> Backtrack retry result:', retryMatched);
        if (retryMatched) {
          continue;
        }
      }

      return false;
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
        return readRoleValue(tokens, patternToken, captured, this.currentProfile);

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
   * Match a group pattern token (optional sequence).
   * When the group's leading marker isn't at the current position, scans ahead
   * up to MAX_MARKER_SCAN tokens to find it. This allows unmarked tokens
   * (e.g., a value like 'hello') to sit between groups without blocking later
   * marker matches.
   */
  private matchGroupToken(
    tokens: TokenStream,
    patternToken: PatternToken & { type: 'group' },
    captured: Map<SemanticRole, SemanticValue>,
    parentStopMarkers?: Set<string>
  ): boolean {
    const mark = tokens.mark();
    const capturedBefore = new Set(captured.keys());

    const success = this.matchTokenSequence(
      tokens,
      patternToken.tokens,
      captured,
      parentStopMarkers
    );
    if (success) return true;

    // Reset from failed attempt
    tokens.reset(mark);
    for (const role of captured.keys()) {
      if (!capturedBefore.has(role)) captured.delete(role);
    }

    if (!patternToken.optional) return false;

    // Marker scan: look ahead for the group's leading marker past intervening tokens.
    // This handles cases like "types 'hello' into #search" where 'hello' blocks the
    // 'into' marker from being found at the current position.
    const leadingMarker = this.getGroupLeadingMarker(patternToken);
    if (leadingMarker) {
      for (let offset = 1; offset <= PatternMatcher.MAX_MARKER_SCAN; offset++) {
        const ahead = tokens.peek(offset);
        if (!ahead) break;
        const aheadValue = (ahead.normalized || ahead.value).toLowerCase();
        if (aheadValue === leadingMarker) {
          this.logger.debug(
            '  >> MARKER SCAN: found',
            leadingMarker,
            'at offset',
            offset,
            '- skipping intervening tokens'
          );
          // Advance past intervening tokens to reach the marker
          for (let s = 0; s < offset; s++) tokens.advance();

          // Retry group match from marker position
          const retrySuccess = this.matchTokenSequence(
            tokens,
            patternToken.tokens,
            captured,
            parentStopMarkers
          );
          if (retrySuccess) return true;

          // Retry failed — full reset
          tokens.reset(mark);
          for (const role of captured.keys()) {
            if (!capturedBefore.has(role)) captured.delete(role);
          }
          break;
        }
      }
    }

    return true; // Optional group, just skip
  }

  /**
   * Get the leading marker literal from an optional group.
   * Returns the lowercase marker value, or null if the group
   * doesn't start with a literal token (e.g., SOV groups where
   * the role comes before the marker).
   */
  private getGroupLeadingMarker(group: PatternToken & { type: 'group' }): string | null {
    const first = group.tokens[0];
    if (first?.type === 'literal') return first.value.toLowerCase();
    return null;
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
    if (token.kind === 'keyword' && safeToLowerCase(token.value) === value.toLowerCase()) {
      return 'case-insensitive';
    }

    return 'none';
  }

  /**
   * Collect literal values from upcoming pattern tokens that act as stop markers
   * for greedy role capture. Returns the set of lowercase values.
   */
  private collectStopMarkers(patternTokens: PatternToken[], startIndex: number): Set<string> {
    const markers = new Set<string>();
    for (let j = startIndex; j < patternTokens.length; j++) {
      const pt = patternTokens[j];
      if (pt.type === 'literal') {
        markers.add(pt.value.toLowerCase());
        if (pt.alternatives) {
          for (const alt of pt.alternatives) {
            markers.add(alt.toLowerCase());
          }
        }
        break;
      }
      if (pt.type === 'group') {
        for (const gt of pt.tokens) {
          if (gt.type === 'literal') {
            markers.add(gt.value.toLowerCase());
            if (gt.alternatives) {
              for (const alt of gt.alternatives) {
                markers.add(alt.toLowerCase());
              }
            }
            break;
          }
        }
        // For optional groups, continue scanning past them so the greedy
        // capture also sees subsequent required literals (e.g., the SOV verb
        // keyword after an optional WHERE group).
        if (!pt.optional) break;
      }
    }
    return markers;
  }

  /**
   * Check if a token matches any stop marker for greedy capture.
   */
  private isStopMarker(token: LanguageToken, stopMarkers: Set<string>): boolean {
    if (stopMarkers.size === 0) return false;
    // Check both raw value and normalized form against stop markers.
    // Pattern literals use native keywords (e.g., '選択') while tokenizers may
    // set normalized to the English equivalent (e.g., 'select'). Both must match.
    if (stopMarkers.has(token.value.toLowerCase())) return true;
    if (token.normalized && stopMarkers.has(token.normalized.toLowerCase())) return true;
    return false;
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

  // ===========================================================================
  // English Idiom Support - Noise Word Handling
  // ===========================================================================

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
        { modifierName: string; value?: number | string } | undefined;
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
