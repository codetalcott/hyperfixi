/**
 * Core Parser Bridge — Confidence thresholds
 *
 * As of v3.0.0 the SemanticAnalyzer interface, SemanticAnalyzerImpl class,
 * createSemanticAnalyzer factory, and SemanticAnalysisResult type have been
 * removed. Consumers use `parseSemantic()` / `parseWithConfidence()` from
 * `@lokascript/semantic` and read `result.node.action` / `result.node.roles`
 * directly from the returned `SemanticNode`. See CHANGELOG for migration.
 *
 * This file is retained only for the confidence-threshold constants and the
 * cache type re-exports that downstream consumers still import.
 */

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
