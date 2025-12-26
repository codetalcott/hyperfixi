/**
 * Language Profiles
 *
 * Re-exports from individual profile files for backwards compatibility.
 * For minimal bundles, import specific profiles directly:
 *
 * @example
 * ```typescript
 * // Tree-shakeable import
 * import { englishProfile } from './profiles/english';
 *
 * // Full import (all profiles bundled)
 * import { englishProfile, languageProfiles } from './language-profiles';
 * ```
 */

// Re-export types
export type {
  LanguageProfile,
  WordOrder,
  MarkingStrategy,
  RoleMarker,
  VerbConfig,
  VerbForm,
  PossessiveConfig,
  KeywordTranslation,
  TokenizationConfig,
} from './profiles/types';

// Re-export individual profiles
export { englishProfile } from './profiles/english';
export { japaneseProfile } from './profiles/japanese';
export { arabicProfile } from './profiles/arabic';
export { spanishProfile } from './profiles/spanish';
export { koreanProfile } from './profiles/korean';
export { chineseProfile } from './profiles/chinese';
export { turkishProfile } from './profiles/turkish';
export { portugueseProfile } from './profiles/portuguese';
export { frenchProfile } from './profiles/french';
export { germanProfile } from './profiles/german';
export { indonesianProfile } from './profiles/indonesian';
export { quechuaProfile } from './profiles/quechua';
export { swahiliProfile } from './profiles/swahili';

// Import for creating the combined object
import { englishProfile } from './profiles/english';
import { japaneseProfile } from './profiles/japanese';
import { arabicProfile } from './profiles/arabic';
import { spanishProfile } from './profiles/spanish';
import { koreanProfile } from './profiles/korean';
import { chineseProfile } from './profiles/chinese';
import { turkishProfile } from './profiles/turkish';
import { portugueseProfile } from './profiles/portuguese';
import { frenchProfile } from './profiles/french';
import { germanProfile } from './profiles/german';
import { indonesianProfile } from './profiles/indonesian';
import { quechuaProfile } from './profiles/quechua';
import { swahiliProfile } from './profiles/swahili';
import type { LanguageProfile } from './profiles/types';

// =============================================================================
// Profile Registry (backwards compatibility)
// =============================================================================

/**
 * All available language profiles.
 * @deprecated Import individual profiles for tree-shaking.
 */
export const languageProfiles: Record<string, LanguageProfile> = {
  en: englishProfile,
  ja: japaneseProfile,
  ar: arabicProfile,
  es: spanishProfile,
  ko: koreanProfile,
  zh: chineseProfile,
  tr: turkishProfile,
  pt: portugueseProfile,
  fr: frenchProfile,
  de: germanProfile,
  id: indonesianProfile,
  qu: quechuaProfile,
  sw: swahiliProfile,
};

/**
 * Get a language profile by code.
 * @deprecated Use the registry's getProfile instead.
 */
export function getProfile(code: string): LanguageProfile | undefined {
  return languageProfiles[code];
}

/**
 * Get all supported language codes.
 * @deprecated Use the registry's getRegisteredLanguages instead.
 */
export function getSupportedLanguages(): string[] {
  return Object.keys(languageProfiles);
}

/**
 * Check if a language is supported.
 * @deprecated Use the registry's isLanguageRegistered instead.
 */
export function isLanguageSupported(code: string): boolean {
  return code in languageProfiles;
}
