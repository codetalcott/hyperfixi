/**
 * Cache Module
 *
 * LRU caching for semantic analysis results.
 */

export {
  SemanticCache,
  semanticCache,
  createSemanticCache,
  withCache,
  type SemanticCacheConfig,
  type CacheStats,
} from './semantic-cache';
