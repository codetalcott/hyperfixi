/**
 * Cross-Domain Dispatcher
 *
 * Routes natural-language input to the correct domain by trying all registered
 * domains and picking the highest-confidence match. Supports auto-detection,
 * composite multi-line parsing, and confidence-based routing.
 *
 * @example
 * ```typescript
 * import { DomainRegistry, CrossDomainDispatcher } from '@lokascript/framework';
 *
 * const registry = new DomainRegistry();
 * registry.register(sqlDescriptor);
 * registry.register(bddDescriptor);
 *
 * const dispatcher = new CrossDomainDispatcher(registry);
 *
 * // Auto-detect which domain handles the input
 * const result = await dispatcher.detect('select name from users', 'en');
 * // → { domain: 'sql', node: ..., confidence: 0.95, dsl: ... }
 *
 * // Parse multi-line input across domains
 * const composite = await dispatcher.parseComposite(`
 *   select name from users
 *   given page http://localhost
 * `, 'en');
 * ```
 */

import type { SemanticNode } from '../core/types';
import type { MultilingualDSL, CompileResult, ValidationResult } from './create-dsl';
import { DomainRegistry } from './domain-registry';

// =============================================================================
// Types
// =============================================================================

/** Result of domain auto-detection */
export interface DispatchResult {
  /** The domain that matched */
  readonly domain: string;
  /** Parsed semantic node */
  readonly node: SemanticNode;
  /** Confidence score (0-1) */
  readonly confidence: number;
  /** The DSL instance that parsed it */
  readonly dsl: MultilingualDSL;
}

/** A single statement in a composite parse result */
export interface CompositeStatement {
  readonly line: number;
  readonly input: string;
  readonly domain: string;
  readonly node: SemanticNode;
  readonly confidence: number;
}

/** An error from a composite parse */
export interface CompositeError {
  readonly line: number;
  readonly input: string;
  readonly message: string;
}

/** Result of multi-domain composite parsing */
export interface CompositeParseResult {
  /** Successfully parsed statements */
  readonly statements: readonly CompositeStatement[];
  /** Lines that could not be matched to any domain */
  readonly errors: readonly CompositeError[];
}

/** Dispatcher configuration options */
export interface DispatcherOptions {
  /** Minimum confidence to accept a match (default: 0.5) */
  readonly minConfidence?: number;
  /** Domain priority order — earlier domains win on confidence ties */
  readonly priority?: readonly string[];
}

// =============================================================================
// Comment line detection
// =============================================================================

const COMMENT_PATTERN = /^\s*(\/\/|--|#)/;

function isSkippableLine(line: string): boolean {
  const trimmed = line.trim();
  return trimmed === '' || COMMENT_PATTERN.test(trimmed);
}

// =============================================================================
// CrossDomainDispatcher
// =============================================================================

/**
 * Dispatcher that routes input to the correct domain by confidence scoring.
 *
 * Built on top of DomainRegistry — uses registered domains' DSL instances
 * to try parsing input and picks the highest-confidence match.
 */
export class CrossDomainDispatcher {
  private registry: DomainRegistry;
  private minConfidence: number;
  private priority: readonly string[];

  constructor(registry: DomainRegistry, options?: DispatcherOptions) {
    this.registry = registry;
    this.minConfidence = options?.minConfidence ?? 0.5;
    this.priority = options?.priority ?? [];
  }

  /**
   * Auto-detect which domain handles the input.
   * Tries all registered domains and returns the highest-confidence match.
   * Returns null if no domain matches above minConfidence.
   */
  async detect(input: string, language = 'en'): Promise<DispatchResult | null> {
    const domainNames = this.registry.getDomainNames();
    if (domainNames.length === 0) return null;

    const candidates: DispatchResult[] = [];

    for (const name of domainNames) {
      try {
        const dsl = await this.registry.getDSLForDomain(name);
        if (!dsl) continue;

        const { node, confidence } = dsl.parseWithConfidence(input, language);
        if (confidence >= this.minConfidence) {
          candidates.push({ domain: name, node, confidence, dsl });
        }
      } catch {
        // Domain could not be loaded or parse this input — skip
      }
    }

    if (candidates.length === 0) return null;

    // Sort by confidence descending, break ties by priority order
    candidates.sort((a, b) => {
      if (b.confidence !== a.confidence) return b.confidence - a.confidence;
      return this.getPriorityIndex(a.domain) - this.getPriorityIndex(b.domain);
    });

    return candidates[0];
  }

  /**
   * Parse multi-line input where each line may belong to a different domain.
   * Empty lines and comment lines (starting with //, --, or #) are skipped.
   */
  async parseComposite(input: string, language = 'en'): Promise<CompositeParseResult> {
    const lines = input.split('\n');
    const statements: CompositeStatement[] = [];
    const errors: CompositeError[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (isSkippableLine(line)) continue;

      const trimmed = line.trim();
      const result = await this.detect(trimmed, language);

      if (result) {
        statements.push({
          line: i + 1,
          input: trimmed,
          domain: result.domain,
          node: result.node,
          confidence: result.confidence,
        });
      } else {
        errors.push({
          line: i + 1,
          input: trimmed,
          message: 'No domain matched this input',
        });
      }
    }

    return { statements, errors };
  }

  /**
   * Compile input using auto-detected domain.
   * Returns the compilation result with the domain name.
   */
  async compile(
    input: string,
    language = 'en'
  ): Promise<(CompileResult & { domain: string }) | null> {
    const detected = await this.detect(input, language);
    if (!detected) return null;

    const result = detected.dsl.compile(input, language);
    return { ...result, domain: detected.domain };
  }

  /**
   * Validate input against all domains, returning the best match.
   */
  async validate(input: string, language = 'en'): Promise<ValidationResult & { domain?: string }> {
    const detected = await this.detect(input, language);
    if (!detected) {
      return { valid: false, errors: ['No domain matched this input'] };
    }

    const result = detected.dsl.validate(input, language);
    return { ...result, domain: detected.domain };
  }

  // ---------------------------------------------------------------------------
  // Private
  // ---------------------------------------------------------------------------

  private getPriorityIndex(domain: string): number {
    const idx = this.priority.indexOf(domain);
    return idx === -1 ? this.priority.length : idx;
  }
}
