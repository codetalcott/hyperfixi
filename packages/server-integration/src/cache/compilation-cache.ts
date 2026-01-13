/**
 * Compilation Cache - caching system for compiled hyperscript
 */

import type { CompilationOptions, CompilationResult, CacheEntry } from '../types.js';

export interface CacheConfig {
  maxSize?: number;
  ttl?: number; // Time to live in milliseconds
}

export interface CacheStats {
  hits: number;
  misses: number;
  hitRatio: number;
  size: number;
  maxSize: number;
}

export class CompilationCache {
  private cache = new Map<string, CacheEntry>();
  private maxSize: number;
  private ttl: number;
  private hits = 0;
  private misses = 0;

  constructor(config: CacheConfig = {}) {
    this.maxSize = config.maxSize || 1000;
    this.ttl = config.ttl || 5 * 60 * 1000; // 5 minutes default
  }

  /**
   * Get a cached compilation result
   */
  get(script: string, options: CompilationOptions): CompilationResult | null {
    const key = this.generateKey(script, options);
    const entry = this.cache.get(key);

    if (!entry) {
      this.misses++;
      return null;
    }

    // Check if entry has expired
    if (this.isExpired(entry)) {
      this.cache.delete(key);
      this.misses++;
      return null;
    }

    // Update access statistics
    entry.hits++;
    entry.timestamp = Date.now();
    this.hits++;

    // Move to end (most recently used)
    this.cache.delete(key);
    this.cache.set(key, entry);

    return entry.result;
  }

  /**
   * Cache a compilation result
   */
  set(script: string, options: CompilationOptions, result: CompilationResult): void {
    const key = this.generateKey(script, options);

    // Remove oldest entries if cache is full
    this.enforceSize();

    const entry: CacheEntry = {
      key,
      result,
      timestamp: Date.now(),
      options,
      hits: 0,
    };

    this.cache.set(key, entry);
  }

  /**
   * Check if cache has an entry for the given script and options
   */
  has(script: string, options: CompilationOptions): boolean {
    const key = this.generateKey(script, options);
    const entry = this.cache.get(key);

    if (!entry) {
      return false;
    }

    // Check if expired
    if (this.isExpired(entry)) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * Get current cache size
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const total = this.hits + this.misses;
    const hitRatio = total > 0 ? this.hits / total : 0;

    return {
      hits: this.hits,
      misses: this.misses,
      hitRatio: Math.round(hitRatio * 100) / 100, // Round to 2 decimal places
      size: this.cache.size,
      maxSize: this.maxSize,
    };
  }

  /**
   * Remove expired entries from cache
   */
  cleanup(): number {
    let removed = 0;
    const now = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (this.isExpired(entry, now)) {
        this.cache.delete(key);
        removed++;
      }
    }

    return removed;
  }

  /**
   * Generate a unique cache key for script and options
   */
  private generateKey(script: string, options: CompilationOptions): string {
    // Create a deterministic key based on script content and options
    const optionsString = JSON.stringify({
      minify: options.minify || false,
      compatibility: options.compatibility || 'modern',
      sourceMap: options.sourceMap || false,
      optimization: options.optimization || false,
      templateVars: this.sortObject(options.templateVars || {}),
    });

    // Simple hash function for the key
    const scriptHash = this.simpleHash(script);
    const optionsHash = this.simpleHash(optionsString);

    return `${scriptHash}-${optionsHash}`;
  }

  /**
   * Sort object keys for consistent hashing
   */
  private sortObject(obj: Record<string, any>): Record<string, any> {
    const sorted: Record<string, any> = {};
    const keys = Object.keys(obj).sort();

    for (const key of keys) {
      sorted[key] = obj[key];
    }

    return sorted;
  }

  /**
   * Simple hash function
   */
  private simpleHash(str: string): string {
    let hash = 0;

    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    return Math.abs(hash).toString(36);
  }

  /**
   * Check if a cache entry has expired
   */
  private isExpired(entry: CacheEntry, now: number = Date.now()): boolean {
    return now - entry.timestamp > this.ttl;
  }

  /**
   * Enforce maximum cache size by removing oldest entries
   */
  private enforceSize(): void {
    while (this.cache.size >= this.maxSize) {
      // Remove the first (oldest) entry
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      } else {
        break; // Safety check
      }
    }
  }
}
