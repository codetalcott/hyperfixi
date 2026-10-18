/**
 * The matcher's confidence model: an injectable score for a pattern's match
 * (domains rethink Phase 4.3). The interface moved here with the skeleton
 * (`match-skeleton.ts`), which calls `calculate` once per matched pattern;
 * hyperscript's model is `@lokascript/semantic`'s `DefaultConfidenceModel`.
 */

import type { LanguagePattern, SemanticRole, SemanticValue } from '../types';

/**
 * Context passed to confidence model methods.
 */
export interface ConfidenceContext {
  /** The pattern being matched */
  readonly pattern: LanguagePattern;
  /** Captured semantic roles */
  readonly captured: ReadonlyMap<SemanticRole, SemanticValue>;
  /** Number of stem (morphological) keyword matches */
  readonly stemMatchCount: number;
  /** Total keyword matches attempted */
  readonly totalKeywordMatches: number;
}

/**
 * Breakdown of confidence scoring factors (for diagnostics/debugging).
 */
export interface ConfidenceBreakdown {
  /** Role coverage score (0-1) */
  readonly roleCoverage: number;
  /** Stem match penalty applied (0 to -0.15) */
  readonly stemPenalty: number;
  /** Language-specific boost (e.g., VSO verb-first) */
  readonly languageBoost: number;
  /** Language-specific adjustment (e.g., preposition disambiguation) */
  readonly languageAdjustment: number;
  /** Final clamped confidence (0-1) */
  readonly final: number;
}

/**
 * Injectable confidence scoring model.
 *
 * Each method computes one factor of the confidence score.
 * Override individual methods to customize scoring without rewriting the pipeline.
 */
export interface ConfidenceModel {
  /**
   * Calculate the full confidence score.
   * Default implementation calls each factor method and combines them.
   */
  calculate(ctx: ConfidenceContext): number;

  /**
   * Calculate confidence with a detailed breakdown.
   * Useful for diagnostics and debugging.
   */
  calculateWithBreakdown(ctx: ConfidenceContext): ConfidenceBreakdown;
}
