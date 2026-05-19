/**
 * Profile Loader
 *
 * Imports all language profiles from @lokascript/semantic as the base layer.
 * The editor overlays SQLite edits on top of these base profiles.
 */

import {
  KNOWN_PROFILES,
  type LanguageProfile,
} from '@lokascript/semantic';

export { type LanguageProfile };

/**
 * Get a base profile by language code.
 */
export function getBaseProfile(code: string): LanguageProfile | null {
  return KNOWN_PROFILES[code] ?? null;
}

/**
 * Get all base profiles.
 */
export function getAllBaseProfiles(): Record<string, LanguageProfile> {
  return KNOWN_PROFILES;
}

/**
 * Get all supported language codes.
 */
export function getAllLanguageCodes(): string[] {
  return Object.keys(KNOWN_PROFILES);
}

/**
 * Get the English profile's keyword list (canonical reference for coverage).
 */
export function getEnglishKeywords(): string[] {
  const en = KNOWN_PROFILES['en'];
  return en ? Object.keys(en.keywords) : [];
}

/**
 * Get the English profile's role marker keys (canonical reference).
 */
export function getEnglishRoleMarkers(): string[] {
  const en = KNOWN_PROFILES['en'];
  return en ? Object.keys(en.roleMarkers) : [];
}

/**
 * Get the English profile's reference keys (canonical reference).
 */
export function getEnglishReferences(): string[] {
  const en = KNOWN_PROFILES['en'];
  return en?.references ? Object.keys(en.references) : [];
}
