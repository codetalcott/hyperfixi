/**
 * Marker Resolution Utility
 *
 * Shared utilities for resolving role markers from language profiles.
 * Used by pattern-generator to build tokens and extraction rules.
 */

import type { SemanticRole } from '../../types';
import type { LanguageProfile, RoleMarker } from '../../generators/language-profiles';

/**
 * Minimum interface for role specs that can have marker resolution.
 * Compatible with the RoleSpec type from command-schemas.
 */
export interface RoleSpecWithMarker {
  role: SemanticRole;
  markerOverride?: Record<string, string | undefined>;
  markerLegacy?: Record<string, readonly string[]>;
}

/**
 * Resolved marker information for a role.
 */
export interface ResolvedMarker {
  /** Primary marker string (may be empty string for no marker) */
  primary: string;
  /** Alternative markers */
  alternatives?: string[];
  /** Position relative to role value */
  position: 'before' | 'after';
  /** Whether this is an override marker */
  isOverride: boolean;
}

/**
 * Resolve the marker for a role in a specific language.
 *
 * Checks for command-specific marker overrides first,
 * then falls back to the default marker from the language profile.
 *
 * @param roleSpec Role specification with optional override
 * @param profile Language profile with role markers
 * @returns Resolved marker info, or null if no marker
 */
export function resolveMarkerForRole(
  roleSpec: RoleSpecWithMarker,
  profile: LanguageProfile
): ResolvedMarker | null {
  // Check for command-specific marker override first
  const overrideMarker = roleSpec.markerOverride?.[profile.code];
  const defaultMarker = profile.roleMarkers[roleSpec.role];

  if (overrideMarker !== undefined) {
    // Use override marker (can be empty string to suppress default marker).
    // markerLegacy entries stay accepted, so correcting an override does not
    // stop the marker a previous release rendered from parsing.
    const alternatives = legacyMarkerAlternatives(roleSpec, profile.code, overrideMarker);
    return {
      primary: overrideMarker,
      ...(alternatives && { alternatives }),
      position: defaultMarker?.position ?? 'before',
      isOverride: true,
    };
  }

  if (defaultMarker && defaultMarker.primary) {
    const result: ResolvedMarker = {
      primary: defaultMarker.primary,
      position: defaultMarker.position,
      isOverride: false,
    };
    if (defaultMarker.alternatives) {
      result.alternatives = defaultMarker.alternatives;
    }
    return result;
  }

  return null;
}

/**
 * Alternatives an OVERRIDE marker accepts: the role's {@link RoleSpecWithMarker.markerLegacy}
 * entries for this language, minus the override itself.
 *
 * Every generator that resolves a marker has its own override branch, and each
 * one used to drop alternatives entirely — so correcting a marker silently
 * stopped the previous one parsing. This is the single definition of what an
 * override still accepts; call it from each of those branches.
 *
 * Deliberately NOT `markerVariants`: those carry meaning of their own (`put`'s
 * `before`/`after` populate the `method` role), so accepting them as synonyms
 * would swallow a distinct command shape.
 */
export function legacyMarkerAlternatives(
  roleSpec: RoleSpecWithMarker,
  languageCode: string,
  overrideMarker: string
): string[] | undefined {
  const legacy = roleSpec.markerLegacy?.[languageCode];
  if (!legacy?.length) return undefined;
  const alternatives = [...new Set(legacy)].filter(a => a && a !== overrideMarker);
  return alternatives.length ? alternatives : undefined;
}

/**
 * Get all markers (primary + alternatives) for a role.
 *
 * @param roleSpec Role specification
 * @param profile Language profile
 * @returns Array of marker strings, or empty array if no markers
 */
export function getAllMarkersForRole(
  roleSpec: RoleSpecWithMarker,
  profile: LanguageProfile
): string[] {
  const resolved = resolveMarkerForRole(roleSpec, profile);
  if (!resolved || !resolved.primary) {
    return [];
  }

  const markers = [resolved.primary];
  if (resolved.alternatives) {
    markers.push(...resolved.alternatives);
  }
  return markers;
}

/**
 * Get the default role marker from a language profile.
 *
 * @param profile Language profile
 * @param role Semantic role
 * @returns Role marker or undefined
 */
export function getDefaultRoleMarker(
  profile: LanguageProfile,
  role: SemanticRole
): RoleMarker | undefined {
  return profile.roleMarkers[role];
}
