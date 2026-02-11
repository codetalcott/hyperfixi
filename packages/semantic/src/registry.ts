/**
 * Language Registry
 *
 * Central registration point for language support in the semantic parser.
 * Languages self-register when their modules are imported, enabling
 * tree-shaking for minimal bundles.
 *
 * @example
 * ```typescript
 * // Import only the languages you need
 * import '@lokascript/semantic/languages/en';
 * import '@lokascript/semantic/languages/es';
 *
 * // Now parse works for registered languages
 * import { parse } from '@lokascript/semantic';
 * parse('toggle .active', 'en');     // Works
 * parse('alternar .activo', 'es');   // Works
 * parse('切り替え .active', 'ja');    // Error: Language not registered
 * ```
 */

import type { LanguageTokenizer, LanguagePattern, TokenStream } from './types';

// Re-export profile types from generators for convenience
export type {
  LanguageProfile,
  WordOrder,
  MarkingStrategy,
  RoleMarker,
  VerbConfig,
  PossessiveConfig,
  KeywordTranslation,
  TokenizationConfig,
} from './generators/language-profiles';

import type { LanguageProfile } from './generators/language-profiles';

// =============================================================================
// External Pattern Source Interface
// =============================================================================

/**
 * Interface for external pattern sources (e.g., @hyperfixi/patterns-reference database).
 * External sources can provide additional patterns at runtime.
 */
export interface ExternalPatternsSource {
  /** Unique identifier for the source */
  id: string;
  /** Human-readable name */
  name: string;
  /** Get patterns for a specific language */
  getPatternsForLanguage(language: string): Promise<ExternalPatternEntry[]>;
  /** Get patterns for a specific command */
  getPatternsForCommand(command: string, language?: string): Promise<ExternalPatternEntry[]>;
  /** Check if source has patterns for a language */
  hasPatterns(language: string): Promise<boolean>;
  /** Get all supported languages */
  getSupportedLanguages(): Promise<string[]>;
}

/**
 * Pattern entry from external source.
 */
export interface ExternalPatternEntry {
  id: string;
  code: string;
  command: string | null;
  language: string;
  confidence: number;
  verified: boolean;
  title?: string;
  category?: string;
}

// =============================================================================
// Registry State
// =============================================================================

const tokenizers = new Map<string, LanguageTokenizer>();
const profiles = new Map<string, LanguageProfile>();
const patternCache = new Map<string, LanguagePattern[]>();

// External pattern sources (e.g., @hyperfixi/patterns-reference database)
const externalSources = new Map<string, ExternalPatternsSource>();

// Pattern generator function - set by patterns module to avoid circular deps
let patternGenerator: ((profile: LanguageProfile) => LanguagePattern[]) | null = null;

// =============================================================================
// Profile Inheritance
// =============================================================================

/**
 * Deep merge two objects, with variant values overriding base values.
 * Arrays are replaced, not merged.
 */
function deepMerge<T extends object>(base: T, variant: Partial<T>): T {
  const result = { ...base } as T;

  for (const key of Object.keys(variant) as (keyof T)[]) {
    const variantValue = variant[key];
    const baseValue = base[key];

    if (variantValue === undefined) {
      continue;
    }

    // If both are objects (but not arrays), merge recursively
    if (
      typeof variantValue === 'object' &&
      variantValue !== null &&
      !Array.isArray(variantValue) &&
      typeof baseValue === 'object' &&
      baseValue !== null &&
      !Array.isArray(baseValue)
    ) {
      result[key] = deepMerge(
        baseValue as object,
        variantValue as Partial<typeof baseValue>
      ) as T[keyof T];
    } else {
      // Replace value (including arrays)
      result[key] = variantValue as T[keyof T];
    }
  }

  return result;
}

/**
 * Merge a variant profile with its base profile.
 * The variant's fields override the base, with deep merging for nested objects.
 *
 * @example
 * ```typescript
 * const esMX = mergeProfiles(spanishProfile, {
 *   code: 'es-MX',
 *   name: 'Spanish (Mexico)',
 *   keywords: {
 *     toggle: { primary: 'alternar', alternatives: ['dale', 'cambiar'] },
 *   },
 * });
 * ```
 */
export function mergeProfiles(
  base: LanguageProfile,
  variant: Partial<LanguageProfile>
): LanguageProfile {
  return deepMerge(base, variant);
}

/**
 * Resolve a profile, applying inheritance if the profile has an `extends` field.
 * Returns the merged profile with base language properties inherited.
 */
export function resolveProfile(profile: LanguageProfile): LanguageProfile {
  if (!profile.extends) {
    return profile;
  }

  const baseProfile = profiles.get(profile.extends);
  if (!baseProfile) {
    console.warn(
      `[Registry] Profile '${profile.code}' extends '${profile.extends}' but base is not registered. ` +
        `Make sure to import the base language before the variant.`
    );
    return profile;
  }

  // Recursively resolve base profile (in case it also extends something)
  const resolvedBase = resolveProfile(baseProfile);

  // Merge, with variant overriding base
  return mergeProfiles(resolvedBase, profile);
}

// =============================================================================
// Registration Functions
// =============================================================================

/**
 * Register a language with its tokenizer and profile.
 * Called automatically by language modules when imported.
 * If the profile has an `extends` field, it will inherit from the base profile.
 */
export function registerLanguage(
  code: string,
  tokenizer: LanguageTokenizer,
  profile: LanguageProfile
): void {
  tokenizers.set(code, tokenizer);
  // Store the original profile (inheritance is resolved at query time)
  profiles.set(code, profile);
  // Clear pattern cache for this language if it was previously cached
  patternCache.delete(code);
}

/**
 * Register only a tokenizer (for backwards compatibility).
 */
export function registerTokenizer(tokenizer: LanguageTokenizer): void {
  tokenizers.set(tokenizer.language, tokenizer);
}

/**
 * Register only a profile (for backwards compatibility).
 */
export function registerProfile(profile: LanguageProfile): void {
  profiles.set(profile.code, profile);
  patternCache.delete(profile.code);
}

/**
 * Set the pattern generator function.
 * Called by patterns module to inject the generator without circular deps.
 */
export function setPatternGenerator(
  generator: (profile: LanguageProfile) => LanguagePattern[]
): void {
  patternGenerator = generator;
}

// Direct pattern registration map (for tree-shaking)
const registeredPatterns = new Map<string, LanguagePattern[]>();

/**
 * Register patterns directly for a language.
 * This enables tree-shaking by allowing each language module to register
 * only its own patterns.
 */
export function registerPatterns(code: string, patterns: LanguagePattern[]): void {
  registeredPatterns.set(code, patterns);
  // Clear cached patterns if any
  patternCache.delete(code);
}

/**
 * Check if patterns are directly registered for a language.
 */
export function hasRegisteredPatterns(code: string): boolean {
  return registeredPatterns.has(code);
}

/**
 * Get directly registered patterns for a language.
 */
export function getRegisteredPatterns(code: string): LanguagePattern[] | undefined {
  return registeredPatterns.get(code);
}

// =============================================================================
// External Pattern Sources
// =============================================================================

/**
 * Register an external pattern source.
 * External sources (like @hyperfixi/patterns-reference) can provide
 * additional patterns at runtime.
 *
 * @example
 * ```typescript
 * import { registerPatternsSource } from '@lokascript/semantic';
 * import { createPatternsProvider } from '@hyperfixi/patterns-reference';
 *
 * const provider = createPatternsProvider();
 * registerPatternsSource(provider);
 * ```
 */
export function registerPatternsSource(source: ExternalPatternsSource): void {
  externalSources.set(source.id, source);
}

/**
 * Unregister an external pattern source.
 */
export function unregisterPatternsSource(sourceId: string): boolean {
  return externalSources.delete(sourceId);
}

/**
 * Get a registered external pattern source.
 */
export function getPatternsSource(sourceId: string): ExternalPatternsSource | undefined {
  return externalSources.get(sourceId);
}

/**
 * Get all registered external pattern sources.
 */
export function getAllPatternsSources(): ExternalPatternsSource[] {
  return Array.from(externalSources.values());
}

/**
 * Check if any external pattern sources are registered.
 */
export function hasExternalSources(): boolean {
  return externalSources.size > 0;
}

/**
 * Query patterns from all external sources for a language.
 * Returns patterns sorted by confidence.
 */
export async function queryExternalPatterns(language: string): Promise<ExternalPatternEntry[]> {
  if (externalSources.size === 0) {
    return [];
  }

  const allPatterns: ExternalPatternEntry[] = [];

  for (const source of externalSources.values()) {
    try {
      const patterns = await source.getPatternsForLanguage(language);
      allPatterns.push(...patterns);
    } catch (error) {
      console.warn(
        `[Registry] Failed to query patterns from ${source.name}:`,
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  // Sort by confidence (highest first)
  return allPatterns.sort((a, b) => b.confidence - a.confidence);
}

/**
 * Query patterns from all external sources for a command.
 */
export async function queryExternalPatternsForCommand(
  command: string,
  language?: string
): Promise<ExternalPatternEntry[]> {
  if (externalSources.size === 0) {
    return [];
  }

  const allPatterns: ExternalPatternEntry[] = [];

  for (const source of externalSources.values()) {
    try {
      const patterns = await source.getPatternsForCommand(command, language);
      allPatterns.push(...patterns);
    } catch (error) {
      console.warn(
        `[Registry] Failed to query patterns from ${source.name}:`,
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  return allPatterns.sort((a, b) => b.confidence - a.confidence);
}

// =============================================================================
// Language Code Utilities
// =============================================================================

/**
 * Extract the base language code from a BCP 47 tag.
 * Examples: 'es-MX' → 'es', 'pt-BR' → 'pt', 'en' → 'en'
 */
export function getBaseLanguageCode(code: string): string {
  return code.split('-')[0];
}

/**
 * Check if a code is a language variant (has region subtag).
 * Examples: 'es-MX' → true, 'pt' → false
 */
export function isLanguageVariant(code: string): boolean {
  return code.includes('-');
}

// =============================================================================
// Query Functions
// =============================================================================

/**
 * Get a tokenizer for the specified language.
 * Supports fallback: if 'es-MX' is not registered, falls back to 'es'.
 * @throws Error if neither the variant nor base language is registered
 */
export function getTokenizer(code: string): LanguageTokenizer {
  // Try exact match first
  let tokenizer = tokenizers.get(code);

  // Fallback: es-MX → es
  if (!tokenizer && isLanguageVariant(code)) {
    const baseCode = getBaseLanguageCode(code);
    tokenizer = tokenizers.get(baseCode);
  }

  if (!tokenizer) {
    const registered = Array.from(tokenizers.keys()).join(', ');
    throw new Error(
      `Language '${code}' is not registered. ` +
        `Registered languages: ${registered || 'none'}. ` +
        `Import the language module first: import '@lokascript/semantic/languages/${code}';`
    );
  }
  return tokenizer;
}

/**
 * Get a profile for the specified language.
 * Supports fallback: if 'es-MX' is not registered, falls back to 'es'.
 * @throws Error if neither the variant nor base language is registered
 */
export function getProfile(code: string): LanguageProfile {
  // Try exact match first
  let profile = profiles.get(code);

  // Fallback: es-MX → es
  if (!profile && isLanguageVariant(code)) {
    const baseCode = getBaseLanguageCode(code);
    profile = profiles.get(baseCode);
  }

  if (!profile) {
    const registered = Array.from(profiles.keys()).join(', ');
    throw new Error(
      `Language profile '${code}' is not registered. ` +
        `Registered languages: ${registered || 'none'}. ` +
        `Import the language module first: import '@lokascript/semantic/languages/${code}';`
    );
  }

  // Resolve inheritance if profile extends another
  return resolveProfile(profile);
}

/**
 * Try to get a tokenizer, returning undefined if not registered.
 * Supports fallback: if 'es-MX' is not registered, falls back to 'es'.
 */
export function tryGetTokenizer(code: string): LanguageTokenizer | undefined {
  let tokenizer = tokenizers.get(code);
  if (!tokenizer && isLanguageVariant(code)) {
    tokenizer = tokenizers.get(getBaseLanguageCode(code));
  }
  return tokenizer;
}

/**
 * Try to get a profile, returning undefined if not registered.
 * Supports fallback: if 'es-MX' is not registered, falls back to 'es'.
 */
export function tryGetProfile(code: string): LanguageProfile | undefined {
  let profile = profiles.get(code);
  if (!profile && isLanguageVariant(code)) {
    profile = profiles.get(getBaseLanguageCode(code));
  }
  // Resolve inheritance if profile extends another
  return profile ? resolveProfile(profile) : undefined;
}

/**
 * Get all registered language codes.
 */
export function getRegisteredLanguages(): string[] {
  return Array.from(tokenizers.keys());
}

/**
 * Check if a language is registered (exact match or base language fallback).
 */
export function isLanguageRegistered(code: string): boolean {
  if (tokenizers.has(code) && profiles.has(code)) {
    return true;
  }
  // Check fallback for variants
  if (isLanguageVariant(code)) {
    const baseCode = getBaseLanguageCode(code);
    return tokenizers.has(baseCode) && profiles.has(baseCode);
  }
  return false;
}

/**
 * Check if a language is supported (exact match or base language fallback).
 * For backwards compatibility with tokenizers API.
 */
export function isLanguageSupported(code: string): boolean {
  if (tokenizers.has(code)) {
    return true;
  }
  // Check fallback for variants
  if (isLanguageVariant(code)) {
    return tokenizers.has(getBaseLanguageCode(code));
  }
  return false;
}

// =============================================================================
// Tokenization
// =============================================================================

/**
 * Tokenize input in the specified language.
 * @throws Error if language is not registered
 */
export function tokenize(input: string, language: string): TokenStream {
  const tokenizer = getTokenizer(language);
  return tokenizer.tokenize(input);
}

// =============================================================================
// Pattern Access (Lazy Generation)
// =============================================================================

/**
 * Get patterns for a specific language.
 * First checks for directly registered patterns (for tree-shaking),
 * then falls back to pattern generator.
 * Supports fallback: if 'es-MX' is not registered, falls back to 'es'.
 * @throws Error if language is not registered
 */
export function getPatternsForLanguage(code: string): LanguagePattern[] {
  // Check cache first (try exact, then base language)
  let cached = patternCache.get(code);
  if (!cached && isLanguageVariant(code)) {
    cached = patternCache.get(getBaseLanguageCode(code));
  }
  if (cached) {
    return cached;
  }

  // Check for directly registered patterns (tree-shakeable path)
  // Try exact match, then base language fallback
  let registered = registeredPatterns.get(code);
  if (!registered && isLanguageVariant(code)) {
    registered = registeredPatterns.get(getBaseLanguageCode(code));
  }
  if (registered) {
    patternCache.set(code, registered);
    return registered;
  }

  // Fall back to pattern generator
  if (!patternGenerator) {
    throw new Error(
      `No patterns registered for language '${code}'. ` +
        'Either import the language module or set a pattern generator.'
    );
  }

  // Get profile (throws if not registered) - has built-in fallback
  const profile = getProfile(code);
  const patterns = patternGenerator(profile);
  patternCache.set(code, patterns);
  return patterns;
}

/**
 * Get patterns for a specific language and command.
 */
export function getPatternsForLanguageAndCommand(
  language: string,
  command: string
): LanguagePattern[] {
  return getPatternsForLanguage(language)
    .filter(p => p.command === command)
    .sort((a, b) => b.priority - a.priority);
}

/**
 * Clear the pattern cache for a language (useful for testing).
 */
export function clearPatternCache(code?: string): void {
  if (code) {
    patternCache.delete(code);
  } else {
    patternCache.clear();
  }
}

// =============================================================================
// Backwards Compatibility
// =============================================================================

/**
 * Get all profiles as a record (for backwards compatibility).
 * Note: Only returns registered profiles.
 */
export function getAllProfiles(): Record<string, LanguageProfile> {
  const result: Record<string, LanguageProfile> = {};
  for (const [code, profile] of profiles) {
    result[code] = profile;
  }
  return result;
}

/**
 * Get all tokenizers as a record (for backwards compatibility).
 * Note: Only returns registered tokenizers.
 */
export function getAllTokenizers(): Record<string, LanguageTokenizer> {
  const result: Record<string, LanguageTokenizer> = {};
  for (const [code, tokenizer] of tokenizers) {
    result[code] = tokenizer;
  }
  return result;
}
