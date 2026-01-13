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
  | 'responseType' // Response format (as json, as text)
  | 'style' // In what way (with fade, smoothly)
  // Control flow roles
  | 'loopType'; // Loop variant: forever, times, for, while, until, until-event

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
   * Commands that should skip semantic parsing because their syntax
   * doesn't fit the semantic role model well (keyword-heavy syntax).
   */
  private static readonly SKIP_SEMANTIC_COMMANDS = new Set([
    'swap', // swap innerHTML of #target with content - keyword-based
    'morph', // morph #target to content - similar to swap
    'js', // js ... end - body parsing required
    'tell', // tell <target> <commands> - body parsing required
  ]);

  /**
   * Check if input contains a command that should skip semantic parsing.
   * Checks both first word and presence of body-based commands anywhere in input.
   */
  private shouldSkipSemantic(input: string): boolean {
    const firstWord = input.trim().split(/\s+/)[0]?.toLowerCase();
    if (SemanticIntegrationAdapter.SKIP_SEMANTIC_COMMANDS.has(firstWord)) {
      return true;
    }
    // Also check if input contains body-based commands anywhere (js ... end, tell ...)
    const lowerInput = input.toLowerCase();
    // Match 'js' followed by '(' or whitespace and any character - captures js(param), js code, etc.
    if (/\bjs\b/.test(lowerInput)) {
      return true; // Contains js command
    }
    // Match 'tell' command
    if (/\btell\b/.test(lowerInput)) {
      return true; // Contains tell command
    }
    return false;
  }

  /**
   * Attempt to parse input using semantic analysis.
   *
   * @param input The input string to parse
   * @returns Parse attempt result with success status and optional node
   */
  trySemanticParse(input: string): SemanticParseAttempt {
    const startTime = performance.now();

    // Skip semantic parsing for commands with keyword-heavy syntax
    if (this.shouldSkipSemantic(input)) {
      return {
        success: false,
        confidence: 0,
        errors: ['Command skipped for semantic parsing - using traditional parser'],
      };
    }

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

    // Route commands to specialized handlers
    if (command.name === 'repeat') {
      return this.buildRepeatCommandNode(command);
    }

    if (command.name === 'for') {
      // 'for' is internally a repeat variant with loopType='for'
      return this.buildRepeatCommandNode(command);
    }

    if (command.name === 'set') {
      return this.buildSetCommandNode(command);
    }

    if (command.name === 'if' || command.name === 'unless') {
      return this.buildIfCommandNode(command);
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
        // Each command uses different prepositions for the target:
        case 'destination':
          if (command.name === 'put') {
            modifiers['into'] = exprNode;
          } else if (
            command.name === 'add' ||
            command.name === 'append' ||
            command.name === 'prepend'
          ) {
            modifiers['to'] = exprNode;
          } else {
            // toggle, set, send, etc use 'on'
            modifiers['on'] = exprNode;
          }
          break;

        // Source role - for fetch command, the source (URL) goes into args
        // For other commands, it becomes a 'from' modifier
        case 'source':
          if (command.name === 'fetch') {
            args.push(exprNode);
          } else {
            modifiers['from'] = exprNode;
          }
          break;

        // Quantitative roles
        case 'quantity':
          modifiers['by'] = exprNode;
          break;

        case 'duration':
          modifiers['over'] = exprNode;
          break;

        // Adverbial roles
        case 'responseType':
          modifiers['as'] = exprNode; // Response format (json, text, html)
          break;

        case 'method':
          modifiers['method'] = exprNode; // HTTP method (GET, POST)
          break;

        case 'style':
          modifiers['with'] = exprNode;
          break;

        // Condition role - maps to 'when' modifier (matches core implementation)
        case 'condition':
          modifiers['when'] = exprNode;
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
   * Build a CommandNode specifically for repeat commands.
   * Repeat commands need special handling because they require a loop type
   * discriminator as the first argument (until-event, times, forever, etc.).
   */
  private buildRepeatCommandNode(command: {
    readonly name: string;
    readonly roles: ReadonlyMap<SemanticRole, SemanticValue>;
  }): CommandNode {
    const args: ExpressionNode[] = [];
    const modifiers: Record<string, ExpressionNode> = {};

    // 1. loopType as first arg (identifier) - this is the loop variant discriminator
    const loopType = command.roles.get('loopType' as SemanticRole);
    if (loopType) {
      args.push({
        type: 'identifier',
        name: String(loopType.value),
        start: 0,
        end: 0,
        line: 1,
        column: 0,
      } as unknown as ExpressionNode);
    }

    // 2. For 'for' loops: patient is the loop variable name
    const patient = command.roles.get('patient' as SemanticRole);
    const loopTypeValue = loopType ? String(loopType.value) : '';
    if (loopTypeValue === 'for' && patient) {
      // Loop variable name as identifier (e.g., "item" in "for item in items")
      args.push({
        type: 'identifier',
        name:
          patient.type === 'expression'
            ? (patient as unknown as { raw?: string }).raw || String(patient.value)
            : String(patient.value),
        start: 0,
        end: 0,
        line: 1,
        column: 0,
      } as unknown as ExpressionNode);
    }

    // 3. event name as string (for until-event loops)
    const event = command.roles.get('event');
    if (event) {
      args.push({
        type: 'string',
        value: String(event.value),
        start: 0,
        end: 0,
        line: 1,
        column: 0,
      } as unknown as ExpressionNode);
    }

    // 4. source as expression (for 'from document' etc. or collection in 'for' loops)
    const source = command.roles.get('source');
    if (source) {
      args.push(this.semanticValueToExpression(source));
    }

    // 5. quantity for 'times' loops (e.g., "repeat 5 times")
    const quantity = command.roles.get('quantity');
    if (quantity) {
      args.push(this.semanticValueToExpression(quantity));
    }

    // 6. condition for 'while'/'until' loops
    const condition = command.roles.get('condition');
    if (condition) {
      modifiers['condition'] = this.semanticValueToExpression(condition);
    }

    return {
      type: 'command',
      name: 'repeat',
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
   * Build a CommandNode specifically for set commands.
   * Set commands need special handling because:
   * - The destination can be a property-path (possessive expression)
   * - The args must include a 'to' keyword marker
   * - The SetCommand.parseInput() expects: [target, identifier('to'), value]
   */
  private buildSetCommandNode(command: {
    readonly name: string;
    readonly roles: ReadonlyMap<SemanticRole, SemanticValue>;
  }): CommandNode {
    const args: ExpressionNode[] = [];

    // 1. Destination (target) - could be identifier, possessiveExpression, or memberExpression
    const destination = command.roles.get('destination' as SemanticRole);
    if (destination) {
      if (destination.type === 'property-path') {
        // Convert to possessiveExpression for #el's *opacity syntax
        // The property-path has { object: SemanticValue, property: string }
        const pathValue = destination as unknown as {
          type: 'property-path';
          object: SemanticValue;
          property: string;
        };
        args.push({
          type: 'possessiveExpression',
          object: this.semanticValueToExpression(pathValue.object),
          property: this.createPropertyNode(pathValue.property),
          start: 0,
          end: 0,
          line: 1,
          column: 0,
        } as unknown as ExpressionNode);
      } else {
        args.push(this.semanticValueToExpression(destination));
      }
    }

    // 2. 'to' keyword marker (required by SetCommand.parseInput)
    args.push({
      type: 'identifier',
      name: 'to',
      start: 0,
      end: 0,
      line: 1,
      column: 0,
    } as unknown as ExpressionNode);

    // 3. Patient (value)
    const patient = command.roles.get('patient' as SemanticRole);
    if (patient) {
      args.push(this.semanticValueToExpression(patient));
    }

    return {
      type: 'command',
      name: 'set',
      args,
      isBlocking: false,
      start: 0,
      end: 0,
      line: 1,
      column: 0,
    };
  }

  /**
   * Create a property node for set command targets.
   * Handles CSS property syntax (*property) vs regular identifiers.
   */
  private createPropertyNode(property: string): ExpressionNode {
    if (property.startsWith('*')) {
      // CSS property: *opacity → { type: 'cssProperty', name: 'opacity' }
      return {
        type: 'cssProperty',
        name: property.substring(1),
        start: 0,
        end: 0,
        line: 1,
        column: 0,
      } as unknown as ExpressionNode;
    }
    // Regular property: innerHTML → { type: 'identifier', name: 'innerHTML' }
    return {
      type: 'identifier',
      name: property,
      start: 0,
      end: 0,
      line: 1,
      column: 0,
    } as unknown as ExpressionNode;
  }

  /**
   * Build an if/unless command node from semantic analysis.
   * The condition goes into args as the first argument.
   * Body parsing is handled by the main parser.
   */
  private buildIfCommandNode(command: {
    readonly name: string;
    readonly roles: ReadonlyMap<SemanticRole, SemanticValue>;
  }): CommandNode {
    const args: ExpressionNode[] = [];

    // 1. Condition as first arg
    const condition = command.roles.get('condition' as SemanticRole);
    if (condition) {
      args.push(this.semanticValueToExpression(condition));
    }

    return {
      type: 'command',
      name: command.name, // 'if' or 'unless'
      args,
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
        // Check if this is a template literal with ${...} interpolation syntax
        // Template literals need special handling to preserve interpolation
        if (
          typeof value.value === 'string' &&
          value.value.includes('${') &&
          value.value.includes('}')
        ) {
          return {
            type: 'templateLiteral',
            value: value.value,
            start: 0,
            end: 0,
            line: 1,
            column: 0,
          } as unknown as ExpressionNode;
        }
        return {
          type: 'literal',
          value: value.value,
          raw: value.raw ?? value.value,
          start: 0,
          end: 0,
          line: 1,
          column: 0,
        } as unknown as ExpressionNode;

      case 'property-path': {
        // Property paths become memberExpression nodes
        // e.g., "my value" -> { object: me, property: { type: 'identifier', name: 'value' } }
        // The evaluator expects node.object and node.property.name
        const pathValue = value as unknown as {
          type: 'property-path';
          object: SemanticValue;
          property: string;
        };
        const objectNode = this.semanticValueToExpression(pathValue.object);
        return {
          type: 'memberExpression',
          object: objectNode,
          property: {
            type: 'identifier',
            name: pathValue.property,
            start: 0,
            end: 0,
            line: 1,
            column: 0,
          },
          computed: false,
          start: 0,
          end: 0,
          line: 1,
          column: 0,
        } as unknown as ExpressionNode;
      }

      case 'expression':
      default: {
        // Generic expressions - use proper expression parsing
        const exprValue = value as { type: 'expression'; raw: string };
        const rawStr = exprValue.raw || '';

        // Use the expression parser to properly handle method calls, property access, etc.
        return this.parseExpressionString(rawStr);
      }
    }
  }

  /**
   * Parse an expression string into an ExpressionNode.
   *
   * Handles:
   * - Simple identifiers: x, me, result
   * - Property access: x.y, x.y.z
   * - Method calls: foo(), x.y(), x.y(a, b)
   * - Nested calls: x.y(a.b, c)
   */
  private parseExpressionString(input: string): ExpressionNode {
    let pos = 0;

    const skipWhitespace = () => {
      while (pos < input.length && /\s/.test(input[pos])) pos++;
    };

    const parseIdentifier = (): string => {
      skipWhitespace();
      const start = pos;
      while (pos < input.length && /[a-zA-Z0-9_$]/.test(input[pos])) pos++;
      return input.slice(start, pos);
    };

    const parseArguments = (): ExpressionNode[] => {
      const args: ExpressionNode[] = [];
      pos++; // skip '('
      skipWhitespace();

      if (input[pos] !== ')') {
        // Parse first argument
        args.push(parseExpression());
        skipWhitespace();

        // Parse remaining arguments
        while (input[pos] === ',') {
          pos++; // skip ','
          skipWhitespace();
          args.push(parseExpression());
          skipWhitespace();
        }
      }

      if (input[pos] === ')') pos++; // skip ')'
      return args;
    };

    const parseExpression = (): ExpressionNode => {
      skipWhitespace();

      // Start with identifier
      const name = parseIdentifier();
      if (!name) {
        // Fallback for unparseable content
        return {
          type: 'identifier',
          name: input.trim(),
          start: 0,
          end: 0,
          line: 1,
          column: 0,
        } as unknown as ExpressionNode;
      }

      let result: ExpressionNode = {
        type: 'identifier',
        name,
        start: 0,
        end: 0,
        line: 1,
        column: 0,
      } as unknown as ExpressionNode;

      // Handle postfix operations (property access and function calls)
      while (pos < input.length) {
        skipWhitespace();
        const char = input[pos];

        if (char === '.') {
          // Property access
          pos++; // skip '.'
          const property = parseIdentifier();
          if (property) {
            result = {
              type: 'memberExpression',
              object: result,
              property: {
                type: 'identifier',
                name: property,
                start: 0,
                end: 0,
                line: 1,
                column: 0,
              },
              computed: false,
              start: 0,
              end: 0,
              line: 1,
              column: 0,
            } as unknown as ExpressionNode;
          }
        } else if (char === '(') {
          // Function call
          const args = parseArguments();
          result = {
            type: 'callExpression',
            callee: result,
            arguments: args,
            start: 0,
            end: 0,
            line: 1,
            column: 0,
          } as unknown as ExpressionNode;
        } else {
          break;
        }
      }

      return result;
    };

    return parseExpression();
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
