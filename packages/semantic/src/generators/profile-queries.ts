/**
 * Small query helpers over the language-profile manifest.
 *
 * Public API for consumers that need per-language profile facts without
 * hand-rolling profile iteration (mcp-server's profile tools,
 * language-server hovers, framework-bridge domains). Backed by
 * `KNOWN_PROFILES` (every defined profile, independent of runtime
 * registration) — pass an explicit `languages` list to narrow.
 */

import type { SemanticRole } from '../types';
import type { KeywordTranslation, RoleMarker } from './profiles/types';
import { KNOWN_PROFILES } from './known-profiles';

/**
 * Look up one keyword's translations across languages.
 *
 * @param keyword - Profile keyword / action name (e.g. `toggle`, `set`)
 * @param languages - Language codes to include (default: every known profile)
 * @returns Map of language code → translation, with entries only for
 *   languages whose profile defines the keyword
 */
export function getKeywordTranslations(
  keyword: string,
  languages?: readonly string[]
): Record<string, KeywordTranslation> {
  const codes = languages ?? Object.keys(KNOWN_PROFILES);
  const translations: Record<string, KeywordTranslation> = {};
  for (const code of codes) {
    const translation = KNOWN_PROFILES[code]?.keywords[keyword];
    if (translation) translations[code] = translation;
  }
  return translations;
}

/**
 * Look up a language's grammatical role markers.
 *
 * @param language - Language code (e.g. `ja`)
 * @param role - Optional semantic role; when given, returns that role's
 *   marker only
 * @returns The marker(s), or `undefined` when the language is unknown or
 *   has no marker for the requested role
 */
export function getRoleMarkers(language: string): Partial<Record<SemanticRole, RoleMarker>>;
export function getRoleMarkers(language: string, role: SemanticRole): RoleMarker | undefined;
export function getRoleMarkers(
  language: string,
  role?: SemanticRole
): Partial<Record<SemanticRole, RoleMarker>> | RoleMarker | undefined {
  const markers = KNOWN_PROFILES[language]?.roleMarkers ?? {};
  return role ? markers[role] : markers;
}
