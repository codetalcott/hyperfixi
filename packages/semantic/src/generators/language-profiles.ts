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
 *
 * @generated This file is auto-generated. Do not edit manually.
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
export { arabicProfile } from './profiles/arabic';
export { bengaliProfile } from './profiles/bengali';
export { chineseProfile } from './profiles/chinese';
export { englishProfile } from './profiles/english';
export { frenchProfile } from './profiles/french';
export { germanProfile } from './profiles/german';
export { hindiProfile } from './profiles/hindi';
export { indonesianProfile } from './profiles/indonesian';
export { italianProfile } from './profiles/italian';
export { japaneseProfile } from './profiles/japanese';
export { koreanProfile } from './profiles/korean';
export { malayProfile } from './profiles/ms';
export { polishProfile } from './profiles/polish';
export { portugueseProfile } from './profiles/portuguese';
export { quechuaProfile } from './profiles/quechua';
export { russianProfile } from './profiles/russian';
export { spanishProfile } from './profiles/spanish';
export { swahiliProfile } from './profiles/swahili';
export { thaiProfile } from './profiles/thai';
export { turkishProfile } from './profiles/turkish';
export { ukrainianProfile } from './profiles/ukrainian';
export { vietnameseProfile } from './profiles/vietnamese';
export { tagalogProfile } from './profiles/tl';

// Import for creating the combined object
import { arabicProfile } from './profiles/arabic';
import { bengaliProfile } from './profiles/bengali';
import { chineseProfile } from './profiles/chinese';
import { englishProfile } from './profiles/english';
import { frenchProfile } from './profiles/french';
import { germanProfile } from './profiles/german';
import { hindiProfile } from './profiles/hindi';
import { indonesianProfile } from './profiles/indonesian';
import { italianProfile } from './profiles/italian';
import { japaneseProfile } from './profiles/japanese';
import { koreanProfile } from './profiles/korean';
import { malayProfile } from './profiles/ms';
import { polishProfile } from './profiles/polish';
import { portugueseProfile } from './profiles/portuguese';
import { quechuaProfile } from './profiles/quechua';
import { russianProfile } from './profiles/russian';
import { spanishProfile } from './profiles/spanish';
import { swahiliProfile } from './profiles/swahili';
import { thaiProfile } from './profiles/thai';
import { turkishProfile } from './profiles/turkish';
import { ukrainianProfile } from './profiles/ukrainian';
import { vietnameseProfile } from './profiles/vietnamese';
import { tagalogProfile } from './profiles/tl';
import type { LanguageProfile } from './profiles/types';

// =============================================================================
// Profile Registry (backwards compatibility)
// =============================================================================

/**
 * All available language profiles.
 * @deprecated Import individual profiles for tree-shaking.
 */
export const languageProfiles: Record<string, LanguageProfile> = {
  ar: arabicProfile,
  bn: bengaliProfile,
  zh: chineseProfile,
  en: englishProfile,
  fr: frenchProfile,
  de: germanProfile,
  hi: hindiProfile,
  id: indonesianProfile,
  it: italianProfile,
  ja: japaneseProfile,
  ko: koreanProfile,
  ms: malayProfile,
  pl: polishProfile,
  pt: portugueseProfile,
  qu: quechuaProfile,
  ru: russianProfile,
  es: spanishProfile,
  sw: swahiliProfile,
  th: thaiProfile,
  tr: turkishProfile,
  uk: ukrainianProfile,
  vi: vietnameseProfile,
  tl: tagalogProfile,
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
