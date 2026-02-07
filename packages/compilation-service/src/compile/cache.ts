/**
 * Semantic-keyed LRU cache.
 *
 * Caches compilation results keyed by canonical semantic representation.
 * Different input languages that produce the same semantics hit the same cache.
 */

import type { CompileResponse } from '../types.js';

/**
 * Simple LRU cache using Map insertion order.
 */
export class SemanticCache {
  private cache: Map<string, CompileResponse>;
  private readonly maxSize: number;

  /** Cache hit/miss statistics */
  hits = 0;
  misses = 0;

  constructor(maxSize = 500) {
    this.maxSize = maxSize;
    this.cache = new Map();
  }

  /**
   * Get a cached response, or undefined if not cached.
   */
  get(key: string): CompileResponse | undefined {
    const entry = this.cache.get(key);
    if (entry) {
      this.hits++;
      // Move to end (most recently used)
      this.cache.delete(key);
      this.cache.set(key, entry);
      return entry;
    }
    this.misses++;
    return undefined;
  }

  /**
   * Store a response in the cache.
   */
  set(key: string, value: CompileResponse): void {
    // Delete first to reset insertion order
    this.cache.delete(key);

    // Evict oldest if at capacity
    if (this.cache.size >= this.maxSize) {
      const oldest = this.cache.keys().next().value;
      if (oldest !== undefined) {
        this.cache.delete(oldest);
      }
    }

    this.cache.set(key, value);
  }

  /** Current cache size */
  get size(): number {
    return this.cache.size;
  }

  /** Clear all entries */
  clear(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }
}

// =============================================================================
// Cache Key Generation
// =============================================================================

/**
 * Generate a canonical cache key from a semantic node and compilation options.
 *
 * The key is based on semantic identity, not syntax — so the same behavior
 * described in English, Japanese, or explicit syntax produces the same key.
 */
export function generateCacheKey(
  node: unknown,
  options: { optimization?: number; target?: string; minify?: boolean }
): string {
  const canonical = canonicalize(node);
  const optKey = `${options.optimization ?? 2}:${options.target ?? 'esm'}:${options.minify ?? false}`;
  return `${canonical}|${optKey}`;
}

/**
 * Canonicalize a SemanticNode to a deterministic string.
 */
function canonicalize(node: unknown): string {
  if (!node || typeof node !== 'object') return String(node);

  const n = node as Record<string, unknown>;
  const parts: string[] = [];

  // Action
  if (n.action) parts.push(`a:${n.action}`);
  if (n.kind) parts.push(`k:${n.kind}`);

  // Roles (sorted for determinism)
  if (n.roles && typeof (n.roles as Map<string, unknown>).entries === 'function') {
    const roles = n.roles as ReadonlyMap<string, unknown>;
    const sortedRoles = [...roles.entries()].sort(([a], [b]) => a.localeCompare(b));
    for (const [role, value] of sortedRoles) {
      parts.push(`r:${role}=${canonicalizeValue(value)}`);
    }
  }

  // Body (for event handlers)
  if (Array.isArray(n.body)) {
    parts.push(`b:[${n.body.map(canonicalize).join(',')}]`);
  }

  // Trigger/event modifiers
  if (n.eventModifiers && typeof n.eventModifiers === 'object') {
    const mods = Object.entries(n.eventModifiers as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join(',');
    if (mods) parts.push(`m:${mods}`);
  }

  return parts.join(';');
}

function canonicalizeValue(value: unknown): string {
  if (!value || typeof value !== 'object') return String(value);
  const v = value as Record<string, unknown>;
  return `${v.type}:${v.value ?? v.raw ?? ''}`;
}
