/**
 * Parse Validator - Validates hyperscript parsing across languages
 */

import { MultilingualHyperscript } from '@hyperfixi/core/multilingual';
import type { SemanticNode } from '@lokascript/semantic';
import type { PatternTranslation, ParseResult, Validator } from '../types';

/**
 * Parse Validator
 *
 * Validates that hyperscript patterns parse correctly using the semantic parser.
 */
export class ParseValidator implements Validator<ParseResult[]> {
  private ml: MultilingualHyperscript;
  private initialized = false;

  constructor() {
    this.ml = new MultilingualHyperscript();
  }

  /**
   * Initialize the validator
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;
    await this.ml.initialize();
    this.initialized = true;
  }

  /**
   * Get validator name
   */
  getName(): string {
    return 'ParseValidator';
  }

  /**
   * Validate patterns
   */
  async validate(patterns: PatternTranslation[]): Promise<ParseResult[]> {
    await this.initialize();

    const results: ParseResult[] = [];

    for (const pattern of patterns) {
      const result = await this.validatePattern(pattern);
      results.push(result);
    }

    return results;
  }

  /**
   * Validate a single pattern
   */
  private async validatePattern(pattern: PatternTranslation): Promise<ParseResult> {
    const startTime = performance.now();

    try {
      // Parse the hyperscript
      const semanticNode = (await this.ml.parse(
        pattern.hyperscript,
        pattern.language
      )) as SemanticNode;

      if (!semanticNode) {
        return {
          pattern,
          success: false,
          error: 'Parse returned null or undefined',
          duration: performance.now() - startTime,
        };
      }

      // Extract command and roles from semantic node
      const command = semanticNode.action;
      const roles = this.extractRoles(semanticNode);

      return {
        pattern,
        success: true,
        command,
        roles,
        confidence: pattern.confidence, // Use pattern confidence
        parser: 'semantic',
        duration: performance.now() - startTime,
      };
    } catch (error) {
      return {
        pattern,
        success: false,
        error: error instanceof Error ? error.message : String(error),
        duration: performance.now() - startTime,
      };
    }
  }

  /**
   * Extract semantic roles from node
   */
  private extractRoles(node: SemanticNode): Record<string, unknown> {
    const roles: Record<string, unknown> = {};

    for (const [role, value] of Object.entries(node)) {
      // Skip action and metadata fields
      if (role === 'action' || role === 'type' || role === 'confidence') {
        continue;
      }

      if (value !== undefined && value !== null) {
        roles[role] = value;
      }
    }

    return roles;
  }

  /**
   * Validate patterns in batches for better performance
   */
  async validateBatch(
    patterns: PatternTranslation[],
    batchSize: number = 10
  ): Promise<ParseResult[]> {
    await this.initialize();

    const results: ParseResult[] = [];

    for (let i = 0; i < patterns.length; i += batchSize) {
      const batch = patterns.slice(i, i + batchSize);
      const batchResults = await Promise.all(batch.map(pattern => this.validatePattern(pattern)));
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * Get statistics from parse results
   */
  static getStatistics(results: ParseResult[]) {
    const total = results.length;
    const successful = results.filter(r => r.success).length;
    const failed = total - successful;

    const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / total;

    const avgConfidence =
      results
        .filter(r => r.success && r.confidence !== undefined)
        .reduce((sum, r) => sum + (r.confidence || 0), 0) / (successful || 1);

    const byParser: Record<string, number> = {};
    for (const result of results) {
      if (result.parser) {
        byParser[result.parser] = (byParser[result.parser] || 0) + 1;
      }
    }

    return {
      total,
      successful,
      failed,
      successRate: total > 0 ? successful / total : 0,
      avgDuration,
      avgConfidence,
      byParser,
    };
  }
}

/**
 * Quick validation helper function
 */
export async function validatePatterns(patterns: PatternTranslation[]): Promise<ParseResult[]> {
  const validator = new ParseValidator();
  return await validator.validate(patterns);
}

/**
 * Validate patterns and return summary
 */
export async function validateAndSummarize(patterns: PatternTranslation[]) {
  const results = await validatePatterns(patterns);
  const stats = ParseValidator.getStatistics(results);

  return {
    results,
    stats,
    failures: results.filter(r => !r.success),
  };
}
