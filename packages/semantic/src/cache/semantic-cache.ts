/**
 * Semantic Result Cache
 *
 * LRU cache for semantic analysis results to optimize repeated parsing.
 *
 * Design:
 * - Cache key: `${language}:${input}` for simple, fast lookups
 * - LRU eviction when max size reached
 * - Optional TTL (time-to-live) for cache entries
 * - Statistics for monitoring cache effectiveness
 * - Thread-safe for browser environments (single-threaded)
 */

import type { SemanticAnalysisResult } from '../core-bridge';

// =============================================================================
// Types
// =============================================================================

/**
 * Cache configuration options.
 */
export interface SemanticCacheConfig {
  /** Maximum number of entries to cache. Default: 1000 */
  maxSize?: number;
  /** Time-to-live in milliseconds. 0 = no expiration. Default: 0 */
  ttlMs?: number;
  /** Enable/disable caching. Default: true */
  enabled?: boolean;
}

/**
 * Cache entry with metadata.
 */
interface CacheEntry {
  /** The cached result */
  result: SemanticAnalysisResult;
  /** Timestamp when entry was created */
  createdAt: number;
  /** Last access timestamp (for LRU) */
  lastAccessed: number;
}

/**
 * Cache statistics.
 */
export interface CacheStats {
  /** Total cache hits */
  hits: number;
  /** Total cache misses */
  misses: number;
  /** Current cache size */
  size: number;
  /** Maximum cache size */
  maxSize: number;
  /** Hit rate (0-1) */
  hitRate: number;
  /** Total evictions due to size limit */
  evictions: number;
  /** Total expirations due to TTL */
  expirations: number;
  /** Whether caching is enabled */
  enabled: boolean;
}

// =============================================================================
// LRU Cache Implementation
// =============================================================================

/**
 * LRU Cache for semantic analysis results.
 *
 * Uses Map's insertion order for LRU eviction - when we access an entry,
 * we delete and re-insert it to move it to the end (most recently used).
 */
export class SemanticCache {
  private cache: Map<string, CacheEntry>;
  private config: Required<SemanticCacheConfig>;
  private stats: {
    hits: number;
    misses: number;
    evictions: number;
    expirations: number;
  };

  constructor(config: SemanticCacheConfig = {}) {
    this.cache = new Map();
    this.config = {
      maxSize: config.maxSize ?? 1000,
      ttlMs: config.ttlMs ?? 0,
      enabled: config.enabled ?? true,
    };
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      expirations: 0,
    };
  }

  /**
   * Generate cache key from input and language.
   */
  private makeKey(input: string, language: string): string {
    return `${language}:${input}`;
  }

  /**
   * Check if an entry has expired.
   */
  private isExpired(entry: CacheEntry): boolean {
    if (this.config.ttlMs === 0) return false;
    return Date.now() - entry.createdAt > this.config.ttlMs;
  }

  /**
   * Evict the least recently used entry.
   */
  private evictLRU(): void {
    // Map preserves insertion order, so first entry is oldest
    const firstKey = this.cache.keys().next().value;
    if (firstKey !== undefined) {
      this.cache.delete(firstKey);
      this.stats.evictions++;
    }
  }

  /**
   * Get a cached result.
   *
   * @param input - The input string
   * @param language - The language code
   * @returns The cached result, or undefined if not found/expired
   */
  get(input: string, language: string): SemanticAnalysisResult | undefined {
    if (!this.config.enabled) {
      this.stats.misses++;
      return undefined;
    }

    const key = this.makeKey(input, language);
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      return undefined;
    }

    // Check expiration
    if (this.isExpired(entry)) {
      this.cache.delete(key);
      this.stats.expirations++;
      this.stats.misses++;
      return undefined;
    }

    // Move to end for LRU (delete and re-insert)
    this.cache.delete(key);
    entry.lastAccessed = Date.now();
    this.cache.set(key, entry);

    this.stats.hits++;
    return entry.result;
  }

  /**
   * Store a result in the cache.
   *
   * @param input - The input string
   * @param language - The language code
   * @param result - The analysis result to cache
   */
  set(input: string, language: string, result: SemanticAnalysisResult): void {
    if (!this.config.enabled) return;

    // Don't cache failed results (confidence 0)
    if (result.confidence === 0) return;

    const key = this.makeKey(input, language);
    const now = Date.now();

    // Evict if at max size
    while (this.cache.size >= this.config.maxSize) {
      this.evictLRU();
    }

    this.cache.set(key, {
      result,
      createdAt: now,
      lastAccessed: now,
    });
  }

  /**
   * Check if a result is cached (without updating LRU).
   */
  has(input: string, language: string): boolean {
    if (!this.config.enabled) return false;

    const key = this.makeKey(input, language);
    const entry = this.cache.get(key);

    if (!entry) return false;
    if (this.isExpired(entry)) {
      this.cache.delete(key);
      this.stats.expirations++;
      return false;
    }

    return true;
  }

  /**
   * Remove a specific entry from the cache.
   */
  delete(input: string, language: string): boolean {
    const key = this.makeKey(input, language);
    return this.cache.delete(key);
  }

  /**
   * Clear all cached entries.
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Reset statistics.
   */
  resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      expirations: 0,
    };
  }

  /**
   * Get cache statistics.
   */
  getStats(): CacheStats {
    const total = this.stats.hits + this.stats.misses;
    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      size: this.cache.size,
      maxSize: this.config.maxSize,
      hitRate: total > 0 ? this.stats.hits / total : 0,
      evictions: this.stats.evictions,
      expirations: this.stats.expirations,
      enabled: this.config.enabled,
    };
  }

  /**
   * Update cache configuration.
   */
  configure(config: Partial<SemanticCacheConfig>): void {
    if (config.maxSize !== undefined) {
      this.config.maxSize = config.maxSize;
      // Evict if now over limit
      while (this.cache.size > this.config.maxSize) {
        this.evictLRU();
      }
    }
    if (config.ttlMs !== undefined) {
      this.config.ttlMs = config.ttlMs;
    }
    if (config.enabled !== undefined) {
      this.config.enabled = config.enabled;
    }
  }

  /**
   * Enable caching.
   */
  enable(): void {
    this.config.enabled = true;
  }

  /**
   * Disable caching.
   */
  disable(): void {
    this.config.enabled = false;
  }

  /**
   * Get current configuration.
   */
  getConfig(): Readonly<Required<SemanticCacheConfig>> {
    return { ...this.config };
  }
}

// =============================================================================
// Default Instance
// =============================================================================

/**
 * Default global cache instance.
 */
export const semanticCache = new SemanticCache();

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Create a cache with custom configuration.
 */
export function createSemanticCache(config?: SemanticCacheConfig): SemanticCache {
  return new SemanticCache(config);
}

/**
 * Decorator/wrapper for adding caching to an analyze function.
 *
 * @param analyzeFn - The analyze function to wrap
 * @param cache - The cache instance to use
 * @returns Wrapped function with caching
 */
export function withCache<T extends (input: string, language: string) => SemanticAnalysisResult>(
  analyzeFn: T,
  cache: SemanticCache = semanticCache
): T {
  return ((input: string, language: string): SemanticAnalysisResult => {
    // Check cache first
    const cached = cache.get(input, language);
    if (cached) {
      return cached;
    }

    // Run analysis
    const result = analyzeFn(input, language);

    // Cache result
    cache.set(input, language, result);

    return result;
  }) as T;
}
