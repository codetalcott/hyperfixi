/**
 * Core Parser Bridge
 *
 * Provides the SemanticAnalyzer interface that integrates semantic parsing
 * into the core hyperscript parser. This bridge enables confidence-driven
 * fallback between semantic and traditional parsing.
 */

import type {
  SemanticNode,
  SemanticValue,
  ActionType,
  PatternMatchResult,
  SemanticRole,
} from './types';
import { PatternMatcher } from './parser/pattern-matcher';
import { parse as fullParse } from './parser/semantic-parser';
import { getTokenizer } from './tokenizers';
// Import from registry for tree-shaking (registry uses directly-registered patterns first)
import { getPatternsForLanguage, getRegisteredLanguages } from './registry';
import { SemanticCache, semanticCache, type SemanticCacheConfig, type CacheStats } from './cache';

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
   * @deprecated Since v1.4.0. Will be removed in v2.0.0.
   * Prefer `parseSemantic()` from `@lokascript/semantic` for new code.
   * This method is retained for backward compatibility but now uses the full
   * parser internally to preserve event handler bodies.
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

  /**
   * Get cache statistics.
   */
  getCacheStats(): CacheStats;

  /**
   * Clear the result cache.
   */
  clearCache(): void;

  /**
   * Configure the cache.
   */
  configureCache(config: Partial<SemanticCacheConfig>): void;
}

// =============================================================================
// SemanticAnalyzer Implementation
// =============================================================================

/**
 * Options for creating a SemanticAnalyzer.
 */
export interface SemanticAnalyzerOptions {
  /** Cache configuration. Pass false to disable caching. */
  cache?: SemanticCacheConfig | false;
}

/**
 * Implementation of SemanticAnalyzer that wraps the semantic parser.
 * Includes LRU caching for performance optimization on repeated inputs.
 */
export class SemanticAnalyzerImpl implements SemanticAnalyzer {
  private readonly patternMatcher: PatternMatcher;
  private readonly languages: Set<string>;
  private readonly cache: SemanticCache;

  constructor(options: SemanticAnalyzerOptions = {}) {
    this.patternMatcher = new PatternMatcher();
    // Get all registered languages from the registry (dynamically updated as languages are loaded)
    this.languages = new Set(getRegisteredLanguages());

    // Initialize cache
    if (options.cache === false) {
      this.cache = new SemanticCache({ enabled: false });
    } else {
      this.cache = options.cache ? new SemanticCache(options.cache) : semanticCache;
    }
  }

  analyze(input: string, language: string): SemanticAnalysisResult {
    // Check language support
    if (!this.supportsLanguage(language)) {
      return {
        confidence: 0,
        errors: [`Language '${language}' is not supported for semantic parsing`],
      };
    }

    // Check cache first
    const cached = this.cache.get(input, language);
    if (cached) {
      return cached;
    }

    // Perform analysis
    const result = this.analyzeUncached(input, language);

    // Cache successful results
    this.cache.set(input, language, result);

    return result;
  }

  /**
   * Perform analysis without cache lookup.
   *
   * Uses full parser first to preserve complete AST structure (event handler
   * bodies, compound statements, conditionals). Falls back to pattern matching
   * only when the full parser fails, which provides fast simple-command detection
   * but loses structural information like event handler bodies.
   */
  private analyzeUncached(input: string, language: string): SemanticAnalysisResult {
    try {
      // Try full parser first — this preserves event handler bodies,
      // compound statements, and other structural information that
      // pattern-only matching loses.
      try {
        const node = fullParse(input, language);
        const result: SemanticAnalysisResult = {
          confidence: node.metadata?.confidence ?? 0.8,
          node,
        };
        if (node.kind === 'command') {
          return { ...result, command: { name: node.action, roles: node.roles } };
        }
        return result;
      } catch {
        // Full parser failed — fall through to pattern matching
      }

      // Fallback: pattern matching for simple commands.
      // This path is faster but only produces {kind: 'command'} nodes
      // without structural information like event handler bodies.
      const tokenizer = getTokenizer(language);
      if (!tokenizer) {
        return {
          confidence: 0,
          errors: [`No tokenizer available for language '${language}'`],
        };
      }

      const tokenStream = tokenizer.tokenize(input);

      const patterns = getPatternsForLanguage(language);
      if (patterns.length === 0) {
        return {
          confidence: 0,
          errors: [`No patterns available for language '${language}'`],
        };
      }

      const match = this.patternMatcher.matchBest(tokenStream, patterns);

      if (match) {
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
      }

      return {
        confidence: 0,
        errors: ['No pattern matched the input'],
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

  getCacheStats(): CacheStats {
    return this.cache.getStats();
  }

  clearCache(): void {
    this.cache.clear();
  }

  configureCache(config: Partial<SemanticCacheConfig>): void {
    this.cache.configure(config);
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
 * @param options - Configuration options including cache settings
 * @returns A new SemanticAnalyzer
 *
 * @example
 * // Default: uses shared global cache
 * const analyzer = createSemanticAnalyzer();
 *
 * @example
 * // Custom cache size
 * const analyzer = createSemanticAnalyzer({ cache: { maxSize: 500 } });
 *
 * @example
 * // Disable caching
 * const analyzer = createSemanticAnalyzer({ cache: false });
 */
export function createSemanticAnalyzer(options?: SemanticAnalyzerOptions): SemanticAnalyzer {
  return new SemanticAnalyzerImpl(options);
}

// Re-export cache types for convenience
export type { SemanticCacheConfig, CacheStats } from './cache';

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
 *
 * Role to preposition mapping:
 * - patient → first positional arg
 * - event → first positional arg
 * - destination → 'into' (put) or 'on' (others)
 * - source → 'from'
 * - quantity → 'by'
 * - duration → 'over' or 'for'
 * - method → 'as'
 * - style → 'with'
 * - condition → 'if'
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
      // Primary arguments (positional)
      case 'patient':
      case 'event':
        args.push(value);
        break;

      // Destination: context-dependent preposition
      case 'destination':
        if (command === 'put') {
          modifiers['into'] = value;
        } else {
          modifiers['on'] = value;
        }
        break;

      // Source: always 'from'
      case 'source':
        modifiers['from'] = value;
        break;

      // Quantitative roles
      case 'quantity':
        modifiers['by'] = value;
        break;

      case 'duration':
        modifiers['over'] = value;
        break;

      // Adverbial roles
      case 'method':
        modifiers['as'] = value;
        break;

      case 'style':
        modifiers['with'] = value;
        break;

      // Conditional
      case 'condition':
        modifiers['if'] = value;
        break;

      // Agent (for future multi-actor systems)
      case 'agent':
        modifiers['agent'] = value;
        break;

      default:
        // Unknown roles become modifiers using role name as key
        modifiers[role] = value;
    }
  }

  return { args, modifiers };
}
