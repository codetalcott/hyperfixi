/**
 * Expression Result Caching System
 * Provides LRU caching for DOM queries and expression results to dramatically improve performance
 */

interface CacheEntry<T> {
  result: T;
  timestamp: number;
  accessCount: number;
}

export class LRUCache<K, V> {
  private cache = new Map<K, CacheEntry<V>>();
  private accessOrder = new Map<K, number>();
  private accessCounter = 0;

  constructor(
    private readonly maxSize: number = 100,
    private readonly ttl: number = 5000 // 5 second TTL
  ) {}

  get(key: K): V | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;

    // Check TTL
    if (Date.now() - entry.timestamp > this.ttl) {
      this.delete(key);
      return undefined;
    }

    // Update access order and count
    entry.accessCount++;
    this.accessOrder.set(key, ++this.accessCounter);

    return entry.result;
  }

  set(key: K, value: V): void {
    // Remove oldest entries if at capacity
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evictLRU();
    }

    const entry: CacheEntry<V> = {
      result: value,
      timestamp: Date.now(),
      accessCount: 1,
    };

    this.cache.set(key, entry);
    this.accessOrder.set(key, ++this.accessCounter);
  }

  delete(key: K): boolean {
    this.accessOrder.delete(key);
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
    this.accessOrder.clear();
    this.accessCounter = 0;
  }

  size(): number {
    return this.cache.size;
  }

  private evictLRU(): void {
    let lruKey: K | undefined;
    let lruAccessOrder = Infinity;

    for (const [key, accessOrder] of this.accessOrder) {
      if (accessOrder < lruAccessOrder) {
        lruAccessOrder = accessOrder;
        lruKey = key;
      }
    }

    if (lruKey !== undefined) {
      this.delete(lruKey);
    }
  }

  getStats() {
    const entries = Array.from(this.cache.values());
    const now = Date.now();

    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate:
        entries.length > 0 ? entries.filter(e => e.accessCount > 1).length / entries.length : 0,
      avgAge:
        entries.length > 0
          ? entries.reduce((sum, e) => sum + (now - e.timestamp), 0) / entries.length
          : 0,
      totalAccesses: entries.reduce((sum, e) => sum + e.accessCount, 0),
    };
  }
}

export class HyperscriptCache {
  // Separate caches for different types of operations
  private readonly domQueryCache = new LRUCache<string, Element | Element[] | null>(200, 3000);
  private readonly exprResultCache = new LRUCache<string, any>(500, 2000);
  private readonly cssMatchCache = new LRUCache<string, boolean>(100, 5000);
  private readonly formValueCache = new LRUCache<string, any>(50, 1000);

  // Performance counters
  private hits = 0;
  private misses = 0;

  // DOM Query Caching
  querySelector(selector: string): Element | null {
    const cacheKey = `querySelector:${selector}`;
    const cached = this.domQueryCache.get(cacheKey);

    if (cached !== undefined) {
      this.hits++;
      return cached as Element | null;
    }

    this.misses++;
    const result = document.querySelector(selector);
    this.domQueryCache.set(cacheKey, result);
    return result;
  }

  querySelectorAll(selector: string): Element[] {
    const cacheKey = `querySelectorAll:${selector}`;
    const cached = this.domQueryCache.get(cacheKey);

    if (cached !== undefined) {
      this.hits++;
      return cached as Element[];
    }

    this.misses++;
    const result = Array.from(document.querySelectorAll(selector));
    this.domQueryCache.set(cacheKey, result);
    return result;
  }

  getElementById(id: string): Element | null {
    const cacheKey = `getElementById:${id}`;
    const cached = this.domQueryCache.get(cacheKey);

    if (cached !== undefined) {
      this.hits++;
      return cached as Element | null;
    }

    this.misses++;
    const result = document.getElementById(id);
    this.domQueryCache.set(cacheKey, result);
    return result;
  }

  getElementsByClassName(className: string): Element[] {
    const cacheKey = `getElementsByClassName:${className}`;
    const cached = this.domQueryCache.get(cacheKey);

    if (cached !== undefined) {
      this.hits++;
      return cached as Element[];
    }

    this.misses++;
    const result = Array.from(document.getElementsByClassName(className));
    this.domQueryCache.set(cacheKey, result);
    return result;
  }

  // CSS Matching Cache
  matches(element: Element, selector: string): boolean {
    const elementId = this.getElementCacheKey(element);
    const cacheKey = `matches:${elementId}:${selector}`;
    const cached = this.cssMatchCache.get(cacheKey);

    if (cached !== undefined) {
      this.hits++;
      return cached;
    }

    this.misses++;
    const result = element.matches(selector);
    this.cssMatchCache.set(cacheKey, result);
    return result;
  }

  // Expression Result Caching
  getExpressionResult(exprKey: string): any {
    const cached = this.exprResultCache.get(exprKey);
    if (cached !== undefined) {
      this.hits++;
      return cached;
    }
    this.misses++;
    return undefined;
  }

  setExpressionResult(exprKey: string, result: any): void {
    this.exprResultCache.set(exprKey, result);
  }

  // Form Value Caching
  getFormValue(form: HTMLFormElement): any {
    const formId = this.getElementCacheKey(form);
    const cacheKey = `formValue:${formId}`;
    const cached = this.formValueCache.get(cacheKey);

    if (cached !== undefined) {
      this.hits++;
      return cached;
    }

    this.misses++;
    return undefined;
  }

  setFormValue(form: HTMLFormElement, value: any): void {
    const formId = this.getElementCacheKey(form);
    const cacheKey = `formValue:${formId}`;
    this.formValueCache.set(cacheKey, value);
  }

  // Cache invalidation methods
  invalidateElementCache(element: Element): void {
    const elementId = this.getElementCacheKey(element);

    // Clear all caches that might be affected by element changes
    for (const cache of [this.domQueryCache, this.cssMatchCache, this.formValueCache]) {
      for (const key of Array.from(cache['cache'].keys())) {
        if (typeof key === 'string' && key.includes(elementId)) {
          cache.delete(key);
        }
      }
    }
  }

  invalidateAll(): void {
    this.domQueryCache.clear();
    this.exprResultCache.clear();
    this.cssMatchCache.clear();
    this.formValueCache.clear();
    this.hits = 0;
    this.misses = 0;
  }

  // Utility methods
  private getElementCacheKey(element: Element): string {
    // Create a stable identifier for the element
    if (element.id) return `#${element.id}`;

    // Use tagName + classes + position as fallback
    const classes = Array.from(element.classList).sort().join('.');
    const position = this.getElementPosition(element);
    return `${element.tagName.toLowerCase()}${classes ? '.' + classes : ''}@${position}`;
  }

  private getElementPosition(element: Element): string {
    const siblings = Array.from(element.parentElement?.children || []);
    const index = siblings.indexOf(element);
    return `${index}`;
  }

  // Performance monitoring
  getPerformanceStats() {
    const total = this.hits + this.misses;
    const hitRate = total > 0 ? (this.hits / total) * 100 : 0;

    return {
      hits: this.hits,
      misses: this.misses,
      hitRate: Math.round(hitRate * 100) / 100,
      domQueryCache: this.domQueryCache.getStats(),
      exprResultCache: this.exprResultCache.getStats(),
      cssMatchCache: this.cssMatchCache.getStats(),
      formValueCache: this.formValueCache.getStats(),
    };
  }

  // Cleanup method for memory management
  cleanup(): void {
    const now = Date.now();

    // Force cleanup of expired entries
    [this.domQueryCache, this.exprResultCache, this.cssMatchCache, this.formValueCache].forEach(
      cache => {
        const entries = Array.from(cache['cache'].entries());
        entries.forEach(([key, entry]) => {
          if (now - entry.timestamp > cache['ttl']) {
            cache.delete(key);
          }
        });
      }
    );
  }
}

// Global cache instance
export const globalCache = new HyperscriptCache();

// Set up automatic cleanup
if (typeof window !== 'undefined') {
  setInterval(() => {
    globalCache.cleanup();
  }, 10000); // Cleanup every 10 seconds
}
