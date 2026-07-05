/**
 * Possessive Keywords Utility
 *
 * Provides functions to look up possessive keywords from language profiles.
 * Used by pattern-matcher to recognize possessive expressions like "my value".
 */

import type { LanguageProfile } from '../../generators/profiles/types';

/**
 * Get the reference for a possessive keyword from a language profile.
 *
 * @param profile Language profile
 * @param keyword Possessive keyword (e.g., 'my', 'your', 'its')
 * @returns The reference (e.g., 'me', 'you', 'it') or undefined if not found
 */
export function getPossessiveReference(
  profile: LanguageProfile,
  keyword: string
): string | undefined {
  const direct = profile.possessive?.keywords?.[keyword];
  if (direct) return direct;
  // Render/parse symmetry: the i18n transformer renders possessives via
  // `specialForms` (concept → surface, e.g. ko it → 그것의), but only `keywords`
  // (surface → concept) was consulted here — so a surface form present ONLY in
  // specialForms round-tripped out but never parsed back (ko `그것의.name`
  // failed the whole generated set pattern and fell to the role-scrambling SOV
  // fallback; R1 handoff cluster A). Invert specialForms as a fallback so
  // whatever the renderer can emit, the matcher can read. `keywords` keeps
  // precedence for languages that deliberately map a surface differently.
  const special = profile.possessive?.specialForms;
  if (special) {
    for (const [concept, surface] of Object.entries(special)) {
      if (surface === keyword) return concept;
    }
  }
  return undefined;
}

/**
 * Check if a keyword is a possessive keyword in the given profile.
 *
 * @param profile Language profile
 * @param keyword Keyword to check
 * @returns True if the keyword is a possessive keyword
 */
export function isPossessiveKeyword(profile: LanguageProfile, keyword: string): boolean {
  return profile.possessive?.keywords?.[keyword] !== undefined;
}

/**
 * Get all possessive keywords from a language profile.
 *
 * @param profile Language profile
 * @returns Record of possessive keywords to references, or empty object
 */
export function getAllPossessiveKeywords(profile: LanguageProfile): Record<string, string> {
  return profile.possessive?.keywords ?? {};
}
