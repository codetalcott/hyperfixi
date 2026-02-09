/**
 * Profile Loader
 *
 * Imports all language profiles from @lokascript/semantic as the base layer.
 * The editor overlays SQLite edits on top of these base profiles.
 */

import {
  languageProfiles,
  type LanguageProfile,
} from '@lokascript/semantic';

export { type LanguageProfile };

/**
 * Get a base profile by language code.
 */
export function getBaseProfile(code: string): LanguageProfile | null {
  return languageProfiles[code] ?? null;
}

/**
 * Get all base profiles.
 */
export function getAllBaseProfiles(): Record<string, LanguageProfile> {
  return languageProfiles;
}

/**
 * Get all supported language codes.
 */
export function getAllLanguageCodes(): string[] {
  return Object.keys(languageProfiles);
}

/**
 * Get the English profile's keyword list (canonical reference for coverage).
 */
export function getEnglishKeywords(): string[] {
  const en = languageProfiles['en'];
  return en ? Object.keys(en.keywords) : [];
}

/**
 * Get the English profile's role marker keys (canonical reference).
 */
export function getEnglishRoleMarkers(): string[] {
  const en = languageProfiles['en'];
  return en ? Object.keys(en.roleMarkers) : [];
}

/**
 * Get the English profile's reference keys (canonical reference).
 */
export function getEnglishReferences(): string[] {
  const en = languageProfiles['en'];
  return en?.references ? Object.keys(en.references) : [];
}
