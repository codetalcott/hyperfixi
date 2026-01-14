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
    // Use override marker (can be empty string to suppress default marker)
    return {
      primary: overrideMarker,
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
