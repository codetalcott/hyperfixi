/**
 * Expression Tiers - Organized by usage frequency for lazy loading optimization
 *
 * Phase 2 optimization: Split expressions into tiers for on-demand loading
 * - CORE: Always loaded (required for any hyperscript)
 * - COMMON: High usage (loaded for most apps)
 * - OPTIONAL: Low usage (loaded on demand only)
 *
 * This enables minimal bundles to skip loading unused expression categories,
 * reducing bundle size by 30-50% for simple applications.
 */

/**
 * Expression categories organized by usage frequency
 */
export const EXPRESSION_TIERS = {
  /**
   * CORE - Always loaded (required for basic hyperscript functionality)
   *
   * These expressions are fundamental to any hyperscript usage:
   * - references: me, you, it, CSS selectors, DOM queries
   * - logical: comparisons (>, <, ==), boolean logic (and, or, not)
   * - special: literals (strings, numbers, booleans), basic operations
   *
   * Total size: ~35-40KB (unminified)
   */
  core: [
    'references', // me, you, it, querySelector, closest, parent
    'logical', // equals, and, or, not, contains, matches
    'special', // literals, numbers, strings, booleans
  ] as const,

  /**
   * COMMON - High usage (loaded for typical web apps)
   *
   * These expressions are commonly used in most applications:
   * - properties: possessive syntax (element's property), attribute access
   * - conversion: 'as' keyword for type conversion (as Int, as JSON, etc.)
   *
   * Total size: ~25-30KB (unminified)
   */
  common: [
    'properties', // possessive syntax, attribute references
    'conversion', // 'as' keyword, type conversions
  ] as const,

  /**
   * OPTIONAL - Low usage (loaded on demand)
   *
   * These expressions are only needed for specific use cases:
   * - positional: first, last, array/DOM navigation
   *
   * Note: More categories may be added as the expression system expands:
   * - mathematical, function-calls, form, array, time, possessive,
   *   object, in, string, some, symbol, not, as, property, advanced
   *
   * Total size: ~15-20KB (unminified)
   */
  optional: [
    'positional', // first, last, previous, next, array navigation
  ] as const,
} as const;

/**
 * Type representing a tier name (core, common, or optional)
 */
export type ExpressionTier = keyof typeof EXPRESSION_TIERS;

/**
 * Type representing any expression category name
 */
export type ExpressionCategory =
  | (typeof EXPRESSION_TIERS.core)[number]
  | (typeof EXPRESSION_TIERS.common)[number]
  | (typeof EXPRESSION_TIERS.optional)[number];

/**
 * Map expression categories to their tiers
 */
export const CATEGORY_TO_TIER: Record<ExpressionCategory, ExpressionTier> = {
  // Core tier
  references: 'core',
  logical: 'core',
  special: 'core',

  // Common tier
  properties: 'common',
  conversion: 'common',

  // Optional tier
  positional: 'optional',
};

/**
 * Get the tier for a given expression category
 */
export function getTierForCategory(category: string): ExpressionTier | null {
  if (category in CATEGORY_TO_TIER) {
    return CATEGORY_TO_TIER[category as ExpressionCategory];
  }
  return null;
}

/**
 * Get all categories in a specific tier
 */
export function getCategoriesForTier(tier: ExpressionTier): readonly string[] {
  return EXPRESSION_TIERS[tier];
}

/**
 * Check if a category belongs to a specific tier
 */
export function isCategoryInTier(category: string, tier: ExpressionTier): boolean {
  return (EXPRESSION_TIERS[tier] as readonly string[]).includes(category);
}

/**
 * Get all expression categories (all tiers combined)
 */
export function getAllCategories(): string[] {
  return [...EXPRESSION_TIERS.core, ...EXPRESSION_TIERS.common, ...EXPRESSION_TIERS.optional];
}
