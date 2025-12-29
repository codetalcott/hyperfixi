import { SSRCache, SSRResult, SSRCacheError } from './types';

interface MemoryCacheOptions {
  /** Maximum number of entries in the cache (default: 1000) */
  maxSize?: number;
  /** Default TTL in seconds (default: 3600) */
  defaultTTL?: number;
}

interface CacheEntry {
  result: SSRResult;
  expires: number;
  tags: string[];
  lastAccessed: number;
}

/**
 * In-memory LRU cache implementation for SSR results
 */
export class MemorySSRCache implements SSRCache {
  private cache: Map<string, CacheEntry> = new Map();
  private readonly maxSize: number;
  private readonly defaultTTL: number;

  private statsData = {
    hits: 0,
    misses: 0,
    evictions: 0,
  };

  constructor(options: MemoryCacheOptions = {}) {
    this.maxSize = options.maxSize ?? 1000;
    this.defaultTTL = options.defaultTTL ?? 3600;
  }

  /**
   * Get cached result
   */
  async get(key: string): Promise<SSRResult | null> {
    const entry = this.cache.get(key);

    if (!entry) {
      this.statsData.misses++;
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expires) {
      this.cache.delete(key);
      this.statsData.misses++;
      return null;
    }

    // Update last accessed time for LRU
    entry.lastAccessed = Date.now();
    this.statsData.hits++;
    return entry.result;
  }

  /**
   * Set cache entry with LRU eviction
   */
  async set(key: string, result: SSRResult, ttl?: number): Promise<void> {
    const actualTTL = ttl ?? this.defaultTTL;
    const expires = Date.now() + (actualTTL * 1000);
    const tags = result.cache?.tags ?? [];
    const now = Date.now();

    // If key already exists, update it
    if (this.cache.has(key)) {
      this.cache.set(key, { result, expires, tags, lastAccessed: now });
      return;
    }

    // Evict LRU entries if at capacity
    while (this.cache.size >= this.maxSize) {
      this.evictLRU();
    }

    this.cache.set(key, {
      result,
      expires,
      tags,
      lastAccessed: now,
    });

    // Clean up expired entries periodically (5% chance)
    if (Math.random() < 0.05) {
      this.cleanupExpired();
    }
  }

  /**
   * Evict the least recently used entry
   */
  private evictLRU(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.statsData.evictions++;
    }
  }

  /**
   * Invalidate cache entries by tags
   */
  async invalidate(tags: string[]): Promise<void> {
    const keysToDelete: string[] = [];
    
    for (const [key, entry] of this.cache.entries()) {
      // Check if any of the entry's tags match the invalidation tags
      if (entry.tags.some(tag => tags.includes(tag))) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key));
  }

  /**
   * Clear all cache
   */
  async clear(): Promise<void> {
    this.cache.clear();
    this.statsData.hits = 0;
    this.statsData.misses = 0;
  }

  /**
   * Get cache statistics
   */
  async stats(): Promise<{
    hits: number;
    misses: number;
    size: number;
    keys: number;
  }> {
    const totalSize = Array.from(this.cache.values())
      .reduce((size, entry) => size + Buffer.byteLength(JSON.stringify(entry.result), 'utf8'), 0);

    return {
      hits: this.statsData.hits,
      misses: this.statsData.misses,
      size: totalSize,
      keys: this.cache.size,
    };
  }

  /**
   * Clean up expired entries
   */
  private cleanupExpired(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expires) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key));
  }
}

/**
 * Redis-based cache implementation (for production use)
 */
export class RedisSSRCache implements SSRCache {
  private redis: any; // Would be Redis client in real implementation
  private keyPrefix: string;

  constructor(redisClient: any, keyPrefix: string = 'ssr:') {
    this.redis = redisClient;
    this.keyPrefix = keyPrefix;
  }

  /**
   * Get cached result
   */
  async get(key: string): Promise<SSRResult | null> {
    try {
      const data = await this.redis.get(this.keyPrefix + key);
      if (!data) {
        return null;
      }

      return JSON.parse(data);
    } catch (error) {
      console.warn('Redis cache get error:', error);
      return null;
    }
  }

  /**
   * Set cache entry
   */
  async set(key: string, result: SSRResult, ttl: number = 3600): Promise<void> {
    try {
      const data = JSON.stringify(result);
      await this.redis.setex(this.keyPrefix + key, ttl, data);

      // Store tags for invalidation
      if (result.cache?.tags) {
        for (const tag of result.cache.tags) {
          await this.redis.sadd(`${this.keyPrefix}tag:${tag}`, key);
          await this.redis.expire(`${this.keyPrefix}tag:${tag}`, ttl);
        }
      }
    } catch (error) {
      console.warn('Redis cache set error:', error);
    }
  }

  /**
   * Invalidate cache entries by tags
   */
  async invalidate(tags: string[]): Promise<void> {
    try {
      for (const tag of tags) {
        const keys = await this.redis.smembers(`${this.keyPrefix}tag:${tag}`);
        
        if (keys.length > 0) {
          // Delete cache entries
          const fullKeys = keys.map((key: string) => this.keyPrefix + key);
          await this.redis.del(...fullKeys);
          
          // Delete tag set
          await this.redis.del(`${this.keyPrefix}tag:${tag}`);
        }
      }
    } catch (error) {
      console.warn('Redis cache invalidation error:', error);
    }
  }

  /**
   * Clear all cache
   */
  async clear(): Promise<void> {
    try {
      const pattern = this.keyPrefix + '*';
      const keys = await this.redis.keys(pattern);
      
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    } catch (error) {
      console.warn('Redis cache clear error:', error);
    }
  }

  /**
   * Get cache statistics
   */
  async stats(): Promise<{
    hits: number;
    misses: number;
    size: number;
    keys: number;
  }> {
    try {
      const info = await this.redis.info('stats');
      const keyspaceInfo = await this.redis.info('keyspace');
      
      // Parse Redis info for statistics
      const hits = this.parseInfoValue(info, 'keyspace_hits') || 0;
      const misses = this.parseInfoValue(info, 'keyspace_misses') || 0;
      
      const pattern = this.keyPrefix + '*';
      const keys = await this.redis.keys(pattern);
      
      // Estimate size (this would be more sophisticated in a real implementation)
      const size = keys.length * 1024; // Rough estimate

      return {
        hits,
        misses,
        size,
        keys: keys.length,
      };
    } catch (error) {
      console.warn('Redis cache stats error:', error);
      return { hits: 0, misses: 0, size: 0, keys: 0 };
    }
  }

  private parseInfoValue(info: string, key: string): number | null {
    const match = info.match(new RegExp(`${key}:(\\d+)`));
    return match ? parseInt(match[1], 10) : null;
  }
}

/**
 * Multi-tier cache implementation (memory + Redis)
 */
export class TieredSSRCache implements SSRCache {
  private l1Cache: MemorySSRCache;
  private l2Cache: RedisSSRCache;

  constructor(redisClient: any, keyPrefix?: string) {
    this.l1Cache = new MemorySSRCache();
    this.l2Cache = new RedisSSRCache(redisClient, keyPrefix);
  }

  /**
   * Get cached result (check L1 first, then L2)
   */
  async get(key: string): Promise<SSRResult | null> {
    // Try L1 cache first
    let result = await this.l1Cache.get(key);
    if (result) {
      return result;
    }

    // Try L2 cache
    result = await this.l2Cache.get(key);
    if (result) {
      // Store in L1 cache for faster access
      await this.l1Cache.set(key, result, 300); // 5 minutes in L1
      return result;
    }

    return null;
  }

  /**
   * Set cache entry (store in both tiers)
   */
  async set(key: string, result: SSRResult, ttl: number = 3600): Promise<void> {
    // Store in both caches
    await Promise.all([
      this.l1Cache.set(key, result, Math.min(ttl, 1800)), // Max 30 minutes in memory
      this.l2Cache.set(key, result, ttl),
    ]);
  }

  /**
   * Invalidate cache entries by tags
   */
  async invalidate(tags: string[]): Promise<void> {
    await Promise.all([
      this.l1Cache.invalidate(tags),
      this.l2Cache.invalidate(tags),
    ]);
  }

  /**
   * Clear all cache
   */
  async clear(): Promise<void> {
    await Promise.all([
      this.l1Cache.clear(),
      this.l2Cache.clear(),
    ]);
  }

  /**
   * Get cache statistics (combined)
   */
  async stats(): Promise<{
    hits: number;
    misses: number;
    size: number;
    keys: number;
  }> {
    const [l1Stats, l2Stats] = await Promise.all([
      this.l1Cache.stats(),
      this.l2Cache.stats(),
    ]);

    return {
      hits: l1Stats.hits + l2Stats.hits,
      misses: l1Stats.misses + l2Stats.misses,
      size: l1Stats.size + l2Stats.size,
      keys: l1Stats.keys + l2Stats.keys,
    };
  }
}

/**
 * Create cache instance based on configuration
 */
export function createSSRCache(config: {
  type: 'memory' | 'redis' | 'tiered';
  redis?: any;
  keyPrefix?: string;
}): SSRCache {
  switch (config.type) {
    case 'memory':
      return new MemorySSRCache();
    
    case 'redis':
      if (!config.redis) {
        throw new Error('Redis client required for Redis cache');
      }
      return new RedisSSRCache(config.redis, config.keyPrefix);
    
    case 'tiered':
      if (!config.redis) {
        throw new Error('Redis client required for tiered cache');
      }
      return new TieredSSRCache(config.redis, config.keyPrefix);
    
    default:
      return new MemorySSRCache();
  }
}