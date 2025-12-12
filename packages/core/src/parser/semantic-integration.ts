/**
 * Semantic Integration Adapter
 *
 * Bridges the semantic parser from @hyperfixi/semantic into the core parser.
 * Provides confidence-based routing between semantic and traditional parsing.
 *
 * @module parser/semantic-integration
 */

import type { CommandNode, ExpressionNode } from '../types/core';
import {
  emitSemanticParseEvent,
  updateDebugStats,
  isDebugEnabled,
  type SemanticParseEventDetail,
} from '../utils/debug-events';

// =============================================================================
// Semantic Analyzer Interface (mirrors @hyperfixi/semantic/core-bridge)
// =============================================================================

/**
 * Semantic value types that can be captured from patterns.
 */
export type SemanticValueType =
  | 'literal'
  | 'selector'
  | 'reference'
  | 'property-path'
  | 'expression';

/**
 * A semantic value from pattern matching.
 */
export interface SemanticValue {
  readonly type: SemanticValueType;
  readonly value: string;
  readonly raw?: string;
}

/**
 * Semantic roles for command arguments.
 *
 * Core thematic roles:
 * - patient, destination, source, event, condition
 *
 * Quantitative roles (answer "how much/long"):
 * - quantity: numeric amounts (by 5, 3 times)
 * - duration: time spans (for 5 seconds, over 500ms)
 *
 * Adverbial roles (answer "how/by what means"):
 * - method: protocol/technique (as GET, via websocket)
 * - style: visual/behavioral manner (with fade, smoothly)
 */
export type SemanticRole =
  // Core thematic roles
  | 'patient' // What is being acted upon
  | 'destination' // Where something goes
  | 'source' // Where something comes from
  | 'event' // What event
  | 'condition' // Under what condition
  // Quantitative roles
  | 'quantity' // How much/many (by 5, 3 times)
  | 'duration' // How long (for 5 seconds, over 500ms)
  // Adverbial roles
  | 'method' // By what means (as GET, via websocket)
  | 'style'; // In what way (with fade, smoothly)

/**
 * Result of semantic analysis.
 */
export interface SemanticAnalysisResult {
  /** Confidence score (0-1) for this analysis */
  readonly confidence: number;
  /** The parsed command info (if successful) */
  readonly command?: {
    readonly name: string;
    readonly roles: ReadonlyMap<SemanticRole, SemanticValue>;
  };
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
// Semantic Integration Adapter
// =============================================================================

/**
 * Configuration options for semantic integration.
 */
export interface SemanticIntegrationOptions {
  /** The semantic analyzer instance */
  analyzer: SemanticAnalyzer;
  /** Language code for parsing (ISO 639-1) */
  language: string;
  /** Confidence threshold for using semantic results (default: 0.5) */
  confidenceThreshold?: number;
  /** Whether to log debug information */
  debug?: boolean;
}

/**
 * Result of attempting semantic parsing.
 */
export interface SemanticParseAttempt {
  /** Whether semantic parsing was successful */
  success: boolean;
  /** The parsed command node (if successful) */
  node?: CommandNode;
  /** Confidence score from semantic analysis */
  confidence: number;
  /** Number of tokens consumed */
  tokensConsumed?: number;
  /** Errors encountered */
  errors?: string[];
}

/**
 * Adapter that integrates semantic parsing into the core parser.
 *
 * Usage:
 * ```typescript
 * import { createSemanticAnalyzer } from '@hyperfixi/semantic';
 *
 * const adapter = new SemanticIntegrationAdapter({
 *   analyzer: createSemanticAnalyzer(),
 *   language: 'ja',
 *   confidenceThreshold: 0.5,
 * });
 *
 * const result = adapter.trySemanticParse('切り替え .active');
 * if (result.success && result.node) {
 *   // Use semantic parse result
 * } else {
 *   // Fall back to traditional parser
 * }
 * ```
 */
export class SemanticIntegrationAdapter {
  private readonly analyzer: SemanticAnalyzer;
  private readonly language: string;
  private readonly confidenceThreshold: number;
  private readonly debugEnabled: boolean;

  constructor(options: SemanticIntegrationOptions) {
    this.analyzer = options.analyzer;
    this.language = options.language;
    this.confidenceThreshold = options.confidenceThreshold ?? DEFAULT_CONFIDENCE_THRESHOLD;
    this.debugEnabled = options.debug ?? false;
  }

  /**
   * Check if semantic parsing is available for the configured language.
   */
  isAvailable(): boolean {
    return this.analyzer.supportsLanguage(this.language);
  }

  /**
   * Attempt to parse input using semantic analysis.
   *
   * @param input The input string to parse
   * @returns Parse attempt result with success status and optional node
   */
  trySemanticParse(input: string): SemanticParseAttempt {
    const startTime = performance.now();

    if (!this.isAvailable()) {
      return {
        success: false,
        confidence: 0,
        errors: [`Semantic parsing not available for language '${this.language}'`],
      };
    }

    try {
      const result = this.analyzer.analyze(input, this.language);
      const duration = performance.now() - startTime;

      if (this.debugEnabled) {
        console.log(`[SemanticIntegration] Analysis result:`, {
          input,
          language: this.language,
          confidence: result.confidence,
          command: result.command?.name,
          threshold: this.confidenceThreshold,
        });
      }

      // Check if confidence meets threshold
      const semanticSuccess = result.confidence >= this.confidenceThreshold && !!result.command;
      const fallbackTriggered = !semanticSuccess && result.confidence > 0;

      // Emit debug event if enabled
      if (isDebugEnabled()) {
        const roles: Record<string, string> = {};
        if (result.command?.roles) {
          for (const [role, value] of result.command.roles) {
            roles[role] = value.value;
          }
        }

        const eventDetail: SemanticParseEventDetail = {
          input: input.substring(0, 100), // Truncate for display
          language: this.language,
          confidence: result.confidence,
          threshold: this.confidenceThreshold,
          semanticSuccess,
          fallbackTriggered,
          command: result.command?.name,
          roles: Object.keys(roles).length > 0 ? roles : undefined,
          errors: result.errors,
          timestamp: Date.now(),
          duration,
        };

        emitSemanticParseEvent(eventDetail);
        updateDebugStats(eventDetail);
      }

      if (!semanticSuccess) {
        return {
          success: false,
          confidence: result.confidence,
          tokensConsumed: result.tokensConsumed,
          errors: result.errors,
        };
      }

      // Convert semantic result to CommandNode
      const node = this.buildCommandNode(result);

      return {
        success: true,
        node,
        confidence: result.confidence,
        tokensConsumed: result.tokensConsumed,
      };
    } catch (error) {
      return {
        success: false,
        confidence: 0,
        errors: [error instanceof Error ? error.message : String(error)],
      };
    }
  }

  /**
   * Build a CommandNode from semantic analysis result.
   */
  private buildCommandNode(result: SemanticAnalysisResult): CommandNode {
    const { command } = result;
    if (!command) {
      throw new Error('Cannot build command node without command data');
    }

    const args: ExpressionNode[] = [];
    const modifiers: Record<string, ExpressionNode> = {};

    // Convert semantic roles to command arguments/modifiers
    for (const [role, value] of command.roles) {
      const exprNode = this.semanticValueToExpression(value);

      switch (role) {
        // Primary arguments (patient, event) go into args array
        case 'patient':
        case 'event':
          args.push(exprNode);
          break;

        // Destination role maps to position-based modifiers
        case 'destination':
          if (command.name === 'put') {
            modifiers['into'] = exprNode;
          } else {
            modifiers['on'] = exprNode;
          }
          break;

        // Source role
        case 'source':
          modifiers['from'] = exprNode;
          break;

        // Quantitative roles
        case 'quantity':
          modifiers['by'] = exprNode;
          break;

        case 'duration':
          modifiers['over'] = exprNode;
          break;

        // Adverbial roles
        case 'method':
          modifiers['as'] = exprNode;
          break;

        case 'style':
          modifiers['with'] = exprNode;
          break;

        // Condition role
        case 'condition':
          modifiers['if'] = exprNode;
          break;

        // Unknown roles become modifiers with role name as key
        default:
          modifiers[role] = exprNode;
      }
    }

    return {
      type: 'command',
      name: command.name,
      args,
      modifiers: Object.keys(modifiers).length > 0 ? modifiers : undefined,
      isBlocking: false,
      start: 0,
      end: 0,
      line: 1,
      column: 0,
    };
  }

  /**
   * Convert a semantic value to an expression node.
   */
  private semanticValueToExpression(value: SemanticValue): ExpressionNode {
    switch (value.type) {
      case 'selector':
        return {
          type: 'selector',
          value: value.value,
          start: 0,
          end: 0,
          line: 1,
          column: 0,
        } as unknown as ExpressionNode;

      case 'reference':
        return {
          type: 'identifier',
          name: value.value,
          start: 0,
          end: 0,
          line: 1,
          column: 0,
        } as unknown as ExpressionNode;

      case 'literal':
        return {
          type: 'literal',
          value: value.value,
          raw: value.raw ?? value.value,
          start: 0,
          end: 0,
          line: 1,
          column: 0,
        } as unknown as ExpressionNode;

      case 'property-path':
        // Property paths become member expressions
        // For now, return as identifier; can be enhanced later
        return {
          type: 'identifier',
          name: value.value,
          start: 0,
          end: 0,
          line: 1,
          column: 0,
        } as unknown as ExpressionNode;

      case 'expression':
      default:
        // Generic expressions - treat as identifier for now
        return {
          type: 'identifier',
          name: value.value,
          start: 0,
          end: 0,
          line: 1,
          column: 0,
        } as unknown as ExpressionNode;
    }
  }

  /**
   * Get the configured language.
   */
  getLanguage(): string {
    return this.language;
  }

  /**
   * Get the configured confidence threshold.
   */
  getConfidenceThreshold(): number {
    return this.confidenceThreshold;
  }
}

// =============================================================================
// Factory Function
// =============================================================================

/**
 * Create a semantic integration adapter.
 *
 * @param options Configuration options
 * @returns Configured adapter instance
 */
export function createSemanticIntegration(
  options: SemanticIntegrationOptions
): SemanticIntegrationAdapter {
  return new SemanticIntegrationAdapter(options);
}

// =============================================================================
// Helper Functions
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
 * Check if a language is likely to benefit from semantic parsing.
 *
 * Non-English languages especially benefit because:
 * - Word order may differ (SOV vs SVO)
 * - Role markers (particles, postpositions) carry meaning
 * - Multiple verb forms may map to same command
 */
export function languageBenefitsFromSemantic(language: string): boolean {
  // All non-English languages benefit from semantic parsing
  // English can also benefit for more flexible parsing
  const highBenefitLanguages = new Set(['ja', 'ar', 'ko', 'tr', 'zh']);
  const moderateBenefitLanguages = new Set(['es', 'de', 'fr', 'it', 'pt']);

  return (
    highBenefitLanguages.has(language) ||
    moderateBenefitLanguages.has(language) ||
    language !== 'en'
  );
}
