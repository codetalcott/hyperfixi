/**
 * Confidence Calculator Utility
 *
 * Provides standalone confidence calculation for translations.
 * Exposes the pattern matcher's confidence scoring for use in scripts.
 */

import { tokenize } from '../tokenizers';
import { getPatternsForLanguage } from '../registry';
import { patternMatcher } from '../parser/pattern-matcher';
import type { SemanticNode, ActionType } from '../types';

export interface ConfidenceResult {
  /** Confidence score from 0-1 */
  confidence: number;
  /** Whether the input parsed successfully */
  parseSuccess: boolean;
  /** Pattern ID that matched, if any */
  patternId?: string;
  /** The action type (command) that was parsed */
  action?: ActionType;
  /** Number of tokens consumed during matching */
  tokensConsumed?: number;
  /** Error message if parsing failed */
  error?: string;
}

/**
 * Calculate confidence score for a hyperscript translation.
 *
 * Uses the pattern matcher to determine how well the input matches
 * available patterns for the given language.
 *
 * @param hyperscript - The hyperscript code to analyze
 * @param language - The language code (e.g., 'ja', 'es', 'en')
 * @returns Confidence result with score and match details
 */
export function calculateTranslationConfidence(
  hyperscript: string,
  language: string
): ConfidenceResult {
  try {
    // Tokenize the input
    const tokens = tokenize(hyperscript, language);

    // Get patterns for this language
    const patterns = getPatternsForLanguage(language);

    if (patterns.length === 0) {
      return {
        confidence: 0,
        parseSuccess: false,
        error: `No patterns available for language: ${language}`,
      };
    }

    // Sort patterns by priority (descending)
    const sortedPatterns = [...patterns].sort((a, b) => b.priority - a.priority);

    // Try to match event handler patterns first (they wrap commands)
    const eventPatterns = sortedPatterns.filter(p => p.command === 'on');
    const eventMatch = patternMatcher.matchBest(tokens, eventPatterns);

    if (eventMatch) {
      return {
        confidence: eventMatch.confidence,
        parseSuccess: true,
        patternId: eventMatch.pattern.id,
        action: eventMatch.pattern.command,
        tokensConsumed: eventMatch.consumedTokens,
      };
    }

    // Reset tokens for command matching
    tokens.reset(tokens.mark());

    // Try command patterns
    const commandPatterns = sortedPatterns.filter(p => p.command !== 'on');
    const commandMatch = patternMatcher.matchBest(tokens, commandPatterns);

    if (commandMatch) {
      return {
        confidence: commandMatch.confidence,
        parseSuccess: true,
        patternId: commandMatch.pattern.id,
        action: commandMatch.pattern.command,
        tokensConsumed: commandMatch.consumedTokens,
      };
    }

    return {
      confidence: 0,
      parseSuccess: false,
      error: `Could not match any patterns for: ${hyperscript}`,
    };
  } catch (error) {
    return {
      confidence: 0,
      parseSuccess: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export interface ParseWithConfidenceResult {
  node: SemanticNode | null;
  confidence: number;
  error: string | undefined;
}

/**
 * Calculate confidence and parse to a semantic node in one call.
 * Returns both the parsed node and the confidence score.
 */
export function parseWithConfidence(
  hyperscript: string,
  language: string
): ParseWithConfidenceResult {
  // Use the confidence calculator for the score
  const confidenceResult = calculateTranslationConfidence(hyperscript, language);

  if (!confidenceResult.parseSuccess) {
    return {
      node: null,
      confidence: 0,
      error: confidenceResult.error,
    };
  }

  // Also do the full parse to get the semantic node
  // (import parse here to avoid circular dependency)
  try {
    const { parse } = require('../parser/semantic-parser');
    const node = parse(hyperscript, language);
    return {
      node,
      confidence: confidenceResult.confidence,
      error: undefined,
    };
  } catch (error) {
    return {
      node: null,
      confidence: confidenceResult.confidence,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
