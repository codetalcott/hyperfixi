/**
 * Possessive Keywords Utility
 *
 * Provides functions to look up possessive keywords from language profiles.
 * Used by pattern-matcher to recognize possessive expressions like "my value".
 */

/**
 * Minimal profile interface for possessive keyword lookup.
 */
export interface PossessiveProfile {
  readonly possessive?: {
    readonly keywords?: Record<string, string>;
  };
}

/**
 * Get the reference for a possessive keyword from a profile.
 *
 * @param profile Language profile
 * @param keyword Possessive keyword (e.g., 'my', 'your', 'its')
 * @returns The reference (e.g., 'me', 'you', 'it') or undefined if not found
 */
export function getPossessiveReference(
  profile: PossessiveProfile | undefined,
  keyword: string
): string | undefined {
  return profile?.possessive?.keywords?.[keyword];
}

/**
 * Check if a keyword is a possessive keyword in the given profile.
 *
 * @param profile Language profile
 * @param keyword Keyword to check
 * @returns True if the keyword is a possessive keyword
 */
export function isPossessiveKeyword(
  profile: PossessiveProfile | undefined,
  keyword: string
): boolean {
  return profile?.possessive?.keywords?.[keyword] !== undefined;
}

/**
 * Get all possessive keywords from a profile.
 *
 * @param profile Language profile
 * @returns Record of possessive keywords to references, or empty object
 */
export function getAllPossessiveKeywords(
  profile: PossessiveProfile | undefined
): Record<string, string> {
  return profile?.possessive?.keywords ?? {};
}
