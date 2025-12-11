/**
 * Core Parser Bridge
 *
 * Provides the SemanticAnalyzer interface that integrates semantic parsing
 * into the core hyperscript parser. This bridge enables confidence-driven
 * fallback between semantic and traditional parsing.
 */

import type { SemanticNode, SemanticValue, ActionType, PatternMatchResult } from './types';
import type { SemanticRole } from '@hyperfixi/i18n/src/grammar/types';
import { PatternMatcher } from './parser/pattern-matcher';
import { getTokenizer } from './tokenizers';
import { getPatternsForLanguage } from './patterns';

// =============================================================================
// SemanticAnalyzer Interface
// =============================================================================

/**
 * Result of semantic analysis.
 */
export interface SemanticAnalysisResult {
  /** Confidence score (0-1) for this analysis */
  readonly confidence: number;
  /** The parsed command info (if successful) */
  readonly command?: {
    readonly name: ActionType;
    readonly roles: ReadonlyMap<SemanticRole, SemanticValue>;
  };
  /** The full semantic node (if successful) */
  readonly node?: SemanticNode;
  /** Any errors encountered */
  readonly errors?: string[];
  /** Number of tokens consumed */
  readonly tokensConsumed?: number;
}

/**
 * Interface for semantic analysis that can be integrated into the core parser.
 * This allows the core parser to optionally use semantic parsing with
 * confidence-based fallback to traditional parsing.
 */
export interface SemanticAnalyzer {
  /**
   * Analyze input in the specified language.
   *
   * @param input The input string to analyze
   * @param language ISO 639-1 language code
   * @returns Analysis result with confidence score
   */
  analyze(input: string, language: string): SemanticAnalysisResult;

  /**
   * Check if semantic parsing is available for a language.
   */
  supportsLanguage(language: string): boolean;

  /**
   * Get the list of supported languages.
   */
  supportedLanguages(): string[];
}

// =============================================================================
// SemanticAnalyzer Implementation
// =============================================================================

/**
 * Implementation of SemanticAnalyzer that wraps the semantic parser.
 */
export class SemanticAnalyzerImpl implements SemanticAnalyzer {
  private readonly patternMatcher: PatternMatcher;
  private readonly languages: Set<string>;

  constructor() {
    this.patternMatcher = new PatternMatcher();
    this.languages = new Set(['en', 'es', 'ja', 'ar']);
  }

  analyze(input: string, language: string): SemanticAnalysisResult {
    // Check language support
    if (!this.supportsLanguage(language)) {
      return {
        confidence: 0,
        errors: [`Language '${language}' is not supported for semantic parsing`],
      };
    }

    try {
      // Tokenize
      const tokenizer = getTokenizer(language);
      if (!tokenizer) {
        return {
          confidence: 0,
          errors: [`No tokenizer available for language '${language}'`],
        };
      }

      const tokenStream = tokenizer.tokenize(input);

      // Get patterns for this language
      const patterns = getPatternsForLanguage(language);
      if (patterns.length === 0) {
        return {
          confidence: 0,
          errors: [`No patterns available for language '${language}'`],
        };
      }

      // Try to match patterns
      const match = this.patternMatcher.matchBest(tokenStream, patterns);

      if (!match) {
        return {
          confidence: 0,
          errors: ['No pattern matched the input'],
        };
      }

      // Build semantic node from match
      const node = this.buildSemanticNode(match);

      return {
        confidence: match.confidence,
        command: {
          name: match.pattern.command,
          roles: match.captured,
        },
        node,
        tokensConsumed: match.consumedTokens,
      };
    } catch (error) {
      return {
        confidence: 0,
        errors: [error instanceof Error ? error.message : String(error)],
      };
    }
  }

  supportsLanguage(language: string): boolean {
    return this.languages.has(language);
  }

  supportedLanguages(): string[] {
    return Array.from(this.languages);
  }

  private buildSemanticNode(match: PatternMatchResult): SemanticNode {
    return {
      kind: 'command',
      action: match.pattern.command,
      roles: match.captured,
      metadata: {
        patternId: match.pattern.id,
      },
    };
  }
}

// =============================================================================
// Factory Function
// =============================================================================

/**
 * Create a SemanticAnalyzer instance.
 *
 * @returns A new SemanticAnalyzer
 */
export function createSemanticAnalyzer(): SemanticAnalyzer {
  return new SemanticAnalyzerImpl();
}

// =============================================================================
// Confidence Thresholds
// =============================================================================

/**
 * Default confidence threshold for preferring semantic parsing.
 * If confidence is above this, use semantic result; otherwise fallback.
 */
export const DEFAULT_CONFIDENCE_THRESHOLD = 0.5;

/**
 * High confidence threshold for very certain matches.
 */
export const HIGH_CONFIDENCE_THRESHOLD = 0.8;

// =============================================================================
// Integration Helpers
// =============================================================================

/**
 * Determine if semantic analysis should be used based on confidence.
 */
export function shouldUseSemanticResult(
  result: SemanticAnalysisResult,
  threshold: number = DEFAULT_CONFIDENCE_THRESHOLD
): boolean {
  return result.confidence >= threshold && result.command !== undefined;
}

/**
 * Convert semantic roles to the format expected by core parser commands.
 * This maps semantic roles to the positional/modifier structure used by
 * the core command implementations.
 */
export function rolesToCommandArgs(
  roles: ReadonlyMap<SemanticRole, SemanticValue>,
  command: ActionType
): {
  args: SemanticValue[];
  modifiers: Record<string, SemanticValue>;
} {
  const args: SemanticValue[] = [];
  const modifiers: Record<string, SemanticValue> = {};

  for (const [role, value] of roles) {
    switch (role) {
      // Primary arguments
      case 'patient':
        args.push(value);
        break;

      // Modifiers with preposition keys
      case 'destination':
        if (command === 'put') {
          modifiers['into'] = value;
        } else {
          modifiers['on'] = value;
        }
        break;

      case 'source':
        modifiers['from'] = value;
        break;

      case 'instrument':
      case 'quantity':
        modifiers['by'] = value;
        break;

      case 'manner':
        modifiers['as'] = value;
        break;

      case 'condition':
        modifiers['if'] = value;
        break;

      case 'event':
        args.push(value);
        break;

      default:
        // Unknown roles become modifiers
        modifiers[role] = value;
    }
  }

  return { args, modifiers };
}
